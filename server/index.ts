// 联机对战服务器（Node + Socket.io）。
// 职责：房间管理、共享种子开局、棋盘快照转发、攻击仲裁（限频+随机缺口）、淘汰/胜负。
// 混合权威：不持有任何玩家的活动方块状态，只转发与仲裁跨玩家交互。
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { RoomStore, publicState } from './rooms';
import { BOARD_WIDTH } from '../shared/constants';

const PORT = Number(process.env.PORT ?? 3000);
const ATTACK_MIN_INTERVAL_MS = 500; // ≤2 次/秒
const COUNTDOWN_MS = 4000; // gameStart 到实际开始的延迟（含 3-2-1）

const httpServer = createServer();
const io = new Server(httpServer, { cors: { origin: '*' } });
const store = new RoomStore();
const lastAttack = new Map<string, number>(); // 攻击限频：socketId -> 上次攻击时间戳

function emitRoomUpdate(roomId: string): void {
  const room = store.getRoom(roomId);
  if (!room) return;
  io.to(roomId).emit('roomUpdate', publicState(room));
}

function checkGameEnd(roomId: string): void {
  const room = store.getRoom(roomId);
  if (!room || !room.inGame) return;
  const alive = room.alivePlayers ? Array.from(room.alivePlayers) : [];
  if (alive.length <= 1) {
    room.inGame = false;
    io.to(roomId).emit('gameEnd', { winner: alive[0] ?? null });
    emitRoomUpdate(roomId);
  }
}

function clampPlayers(n: number): number {
  return n === 2 || n === 4 ? n : 3;
}

io.on('connection', (socket) => {
  console.log(`[server] connected: ${socket.id}`);

  socket.on('createRoom', (payload: { name?: string; maxPlayers?: number }) => {
    const room = store.createRoom(socket.id, payload.name || '玩家', clampPlayers(payload.maxPlayers ?? 3));
    socket.join(room.id);
    socket.emit('roomCreated', { roomId: room.id });
    emitRoomUpdate(room.id);
  });

  socket.on('joinRoom', (payload: { name?: string; roomId?: string }) => {
    const roomId = (payload.roomId ?? '').trim();
    const res = store.joinRoom(socket.id, payload.name || '玩家', roomId);
    if (!res.ok) {
      socket.emit('roomError', { message: res.error });
      return;
    }
    socket.join(roomId);
    socket.emit('roomJoined', { roomId });
    emitRoomUpdate(roomId);
  });

  socket.on('leaveRoom', () => {
    const room = store.getRoomBySocket(socket.id);
    if (!room) return;
    const roomId = room.id;
    socket.leave(roomId);
    store.leaveRoom(socket.id);
    if (store.getRoom(roomId)) emitRoomUpdate(roomId);
  });

  socket.on('startGame', () => {
    const room = store.getRoomBySocket(socket.id);
    if (!room || room.hostId !== socket.id) return;
    if (room.players.size < 2) {
      socket.emit('roomError', { message: '至少需要 2 名玩家' });
      return;
    }
    room.inGame = true;
    room.alivePlayers = new Set(room.players.keys());
    const seed = (Math.random() * 0xffffffff) >>> 0;
    const startTimestamp = Date.now() + COUNTDOWN_MS;
    io.to(room.id).emit('gameStart', {
      seed,
      players: publicState(room).players,
      startTimestamp,
    });
    emitRoomUpdate(room.id);
  });

  socket.on('boardSnapshot', (payload: { snapshot?: string }) => {
    const room = store.getRoomBySocket(socket.id);
    if (!room || !room.inGame || !payload.snapshot) return;
    socket.to(room.id).emit('opponentSnapshot', { playerId: socket.id, snapshot: payload.snapshot });
  });

  socket.on('attack', (payload: { targetId?: string }) => {
    const room = store.getRoomBySocket(socket.id);
    const targetId = payload.targetId;
    if (!room || !room.inGame || !targetId) return;
    if (!room.alivePlayers?.has(socket.id) || !room.alivePlayers.has(targetId)) return;
    // 限频
    const now = Date.now();
    const last = lastAttack.get(socket.id) ?? 0;
    if (now - last < ATTACK_MIN_INTERVAL_MS) return; // 超频丢弃
    lastAttack.set(socket.id, now);
    const holeCol = Math.floor(Math.random() * BOARD_WIDTH);
    io.to(targetId).emit('garbageIn', { fromId: socket.id, count: 1, holeCol });
  });

  socket.on('gameOver', (payload: { snapshot?: string }) => {
    const room = store.getRoomBySocket(socket.id);
    if (!room || !room.inGame) return;
    room.alivePlayers?.delete(socket.id);
    io.to(room.id).emit('playerOut', { playerId: socket.id, snapshot: payload.snapshot });
    checkGameEnd(room.id);
  });

  socket.on('disconnect', (reason) => {
    console.log(`[server] disconnected: ${socket.id} (${reason})`);
    const room = store.getRoomBySocket(socket.id);
    lastAttack.delete(socket.id);
    if (!room) return;
    const roomId = room.id;
    const wasAlive = room.inGame && (room.alivePlayers?.has(socket.id) ?? false);
    store.leaveRoom(socket.id);
    if (wasAlive) {
      const r = store.getRoom(roomId);
      if (r && r.inGame) {
        io.to(roomId).emit('playerOut', { playerId: socket.id, snapshot: undefined });
        checkGameEnd(roomId);
      }
    }
    if (store.getRoom(roomId)) emitRoomUpdate(roomId);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
});

// 联机网络层：封装 socket.io-client 的连接与事件收发。
// 连接使用同源地址（dev 经 vite proxy 的 /socket.io 转发到 server:3000）。
import { io, type Socket } from 'socket.io-client';

export interface PublicPlayer {
  id: string;
  name: string;
}

export interface RoomPublicState {
  roomId: string;
  players: PublicPlayer[];
  hostId: string;
  maxPlayers: number;
  inGame: boolean;
}

export interface GameStartPayload {
  seed: number;
  players: PublicPlayer[];
  startTimestamp: number;
}

export interface NetHandlers {
  onConnect?: () => void;
  onRoomCreated?: (roomId: string) => void;
  onRoomJoined?: (roomId: string) => void;
  onRoomError?: (message: string) => void;
  onRoomUpdate?: (state: RoomPublicState) => void;
  onGameStart?: (payload: GameStartPayload) => void;
  onOpponentSnapshot?: (playerId: string, snapshot: string) => void;
  onGarbageIn?: (fromId: string, count: number, holeCol: number) => void;
  onPlayerOut?: (playerId: string, snapshot: string | undefined) => void;
  onGameEnd?: (winner: string | null) => void;
  onDisconnect?: () => void;
}

export class Net {
  readonly socket: Socket;
  selfId: string | null = null;

  constructor(handlers: NetHandlers) {
    this.socket = io();
    this.socket.on('connect', () => {
      this.selfId = this.socket.id ?? null;
      handlers.onConnect?.();
    });
    this.socket.on('disconnect', () => handlers.onDisconnect?.());
    this.socket.on('roomCreated', (p: { roomId: string }) => handlers.onRoomCreated?.(p.roomId));
    this.socket.on('roomJoined', (p: { roomId: string }) => handlers.onRoomJoined?.(p.roomId));
    this.socket.on('roomError', (p: { message: string }) => handlers.onRoomError?.(p.message));
    this.socket.on('roomUpdate', (s: RoomPublicState) => handlers.onRoomUpdate?.(s));
    this.socket.on('gameStart', (p: GameStartPayload) => handlers.onGameStart?.(p));
    this.socket.on('opponentSnapshot', (p: { playerId: string; snapshot: string }) =>
      handlers.onOpponentSnapshot?.(p.playerId, p.snapshot),
    );
    this.socket.on('garbageIn', (p: { fromId: string; count: number; holeCol: number }) =>
      handlers.onGarbageIn?.(p.fromId, p.count, p.holeCol),
    );
    this.socket.on('playerOut', (p: { playerId: string; snapshot?: string }) =>
      handlers.onPlayerOut?.(p.playerId, p.snapshot),
    );
    this.socket.on('gameEnd', (p: { winner: string | null }) => handlers.onGameEnd?.(p.winner));
  }

  createRoom(name: string, maxPlayers: number): void {
    this.socket.emit('createRoom', { name, maxPlayers });
  }
  joinRoom(name: string, roomId: string): void {
    this.socket.emit('joinRoom', { name, roomId });
  }
  leaveRoom(): void {
    this.socket.emit('leaveRoom');
  }
  startGame(): void {
    this.socket.emit('startGame');
  }
  sendSnapshot(snapshot: string): void {
    this.socket.emit('boardSnapshot', { snapshot });
  }
  attack(targetId: string): void {
    this.socket.emit('attack', { targetId });
  }
  sendGameOver(snapshot: string): void {
    this.socket.emit('gameOver', { snapshot });
  }
  dispose(): void {
    this.socket.removeAllListeners();
    this.socket.disconnect();
  }
}

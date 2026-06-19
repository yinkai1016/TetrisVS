// 房间存储与管理（服务器侧）。
export interface Player {
  id: string;
  name: string;
}

export interface Room {
  id: string;
  hostId: string;
  players: Map<string, Player>;
  maxPlayers: number;
  inGame: boolean;
  alivePlayers?: Set<string>;
}

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

/** 生成 6 位纯数字房间 ID。 */
function randomRoomId(): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += Math.floor(Math.random() * 10);
  return s;
}

export class RoomStore {
  private rooms = new Map<string, Room>();
  private socketRoom = new Map<string, string>();

  createRoom(hostId: string, name: string, maxPlayers: number): Room {
    let id = randomRoomId();
    while (this.rooms.has(id)) id = randomRoomId();
    const room: Room = {
      id,
      hostId,
      players: new Map([[hostId, { id: hostId, name }]]),
      maxPlayers,
      inGame: false,
    };
    this.rooms.set(id, room);
    this.socketRoom.set(hostId, id);
    return room;
  }

  joinRoom(
    socketId: string,
    name: string,
    roomId: string,
  ): { ok: true; room: Room } | { ok: false; error: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false, error: '房间不存在' };
    if (room.inGame) return { ok: false, error: '对局已开始' };
    if (room.players.size >= room.maxPlayers) return { ok: false, error: '房间已满' };
    room.players.set(socketId, { id: socketId, name });
    this.socketRoom.set(socketId, roomId);
    return { ok: true, room };
  }

  /** 玩家离开；返回剩余房间（用于广播），空房销毁返回 undefined。同时清理 alivePlayers。 */
  leaveRoom(socketId: string): Room | undefined {
    const roomId = this.socketRoom.get(socketId);
    this.socketRoom.delete(socketId);
    if (!roomId) return undefined;
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    room.players.delete(socketId);
    room.alivePlayers?.delete(socketId);
    if (room.players.size === 0) {
      this.rooms.delete(roomId);
      return undefined;
    }
    if (room.hostId === socketId) {
      room.hostId = room.players.keys().next().value as string;
    }
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomBySocket(socketId: string): Room | undefined {
    const rid = this.socketRoom.get(socketId);
    return rid ? this.rooms.get(rid) : undefined;
  }
}

export function publicPlayers(room: Room): PublicPlayer[] {
  return Array.from(room.players.values()).map((p) => ({ id: p.id, name: p.name }));
}

export function publicState(room: Room): RoomPublicState {
  return {
    roomId: room.id,
    players: publicPlayers(room),
    hostId: room.hostId,
    maxPlayers: room.maxPlayers,
    inGame: room.inGame,
  };
}

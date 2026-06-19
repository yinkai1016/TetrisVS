// 冒烟：模拟双客户端验证 server 房间/开局/快照/攻击/胜负链路（组 6-8）。
import { io } from 'socket.io-client';

const URL = 'http://localhost:3000';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function once(socket: ReturnType<typeof io>, event: string): Promise<any> {
  return new Promise((res) => socket.once(event, res));
}

async function run(): Promise<void> {
  const host = io(URL);
  const guest = io(URL);
  await Promise.all([once(host, 'connect'), once(guest, 'connect')]);

  // 创建房间
  host.emit('createRoom', { name: 'A', maxPlayers: 4 });
  const created = await once(host, 'roomCreated');
  const roomId: string = created.roomId;
  console.log('[smoke] roomId =', roomId, /^\d{6}$/.test(roomId) ? 'OK' : 'BAD');

  // guest 加入
  guest.emit('joinRoom', { name: 'B', roomId });
  await once(guest, 'roomJoined');
  console.log('[smoke] guest joined OK');

  // 开始
  host.emit('startGame');
  const gsA = await once(host, 'gameStart');
  const gsB = await once(guest, 'gameStart');
  console.log('[smoke] seed match:', gsA.seed === gsB.seed ? 'OK' : 'BAD');

  // 快照转发：host 发 → guest 收
  guest.once('opponentSnapshot', () => {});
  host.emit('boardSnapshot', { snapshot: '0'.repeat(200) });
  const snap = await once(guest, 'opponentSnapshot');
  console.log('[smoke] snapshot forwarded OK, len =', snap.snapshot.length);

  // 攻击：host 攻击 guest
  host.emit('attack', { targetId: guest.id });
  const gbg = await once(guest, 'garbageIn');
  console.log('[smoke] attack forwarded OK, holeCol =', gbg.holeCol, 'count =', gbg.count);

  // guest gameOver → host 收 playerOut + gameEnd
  guest.emit('gameOver', { snapshot: '0'.repeat(200) });
  const end = await once(host, 'gameEnd');
  console.log('[smoke] gameEnd winner is host:', end.winner === host.id ? 'OK' : 'BAD');

  host.disconnect();
  guest.disconnect();
  await wait(100);
}

run().then(() => process.exit(0)).catch((e) => {
  console.error('[smoke] FAIL:', e);
  process.exit(1);
});

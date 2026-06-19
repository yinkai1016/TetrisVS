// 冒烟：验证 client 能与 server 建立 Socket 连接（组 1.4）。用完可删。
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');
socket.on('connect', () => {
  console.log('[smoke] connected:', socket.id);
  setTimeout(() => {
    socket.disconnect();
    process.exit(0);
  }, 300);
});
socket.on('connect_error', (err) => {
  console.error('[smoke] connect_error:', err.message);
  process.exit(1);
});
setTimeout(() => {
  console.error('[smoke] timeout');
  process.exit(1);
}, 3000);

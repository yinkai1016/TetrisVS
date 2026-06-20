// 应用入口：屏幕状态机（菜单 / 单机 / 房间大厅 / 联机对局）。
// 桌面 = 键盘 + 宽屏；手机（pointer:coarse）= 虚拟按键 + 竖屏布局。游戏逻辑共用。
import { Action, GameState, createGame, dispatch, restart, step } from './game/engine';
import { ClientAction, InputController } from './game/input';
import { MOBILE_LAYOUT, renderGame, renderMobile } from './game/renderer';
import { GameStartPayload, Net } from './game/net';
import { MultiplayerSession } from './game/multiplayer';
import { showMenu } from './ui/menu';
import { Lobby } from './ui/lobby';
import { isTouchDevice, setupCanvasDpi } from './game/platform';
import { TouchControls } from './game/touch-controls';
import { TICK_MS } from '../shared/constants';

const canvasEl = document.getElementById('game');
if (!canvasEl) throw new Error('canvas#game 未找到');
const canvas = canvasEl as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const overlayEl = document.getElementById('overlay');
if (!overlayEl) throw new Error('#overlay 未找到');
const overlay = overlayEl as HTMLElement;

const touch = isTouchDevice();

let net: Net | null = null;
let lobby: Lobby | null = null;
let session: MultiplayerSession | null = null;
let singleCleanup: (() => void) | null = null;

function clearScreen(): void {
  if (singleCleanup) {
    singleCleanup();
    singleCleanup = null;
  }
  if (session) {
    session.dispose();
    session = null;
  }
  if (lobby) {
    lobby.hide();
    lobby = null;
  }
  overlay.innerHTML = '';
  overlay.style.display = '';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function gotoMenu(): void {
  clearScreen();
  if (net) {
    net.dispose();
    net = null;
  }
  canvas.style.display = 'none';
  showMenu(overlay, { onSingle: startSingle, onMulti: startMulti });
}

function startSingle(): void {
  clearScreen();
  canvas.style.display = 'block';

  let state: GameState = createGame((Date.now() >>> 0) || 1);

  // 输入：手机用虚拟按键，桌面用键盘
  let pollFn: (dt: number) => void;
  let cleanupInput: () => void;
  if (touch) {
    setupCanvasDpi(canvas, MOBILE_LAYOUT.canvasW, MOBILE_LAYOUT.canvasH);
    // 手机单机：常驻退出按钮（无键盘 Esc）
    const back = document.createElement('button');
    back.textContent = '← 退出';
    back.className = 'back-btn';
    back.onclick = () => gotoMenu();
    overlay.appendChild(back);
    const tc = new TouchControls(overlay, (a: ClientAction) => {
      state = dispatch(state, a as Action);
    });
    tc.attach();
    pollFn = (dt) => tc.poll(dt);
    cleanupInput = () => {
      tc.detach();
      back.remove();
    };
  } else {
    const input = new InputController(window, (a: ClientAction) => {
      state = dispatch(state, a as Action);
    });
    input.attach();
    pollFn = (dt) => input.poll(dt);
    cleanupInput = () => input.detach();
  }

  let raf = 0;
  let last = performance.now();
  let acc = 0;
  const onKey = (e: KeyboardEvent) => {
    if (e.code === 'KeyR' && !e.repeat) state = restart((Date.now() >>> 0) || 1);
    if (e.code === 'Escape') {
      if (window.confirm('返回主菜单？当前对局将放弃。')) gotoMenu();
    }
  };
  const onBlur = () => {
    if (!state.paused && state.phase !== 'GameOver') state = dispatch(state, 'pause');
  };
  if (!touch) {
    window.addEventListener('keydown', onKey);
    window.addEventListener('blur', onBlur);
  }

  const loop = () => {
    const now = performance.now();
    let dt = now - last;
    last = now;
    if (dt > 250) dt = 250;
    acc += dt;
    while (acc >= TICK_MS) {
      pollFn(TICK_MS);
      state = step(state, TICK_MS);
      acc -= TICK_MS;
    }
    if (touch) renderMobile(ctx, state, [], null);
    else renderGame(ctx, state);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  singleCleanup = () => {
    cancelAnimationFrame(raf);
    cleanupInput();
    if (!touch) {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', onBlur);
    }
  };
}

function startMulti(): void {
  clearScreen();
  canvas.style.display = 'none';
  net = new Net({
    onRoomCreated: (rid) => lobby?.onRoomCreated(rid),
    onRoomJoined: (rid) => lobby?.onRoomJoined(rid),
    onRoomError: (msg) => lobby?.showError(msg),
    onRoomUpdate: (s) => lobby?.updateRoom(s),
    onGameStart: (p) => onGameStart(p),
    onOpponentSnapshot: (id, snap) => session?.onOpponentSnapshot(id, snap),
    onGarbageIn: (from, count, hole) => session?.onGarbageIn(from, count, hole),
    onPlayerOut: (id) => session?.onPlayerOut(id),
    onGameEnd: (winner) => session?.onGameEnd(winner),
  });
  lobby = new Lobby(overlay, net, { onBack: gotoMenu });
}

function onGameStart(payload: GameStartPayload): void {
  if (!net) return;
  overlay.innerHTML = '';
  overlay.style.display = 'none';
  lobby = null;
  canvas.style.display = 'block';
  session = new MultiplayerSession({ ctx, canvas, net, touch, parentContainer: document.getElementById('app') as HTMLElement, onGameEnd: (_winner, isSelf) => showResult(isSelf) });
  session.start(payload);
}

function showResult(isSelf: boolean): void {
  overlay.innerHTML = '';
  overlay.style.display = '';
  canvas.style.display = 'none';
  const card = document.createElement('div');
  card.className = 'result';
  const h = document.createElement('h2');
  h.textContent = isSelf ? '🏆 你赢了！' : '💔 你输了';
  card.appendChild(h);
  const back = document.createElement('button');
  back.textContent = '返回房间';
  back.onclick = backToLobby;
  card.appendChild(back);
  const menu = document.createElement('button');
  menu.textContent = '返回主菜单';
  menu.onclick = gotoMenu;
  card.appendChild(menu);
  overlay.appendChild(card);
}

function backToLobby(): void {
  if (session) {
    session.dispose();
    session = null;
  }
  if (!net) {
    gotoMenu();
    return;
  }
  overlay.innerHTML = '';
  overlay.style.display = '';
  canvas.style.display = 'none';
  lobby = new Lobby(overlay, net, { onBack: gotoMenu });
}

gotoMenu();

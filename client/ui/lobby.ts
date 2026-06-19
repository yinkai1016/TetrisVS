// 联机房间界面 DOM：创建 / 加入 / 房间状态 / 房主开始。
import { Net, RoomPublicState } from '../game/net';

export class Lobby {
  private el: HTMLDivElement;
  private formEl: HTMLDivElement;
  private stateEl: HTMLDivElement;
  private errorEl: HTMLDivElement;

  constructor(
    container: HTMLElement,
    private net: Net,
    private opts: { onBack: () => void },
  ) {
    this.el = document.createElement('div');
    this.el.className = 'lobby';
    this.formEl = document.createElement('div');
    this.stateEl = document.createElement('div');
    this.errorEl = document.createElement('div');
    this.el.appendChild(this.formEl);
    this.el.appendChild(this.stateEl);
    this.el.appendChild(this.errorEl);
    container.appendChild(this.el);
    this.buildForm();
  }

  private buildForm(): void {
    this.formEl.innerHTML = '';
    const title = document.createElement('h2');
    title.textContent = '联机对战';
    this.formEl.appendChild(title);
    const sub = document.createElement('p');
    sub.className = 'muted';
    sub.textContent = '创建一个新房间，或输入 6 位房间 ID 加入。';
    this.formEl.appendChild(sub);

    const nameInput = document.createElement('input');
    nameInput.placeholder = '你的名字';
    nameInput.value = `玩家${Math.floor(Math.random() * 100)}`;
    this.formEl.appendChild(nameInput);

    // 创建房间
    const createSection = document.createElement('div');
    createSection.className = 'section';
    const createLabel = document.createElement('div');
    createLabel.className = 'section-label';
    createLabel.textContent = '创建房间';
    createSection.appendChild(createLabel);
    const createRow = document.createElement('div');
    createRow.className = 'row';
    const sizeSel = document.createElement('select');
    [2, 3, 4].forEach((n) => {
      const o = document.createElement('option');
      o.value = String(n);
      o.textContent = `${n} 人`;
      sizeSel.add(o);
    });
    sizeSel.value = '3';
    const createBtn = document.createElement('button');
    createBtn.textContent = '创建';
    createBtn.onclick = () => {
      this.errorEl.textContent = '';
      this.net.createRoom(nameInput.value || '玩家', Number(sizeSel.value));
    };
    createRow.appendChild(sizeSel);
    createRow.appendChild(createBtn);
    createSection.appendChild(createRow);
    this.formEl.appendChild(createSection);

    // 加入房间
    const joinSection = document.createElement('div');
    joinSection.className = 'section';
    const joinLabel = document.createElement('div');
    joinLabel.className = 'section-label';
    joinLabel.textContent = '加入房间';
    joinSection.appendChild(joinLabel);
    const joinRow = document.createElement('div');
    joinRow.className = 'row';
    const idInput = document.createElement('input');
    idInput.placeholder = '6 位数字房间 ID';
    idInput.maxLength = 6;
    const joinBtn = document.createElement('button');
    joinBtn.textContent = '加入';
    joinBtn.onclick = () => {
      this.errorEl.textContent = '';
      const id = idInput.value.trim();
      if (!/^\d{6}$/.test(id)) {
        this.errorEl.textContent = '请输入 6 位数字房间 ID';
        return;
      }
      this.net.joinRoom(nameInput.value || '玩家', id);
    };
    joinRow.appendChild(idInput);
    joinRow.appendChild(joinBtn);
    joinSection.appendChild(joinRow);
    this.formEl.appendChild(joinSection);

    const back = document.createElement('button');
    back.textContent = '返回主菜单';
    back.onclick = this.opts.onBack;
    this.formEl.appendChild(back);
  }

  onRoomCreated(_roomId: string): void {
    this.errorEl.textContent = '';
  }
  onRoomJoined(_roomId: string): void {
    this.errorEl.textContent = '';
  }
  showError(msg: string): void {
    this.errorEl.textContent = msg;
  }

  updateRoom(s: RoomPublicState): void {
    this.stateEl.innerHTML = '';
    if (!s.roomId) return;
    const card = document.createElement('div');
    card.className = 'room-card';
    const idLine = document.createElement('div');
    idLine.className = 'room-id';
    idLine.textContent = `房间 ID：${s.roomId}`;
    card.appendChild(idLine);
    const cap = document.createElement('div');
    cap.className = 'muted';
    cap.textContent = `${s.players.length} / ${s.maxPlayers} 人`;
    card.appendChild(cap);
    const list = document.createElement('ul');
    s.players.forEach((p) => {
      const li = document.createElement('li');
      const tags: string[] = [];
      if (p.id === s.hostId) tags.push('房主');
      if (p.id === this.net.selfId) tags.push('你');
      li.textContent = `${p.name}${tags.length ? `（${tags.join('、')}）` : ''}`;
      list.appendChild(li);
    });
    card.appendChild(list);
    if (this.net.selfId === s.hostId && !s.inGame) {
      const start = document.createElement('button');
      start.textContent = '开始对局';
      start.disabled = s.players.length < 2;
      start.onclick = () => this.net.startGame();
      card.appendChild(start);
    }
    this.stateEl.appendChild(card);
  }

  hide(): void {
    this.el.remove();
  }
}

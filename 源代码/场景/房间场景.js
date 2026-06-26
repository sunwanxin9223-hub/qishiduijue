/**
 * 联机房间界面
 */
export class RoomScene {
    constructor(g, d = {}) {
        this.g = g; this.w = 1920; this.h = 1080;
        this.im = {}; this.ok = false;
        this.isHost = false;
        this.isJoining = false;
        this.showAnim = false;
        this.animFrames = [];
        this.currentFrame = 0;
        this.frameTimer = 0;
        this.fps = 12;
        this.frameInterval = 1000 / 12;
        this.roomCode = '';
        this.inputCode = '';
        this._pressed = null;
    }

    async init() {
        const L = (k, u) => new Promise(r => { const i = new Image(); i.onload = () => { this.im[k] = i; r(); }; i.onerror = () => { console.error('FAIL', k, u); r(); }; i.src = u; });
        const AD = '游戏资源/序列帧/人物动作/联机准备界面趣味动画_色键输出/透明帧';
        const tasks = [L('bg', '游戏资源/图像/场景/联机界面背景1.jpg')];
        for (let j = 1; j <= 121; j++) tasks.push(L('a' + j, `${AD}/frame_${String(j).padStart(5, '0')}.png`));
        await Promise.all(tasks);
        this.ok = true;
        for (let j = 1; j <= 121; j++) this.animFrames.push(this.im['a' + j]);
        this.setupInput();
    }

    setupInput() {
        const cv = this.g.canvas;
        this._kd = (e) => {
            if (!this.isHost && !this.isJoining) {
                if (e.key >= '0' && e.key <= '9' && this.inputCode.length < 4) this.inputCode += e.key;
                else if (e.key === 'Backspace') this.inputCode = this.inputCode.slice(0, -1);
            }
        };
        window.addEventListener('keydown', this._kd);

        this._cl = (e) => {
            this._pressed=null;
            const { x, y } = this.p(e);
            if (x >= 30 && x <= 130 && y >= 30 && y <= 70) { this.g.switchScene('主菜单'); return; }

            // 创建房间按钮
            if (!this.isHost && !this.isJoining) {
                const cb = this.btnCreateRoom;
                if (cb && x >= cb.x && x <= cb.x + cb.w && y >= cb.y && y <= cb.y + cb.h) { this.createRoom(); return; }
            }
            // 复制按钮
            if (this.isHost && this.roomCode) {
                const cp = this.btnCopy;
                if (cp && x >= cp.x && x <= cp.x + cp.w && y >= cp.y && y <= cp.y + cp.h) { navigator.clipboard.writeText(this.roomCode); return; }
            }
            // 加入房间按钮
            if (!this.isHost && !this.isJoining && this.inputCode.length === 4) {
                const jb = this.btnJoin;
                if (jb && x >= jb.x && x <= jb.x + jb.w && y >= jb.y && y <= jb.y + jb.h) { this.joinRoom(); return; }
            }
        };
        this._md = (e) => {
            const {x,y}=this.p(e);
            if(x>=30&&x<=130&&y>=30&&y<=70){this._pressed='back';return;}
            if(!this.isHost&&!this.isJoining){const cb=this.btnCreateRoom;if(cb&&x>=cb.x&&x<=cb.x+cb.w&&y>=cb.y&&y<=cb.y+cb.h){this._pressed='create';return;}}
            if(this.isHost&&this.roomCode){const cp=this.btnCopy;if(cp&&x>=cp.x&&x<=cp.x+cp.w&&y>=cp.y&&y<=cp.y+cp.h){this._pressed='copy';return;}}
            if(!this.isHost&&!this.isJoining&&this.inputCode.length===4){const jb=this.btnJoin;if(jb&&x>=jb.x&&x<=jb.x+jb.w&&y>=jb.y&&y<=jb.y+jb.h){this._pressed='join';return;}}
            this._pressed=null;
        };
        this._mu = () => { this._pressed=null; };
        cv.addEventListener('click', this._cl);
        cv.addEventListener('mousedown', this._md); cv.addEventListener('mouseup', this._mu);
        this._ts = e => { this._md(e.touches[0]); };
        this._te = e => { this._mu(); this._cl(e.changedTouches[0]); };
        cv.addEventListener('touchstart', this._ts, {passive: false});
        cv.addEventListener('touchend', this._te);
        cv.addEventListener('touchcancel', this._te);
    }

    createRoom() { this.isHost = true; this.roomCode = String(Math.floor(1000 + Math.random() * 9000)); this.showAnim = true; this.currentFrame = 0; setTimeout(() => this.g.switchScene('技能选择', { mode: '好友对战', role: '房主' }), 3000); }
    joinRoom() { this.isJoining = true; this.showAnim = true; this.currentFrame = 0; setTimeout(() => this.g.switchScene('技能选择', { mode: '好友对战', role: '好友' }), 3000); }

    p(e) { const r = this.g.canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * (1920 / r.width), y: (e.clientY - r.top) * (1080 / r.height) }; }

    update(dt) {
        if (this.showAnim) {
            this.frameTimer += dt * 1000;
            while (this.frameTimer >= this.frameInterval) { this.frameTimer -= this.frameInterval; this.currentFrame = (this.currentFrame + 1) % 121; }
        }
    }

    render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, this.w, this.h);
        if (!this.ok) { this.renderLoading(ctx); return; }
        const bg = this.im['bg']; if (bg && bg.naturalWidth > 0) ctx.drawImage(bg, 0, 0, 1920, 1080);

        if (this.showAnim) {
            const f = this.animFrames[this.currentFrame];
            if (f && f.naturalWidth > 0) ctx.drawImage(f, 254.42 + 960, -450.11 + 540, 723.17, 964.22);
        }

        ctx.fillStyle = 'rgba(0,0,0,0.4)'; this.rr(ctx, 30, 30, 100, 40, 8);
        if(this._pressed==='back'){ctx.fillStyle='rgba(0,0,0,0.2)';this.rr(ctx,30,30,100,40,8);}
        ctx.fillStyle = '#ccc'; ctx.font = '18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('← 返回', 80, 57);

        const uiCX = 965, uiCY = 540;
        const outerW = 600, outerH = 560;
        const pad = 28;
        const ox = uiCX - outerW / 2, oy = uiCY - outerH / 2;
        const hostX = ox + pad, hostY = oy + pad, hostW = outerW - pad * 2, hostH = 190;
        const guestX = ox + pad, guestY = hostY + hostH + pad, guestW = outerW - pad * 2, guestH = 170;

        this.renderGlassBox(ctx, ox, oy, outerW, outerH, 16);
        this.renderGlassBox(ctx, hostX, hostY, hostW, hostH, 12);
        this.renderGlassBox(ctx, guestX, guestY, guestW, guestH, 12);

        ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('房主', hostX + hostW / 2, hostY + 30);
        ctx.fillText('加入房间', guestX + guestW / 2, guestY + 30);

        if (!this.isHost) {
            const bx = hostX + hostW / 2 - 190, by = hostY + 55, bw = 380, bh = 80;
            this.btnCreateRoom = { x: bx, y: by, w: bw, h: bh };
            ctx.fillStyle = 'rgba(60,120,200,0.7)'; this.rr(ctx, bx, by, bw, bh, 10);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5; this.rr(ctx, bx, by, bw, bh, 10, true);
            if(this._pressed==='create'){ctx.fillStyle='rgba(0,0,0,0.2)';this.rr(ctx,bx,by,bw,bh,10);}
            ctx.fillStyle = '#fff'; ctx.font = 'bold 28px sans-serif';
            ctx.fillText('创建房间', bx + bw / 2, by + bh / 2 + 10);
        } else {
            const codeY = hostY + 60;
            ctx.fillStyle = 'rgba(40,30,0,0.5)'; this.rr(ctx, hostX + 60, codeY, hostW - 120, 60, 10);
            ctx.fillStyle = '#ffd700'; ctx.font = 'bold 48px monospace';
            ctx.fillText(this.roomCode.split('').join(' '), hostX + hostW / 2, codeY + 42);
            const cpx = hostX + hostW - 110, cpy = hostY + 135, cpw = 80, cph = 30;
            this.btnCopy = { x: cpx, y: cpy, w: cpw, h: cph };
            ctx.fillStyle = 'rgba(255,255,255,0.2)'; this.rr(ctx, cpx, cpy, cpw, cph, 6);
            if(this._pressed==='copy'){ctx.fillStyle='rgba(0,0,0,0.2)';this.rr(ctx,cpx,cpy,cpw,cph,6);}
            ctx.fillStyle = '#fff'; ctx.font = '16px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('复制', cpx + cpw / 2, cpy + 21);
            ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '18px sans-serif';
            ctx.fillText('房间已创建，等待好友加入...', guestX + guestW / 2, guestY + 80);
        }

        if (!this.isHost && !this.isJoining) {
            const ix = guestX + hostW / 2 - 180, iy = guestY + 48, iw = 360, ih = 60;
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; this.rr(ctx, ix, iy, iw, ih, 8);
            ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5; this.rr(ctx, ix, iy, iw, ih, 8, true);
            const disp = this.inputCode + '_'.repeat(4 - this.inputCode.length);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 40px monospace'; ctx.textAlign = 'center';
            ctx.fillText(disp.split('').join(' '), ix + iw / 2, iy + 42);

            const jx = guestX + hostW / 2 - 190, jy = iy + ih + 12, jw = 380, jh = 50;
            this.btnJoin = { x: jx, y: jy, w: jw, h: jh };
            const alpha = this.inputCode.length === 4 ? '0.7' : '0.25';
            ctx.fillStyle = `rgba(60,180,120,${alpha})`; this.rr(ctx, jx, jy, jw, jh, 8);
            if (this.inputCode.length === 4) { ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5; this.rr(ctx, jx, jy, jw, jh, 8, true); }
            if(this._pressed==='join'){ctx.fillStyle='rgba(0,0,0,0.2)';this.rr(ctx,jx,jy,jw,jh,8);}
            ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('加入房间', jx + jw / 2, jy + jh / 2 + 8);
        } else if (this.isJoining) {
            ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '18px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('正在加入房间...', guestX + guestW / 2, guestY + 80);
        }
    }

    renderGlassBox(ctx, x, y, w, h, r) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; this.rr(ctx, x, y, w, h, r);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1.5; this.rr(ctx, x, y, w, h, r, true);
    }

    rr(ctx, x, y, w, h, r, s = false) {
        ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
        if (s) ctx.stroke(); else ctx.fill();
    }

    renderLoading(ctx) {
        const t = Date.now(); ctx.fillStyle = '#0a0a15'; ctx.fillRect(0, 0, this.w, this.h);
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + t / 2000; ctx.fillStyle = `rgba(224,192,112,${0.3 + 0.3 * Math.sin(t / 300 + i)})`; ctx.beginPath(); ctx.arc(960 + Math.cos(a) * 60, 540 + Math.sin(a) * 60, 4, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#e0c070'; ctx.font = '28px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('加载中' + '.'.repeat(Math.floor(t / 400) % 4), 960, 620);
    }

    destroy() { const c = this.g.canvas; if (this._cl) c.removeEventListener('click', this._cl); if (this._kd) window.removeEventListener('keydown', this._kd); if (this._md) c.removeEventListener('mousedown', this._md); if (this._mu) c.removeEventListener('mouseup', this._mu); if(this._ts) c.removeEventListener('touchstart', this._ts); if(this._te){ c.removeEventListener('touchend', this._te); c.removeEventListener('touchcancel', this._te); } }
}

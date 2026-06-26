/**
 * ============================================
 * 游戏主循环 — 游戏引擎核心
 * ============================================
 * 职责：
 *  - Canvas 创建和响应式缩放
 *  - requestAnimationFrame 主循环
 *  - 场景注册和切换
 */

export class Game {
    constructor(config) {
        this.config = config;
        this.designW = config.设计宽度;   // 1920
        this.designH = config.设计高度;   // 1080
        this.canvas = null;
        this.ctx = null;
        this.scenes = {};            // 已注册场景 { 名称: 类 }
        this.currentScene = null;
        this.currentSceneName = '';
        this.running = false;
        this.lastTime = 0;
        this._lastNow = 0;
        this._lastDraw = 0;
        this.deltaTime = 0;
        // BGM 系统
        this.bgm = null;
        this.bgmTracks = ['游戏资源/音频/背景音乐/骑士对决_慷慨激昂（默认）.mp3','游戏资源/音频/背景音乐/骑士对决_低调振奋.mp3','游戏资源/音频/背景音乐/骑士对决_悠扬唯美.mp3','游戏资源/音频/背景音乐/骑士对决_磅礴大气.mp3'];
        this.bgmIndex = Math.min(Math.max(parseInt(localStorage.getItem('bgmIndex')||'0'), 0), this.bgmTracks.length - 1);
        this._bgmVol = parseFloat(localStorage.getItem('bgmVol')||'0.8');
        this._voiceVol = parseFloat(localStorage.getItem('voiceVol')||'0.8');
        this._sfxVol = parseFloat(localStorage.getItem('sfxVol')||'0.8');
    }

    get bgmVol() { return this._bgmVol; }
    set bgmVol(v) { this._bgmVol = v; localStorage.setItem('bgmVol', v); }
    get voiceVol() { return this._voiceVol; }
    set voiceVol(v) { this._voiceVol = v; localStorage.setItem('voiceVol', v); }
    get sfxVol() { return this._sfxVol; }
    set sfxVol(v) { this._sfxVol = v; localStorage.setItem('sfxVol', v); }

    /** 初始化 Canvas */
    init() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        // BGM 初始化
        this._initBgm();
    }

    /** BGM 系统 */
    _initBgm() {
        this.bgm = new Audio(this.bgmTracks[this.bgmIndex]);
        this.bgm.loop = true;
        this.bgm.volume = this.bgmVol * 0.7;
        this.bgm.play().catch(() => {}); // 浏览器可能拦截，首次交互后重试
        // 首次点击后确保播放
        const tryPlay = () => {
            if (this.bgm.paused) this.bgm.play().catch(() => {});
            this.canvas.removeEventListener('click', tryPlay);
        };
        this.canvas.addEventListener('click', tryPlay);
    }

    setBgmVol(v) { this._bgmVol = v; localStorage.setItem('bgmVol', v); if (this.bgm) this.bgm.volume = v * 0.7; }

    switchBgm(idx) {
        if (idx >= 0 && idx < this.bgmTracks.length && this.bgm) {
            this.bgmIndex = idx;
            localStorage.setItem('bgmIndex', idx);
            const wasPlaying = !this.bgm.paused;
            this.bgm.src = this.bgmTracks[idx];
            this.bgm.load();
            this.bgm.volume = this.bgmVol * 0.7;
            if (wasPlaying) this.bgm.play().catch(() => {});
        }
    }

    /** UI 点击音效 — 清脆玻璃叮（版本1） */
    playClick() {
        const ctx = this._audioCtx || (this._audioCtx = new (window.AudioContext || window.webkitAudioContext)());
        const t = ctx.currentTime;
        const v = Math.min(1, this.sfxVol * 1.4);
        const harmonics = [
            {f:2400, start:0.22},{f:3600, start:0.16},{f:4800, start:0.10},{f:6000, start:0.06},{f:7200, start:0.03},
        ];
        for (const h of harmonics) {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'sine'; o.frequency.setValueAtTime(h.f, t);
            g.gain.setValueAtTime(v * h.start, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
            o.connect(g); g.connect(ctx.destination);
            o.start(t); o.stop(t + 0.5);
        }
    }

    /** 版本2 — 双音叠加，饱满厚实，适合确认操作 */
    playClick2() {
        const ctx = this._audioCtx || (this._audioCtx = new (window.AudioContext || window.webkitAudioContext)());
        const t = ctx.currentTime;
        const v = Math.min(1, this.sfxVol * 1.4);
        // 底层：600→300Hz 提供"嘭"的实体感
        const o1 = ctx.createOscillator(), g1 = ctx.createGain();
        o1.type = 'sine';
        o1.frequency.setValueAtTime(600, t);
        o1.frequency.exponentialRampToValueAtTime(300, t + 0.12);
        g1.gain.setValueAtTime(v * 0.35, t);
        g1.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        o1.connect(g1); g1.connect(ctx.destination);
        o1.start(t); o1.stop(t + 0.3);
        // 顶层：2800→1600Hz 提供"叮"的清脆
        const o2 = ctx.createOscillator(), g2 = ctx.createGain();
        o2.type = 'sine';
        o2.frequency.setValueAtTime(2800, t);
        o2.frequency.exponentialRampToValueAtTime(1600, t + 0.08);
        g2.gain.setValueAtTime(v * 0.2, t);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        o2.connect(g2); g2.connect(ctx.destination);
        o2.start(t); o2.stop(t + 0.25);
    }

    /** 响应式缩放 */
    resize() {
        const parent = this.canvas.parentElement;
        const pw = parent.clientWidth;
        const ph = parent.clientHeight;
        const scale = Math.min(pw / this.designW, ph / this.designH);
        const displayW = Math.floor(this.designW * scale);
        const displayH = Math.floor(this.designH * scale);

        this.canvas.width = this.designW;
        this.canvas.height = this.designH;
        this.canvas.style.width = displayW + 'px';
        this.canvas.style.height = displayH + 'px';
        this.scale = scale;

        // 关闭平滑，保持像素风格
        this.ctx.imageSmoothingEnabled = false;
    }

    /** 注册场景 */
    registerScene(name, SceneClass) {
        this.scenes[name] = SceneClass;
    }

    /** 切换场景 */
    async switchScene(name, data = {}) {
        if (!this.scenes[name]) {
            console.error(`场景 "${name}" 未注册`);
            return;
        }
        if (this.currentScene && this.currentScene.destroy) {
            this.currentScene.destroy();
        }
        const SceneClass = this.scenes[name];
        this.currentScene = new SceneClass(this, data);
        this.currentSceneName = name;
        if (this.currentScene.init) {
            await this.currentScene.init();
        }
    }

    /** 启动游戏 */
    async start(firstScene) {
        this.init();
        await this.switchScene(firstScene);
        this.running = true;
        this._lastNow = performance.now();
        this._lastDraw = 0;
        this._loop(0);
    }

    /** 主循环 */
    _loop(timestamp) {
        if (!this.running) return;
        // 60fps稳定上限（消除120Hz屏冗余渲染）
        const elapsed = timestamp - this._lastDraw;
        if (elapsed < 14) {
            requestAnimationFrame(t => this._loop(t));
            return;
        }
        this._lastDraw += (elapsed >= 28 ? elapsed : 16.67);
        const now = performance.now();
        this.deltaTime = Math.min((now - this._lastNow) / 1000, 0.1);
        this._lastNow = now;

        // 清屏
        this.ctx.clearRect(0, 0, this.designW, this.designH);

        // 更新和渲染当前场景
        if (this.currentScene) {
            try {
                if (this.currentScene.update) {
                    this.currentScene.update(this.deltaTime);
                }
                if (this.currentScene.render) {
                    this.currentScene.render(this.ctx, this.deltaTime);
                }
            } catch(e) {
                console.error('游戏循环错误:', e);
                this.ctx.fillStyle = '#000';
                this.ctx.fillRect(0, 0, this.designW, this.designH);
                this.ctx.fillStyle = '#f00';
                this.ctx.font = '16px monospace';
                this.ctx.fillText('Error: ' + e.message, 20, 30);
            }
        }

        requestAnimationFrame(t => this._loop(t));
    }
}

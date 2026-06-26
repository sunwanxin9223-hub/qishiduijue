/**
 * 战斗场景 — 移动系统 + 血条 + 按需加载帧
 * 重构：不再一次性加载972张图片，改为按需加载+缓存
 */
import { SpriteManager } from '../核心/雪碧图管理器.js';

export class BattleScene {
    constructor(g, d = {}) {
        this.g = g; this.w = 1920; this.h = 1080;
        this.im = {}; this.ok = false;
        this.useSprite = false; // true=雪碧图, false=逐帧（技能做完后再切）
        this.gameMode = d.gameMode || '一局定胜负';
        this.mode = d.mode || '本地对战';
        this.round = d.round || 1;
        this.wins = d.wins || [0, 0];
        this.roundWinner = null;
        this.finalWinner = null;
        this.victoryAnim = null; // 胜利动画状态 {type, timer, scale, image, frame, showText}
        this.victoryFrameDir = '游戏资源/序列帧/场景动画/最终胜利结算_色键输出/透明帧';
        this.melee = null;   // 近战动画状态
        this._prevPos = ['',''];
        this.fps = 30; this.total = 121;
        this._gameTime = 0;
        this._lastGoodFrame = {};
        this.loadingProgress = 0;
        this._lastProgressTime = Date.now();
        this._lastRealPct = 0;
        this.speedMult = 1/3; // 默认1/3速防卡
        this._speedTutorial = false; // 首次弹窗
        this._beamKey = '';
        this._beamCvs = document.createElement('canvas');
        this._beamCvs.width = 1920; this._beamCvs.height = 1080; // 尺寸固定
        this.pingpongSeq = [];
        for(let i=1;i<=120;i++)this.pingpongSeq.push(i);
        for(let i=121;i>=2;i--)this.pingpongSeq.push(i);
        this.ppLen=240;
        this.paused = false; this.showSettings = false;
        this.sfxVol = 0.8; this.bgmVol = 0.8; this.sliderDrag = null;
        this.moving = null;
        this.turn = 0;
        this.dmgPopups = [];
        this._pressed = null;
        this._pressFlash = null;   // 技能按下反馈 (持续显示)
        this._pressTimer = 0;      // 反馈倒计时
        this.moved = false;      // 当前回合是否已移动
        this.skillUsed = false;  // 当前回合是否已使用技能
        this.winner = null;      // 胜利者
        this.hints = [];         // 浮动提示 [{text, timer, color}]

        // ═══ 配音系统 ═══
        this._voiceAudio = null;
        this._voiceNextTurn = 2; // 下一次可放待机台词的回合计次（从2开始，即第2回合可放）
        this._voiceTurnCount = 0;
        this._voicePlayedThisTurn = false;

        // ═══ 技能系统 ═══
        this.skills1 = d.p1 || []; // 玩家1选择的3个技能
        this.skills2 = d.p2 || []; // 玩家2选择的3个技能
        this.cd = [[0,0,0,0],[0,0,0,0]]; // 冷却倒计时 [玩家][0=技1/1=技2/2=技3/3=回血]
        this.skillIcons = {}; // 技能图标图片缓存
        // 技能图标位置（JSON中心坐标转屏幕中心点）
        this.skPos = [
            [ // 玩家1（左侧）
                {x:66.2, y:123.9},   // 技能1
                {x:66.2, y:187.4},   // 技能2
                {x:66.2, y:252.6},   // 技能3
                {x:66.2, y:319.6},   // 回血
            ],
            [ // 玩家2（右侧）
                {x:1864.4, y:123.9}, // 技能1
                {x:1864.4, y:189.2}, // 技能2
                {x:1864.4, y:254.4}, // 技能3
                {x:1864.4, y:321.4}, // 回血
            ],
        ];
        // 技能交互框（JSON交互框topLeft+size，用于点击检测）
        this.skHit = [
            [ // 玩家1（左侧）
                {x:38.0,  y:96.3,  w:56, h:56},  // 技能1
                {x:38.2,  y:159.4, w:56, h:56},  // 技能2
                {x:38.2,  y:224.6, w:56, h:56},  // 技能3
                {x:38.2,  y:291.6, w:56, h:56},  // 回血
            ],
            [ // 玩家2（右侧）
                {x:1836.4,y:95.9,  w:56, h:56},  // 技能1
                {x:1836.4,y:161.2, w:56, h:56},  // 技能2
                {x:1836.4,y:226.4, w:56, h:56},  // 技能3
                {x:1836.4,y:293.4, w:56, h:56},  // 回血
            ],
        ];
        this.skSize = 90.52; // 技能图标尺寸
        // 每个技能的实际显示尺寸（按桌面文件）
        this.skSizes = {
            '回血':[90.52,90.52], '淬毒刃':[84.17,84.17], '神速':[77.82,77.82],
            '强化':[84.17,84.17], '激光':[78.23,78.23], '无敌之盾':[92.16,92.16],
            '巨剑术':[92.16,92.16], '隐身面具':[62.87,62.87], '烈焰斩':[63.28,63.28],
            '震雷枪':[63.49,63.49], '冰冻':[73.73,73.73],
        };

        // ═══ 按需帧加载系统 ═══
        this.frameCache = new Map();      // key+num → Image
        this.frameLoading = new Set();     // 正在加载的帧
        this.cacheMax = 600;               // 最大缓存帧数（平衡流畅度与内存）
        this.sprite = new SpriteManager();  // 雪碧图管理器
        this.spritePaths = {
            bg:1, sz:1, fz:1,
            idle:1, walk:1, jump:1, drop:1, float:1, heal:1, death:1,
            buff:1, buffIdle:1, slash:1, speed:1, meleeSlash:1, meleeChop:1,
            poisonBlade:1, flameBlade:1, laser:1, thunder:1,
            buffAttack:1, giantSword:1, hitReact:1, shield:1,
        };
        this.animPaths = {
            bg:   '游戏资源/序列帧/场景动画/背景动画_色键输出/透明帧',
            sz:   '游戏资源/序列帧/场景动画/石柱_色键输出/透明帧',
            fz:   '游戏资源/序列帧/场景动画/风阵_色键输出/透明帧',
            idle: '游戏资源/序列帧/人物动作/待机动作/透明帧',
            walk: '游戏资源/序列帧/人物动作/移动_色键输出/透明帧',
            jump: '游戏资源/序列帧/人物动作/跳跃_色键输出/透明帧',
            drop: '游戏资源/序列帧/人物动作/下坠_色键输出/透明帧',
            float:'游戏资源/序列帧/人物动作/悬浮_色键输出/透明帧',
            heal: '游戏资源/序列帧/人物动作/治疗_色键输出/透明帧',
            death:'游戏资源/序列帧/人物动作/死亡动作_色键输出/透明帧',
            buff: '游戏资源/序列帧/人物动作/强化状态_色键输出/透明帧',
            buffIdle:'游戏资源/序列帧/人物动作/强化状态待机动作_色键输出/透明帧',
            slash:'游戏资源/序列帧/人物动作/挥砍前刺_色键输出/透明帧',
            buffIdle:'游戏资源/序列帧/人物动作/强化状态待机动作_色键输出/透明帧',
            speed:'游戏资源/序列帧/人物动作/神速2雷遁_色键输出1/透明帧',
            meleeSlash:'游戏资源/序列帧/人物动作/挥砍前刺_色键输出/透明帧',
            meleeChop:'游戏资源/序列帧/人物动作/竖劈_色键输出/透明帧',
            poisonBlade:'游戏资源/序列帧/特效/淬毒刃_色键输出/透明帧',
            flameBlade:'游戏资源/序列帧/特效/烈焰斩AE输出/透明帧',
            laser:'游戏资源/序列帧/特效/激光_色键输出/透明帧',
            thunder:'游戏资源/序列帧/特效/震雷枪1_色键输出/透明帧',
            buffAttack:'游戏资源/序列帧/人物动作/强化状态攻击动作_色键输出/透明帧',
            giantSword:'游戏资源/序列帧/人物动作/巨剑术1_色键输出/透明帧',
            hitReact:'游戏资源/序列帧/人物动作/受击_色键输出/透明帧',
            shield:'游戏资源/序列帧/人物动作/防御_色键输出/透明帧',
        };
        this.frameCounts = {
            bg:121, sz:121, fz:121, idle:121,
            walk:121, jump:121, drop:103, float:121,
            heal:121, death:121, buff:121, buffIdle:121, speed:121, slash:121,
            meleeSlash:121, meleeChop:121, buffAttack:121, giantSword:121, hitReact:121, shield:121,
            poisonBlade:121, flameBlade:121, laser:121, thunder:121,
        };
        this.bgLoadQueue = [];   // 后台加载队列
        this.bgLoadIdx = 0;      // 后台加载进度
        this.tilePattern = null; // 缓存地面平铺图案
        this.moveLoading = false; // 移动动画正在加载
    }

    /** 加载单帧到缓存 */
    _loadFrame(key, num) {
        const ck = key + num;
        if (this.frameCache.has(ck) || this.frameLoading.has(ck)) return;
        const dir = this.animPaths[key];
        const count = this.frameCounts[key] || 121;
        if (!dir || num < 1 || num > count) return;
        // 人物动作抽帧：只加载奇数帧
        if(key!=='bg'&&key!=='sz'&&key!=='fz' && num%2===0) return;

        this.frameLoading.add(ck);
        // setTimeout 将 Image 创建推迟到下一个宏任务，避免 file:// 协议的同步 IO 阻塞
        setTimeout(() => {
            const pad = n => String(n).padStart(5, '0');
            const img = new Image();
            img.onload = () => {
                this.frameCache.set(ck, img);
                this.frameLoading.delete(ck);
                if (this.frameCache.size > this.cacheMax) {
                    let deleted=0;
                    for(const [k] of this.frameCache){
                        if(k[0]==='b'||k[0]==='s'||k[0]==='f'||k[0]==='i'||k.startsWith('death')||k.startsWith('dsc_')) continue;
                        this.frameCache.delete(k); deleted++;
                        if(deleted>=50) break;
                    }
                    if(deleted<50){
                        const it2=this.frameCache.keys();
                        for(let i=0;i<50-deleted;i++){const k=it2.next().value;if(k)this.frameCache.delete(k);}
                    }
                }
            };
            img.onerror = () => { this.frameLoading.delete(ck); };
            img.src = `${dir}/frame_${pad(num)}.png`;
        }, 0);
    }

    /** 获取帧。雪碧图返回缓存的坐标描述符（零拷贝），逐帧返回 Image */
    _getFrame(key, num) {
        if(this.useSprite && this.sprite.has(key)){
            const ck = 'dsc_'+key+num;
            let desc = this.frameCache.get(ck);
            if (desc) return desc;
            const sp = this.sprite.getFrame(key, num);
            if(sp && sp.img && sp.img.naturalWidth>0){
                const fullRes = {bg:true, sz:true, fz:true, idle:true}[key];
                const scale = fullRes ? 1 : 2;
                desc = {__sp:true, img:sp.img, sx:sp.sx, sy:sp.sy, sw:sp.sw, sh:sp.sh, scale};
                this.frameCache.set(ck, desc);
                return desc;
            }
        }
        const isChar = key!=='bg'&&key!=='sz'&&key!=='fz';
        // 人物动作抽帧：只显示奇数帧
        if(isChar) num = ((num-1)>>1)*2+1;
        const ck = key + num;
        let img = this.frameCache.get(ck);
        if (img && img.naturalWidth > 0) return img;
        this._loadFrame(key, num);
        const step = isChar?2:1;
        for (let i = 1; i <= 8; i++) {
            let f = this.frameCache.get(key + (num - i*step));
            if (f && f.naturalWidth > 0) return f;
            f = this.frameCache.get(key + (num + i*step));
            if (f && f.naturalWidth > 0) return f;
        }
        return this.frameCache.get(key + 1) || null;
    }

    /** 绘制帧（兼容雪碧图坐标对象和 Image/Canvas） */
    _draw(ctx, frame, dx, dy, dw, dh) {
        if (frame && frame.__sp && frame.img) {
            ctx.drawImage(frame.img, frame.sx, frame.sy, frame.sw, frame.sh, dx, dy, dw, dh);
        } else if (frame) {
            ctx.drawImage(frame, dx, dy, dw, dh);
        }
    }
    /** 帧有效检查 */
    _ok(frame) { return frame && (frame.naturalWidth>0 || frame.width>0 || (frame.__sp && frame.img && frame.img.naturalWidth>0)); }
    /** 帧宽度 */
    _fw(frame) { return frame.naturalWidth || frame.width || (frame.__sp ? frame.sw * (frame.scale||1) : 0); }
    /** 帧高度 */
    _fh(frame) { return frame.naturalHeight || frame.height || (frame.__sp ? frame.sh * (frame.scale||1) : 0); }
    /** 后台渐进加载场景动画帧 */
    _bgLoad() {
        if (this.bgLoadIdx >= this.total * 4) return; // 4种动画全加载完
        const keys = ['bg', 'sz', 'fz', 'idle'];
        let loaded = 0;
        const maxPerTick = 8;
        while (loaded < maxPerTick && this.bgLoadIdx < this.total * 4) {
            const keyIdx = this.bgLoadIdx % 4;
            const frameIdx = Math.floor(this.bgLoadIdx / 4) + 1;
            const key = keys[keyIdx];
            const ck = key + frameIdx;
            if (!this.frameCache.has(ck) && !this.frameLoading.has(ck)) {
                this._loadFrame(key, frameIdx);
                loaded++;
            }
            this.bgLoadIdx++;
        }
    }

    async _preloadMove(type) {
        // 雪碧图已就绪 → 无需任何操作（init 已加载第1帧兜底）
        if(this.useSprite && this.sprite.has(type)) return;
        // 逐帧模式：预加载全部帧
        const total = this.frameCounts[type] || 121;
        const dir = this.animPaths[type];
        const pad = n => String(n).padStart(5, '0');
        const loadOne = n => new Promise(r => {
            const img = new Image();
            img.onload = () => {
                this.frameCache.set(type + n, img);
                if (this.frameCache.size > this.cacheMax) {
                    let del2=0;
                    for(const [k] of this.frameCache){
                        if(k[0]==='b'||k[0]==='s'||k[0]==='f'||k[0]==='i'||k.startsWith('death')||k.startsWith('dsc_')) continue;
                        this.frameCache.delete(k); del2++;
                        if(del2>=30) break;
                    }
                    if(del2<30){
                        const it2=this.frameCache.keys();
                        for(let i=0;i<30-del2;i++){const k=it2.next().value;if(k)this.frameCache.delete(k);}
                    }
                }
                r();
            };
            img.onerror = () => r();
            img.src = `${dir}/frame_${pad(n)}.png`;
        });
        // 人物动作抽帧：只加载奇数帧，前30帧同步等，其余后台
        const isChar = type!=='bg'&&type!=='sz'&&type!=='fz';
        const step = isChar?2:1;
        const syncCount = isChar ? Math.min(45, Math.ceil(total/2)) : total;
        const tasks = [];
        for(let i=1;i<=total&&tasks.length<syncCount;i+=step){
            if(!this.frameCache.has(type+i))tasks.push(loadOne(i));
        }
        if(tasks.length>0){this.moveLoading=true;await Promise.all(tasks);this.moveLoading=false;}
        // 后台加载剩余帧
        for(let i=1;i<=total;i+=step){
            if(this.frameCache.has(type+i)) continue;
            const img=new Image();
            img.onload=()=>this.frameCache.set(type+i,img);
            img.src=`${dir}/frame_${pad(i)}.png`;
        }
    }
    /** 全量预加载动画的所有帧（init 期使用，并行分批避免卡顿） */
    async _preloadAllFrames(type, total) {
        const dir = this.animPaths[type];
        const pad = n => String(n).padStart(5, '0');
        const batchSize = 30;
        for (let start = 1; start <= total; start += batchSize) {
            const batch = [];
            for (let n = start; n < start + batchSize && n <= total; n++) {
                const ck = type + n;
                if (this.frameCache.has(ck)) continue;
                batch.push(new Promise(r => {
                    const img = new Image();
                    img.onload = () => { this.frameCache.set(ck, img); r(); };
                    img.onerror = () => r();
                    img.src = `${dir}/frame_${pad(n)}.png`;
                }));
            }
            if (batch.length > 0) await Promise.all(batch);
        }
    }

    async init() {
        // 只加载4张静态图片 + 每种动画的第1帧
        const L = (k, u) => new Promise(r => {
            const i = new Image();
            i.onload = () => { this.im[k] = i; r(); };
            i.onerror = () => r();
            i.src = u;
        });
        const LF = (key, num) => new Promise(r => {
            const dir = this.animPaths[key];
            const pad = n => String(n).padStart(5, '0');
            const img = new Image();
            img.onload = () => { this.frameCache.set(key + num, img); r(); };
            img.onerror = () => r();
            img.src = `${dir}/frame_${pad(num)}.png`;
        });

        this.loadingProgress = 5;
        await Promise.all([
            L('地面', '游戏资源/图像/场景/地面.png'),
            L('平台', '游戏资源/图像/场景/平台_透明.png'),
            L('光圈', '游戏资源/图像/场景/光圈站位_透明.png'),
            L('暂停', '游戏资源/图像/UI/暂停1_透明.png'),
            LF('bg', 1), LF('sz', 1), LF('fz', 1), LF('idle', 1),
            LF('heal', 1), LF('death', 1), LF('buff', 1), LF('buffIdle', 1), LF('speed', 1), LF('slash', 1),
            LF('meleeSlash', 1), LF('meleeChop', 1), LF('buffAttack', 1), LF('giantSword', 1), LF('hitReact', 1), LF('shield', 1),
        ]);
        this.loadingProgress = 15;
        // 加载技能图标
        const allSkills = [...new Set([...this.skills1, ...this.skills2, '回血'])];
        const iconTasks = allSkills.map(s => L('sk_'+s, `游戏资源/图像/UI/${s}1_透明.png`));
        await Promise.all(iconTasks);
        this.loadingProgress = 25;
        // ═══ 雪碧图按需加载 ═══
        this.useSprite = true;
        const baseKeys = ['walk','jump','drop','float','death'];
        // bg/sz/fz/idle 不用雪碧图 — GPU 纹理采样开销远超独立 PNG
        const skillAnimMap = {
            '回血':['heal'], '强化':['buff','buffIdle'], '无敌之盾':['shield'],
            '神速':['speed'], '隐身面具':[], '冰冻':['slash','shield'],
            '淬毒刃':['poisonBlade','meleeSlash','hitReact','shield'],
            '烈焰斩':['flameBlade','meleeSlash','hitReact','shield'],
            '激光':['laser','meleeSlash','hitReact','shield'],
            '震雷枪':['thunder','meleeSlash','hitReact','shield'],
            '巨剑术':['giantSword','hitReact','shield'],
            '普攻':['meleeSlash','meleeChop','hitReact','shield','buffAttack'],
        };
        const needed = new Set(baseKeys);
        for (const s of [...this.skills1, ...this.skills2, '回血', '普攻']) {
            const keys = skillAnimMap[s];
            if (keys) keys.forEach(k => needed.add(k));
        }
        // 雪碧图全部并行加载（总时间 = 最慢的那一个，不是累加）
        await Promise.all([...needed].map(k =>
            this.sprite.load(k, `游戏资源/雪碧图/${k}.json`).catch(() => {})
        ));
        this.loadingProgress = 55;
        // 场景帧 + 结算帧 + 音效 — 全部并行，各有超时
        const tasks = [];
        const padN = n => String(n).padStart(5,'0');
        // 场景动画前10帧
        for (const k of ['bg','sz','fz','idle']) {
            const dir = this.animPaths[k];
            for (let n = 2; n <= 30; n++) {
                const ck = k + n;
                if (!this.frameCache.has(ck)) {
                    tasks.push(new Promise(r => {
                        let done = false;
                        const img = new Image();
                        img.onload = () => { if(!done){done=true;this.frameCache.set(ck,img);r();} };
                        img.onerror = () => { if(!done){done=true;r();} };
                        img.src = `${dir}/frame_${padN(n)}.png`;
                        setTimeout(() => { if(!done){done=true;r();} }, 15000);
                    }));
                }
            }
        }
        // 结算动画前10帧
        for (let n = 1; n <= 60; n++) {
            const ck = 'vicFinal'+n;
            tasks.push(new Promise(r => {
                let done = false;
                const img = new Image();
                img.onload = () => { if(!done){done=true;this.frameCache.set(ck,img);r();} };
                img.onerror = () => { if(!done){done=true;r();} };
                img.src = `${this.victoryFrameDir}/frame_${padN(n)}.png`;
                setTimeout(() => { if(!done){done=true;r();} }, 30000);
            }));
        }
        // 音效
        const baseSfx = ['walk','jump','drop','float','death','hitReact','shield','victory'];
        const sfxMap = {回血:['heal'],强化:['buff','buffAttack'],无敌之盾:['shield'],神速:['speed'],冰冻:['slash'],淬毒刃:['poisonBlade','meleeSlash'],烈焰斩:['flameBlade','meleeSlash'],激光:['laser','meleeSlash'],震雷枪:['thunder','meleeSlash','meleeChop'],巨剑术:['giantSword'],普攻:['meleeSlash','meleeChop']};
        const neededSfx = new Set(baseSfx);
        for (const s of [...this.skills1, ...this.skills2, '回血', '普攻']) {
            const sfx = sfxMap[s]; if (sfx) sfx.forEach(x => neededSfx.add(x));
        }
        const sfxDir = '游戏资源/音频/技能音效';
        const voiceDir = '游戏资源/音频/人物配音/放技能';
        for (const fn of neededSfx) {
            tasks.push(new Promise(r => {
                let done = false;
                const a = new Audio(`${sfxDir}/${fn}.mp3`);
                a.preload = 'auto';
                a.oncanplaythrough = () => { if(!done){done=true;r();} };
                a.onerror = () => { if(!done){done=true;r();} };
                a.load();
                setTimeout(() => { if(!done){done=true;r();} }, 30000);
            }));
        }
        for (const fn of this.skills1.concat(this.skills2)) {
            tasks.push(new Promise(r => {
                let done = false;
                const a = new Audio(`${voiceDir}/${fn}.mp3`);
                a.preload = 'auto';
                a.oncanplaythrough = () => { if(!done){done=true;r();} };
                a.onerror = () => { if(!done){done=true;r();} };
                a.load();
                setTimeout(() => { if(!done){done=true;r();} }, 30000);
            }));
        }
        // 2分钟硬上限，超时强行进入游戏
        await Promise.race([Promise.all(tasks), new Promise(r => setTimeout(r, 120000))]);
        this.loadingProgress = 80;
        this.ok = true;
        // 首次进入提示
        if (!localStorage.getItem('qs_speed_tip')) {
            this._speedTutorial = true;
        }
        // 后台异步加载
        this._deferredLoad();

        // 初始化位置数据
        const V = (cx, cy) => ({ cx, cy, sx: cx+960, sy: cy+540 });
        this.pos = {
            V1: V(-845.04, 359.75), V2: V(-545.69, 359.75), V3: V(-147.11, 359.75),
            V4: V(259, 359.75),      V5: V(583.32, -384.37), V6: V(259, -358.71),
            V7: V(-147.11, -158.57), V8: V(-545.69, 45),     V9: V(837.19, 359.75),
        };
        this.zones = [
            { id:'V1', x:-901.98+960, y:390.49+540, w:107.7, h:90.78 },
            { id:'V2', x:-603.23+960, y:387.07+540, w:107.7, h:94.2 },
            { id:'V3', x:-204.72+960, y:389.01+540, w:108.65, h:93.75 },
            { id:'V4', x:203.47+960, y:383.6+540, w:107.7, h:94.2 },
            { id:'V5', x:530.67+960, y:-362.55+540, w:100.16, h:96.11 },
            { id:'V6', x:206.84+960, y:-335+540, w:101.04, h:93.55 },
            { id:'V7', x:-204.24+960, y:-136.58+540, w:107.7, h:97.62 },
            { id:'V8', x:-603.2+960, y:69+540, w:107.7, h:94.2 },
            { id:'V9', x:723.56+960, y:106.81+540, w:217.14, h:416.48 },
        ];

        this.graph = {};
        const add = (a, b, t) => { if(!this.graph[a])this.graph[a]={}; this.graph[a][b]=t; };
        add('V1','V2','walk'); add('V2','V1','walk'); add('V2','V3','walk'); add('V3','V2','walk');
        add('V3','V4','walk'); add('V4','V3','walk');
        add('V8','V7','jump'); add('V7','V8','jump'); add('V7','V6','jump'); add('V6','V7','jump');
        add('V6','V5','jump'); add('V5','V6','jump'); add('V1','V8','jump'); add('V8','V1','jump');
        add('V8','V2','drop'); add('V7','V3','drop'); add('V6','V4','drop');
        add('V4','V9','walk'); add('V9','V5','float');

        this.charR = { w:496.8, h:662.4 };
        this._voiceList = {
            '血量健康时':{
                '离敌人远时（对自己说）':['今天的风……比昨天更冷一些.mp3','又到了这个时辰……阳光正好.mp3','我的血条还很满，你的信心呢.mp3','这身铠甲，穿了好多年了.mp3'],
                '离敌人近时（对敌人说）':['你打出的伤害，还不如城堡的穿堂风.mp3','别紧张，我会让你死得很体面.mp3','我的剑说，你只有两个回合.mp3','浮空城堡的风，适合埋葬败者.mp3'],
            },
            '血量中等时':{
                '离敌人远时（对自己说）':['冷静……冷静比力量更管用.mp3','呼吸要稳，手不能抖.mp3','我是不是……该换一种打法了.mp3'],
                '离敌人近时（对敌人说）':['伤到我了，那么——该我了.mp3','你的每一击，都在唤醒我的记忆.mp3','你确实有两下子，可惜也就两下.mp3'],
            },
            '残血时':{
                '离敌人远时（对自己说）':['别倒下……至少不是现在.mp3','视线有点模糊……但手还记得.mp3','这一战……我要活着走下去.mp3'],
                '离敌人近时（对敌人说）':['你最好一剑了结我——否则我会反杀.mp3','你的招数我已经看透了——现在到我了.mp3','来吧，看看是你先倒下，还是我先倒下.mp3'],
            },
        };
        this.players = [
            { pos:'V2', flip:true,  label:this.mode==='好友对战'?'房主':'玩家1', hp:2100, maxHp:2100, dispHp:2100, dead:false, buff:false, buffTurns:0, _buffedTurn:false, speedMode:false, stealthed:0, frozen:false, frozenTurns:0, shielded:false, shieldCdUI:0, poisoned:false, poisonTurns:0, weakened:false, weakenTurns:0, animOverride:null, animFrame:1, animTimer:0 },
            { pos:'V4', flip:false, label:this.mode==='好友对战'?'好友':'玩家2', hp:2100, maxHp:2100, dispHp:2100, dead:false, buff:false, buffTurns:0, _buffedTurn:false, speedMode:false, stealthed:0, frozen:false, frozenTurns:0, shielded:false, shieldCdUI:0, poisoned:false, poisonTurns:0, weakened:false, weakenTurns:0, animOverride:null, animFrame:1, animTimer:0 },
        ];

        this.pauseBtn = { x:-924.6+960, y:-515.76+540, w:63.31, h:63.31 };
        this.speedBtn = { x:1850, y:10, w:60, h:36 }; // 右上角播放速度
        this._prevPos = [this.players[0].pos, this.players[1].pos];
        this.setupInput();
        this.setupScene();
    }

    setupScene(){
        const A=(tx,ty,w,h)=>({x:tx+960,y:ty+540,w,h});
        this.scene=[
            {t:'pp',k:'bg',...A(-960,-540,1920,1080),o:15},
            {t:'img',k:'地面',...A(-953.62,460.75,1910,70.26),o:14,til:true,tbW:41,tbH:41},
            {t:'lp',k:'fz',...A(689.41,-194.32,288.86,779.26),o:13},
            {t:'lp',k:'sz',...A(150.76,-347.97,845.93,663.26),o:12},
            {t:'img',k:'平台',...A(-336.96,-187.36,386.25,280.99),o:11},
            {t:'img',k:'平台',...A(80.09,-387.08,351.03,280.99),o:10},
            {t:'img',k:'平台',...A(-750.78,15.56,386.25,280.99),o:9},
            {t:'img',k:'光圈',...A(167.79,270.27,179.07,238.76),o:8},
            {t:'img',k:'光圈',...A(-239.93,272.03,179.07,238.76),o:7},
            {t:'img',k:'光圈',...A(-638.91,272.03,179.07,238.76),o:6},
            {t:'img',k:'光圈',...A(491.22,-474.93,179.07,238.76),o:5},
            {t:'img',k:'光圈',...A(167.83,-452.08,179.07,238.76),o:4},
            {t:'img',k:'光圈',...A(-239.92,-248.21,179.07,238.76),o:2},
            {t:'img',k:'光圈',...A(-638.89,-44.33,179.07,238.76),o:1},
            {t:'img',k:'光圈',...A(-937.67,272.03,179.07,238.76),o:0},
            {t:'img',k:'暂停',...A(-938.2,-529.36,90.52,90.52),o:3}
        ].sort((a,b)=>b.o-a.o);
    }

    setupInput(){
        const cv=this.g.canvas;
        this._cl=(e)=>{
            const{x,y}=this.p(e);
            if(this.sliderDrag){this.sliderDrag=null;return;}
            // 首次提示弹窗：任意点击关闭
            if(this._speedTutorial){
                this._speedTutorial = false;
                localStorage.setItem('qs_speed_tip', '1');
                // 如果点的是速度按钮，顺便切换速度
                if(x>=this.speedBtn.x&&x<=this.speedBtn.x+this.speedBtn.w&&y>=this.speedBtn.y&&y<=this.speedBtn.y+this.speedBtn.h){
                    const speeds = [1/3, 2/3, 1];
                    const idx = speeds.indexOf(this.speedMult);
                    this.speedMult = speeds[(idx+1)%4];
                }
                return;
            }
            // 大部分点击用版本1，移动/准备好用版本2
            if(this.paused){
                if(this.victoryAnim){this.g.playClick();this.victoryClick(x,y);return;}
                if(!this.showSettings){this.g.playClick();this.pauseClick(x,y);}
                else {this.g.playClick();this.settingsClick(x,y);}
                return;
            }
            if(x>=this.pauseBtn.x&&x<=this.pauseBtn.x+this.pauseBtn.w&&y>=this.pauseBtn.y&&y<=this.pauseBtn.y+this.pauseBtn.h){
                this.g.playClick();this.paused=!0;this.showSettings=!1;return;
            }
            if(x>=this.speedBtn.x&&x<=this.speedBtn.x+this.speedBtn.w&&y>=this.speedBtn.y&&y<=this.speedBtn.y+this.speedBtn.h){
                const speeds = [1/3, 2/3, 1];
                const idx = speeds.indexOf(this.speedMult);
                this.speedMult = speeds[(idx+1)%4];
                return;
            }
            if(this.moving||this.moveLoading)return;
            const pi=this.turn;
            for(let si=0;si<4;si++){
                const h=this.skHit[pi][si];
                if(x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h){
                    this._pressFlash='sk'+pi+si; this._pressTimer=0.3;
                    this.useSkill(pi,si);return;
                }
            }
            const cp=this.players[pi];
            const reachable=this._getReachable();
            for(const z of this.zones){
                if(!reachable[z.id])continue;
                if(x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h){
                    this.g.playClick2();this.onClickZone(z.id);return;
                }
            }
        };
        this._mm=(e)=>{
            const{x,y}=this.p(e);
            if(this.sliderDrag){if(this.showSettings)this.updateSlider(x);return;}
            if(!this.paused&&!this.moving&&x>=this.pauseBtn.x&&x<=this.pauseBtn.x+this.pauseBtn.w&&y>=this.pauseBtn.y&&y<=this.pauseBtn.y+this.pauseBtn.h){
                cv.style.cursor='pointer';return;
            }
            cv.style.cursor='default';
        };
        this._mu=()=>{this.sliderDrag=null;this._pressed=null;};
        this._md=(e)=>{
            const{x,y}=this.p(e);
            if(this.sliderDrag)return;
            if(this.paused&&this.showSettings){
                const pw=500,ph=405,px=(this.w-pw)/2,py=(this.h-ph)/2;
                if(x>=px+200&&x<=px+400&&y>=py+95&&y<=py+125){this.sliderDrag='sfx';this._pressed='sfx';return;}
                if(x>=px+200&&x<=px+400&&y>=py+140&&y<=py+170){this.sliderDrag='bgm';this._pressed='bgm';return;}
                if(x>=px+200&&x<=px+400&&y>=py+185&&y<=py+215){this.sliderDrag='voice';this._pressed='voice';return;}
                if(x>=this.w/2-50&&x<=this.w/2+50&&y>=py+340&&y<=py+380){this._pressed='close';return;}
                return;
            }
            if(this.paused&&!this.showSettings){
                const w=400,h=260,px=(this.w-w)/2,py=(this.h-h)/2;
                if(x>=px+100&&x<=px+300&&y>=py+100&&y<=py+145){this._pressed='cont';return;}
                if(x>=px+60&&x<=px+180&&y>=py+170&&y<=py+215){this._pressed='exit';return;}
                if(x>=px+220&&x<=px+340&&y>=py+170&&y<=py+215){this._pressed='set';return;}
                return;
            }
            if(this.moving||this.moveLoading)return;
            // 技能图标按下（交互框）
            if(!this.skillUsed){const pi=this.turn;
                for(let si=0;si<4;si++){const h=this.skHit[pi][si];
                    if(x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h){this._pressed='sk'+pi+si;return;}
                }
            }
            if(x>=this.pauseBtn.x&&x<=this.pauseBtn.x+this.pauseBtn.w&&y>=this.pauseBtn.y&&y<=this.pauseBtn.y+this.pauseBtn.h){
                this._pressed='pause';return;
            }
            this._pressed=null;
        };
        cv.addEventListener('click',this._cl);
        cv.addEventListener('mousemove',this._mm);
        cv.addEventListener('mouseup',this._mu);
        cv.addEventListener('mousedown',this._md);
        // 移动端触摸支持（不preventDefault，保留click事件）
        this._ts = e => { e.preventDefault(); this._md(e.touches[0]); };
        this._tm = e => { e.preventDefault(); this._mm(e.touches[0]); };
        this._te = e => { e.preventDefault(); this._mu(); this._cl(e.changedTouches[0]); };
        cv.addEventListener('touchstart', this._ts, {passive: false});
        cv.addEventListener('touchmove', this._tm, {passive: false});
        cv.addEventListener('touchend', this._te);
        cv.addEventListener('touchcancel', this._te);
        // Enter换回合 + 技能按键
        this._kd = (e) => {
            if(this.paused||this.moving||this.moveLoading)return;
            if(e.key==='Enter'){this.endTurn();return;}
            const pi=this.turn;
            const keys1={u:0,i:1,o:2,p:3,' ':4};   // P1: U=技1 I=技2 O=技3 P=回血 Space=普攻
            const keys2={1:0,2:1,3:2,4:3,0:4};       // P2: 1=技1 2=技2 3=技3 4=回血 0=普攻
            const map = pi===0?keys1:keys2;
            const si = map[e.key]; if(si===undefined)return;
            this.useSkill(pi, si);
        };
        window.addEventListener('keydown', this._kd);
    }

    onClickZone(vid){
        const pi = this.turn; const p = this.players[pi];
        if(p.pos===vid||this.moving||this.moveLoading) return;
        if(p.frozen){this.hints.push({text:'冰冻状态下不可移动',timer:0,color:'100,200,255'});return;}
        if(this.moved){this.hints.push({text:'本回合移动次数已用完',timer:0,color:'255,180,60'});return;}
        let type = this.graph[p.pos]?.[vid];
        // 神速：精确2步位（含自动传送V9→V5）
        if(!type && p.speedMode){
            let m1={...this.graph[p.pos]};
            if(m1['V9']) m1['V5']=true;
            for(const v1 of Object.keys(m1)){
                let adj={...this.graph[v1]};
                if(v1==='V9') adj['V5']=true;
                type = adj[vid];
                if(type) break;
            }
        }
        if(!type)return;
        const to=this.pos[vid], from=this.pos[p.pos];
        const faceRight = to.cx > from.cx;
        if(!p.speedMode) p.flip = faceRight;
        this.startMove(pi, p.pos, vid, type, !!(p.speedMode && !this.graph[p.pos][vid]));
    }

    /** 计算当前回合玩家可达光圈（神速模式只显示2步可达） */
    _getReachable(){
        const cp=this.players[this.turn];
        // 1步有效可达（含自动传送：V9→V5）
        let m1={...this.graph[cp.pos]};
        if(m1['V9']) m1['V5']=true;
        if(!cp.speedMode) return m1;
        // 神速：仅2步可达（排除1步）
        const m2={};
        for(const v1 of Object.keys(m1)){
            let adj={...this.graph[v1]};
            if(v1==='V9') adj['V5']=true;
            for(const v2 of Object.keys(adj)){
                if(v2!==cp.pos&&!m1[v2]) m2[v2]=true;
            }
        }
        return m2;
    }

    /** 图最短距离：两节点间的步数 */
    _graphDist(a, b){
        if(a===b) return 0;
        const visited = new Set(); const q = [[a,0]]; visited.add(a);
        while(q.length){
            const [node, dist] = q.shift();
            const neighbors = this.graph[node] || {};
            for(const nb in neighbors){
                if(nb===b) return dist+1;
                if(!visited.has(nb)){ visited.add(nb); q.push([nb, dist+1]); }
            }
        }
        return Infinity;
    }

    endTurn(){
        if(this.moving||this.moveLoading)return;
        // 冰冻计时：在回合切换前，对即将结束的玩家-1
        const endingPlayer = this.players[this.turn];
        if(endingPlayer.frozen && endingPlayer.frozenTurns>0){
            endingPlayer.frozenTurns--;
            if(endingPlayer.frozenTurns<=0) endingPlayer.frozen=false;
        }
        // 中毒/弱化处理
        if(endingPlayer.poisoned && endingPlayer.poisonTurns>0){
            endingPlayer.hp = Math.max(0, endingPlayer.hp - 300);
            this.dmgPopups.push({px:this.turn, dmg:300, timer:0, type:'poison'});
            endingPlayer.poisonTurns--;
            if(endingPlayer.poisonTurns<=0) endingPlayer.poisoned=false;
        }
        if(endingPlayer.weakened && endingPlayer.weakenTurns>0){
            endingPlayer.weakenTurns--;
            if(endingPlayer.weakenTurns<=0) endingPlayer.weakened=false;
        }
        // 盾在敌人回合结束后自动消失
        const nextPlayer = this.players[1-this.turn];
        if(nextPlayer.shielded) nextPlayer.shielded = false;
        this.turn = this.turn===0?1:0;
        this.moved = false; this.skillUsed = false;
        this._voiceTurnCount = (this._voiceTurnCount || 0) + 1;
        this._voicePlayedThisTurn = false;
        if (this._voiceTurnCount >= this._voiceNextTurn + 3) {
            // 太久没放，重置阈值
            this._voiceTurnCount = 0;
            this._voiceNextTurn = 2 + Math.floor(Math.random() * 2);
        }
        // 冷却-1
        const c = this.cd[this.turn];
        for(let i=0;i<4;i++) if(c[i]>0) c[i]--;
        // buff回合-1
        const pp = this.players[this.turn];
        if(pp.buff && pp.buffTurns>0){
            pp.buffTurns--;
            if(pp.buffTurns<=0) pp.buff = false;
        }
        // 神速复位
        pp.speedMode = false;
        // 强化普攻标记复位
        pp._buffedTurn = false;
        // 隐身计数（所有玩家）
        for(const pl of this.players){
            if(pl.stealthed>0){pl.stealthed--; if(pl.stealthed<=0)pl.stealthed=0;}
            if(pl.shieldCdUI>0) pl.shieldCdUI--;
        }
    }

    /** 播放配音（停止当前播放） */
    _playVoice(path) {
        if (this._voiceAudio) { this._voiceAudio.pause(); this._voiceAudio = null; }
        const a = new Audio(path);
        a.volume = Math.min(1, (this.g.voiceVol || 0.8) * 2);
        a.play().catch(() => {});
        this._voiceAudio = a;
    }

    /** 播放技能音效（独立音量，同步动画fps；原视频24fps基准） */
    _playSfx(name, fps=120) {
        const path = `游戏资源/音频/技能音效/${name}.mp3`;
        const a = new Audio(path);
        a.volume = Math.min(1, (this.g.sfxVol || 0.8) * 3);
        a.playbackRate = (fps / 24) * this.speedMult;
        a.play().catch(() => {});
    }

    /** 待机配音：根据当前玩家血量+距离，随机选一句 */
    _tryIdleVoice() {
        if (this.paused) return;
        const pi = this.turn, p = this.players[pi], en = this.players[1-pi];
        if (p.dead || en.dead) return;
        // 近/远判定：graph距离>=2为远
        const dist = this._graphDist(p.pos, en.pos);
        const far = dist >= 2;
        // 血量判定
        const hpRate = p.hp / p.maxHp;
        let hpDir;
        if (hpRate >= 0.6) hpDir = '血量健康时';
        else if (hpRate >= 0.3) hpDir = '血量中等时';
        else hpDir = '残血时';
        // 子目录
        const subDir = far ? '离敌人远时（对自己说）' : '离敌人近时（对敌人说）';
        const base = `游戏资源/音频/人物配音/${hpDir}/${subDir}/`;
        // 列出该目录下的 mp3 文件
        // 使用预加载列表（避免每次 fs 调用，浏览器不支持）
        const allFiles = this._voiceList[hpDir] && this._voiceList[hpDir][subDir];
        if (!allFiles || !allFiles.length) return;
        const file = allFiles[Math.floor(Math.random() * allFiles.length)];
        this._playVoice(base + file);
    }

    /** 技能配音：即刻截断待机台词，播放技能语音 */
    _playSkillVoice(name) {
        if (name === '无敌之盾') return; // 无技能台词
        const path = `游戏资源/音频/人物配音/放技能/${name}.mp3`;
        this._playVoice(path);
    }

    /** 启动近战动画（0身位攻击） */
    async _startMelee(pi, forceAnim){
        const p = this.players[pi], enemy = this.players[1-pi];
        if(p.pos !== enemy.pos) return;
        if(p.dead || enemy.dead) return;
        let animKey, hitFrame, dmg, fps;
        if(forceAnim==='giantSword'){
            animKey = 'giantSword'; hitFrame = 105; dmg = 1200; fps = 60;
        } else {
            const isBuffed = p.buff && p.buffTurns > 0;
            fps = 120;
            if(isBuffed){animKey='buffAttack';hitFrame=80;dmg=700;}
            else if(Math.random()<0.5){animKey='meleeSlash';hitFrame=63;dmg=200;}
            else {animKey='meleeChop';hitFrame=71;dmg=200;}
        }
        // 面对面朝向：攻击方面向敌人上一回合方向
        const myPrevPos = this._prevPos[pi], enPrevPos = this._prevPos[1-pi];
        const faceRight = (this.pos[myPrevPos]&&this.pos[enPrevPos]) 
            ? this.pos[enPrevPos].cx > this.pos[myPrevPos].cx 
            : this.pos[enemy.pos].cx > this.pos[p.pos].cx;
        p.flip = faceRight; enemy.flip = !faceRight;
        // 位置偏移：P0上回合更左→P0-70/P1+70，否则反之
        this.players[0]._meleeOffX = 0; this.players[1]._meleeOffX = 0;
        const pp0 = this.pos[this._prevPos[0]], pp1 = this.pos[this._prevPos[1]];
        if(pp0 && pp1){
            const p0Left = pp0.cx < pp1.cx;
            this.players[0]._meleeOffX = p0Left ? -70 : 70;
            this.players[1]._meleeOffX = p0Left ? 70 : -70;
        }
        // 预加载
        await this._preloadMove(animKey);
        await this._preloadMove('hitReact');
        // 防御方有盾：预加载并反推起点
        if(enemy.shielded) await this._preloadMove('shield');
        this.melee = {pi, animKey, fps, hitFrame, dmg, atkFrame:0, atkTimer:0, defFrame:1, defTimer:0, defStarted:false, defAnim:'hitReact', defFps:120,
            atkScale:animKey==='meleeSlash'?0.59:0.69, defScale:0.69};
        this._playSfx(animKey, fps);
        if(enemy.shielded){
            const shieldNeed = 68;
            const shieldStartFrame = Math.round(hitFrame - shieldNeed * fps / 120);
            if(shieldStartFrame <= 0){
                this.melee.atkDelay = -shieldStartFrame;
                this.melee.shieldPre = true;
                this.melee.shieldFrame = 1;
                this.melee.shieldTimer = 0;
            } else {
                this.melee.shieldStartAt = shieldStartFrame;
                this.melee.shieldPre = true;
                this.melee.shieldFrame = 0;
                this.melee.shieldTimer = 0;
            }
        }
        this.skillUsed = true;
    }

    /** 淬毒刃：挥砍240fps + 淬毒刃效果120fps + 受击 */
    async _startPoisonBlade(pi){
        const p = this.players[pi], enemy = this.players[1-pi];
        // 预加载
        await this._preloadMove('meleeSlash');
        await this._preloadMove('poisonBlade');
        await this._preloadMove('hitReact');
        // 盾同步：中毒命中=攻63/240+(51-6)/120=0.6375s，盾68帧需提前
        if(enemy.shielded) await this._preloadMove('shield');
        // 攻击参数：挥砍240fps，第63帧触发淬毒刃
        const atkFps = 240, hitFrame = 63;
        this.melee = {
            pi, animKey:'meleeSlash', fps:atkFps, hitFrame, dmg:0,
            atkFrame:0, atkTimer:0,
            defFrame:1, defTimer:0, defStarted:false, defAnim:'hitReact', defFps:120,
            atkScale:0.59, defScale:0.69,
            // 淬毒刃特效状态
            poisonStarted:false, poisonFrame:1, poisonTimer:0, poisonFps:120,
            poisonHitFrame:51, // 淬毒刃第51帧命中
            // 盾同步：中毒命中时盾恰好在第68帧
            shieldPre:!!enemy.shielded, shieldFrame:enemy.shielded?1:0, shieldTimer:0,
            shieldActive:false, atkDelay:enemy.shielded?9:0,
        };
        this.skillUsed = true;
    }

    /** 烈焰斩：竖劈60fps + 烈焰斩特效60fps + 受击120fps */
    async _startFlameSlash(pi){
        const p = this.players[pi], enemy = this.players[1-pi];
        // 预加载
        await this._preloadMove('meleeChop');
        await this._preloadMove('flameBlade');
        await this._preloadMove('hitReact');
        if(enemy.shielded) await this._preloadMove('shield');
        // 攻击参数：竖劈60fps，第71帧触发烈焰斩
        const atkFps = 60, hitFrame = 71;
        this.melee = {
            pi, animKey:'meleeChop', fps:atkFps, hitFrame, dmg:1000,
            atkFrame:0, atkTimer:0,
            defFrame:1, defTimer:0, defStarted:false, defAnim:'hitReact', defFps:120,
            atkScale:0.59, defScale:0.69,
            // 烈焰斩特效状态
            flameStarted:false, flameFrame:1, flameTimer:0, flameFps:60,
            flameHitFrame:119, flameHit:false,
            flameShieldStart:85, // 烈焰斩第85帧启动盾动画，第119帧命中时盾恰好到68帧
            // 盾状态
            shieldPre:false, shieldFrame:0, shieldTimer:0,
            shieldActive:false, atkDelay:0,
        };
        this.skillUsed = true;
    }

    /** 激光：挥砍120fps + 激光特效60fps */
    async _startLaser(pi){
        const p = this.players[pi], enemy = this.players[1-pi];
        await this._preloadMove('meleeSlash');
        await this._preloadMove('laser');
        await this._preloadMove('hitReact');
        if(enemy.shielded) await this._preloadMove('shield');
        // 挥砍120fps，激光需提前启动（挥砍63=激光40，激光提前18帧120fps启动）
        const atkDelay = 18;
        this._playSfx('meleeSlash', 120);
        this._playSfx('laser', 60);
        this.melee = {
            pi, animKey:'meleeSlash', fps:120, hitFrame:63,
            atkFrame:1, atkTimer:0, atkDelay,
            laserStarted:true, laserFrame:1, laserTimer:0, laserFps:60,
            laserHitFrame:41, laserLoopEnd:109, laserResumeFrame:103,
            lastDmgMark:40,
            slashLoopActive:false,
            defFrame:1, defTimer:0, defStarted:false, defFps:60, defAnim:'hitReact',
            shieldPre:enemy.shielded, shieldWait:enemy.shielded?13:0, shieldFrame:0, shieldTimer:0, shieldActive:false,
        };
        this.skillUsed = true;
    }

    /** 震雷枪：挥砍120fps + 震雷枪特效60fps，命中800伤击退1身位 */
    async _startThunderSpear(pi){
        const p = this.players[pi], enemy = this.players[1-pi];
        // 位置重合：近战偏移逻辑
        if(p.pos===enemy.pos){
            const atkPrev = this.pos[this._prevPos[pi]], defPrev = this.pos[this._prevPos[1-pi]];
            if(atkPrev && defPrev){
                const atkWasLeft = atkPrev.cx < defPrev.cx;
                this.players[pi]._meleeOffX = atkWasLeft ? -70 : 70;
                this.players[1-pi]._meleeOffX = atkWasLeft ? 70 : -70;
            }
            p.flip = p._meleeOffX < enemy._meleeOffX;
            enemy.flip = !p.flip;
        }
        // 找击退目标：重合时按偏移方向，否则远离攻击方
        let kbPos = enemy.pos;
        if(p.pos===enemy.pos){
            const defOnRight = enemy._meleeOffX > p._meleeOffX;
            for(const nb of Object.keys(this.graph[enemy.pos]||{})){
                const nd = this.pos[nb];
                if(nd && (nd.cx > this.pos[enemy.pos].cx)===defOnRight){ kbPos = nb; break; }
            }
        } else {
            const atkDist = this._graphDist(p.pos, enemy.pos);
            for(const nb of Object.keys(this.graph[enemy.pos]||{})){
                if(this._graphDist(p.pos, nb) > atkDist){ kbPos = nb; break; }
            }
        }
        await this._preloadMove('meleeSlash');
        await this._preloadMove('hitReact');
        if(enemy.shielded) await this._preloadMove('shield');
        if(p.pos!==enemy.pos){
            const faceRight = this.pos[enemy.pos].cx > this.pos[p.pos].cx;
            p.flip = faceRight; enemy.flip = !faceRight;
        }
        const dx = this.pos[enemy.pos].cx - this.pos[p.pos].cx;
        const dy = this.pos[enemy.pos].cy - this.pos[p.pos].cy;
        // f81: X=67.6%路程, Y=攻方Y+(守方Y-攻方Y)*0.5-146弧线
        const t81x = this.pos[p.pos].cx + dx * 0.676;
        const t81y = this.pos[p.pos].cy + dy * 0.5 - 146;
        // f83(命中帧): X=78.9%路程, Y=守方Y+7
        const t83x = this.pos[p.pos].cx + dx * 0.789;
        const t83y = this.pos[enemy.pos].cy + 7;
        const defCx = this.pos[enemy.pos].cx, defCy = this.pos[enemy.pos].cy;
        const kbCx = this.pos[kbPos].cx, kbCy = this.pos[kbPos].cy;
        const d6x = defCx + (kbCx - defCx) * 0.5;
        const d6y = defCy - 60;
        this.melee = {
            pi, animKey:'meleeSlash', fps:120, hitFrame:63,
            atkFrame:0, atkTimer:0, atkScale:0.59, atkDelay:0,
            thunderStarted:true, thunderFrame:50, thunderTimer:0, thunderFps:60,
            t81x, t81y, t83x, t83y, thunderHit:false,
            defFrame:1, defTimer:0, defStarted:false, defAnim:'hitReact', defFps:24, defScale:0.69,
            kbPos, d1x:defCx, d1y:defCy, d6x, d6y, d11x:kbCx, d11y:kbCy,
            shieldPre:enemy.shielded, shieldWait:0, shieldFrame:enemy.shielded?1:0, shieldTimer:0, shieldActive:false,
        };
        this._playSfx('meleeSlash', 120);
        this._playSfx('thunder', 60);
        this.skillUsed = true;
    }

    _startVictory(){
        this.paused = true;
        this._playSfx('victory', 120);
        if(this.winner){
            // 最终结算：序列帧动画，填满画布播放（1280×720原图→1920×1080）
            this.victoryAnim = {type:'final', timer:0, scale:1.0, targetScale:1.0, frame:1, frameTimer:0, showText:false};
        } else if(this.roundWinner && this.gameMode==='三局两胜'){
            // BO3单局结算：静态图
            const imgKey = this.round===1?'第一局胜利':'第二局胜利';
            this.victoryAnim = {type:'round', timer:0, scale:0.001, targetScale:0.703, imgKey, showText:false};
        }
    }

    /** 使用技能 pi=玩家索引, si=技能索引(0=技1,1=技2,2=技3,3=回血, 4=普攻) */
    async useSkill(pi, si){
        if(this.moving||this.moveLoading)return;
        if(this.skillUsed){
            // 强化后允许普攻
            if(!(si===4 && this.players[pi]._buffedTurn)){
                this.hints.push({text:'本回合攻击次数已用完',timer:0,color:'255,180,60'});
                return;
            }
        }
        const p = this.players[pi];
        if(si<4 && this.cd[pi][si]>0)return;
        const skills = pi===0?this.skills1:this.skills2;
        const sname = si===4?'普攻':(si===3?'回血':(skills[si]||''));
        if(!sname)return;
        if(sname!=='普攻') this._playSkillVoice(sname);
        // 冰冻状态：只能使用回血和无敌之盾
        if(p.frozen && sname!=='回血' && sname!=='无敌之盾') {
            this.hints.push({text:'冰冻状态下不可攻击',timer:0,color:'100,200,255'});
            return;
        }
        // 隐身：无法选中 → 攻击技能无效（自buff类除外）
        const selfSkills = ['回血','强化','无敌之盾','隐身面具','神速'];
        const enemy = this.players[1-pi];
        if(!selfSkills.includes(sname) && enemy.stealthed>0) {
            this.hints.push({text:'敌人隐身，无法选中',timer:0,color:'255,60,60'});
            return;
        }
        const cdMap = {回血:2,淬毒刃:3,震雷枪:2,隐身面具:3,无敌之盾:3,烈焰斩:3,强化:4,激光:3,巨剑术:4,神速:4,冰冻:3,普攻:0};
        const cdVal = cdMap[sname]||0;
        if(sname==='回血'){
            await this._preloadMove('heal');
            p.hp = Math.min(p.maxHp, p.hp + 800);
            this.dmgPopups.push({px:pi, dmg:800, timer:0, type:'heal'});
            if(si<4) this.cd[pi][si] = cdVal;
            this.skillUsed = true;
            p.animOverride = 'heal'; p.animFrame = 1; p.animTimer = 0;
            this._playSfx('heal', 120);
        } else if(sname==='强化'){
            await this._preloadMove('buff');
            await this._preloadMove('buffIdle');
            if(si<4) this.cd[pi][si] = cdVal;
            // 强化后可用普攻，但不能用其他技能
            p.buff = true; p.buffTurns = 2;
            p.animOverride = 'buff'; p.animFrame = 1; p.animTimer = 0;
            this._playSfx('buff', 120);
            p._buffedTurn = true;
            this.skillUsed = true;
        } else if(sname==='无敌之盾'){
            // 预判技能：内部冷却启动，UI冷却延迟到下一回合显示
            if(si<4) this.cd[pi][si] = cdVal;
            this.skillUsed = true;
            p.shielded = true;
            p.shieldCdUI = 2; // UI冷却延迟2回合（本方+敌方）
        } else if(sname==='神速'){
            await this._preloadMove('speed');
            if(si<4) this.cd[pi][si] = cdVal;
            this.skillUsed = true;
            p.speedMode = true;
        } else if(sname==='隐身面具'){
            if(si<4) this.cd[pi][si] = cdVal;
            this.skillUsed = true;
            p.stealthed = 2;
        } else if(sname==='冰冻'){
            const enemy = this.players[1-pi];
            const isAdj = p.pos===enemy.pos || (this.graph[p.pos] && this.graph[p.pos][enemy.pos]);
            if(!isAdj) { this.hints.push({text:'攻击距离不够（需≤1身位）',timer:0,color:'255,180,60'}); return; }
            // 同身位：先分离
            if(p.pos===enemy.pos){
                this.players[0]._meleeOffX = 0; this.players[1]._meleeOffX = 0;
                const atkPrev = this.pos[this._prevPos[pi]];
                const defPrev = this.pos[this._prevPos[1-pi]];
                if(atkPrev && defPrev){
                    const atkWasLeft = atkPrev.cx < defPrev.cx;
                    this.players[pi]._meleeOffX = atkWasLeft ? -70 : 70;
                    this.players[1-pi]._meleeOffX = atkWasLeft ? 70 : -70;
                }
                // 分离后朝向对方
                p.flip = p._meleeOffX < enemy._meleeOffX;
                enemy.flip = !p.flip;
            } else {
                const faceRight = this.pos[enemy.pos].cx > this.pos[p.pos].cx;
                p.flip = faceRight; enemy.flip = !faceRight;
            }
            // 敌人被冻后面向玩家
            await this._preloadMove('slash');
            // 敌人有盾：预加载盾动画
            if(enemy.shielded) await this._preloadMove('shield');
            if(si<4) this.cd[pi][si] = cdVal;
            this.skillUsed = true;
            p.animOverride = 'slash'; p.animFrame = 1; p.animTimer = 0;
            this._playSfx('slash', 120);
            p._freezeTarget = 1-pi; // 挥砍结束后冰冻敌人
            // 敌人有盾：同时播放防御动画
            if(enemy.shielded){
                enemy.animOverride = 'shield'; enemy.animFrame = 1; enemy.animTimer = 0;
                p._shieldDef = 1-pi; // 记录对方播放盾
            }
        } else if(sname==='普攻'){
            p._buffedTurn = false; // 强化后的普攻用掉了
            await this._startMelee(pi);
        } else if(sname==='巨剑术'){
            const enemy = this.players[1-pi];
            if(p.pos !== enemy.pos) {
                this.hints.push({text:'攻击距离不够（需贴身）',timer:0,color:'255,180,60'});
                return;
            }
            if(si<4) this.cd[pi][si] = cdVal;
            await this._startMelee(pi, 'giantSword');
        } else if(sname==='淬毒刃'){
            const enemy = this.players[1-pi];
            // 攻击距离1：允许同身位(0)和邻身位(1)
            const isAdj = p.pos===enemy.pos || (this.graph[p.pos] && this.graph[p.pos][enemy.pos]);
            if(!isAdj) { this.hints.push({text:'攻击距离不够（需≤1身位）',timer:0,color:'255,180,60'}); return; }
            // 同身位：先分离再攻击
            if(p.pos===enemy.pos){
                this.players[0]._meleeOffX = 0; this.players[1]._meleeOffX = 0;
                const atkPrev = this.pos[this._prevPos[pi]];
                const defPrev = this.pos[this._prevPos[1-pi]];
                if(atkPrev && defPrev){
                    const atkWasLeft = atkPrev.cx < defPrev.cx;
                    this.players[pi]._meleeOffX = atkWasLeft ? -70 : 70;
                    this.players[1-pi]._meleeOffX = atkWasLeft ? 70 : -70;
                }
                // 分离后朝向对方
                p.flip = p._meleeOffX < enemy._meleeOffX;
                enemy.flip = !p.flip;
            } else {
                const faceRight = this.pos[enemy.pos].cx > this.pos[p.pos].cx;
                p.flip = faceRight; enemy.flip = !faceRight;
            }
            if(si<4) this.cd[pi][si] = cdVal;
            await this._startPoisonBlade(pi);
        } else if(sname==='烈焰斩'){
            const enemy = this.players[1-pi];
            const isAdj = p.pos===enemy.pos || (this.graph[p.pos] && this.graph[p.pos][enemy.pos]);
            if(!isAdj) { this.hints.push({text:'攻击距离不够（需≤1身位）',timer:0,color:'255,180,60'}); return; }
            if(p.pos===enemy.pos){
                this.players[0]._meleeOffX = 0; this.players[1]._meleeOffX = 0;
                const atkPrev = this.pos[this._prevPos[pi]];
                const defPrev = this.pos[this._prevPos[1-pi]];
                if(atkPrev && defPrev){
                    const atkWasLeft = atkPrev.cx < defPrev.cx;
                    this.players[pi]._meleeOffX = atkWasLeft ? -70 : 70;
                    this.players[1-pi]._meleeOffX = atkWasLeft ? 70 : -70;
                }
                p.flip = p._meleeOffX < enemy._meleeOffX;
                enemy.flip = !p.flip;
            } else {
                const faceRight = this.pos[enemy.pos].cx > this.pos[p.pos].cx;
                p.flip = faceRight; enemy.flip = !faceRight;
            }
            if(si<4) this.cd[pi][si] = cdVal;
            await this._startFlameSlash(pi);
        } else if(sname==='激光'){
            const enemy = this.players[1-pi];
            // 激光攻击距离≤2身位
            const dist = this._graphDist(p.pos, enemy.pos);
            if(dist > 2) { this.hints.push({text:'攻击距离不够（需≤2身位）',timer:0,color:'255,180,60'}); return; }
            if(p.pos===enemy.pos){
                this.players[0]._meleeOffX = 0; this.players[1]._meleeOffX = 0;
                const atkPrev = this.pos[this._prevPos[pi]];
                const defPrev = this.pos[this._prevPos[1-pi]];
                if(atkPrev && defPrev){
                    const atkWasLeft = atkPrev.cx < defPrev.cx;
                    this.players[pi]._meleeOffX = atkWasLeft ? -70 : 70;
                    this.players[1-pi]._meleeOffX = atkWasLeft ? 70 : -70;
                }
                p.flip = p._meleeOffX < enemy._meleeOffX;
                enemy.flip = !p.flip;
            } else {
                const faceRight = this.pos[enemy.pos].cx > this.pos[p.pos].cx;
                p.flip = faceRight; enemy.flip = !faceRight;
            }
            if(si<4) this.cd[pi][si] = cdVal;
            await this._startLaser(pi);
        } else if(sname==='震雷枪'){
            const enemy = this.players[1-pi];
            const dist = this._graphDist(p.pos, enemy.pos);
            if(dist > 1) { this.hints.push({text:'攻击距离不够（需≤1身位）',timer:0,color:'255,180,60'}); return; }
            if(si<4) this.cd[pi][si] = cdVal;
            await this._startThunderSpear(pi);
        } else {
            if(si<4) this.cd[pi][si] = cdVal;
            this.skillUsed = true;
        }
    }

    async startMove(pi, fromV, toV, type, speedAnim=false){
        if(this.moveLoading) return;
        // 移动前保存站位快照
        this._prevPos = [this.players[0].pos, this.players[1].pos];
        const from = this.pos[fromV], to = this.pos[toV];
        const animType = speedAnim?'speed':type;
        const fps = speedAnim?60:120;
        let kfs;
        if(speedAnim){
            // 神速关键帧：帧1-77原地蓄力，帧78开始移动，帧90到达终点
            kfs = [
                {frame:1, cx:from.cx, cy:from.cy},
                {frame:78, cx:from.cx, cy:from.cy},
                {frame:90, cx:to.cx, cy:to.cy},
            ];
        } else {
            kfs = [{frame:1,cx:from.cx,cy:from.cy}];
            if(type==='walk'){ kfs.push({frame:45,cx:from.cx,cy:from.cy}); kfs.push({frame:89,cx:to.cx,cy:to.cy}); }
            else if(type==='jump'){ kfs.push({frame:38,cx:from.cx,cy:from.cy}); kfs.push({frame:89,cx:to.cx,cy:to.cy}); }
            else if(type==='drop'){ kfs.push({frame:15,cx:from.cx,cy:from.cy}); kfs.push({frame:56,cx:to.cx,cy:to.cy}); }
            else if(type==='float'){ kfs.push({frame:36,cx:from.cx,cy:from.cy}); kfs.push({frame:119,cx:from.cx,cy:-52.56}); this.players[pi].flip=false; }
        }
        const totalFrames = this.frameCounts[animType] || 121;
        this._playSfx(type, fps);
        if (this.players[pi].speedMode) this._playSfx('speed', 60);

        // 清除旧移动状态，防止update重复处理
        this.moving = null;
        // 预加载动画帧
        this.moveLoading = true;
        await this._preloadMove(animType);
        this.moveLoading = false;

        this.moving={pi,fromV,toV,type:animType,fps,totalFrames,kfs,curFrame:1,timer:0};
    }

    p(e){const r=this.g.canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*(1920/r.width),y:(e.clientY-r.top)*(1080/r.height)};}
    cf(){const idx=Math.floor(this._gameTime*this.fps);return(idx%this.total)+1;}
    bf(){const idx=Math.floor(this._gameTime*this.fps);return this.pingpongSeq[idx%this.ppLen];}
    _fi(){return Math.floor(this._gameTime*this.fps);} // 帧索引（用于 _bgLoad 等需要 fIdx 的地方）

    update(dt){
        if(!this.ok || !this.players) return;
        this._gameTime += dt; // 精确时间驱动动画帧计算
        // 按下反馈计时器
        if(this._pressTimer>0){this._pressTimer-=dt;if(this._pressTimer<=0)this._pressFlash=null;}
        // 胜利动画（即使paused也要更新）
        if(this.victoryAnim){
            const va=this.victoryAnim;
            va.timer += dt;
            if(va.type==='final'){
                va.frameTimer += dt*1000;
                const fps=120, fInt=1000/(fps * this.speedMult);
                while(va.frameTimer >= fInt){va.frameTimer -= fInt; va.frame++;}
                if(va.frame > 120) va.frame = 121;
                if(va.frame >= 121 && !va.showText) va.showText = true;
                const cf2 = va.frame;
                for(let i=1;i<=8;i++){
                    const fn2 = Math.min(cf2+i, 121);
                    if(!this.frameCache.has('vicFinal'+fn2)){
                        const pad3=n=>String(n).padStart(5,'0');
                        const img3=new Image();
                        img3.onload=()=>this.frameCache.set('vicFinal'+fn2,img3);
                        img3.onerror=()=>{};
                        img3.src=`${this.victoryFrameDir}/frame_${pad3(fn2)}.png`;
                    }
                }
            } else {
                const dur = 0.8, t = Math.min(va.timer/dur, 1);
                const ease = 1 - Math.pow(1-t, 3);
                va.scale = 0.001 + (va.targetScale - 0.001) * ease;
                if(t >= 1){va.scale = va.targetScale; va.showText = true;}
            }
        }
        // 近战动画更新
        if(this.melee && this.melee.active!==false){
            const m = this.melee;
            const atkFps = m.fps * this.speedMult, atkInt = 1000/atkFps;
            m.atkTimer += dt*1000;
            // 攻击延迟（盾需提前时，按帧延迟）
            if(m.atkDelay > 0){
                m.atkTimer += dt*1000;
                while(m.atkTimer >= atkInt && m.atkDelay > 0){m.atkTimer -= atkInt; m.atkDelay--;}
            } else {
                while(m.atkTimer >= atkInt){
                    m.atkTimer -= atkInt;
                    if(m.atkFrame < 121) m.atkFrame++;
                    if(m.laserStarted && !m.slashLoopActive && m.atkFrame >= 103) m.slashLoopActive = true;
                    if(m.slashLoopActive && m.laserFrame < m.laserResumeFrame){
                        if(m.atkFrame >= 113) m.atkFrame = 103;
                    }
                }
            }
            // 淬毒刃特效更新
            if(m.poisonHitFrame!==undefined && !m.poisonStarted && !m.defStarted && m.atkFrame >= m.hitFrame){
                m.poisonStarted = true; m.poisonFrame = 6; m.poisonTimer = 0;
                this._playSfx('poisonBlade');
            }
            if(m.poisonStarted && !m.defStarted){
                m.poisonTimer += dt*1000;
                const pInt = 1000/(m.poisonFps * this.speedMult);
                while(m.poisonTimer >= pInt){m.poisonTimer -= pInt; m.poisonFrame++;}
                // 帧命中 或 攻击动画播完+200ms兜底
                if(m.poisonFrame >= m.poisonHitFrame || (m.atkFrame >= 121 && m.poisonTimer > 200)){
                    const defPlayer = this.players[1-m.pi];
                    if(defPlayer.shielded){
                        this.hints.push({text:'被盾挡住了！',timer:0,color:'255,60,60'});
                        // 盾反伤+取消中毒
                        const atkPlayer = this.players[m.pi];
                        atkPlayer.hp = Math.max(0, atkPlayer.hp - 200);
                        this.dmgPopups.push({px:m.pi, dmg:200, timer:0});
                        defPlayer.shielded = false;
                    } else {
                    // 命中：中毒+弱化
                    defPlayer.hp = Math.max(0, defPlayer.hp - 300);
                    this.dmgPopups.push({px:1-m.pi, dmg:300, timer:0, type:'poison'});
                    defPlayer.poisoned = true; defPlayer.poisonTurns = 1;
                    defPlayer.weakened = true; defPlayer.weakenTurns = 1;
                    }
                    m.poisoned = true;
                    m.defStarted = true;
                }
            }
            // 烈焰斩特效更新
            if(m.flameHitFrame!==undefined && !m.flameStarted && !m.defStarted && m.atkFrame >= m.hitFrame){
                m.flameStarted = true; m.flameFrame = 1; m.flameTimer = 0;
                this._playSfx('flameBlade', 60);
            }
            if(m.flameStarted && !m.defStarted && !m.flameHit){
                m.flameTimer += dt*1000;
                const fInt = 1000/(m.flameFps * this.speedMult);
                while(m.flameTimer >= fInt){m.flameTimer -= fInt; m.flameFrame++;}
                // 烈焰斩第85帧启动盾动画
                if(!m.shieldPre && m.flameFrame >= m.flameShieldStart && this.players[1-m.pi].shielded){
                    m.shieldPre = true; m.shieldFrame = 1; m.shieldTimer = 0;
                }
                if(m.flameFrame >= m.flameHitFrame || (m.atkFrame >= 121 && m.flameTimer > 500)){
                    const defPlayer = this.players[1-m.pi];
                    if(defPlayer.shielded){
                        this.hints.push({text:'被盾挡住了！',timer:0,color:'255,60,60'});
                        const atkPlayer = this.players[m.pi];
                        atkPlayer.hp = Math.max(0, atkPlayer.hp - 200);
                        this.dmgPopups.push({px:m.pi, dmg:200, timer:0});
                        defPlayer.shielded = false;
                    } else {
                        defPlayer.hp = Math.max(0, defPlayer.hp - m.dmg);
                        this.dmgPopups.push({px:1-m.pi, dmg:m.dmg, timer:0});
                    }
                    m.flameHit = true;
                    m.defStarted = true;
                }
            }
            // 激光特效更新（始终推进直到melee结束）
            if(m.laserStarted){
                m.laserTimer += dt*1000;
                const lInt = 1000/(m.laserFps * this.speedMult);
                while(m.laserTimer >= lInt){m.laserTimer -= lInt; m.laserFrame++;}
                const marks = [41,58,75,92];
                for(const mk of marks){
                    if(m.laserFrame >= mk && mk > m.lastDmgMark){
                        const defPlayer = this.players[1-m.pi];
                        const dmg = 225;
                        if(defPlayer.shielded){
                        this.hints.push({text:'被盾挡住了！',timer:0,color:'255,60,60'});
                            this.hints.push({text:'被盾挡住了！',timer:0,color:'255,60,60'});
                            m.shieldActive = true;
                            const atkPlayer = this.players[m.pi];
                            atkPlayer.hp = Math.max(0, atkPlayer.hp - 200);
                            this.dmgPopups.push({px:m.pi, dmg:200, timer:0});
                            defPlayer.shielded = false;
                            m.lastDmgMark = 92; m.defStarted = true;
                            break;
                        }
                        defPlayer.hp = Math.max(0, defPlayer.hp - dmg);
                        this.dmgPopups.push({px:1-m.pi, dmg, timer:0});
                        m.lastDmgMark = mk;
                    }
                }
                if(m.laserFrame >= m.laserHitFrame && !m.defStarted) m.defStarted = true;
            }
            // 震雷枪特效更新（帧始终推进，命中仅触发一次）
            if(m.thunderStarted){
                m.thunderTimer += dt*1000;
                const tInt = 1000/(m.thunderFps * this.speedMult);
                while(m.thunderTimer >= tInt){m.thunderTimer -= tInt; m.thunderFrame++;}
                if(m.thunderFrame >= 83 && !m.thunderHit){
                    m.thunderHit = true;
                    m.defStarted = true;
                    const defPlayer = this.players[1-m.pi];
                    if(defPlayer.shielded){
                        this.hints.push({text:'被盾挡住了！',timer:0,color:'255,60,60'});
                        m.shieldActive = true;
                        m.shieldFrame = 68;
                        m.thunderBlocked = true;
                        const atkPlayer = this.players[m.pi];
                        atkPlayer.hp = Math.max(0, atkPlayer.hp - 200);
                        this.dmgPopups.push({px:m.pi, dmg:200, timer:0});
                        defPlayer.shielded = false;
                    } else {
                        defPlayer.hp = Math.max(0, defPlayer.hp - 800);
                        this.dmgPopups.push({px:1-m.pi, dmg:800, timer:0});
                    }
                }
            }
            // 盾动画：等待shieldWait帧后开始
            if(m.shieldPre && !m.shieldActive){
                if(m.shieldWait > 0){
                    const shieldFps = 120 * this.speedMult;
                    m.shieldTimer += dt*1000;
                    while(m.shieldTimer >= 1000/shieldFps && m.shieldWait > 0){m.shieldTimer -= 1000/shieldFps; m.shieldWait--;}
                }
                if(m.shieldWait <= 0 && (m.shieldFrame > 0 || (m.shieldStartAt!=null && m.atkFrame >= m.shieldStartAt))){
                    if(m.shieldFrame===0) m.shieldFrame = 1;
                    m.shieldTimer += dt*1000;
                    while(m.shieldTimer >= 1000/shieldFps){m.shieldTimer -= 1000/shieldFps; m.shieldFrame++;}
                }
            }
            // 命中帧（淬毒刃跳过，由特效命中处理）
            if(!m.defStarted && m.atkFrame >= m.hitFrame && m.poisonHitFrame===undefined && m.flameHitFrame===undefined && !m.laserStarted && !m.thunderStarted){
                m.defStarted = true;
                const defPlayer = this.players[1-m.pi];
                if(defPlayer.shielded){
                    this.hints.push({text:'被盾挡住了！',timer:0,color:'255,60,60'});
                    this._playSfx('shield');
                    m.shieldActive = true;
                    // 反伤200
                    const atkPlayer = this.players[m.pi];
                    atkPlayer.hp = Math.max(0, atkPlayer.hp - 200);
                    this.dmgPopups.push({px:m.pi, dmg:200, timer:0});
                    defPlayer.shielded = false;
                } else {
                    if (!defPlayer.shielded) this._playSfx('hitReact');
                    const atkPlayer = this.players[m.pi];
                    let realDmg = m.dmg;
                    if(atkPlayer.weakened) realDmg = Math.max(0, realDmg - 200);
                    defPlayer.hp = Math.max(0, defPlayer.hp - realDmg);
                    this.dmgPopups.push({px:1-m.pi, dmg:realDmg, timer:0});
                }
            }
            if(m.defStarted){
                if(m.shieldActive){
                    m.shieldTimer += dt*1000;
                    const shInt = 1000/(120 * this.speedMult);
                    while(m.shieldTimer >= shInt){
                        m.shieldTimer -= shInt; m.shieldFrame++;
                        // 激光41-109期间盾牌循环68→71帧
                        if(m.laserStarted && m.laserFrame >= m.laserHitFrame && m.laserFrame <= m.laserLoopEnd){
                            m.shieldFrame = 68 + ((m.laserFrame - 1) % 4);
                        }
                    }
                } else {
                    m.defTimer += dt*1000;
                    const defInt = 1000/(m.defFps * this.speedMult);
                    while(m.defTimer >= defInt){
                        m.defTimer -= defInt; m.defFrame++;
                        if(m.laserStarted && m.laserFrame >= m.laserHitFrame && m.laserFrame <= m.laserLoopEnd){
                            if(m.defFrame > 3) m.defFrame = 2;
                        }
                    }
                }
            // 结束条件
            let shouldEnd = false;
            if(m.poisonHitFrame!==undefined||m.flameHitFrame!==undefined){
                shouldEnd = m.defStarted && (m.defFrame>121 || (m.shieldActive && m.shieldFrame>=121));
            } else if(m.laserStarted){
                shouldEnd = m.defStarted && m.laserFrame>=121;
            } else if(m.thunderStarted){
                shouldEnd = m.thunderHit && m.thunderFrame>=121;
            } else {
                shouldEnd = m.atkFrame>=121 || (m.shieldActive&&m.shieldFrame>=121);
            }
            if(shouldEnd){
                this.melee.active = false;
                this.players[0]._meleeOffX = 0; this.players[1]._meleeOffX = 0;
                if(!this.players[0].dead){ this.players[0].animOverride = null; this.players[0].animFrame = 1; }
                if(!(m.laserStarted||m.thunderStarted)){
                    if(!this.players[1].dead){ this.players[1].animOverride = null; this.players[1].animFrame = 1; }
                }
                // 震雷枪击退（盾牌格挡则不击退）
                if(m.thunderStarted && m.kbPos && !m.thunderBlocked && m.kbPos!==this.players[1-m.pi].pos){
                    this.players[1-m.pi].pos = m.kbPos;
                    // V9→V5 传送动画
                    if(m.kbPos==='V9'){
                        this.moveLoading = false;
                        this.startMove(1-m.pi, 'V9', 'V5', 'float');
                    }
                }
                if(this.skillUsed && this.moved && !this.players[this.turn]._buffedTurn) this.endTurn();
            }
        }
        }

        if(this.paused) return;
        // 渐进加载（加速补齐剩余帧）
        this._bgLoad();
        const fi = this._fi();
        this._loadFrame('bg', this.pingpongSeq[fi%this.ppLen]);
        this._loadFrame('sz', ((fi%this.total)+1));
        this._loadFrame('fz', ((fi%this.total)+1));
        this._loadFrame('idle', ((fi%this.total)+1));

        // 血条插值 + 死亡检测
        for(const p of this.players){
            if(Math.abs(p.dispHp - p.hp) > 1) p.dispHp += (p.hp - p.dispHp) * Math.min(1, dt * 8);
            else p.dispHp = p.hp;
            // HP归零触发死亡
            if(p.hp <= 0 && !p.dead){
                p.dead = true;
                this._playSfx('death');
                p.animOverride = 'death';
                p.animFrame = 1; p.animTimer = 0;
                this.moving = null;
                // 紧急预加载死亡帧（防止一下打没）
                for(let f=1;f<=121;f++) this._loadFrame('death',f);
            }
            // 预加载死亡动画（血量低时后台加载）
            if(p.hp <= 500 && p.hp > 0){
                for(let f=1;f<=121;f++) this._loadFrame('death',f);
            }
            // 死亡动画播放
            if(p.animOverride === 'death'){
                p.animTimer += dt*1000;
                const dfps = 120 * this.speedMult, dfInt = 1000/dfps;
                while(p.animTimer >= dfInt){p.animTimer -= dfInt; if(p.animFrame<121)p.animFrame++;}
                // 死亡动画收尾：延迟启动结算（让最后一帧展示片刻）
                if(p.animFrame >= 121 && !this.paused){
                    if(!this._deathDone){this._deathDone=0;}
                    this._deathDone += dt;
                    if(this._deathDone > 0.3){
                        this.paused = true; this.showSettings = false;
                        const loserIdx = this.players.indexOf(p);
                        const winnerIdx = loserIdx===0?1:0;
                        this.wins[winnerIdx]++;
                        this.roundWinner = this.players[winnerIdx].label;
                        if(this.gameMode==='一局定胜负' || this.wins[winnerIdx]>=2){
                            this.finalWinner = this.winner = this.players[winnerIdx];
                            this.roundWinner = null;
                        }
                        this._startVictory();
                    }
                }
            }
            // 技能动画播放（heal/buff/speed/slash等）— 近战动画由melee系统接管
            if(p.animOverride && p.animOverride!=='death' && !(this.melee&&this.melee.active!==false)){
                const afps = ((p.animOverride==='speed'||p.animOverride==='giantSword')?60:120) * this.speedMult;
                p.animTimer += dt*1000;
                const afInt = 1000/afps;
                while(p.animTimer >= afInt){p.animTimer -= afInt; p.animFrame++;}
                if(p.animFrame > 121){
                    // 挥砍结束→冰冻敌人
                    if(p.animOverride==='slash' && p._freezeTarget!=null){
                        const enemy = this.players[p._freezeTarget];
                        if(enemy.shielded){
                            enemy.shielded = false;
                            // 清除盾动画
                            if(enemy.animOverride==='shield') enemy.animOverride = null;
                        } else {
                            enemy.frozen = true; enemy.frozenTurns = 1;
                        }
                        p._freezeTarget = null;
                        // 冰冻结束，回到原位
                        this.players[0]._meleeOffX = 0; this.players[1]._meleeOffX = 0;
                    }
                    p.animOverride = null; p.animFrame = 1;
                }
            }
            // buff回合计数
            if(p.buff && p.buffTurns>0){
                // buff turns decrement handled on turn switch
            }
        }
        // 伤害飘字
        for(let i=this.dmgPopups.length-1;i>=0;i--){
            const dp=this.dmgPopups[i];
            dp.timer+=dt;
            if(dp.timer>1.2)this.dmgPopups.splice(i,1);
        }
        // 浮动提示更新
        for(let i=this.hints.length-1;i>=0;i--){
            this.hints[i].timer += dt;
            if(this.hints[i].timer > 1.2) this.hints.splice(i,1);
        }

        if(this.moving){
            const m=this.moving;
            m.timer+=dt*1000;
            const fInt=1000/(m.fps * this.speedMult);
            while(m.timer>=fInt){m.timer-=fInt;m.curFrame++;}
            if(m.curFrame>m.totalFrames){
                const p=this.players[m.pi]; p.pos=m.toV;
                if(m.toV==='V9'){ this.startMove(m.pi,'V9','V5','float'); return; }
                if(m.type==='float'&&m.toV==='V5'){ p.pos='V5'; p.flip=false; }
                let dmg=0;
                if(m.type==='drop'&&m.fromV==='V6'&&m.toV==='V4')dmg=700;
                if(m.type==='drop'&&m.fromV==='V7'&&m.toV==='V3')dmg=200;
                if(dmg>0){ p.hp=Math.max(0,p.hp-dmg); this.dmgPopups.push({px:m.pi,dmg,timer:0}); }
                this.moving=null;
                this.moved = true;
                if(m.type==='float'&&m.toV==='V5') return;
                if(this.skillUsed && this.moved && !this.players[this.turn]._buffedTurn) this.endTurn();
            }
        }
        // ═══ 待机配音 ═══
        if (!this.paused && !this.moving && !this.moveLoading && (!this.melee || this.melee.active===false)) {
            const p = this.players[this.turn];
            if (!p.dead && !p.animOverride) {
                const tc = this._voiceTurnCount || 0;
                if (tc >= this._voiceNextTurn && !this._voicePlayedThisTurn) {
                    this._tryIdleVoice();
                    this._voicePlayedThisTurn = true;
                    this._voiceTurnCount = 0;
                    this._voiceNextTurn = 2 + Math.floor(Math.random() * 2);
                }
            }
        }
    }

    getMovingCenter(){
        const m=this.moving; if(!m)return null;
        const kfs=m.kfs; if(kfs.length===0)return null;
        const f=m.curFrame; let p0=kfs[0],p1=kfs[kfs.length-1];
        for(let i=0;i<kfs.length-1;i++){
            if(f>=kfs[i].frame&&f<=kfs[i+1].frame){p0=kfs[i];p1=kfs[i+1];break;}
        }
        if(f<=p0.frame)return{cx:p0.cx,cy:p0.cy};
        if(f>=p1.frame)return{cx:p1.cx,cy:p1.cy};
        const t=(f-p0.frame)/(p1.frame-p0.frame);
        return{cx:p0.cx+(p1.cx-p0.cx)*t,cy:p0.cy+(p1.cy-p0.cy)*t};
    }

    render(ctx){
        if(!this.players||!Array.isArray(this.players)){this.renderLoading(ctx);return;}
        if(!this.ok){this.renderLoading(ctx);return;}
        ctx.fillStyle='#000';ctx.fillRect(0,0,this.w,this.h);

        const fn=this.cf();
        const bf=this.bf();

        // 渲染场景层
        for(const l of this.scene){
            let img;
            if(l.t==='pp') img = this._getFrame(l.k, bf);
            else if(l.t==='lp') img = this._getFrame(l.k, fn);
            else img = this.im[l.k];
            if(!img||!this._ok(img)){
                // 帧未加载→用缓存的上一帧兜底，避免闪黑
                img = this._lastGoodFrame[l.k];
                if(!img||!this._ok(img)) continue;
            } else {
                this._lastGoodFrame[l.k] = img;
            }
            if(l.til){
                const isSp = img.__sp && img.img;
                const tileKey = isSp ? (img.img.src+'_'+img.sx+'_'+img.sy) : img.src;
                if(!this.tilePattern || this._tileSrc !== tileKey){
                    const o=document.createElement('canvas');
                    o.width=l.tbW;o.height=l.tbH;
                    if(isSp) o.getContext('2d').drawImage(img.img, img.sx, img.sy, img.sw, img.sh, 0, 0, l.tbW, l.tbH);
                    else o.getContext('2d').drawImage(img,0,0,this._fw(img),this._fh(img),0,0,l.tbW,l.tbH);
                    this.tilePattern = ctx.createPattern(o,'repeat');
                    this._tileSrc = tileKey;
                }
                ctx.fillStyle=this.tilePattern;
                ctx.fillRect(l.x,l.y,l.w,l.h);
            } else {
                this._draw(ctx, img, l.x, l.y, l.w, l.h);
            }
        }

        // 暂停按钮按下反馈
        if(this._pressed==='pause'){
            const pb=this.pauseBtn;
            ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fillRect(pb.x,pb.y,pb.w,pb.h);
        }
        // 播放速度按钮（右上角）
        const sb=this.speedBtn;
        const labels = {[1/3]:'x1',[2/3]:'x2',[1]:'x3'};
        const smLabel = labels[this.speedMult] || 'x1';
        const pulse = 0.5 + 0.5 * Math.sin(Date.now()/300); // 一次性计算，避免两次不一致
        if(this._speedTutorial){
            ctx.strokeStyle=`rgba(255,215,0,${0.6+pulse*0.4})`;ctx.lineWidth=3;
            ctx.strokeRect(sb.x-4,sb.y-4,sb.w+8,sb.h+8);
            ctx.fillStyle='rgba(255,215,0,0.2)';ctx.fillRect(sb.x-4,sb.y-4,sb.w+8,sb.h+8);
        }
        ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(sb.x,sb.y,sb.w,sb.h);
        ctx.strokeStyle='rgba(224,192,112,0.5)';ctx.lineWidth=1.5;ctx.strokeRect(sb.x,sb.y,sb.w,sb.h);
        ctx.fillStyle='#e0c070';ctx.font='bold 14px sans-serif';ctx.textAlign='center';
        ctx.fillText(smLabel, sb.x+sb.w/2, sb.y+sb.h/2+5);
        // 首次提示弹窗
        if(this._speedTutorial){
            const tx = 960, ty = 240, tw = 420, th = 160;
            ctx.fillStyle='rgba(0,0,0,0.85)';ctx.fillRect(tx-tw/2,ty-th/2,tw,th);
            ctx.strokeStyle='rgba(224,192,112,0.6)';ctx.lineWidth=2;ctx.strokeRect(tx-tw/2,ty-th/2,tw,th);
            ctx.fillStyle='#e0c070';ctx.font='bold 22px sans-serif';ctx.textAlign='center';
            ctx.fillText('⚡ 播放速度提示', tx, ty-38);
            ctx.fillStyle='#fff';ctx.font='16px sans-serif';
            ctx.fillText('觉得动画慢？点击右上角按钮', tx, ty);
            ctx.fillText('可切换 ×1 / ×2 / ×3 倍速', tx, ty+25);
            // 知道了按钮
            const bx2 = tx-50, by2 = ty+48, bw2 = 100, bh2 = 36;
            ctx.fillStyle='rgba(224,192,112,0.3)';ctx.fillRect(bx2,by2,bw2,bh2);
            ctx.strokeStyle='#e0c070';ctx.lineWidth=1.5;ctx.strokeRect(bx2,by2,bw2,bh2);
            ctx.fillStyle='#e0c070';ctx.font='bold 16px sans-serif';
            ctx.fillText('知道了', tx, by2+26);
            // 引导箭头
            const arrowX = sb.x + sb.w/2, arrowY = sb.y + sb.h + 25;
            ctx.strokeStyle=`rgba(255,215,0,${0.5+pulse*0.5})`;ctx.lineWidth=2;
            ctx.beginPath();ctx.moveTo(arrowX, sb.y+sb.h+4);ctx.lineTo(arrowX, arrowY);
            ctx.moveTo(arrowX-6, arrowY-8);ctx.lineTo(arrowX, arrowY);ctx.lineTo(arrowX+6, arrowY-8);
            ctx.stroke();
        }

        // 可移动光圈光柱（缓存到离屏canvas，避免大量fillRect卡帧）
        if(!this.moving&&!this.moveLoading&&!this.moved){
            const moves=this._getReachable();
            const mk = Object.keys(moves).sort().join(',');
            if (mk !== this._beamKey) {
                this._beamKey = mk;
                const bc = this._beamCvs.getContext('2d');
                bc.clearRect(0, 0, this.w, this.h);
                for(const vid of Object.keys(moves)){
                    const z=this.pos[vid];if(!z)continue;
                    const gx=z.cx+960,base=z.cy+540+100;
                    const beamH=180,top=base-beamH,bands=16,bh=beamH/bands;
                    const levels=[{hw:6,a:1},{hw:14,a:0.7},{hw:28,a:0.4},{hw:40,a:0.2},{hw:54,a:0.08}];
                    for(const lv of levels){
                        for(let b=0;b<bands;b++){
                            const va=(b+1)/bands;
                            bc.fillStyle=`rgba(255,245,190,${(va*lv.a*0.7).toFixed(3)})`;
                            bc.fillRect(gx-lv.hw,top+b*bh,lv.hw*2,bh);
                        }
                    }
                    for(let b=0;b<bands;b++){
                        const va=(b+1)/bands;
                        bc.fillStyle=`rgba(255,255,245,${(va*0.75).toFixed(3)})`;
                        bc.fillRect(gx-5,top+b*bh,10,bh);
                    }
                }
            }
            ctx.drawImage(this._beamCvs, 0, 0);
        }

        // 渲染角色
        const r=this.charR;
        for(let i=0;i<this.players.length;i++){
            const p=this.players[i]; let cx,cy;
            if(this.moving && i===this.moving.pi){
                const mc=this.getMovingCenter();
                if(mc){cx=mc.cx;cy=mc.cy;}
                else{const pos=this.pos[p.pos];cx=pos.cx;cy=pos.cy;}
            } else {
                const pos=this.pos[p.pos];cx=pos.cx;cy=pos.cy;
            }
            // 震雷枪击退：防御方位置随受击帧插值（f1-f11击退，f11后保持击退位）
            if(this.melee && this.melee.active!==false && this.melee.thunderStarted && this.melee.defStarted && i===1-this.melee.pi){
                const m=this.melee; const df=m.defFrame;
                if(df<=6){
                    const t=(df-1)/5;
                    cx=m.d1x+(m.d6x-m.d1x)*t; cy=m.d1y+(m.d6y-m.d1y)*t;
                } else if(df<=11){
                    const t=(df-6)/5;
                    cx=m.d6x+(m.d11x-m.d6x)*t; cy=m.d6y+(m.d11y-m.d6y)*t;
                } else {
                    cx=m.d11x; cy=m.d11y;
                }
            }
            const sx=cx+960-r.w/2+(p._meleeOffX||0), sy=cy+540-r.h/2;
            // melee中：攻击方使用melee动画，防御方使用受击动画
            if(this.melee && this.melee.active!==false){
                if(i===this.melee.pi && this.melee.atkFrame < 121 && !p.dead){
                    p.animOverride = this.melee.animKey; p.animFrame = Math.max(1, this.melee.atkFrame);
                } else if(i===this.melee.pi && p.dead){
                    // 死亡时不覆盖动画
                } else if(i!==this.melee.pi && (this.melee.shieldPre || this.melee.shieldActive)){
                    if(!p.dead){ p.animOverride = 'shield'; p.animFrame = this.melee.shieldFrame; }
                } else if(i!==this.melee.pi && this.melee.defStarted){
                    if(!p.dead){ p.animOverride = this.melee.defAnim; p.animFrame = this.melee.defFrame; }
                }
            }

            // 冰冻状态渲染（特殊处理，不走动画链）
            if(p.frozen && !p.animOverride && !(this.moving&&i===this.moving.pi)){
                const fz = this.im['frozen'];
                if(fz && fz.naturalWidth>0){
                    const iw=fz.naturalWidth, ih=fz.naturalHeight;
                    ctx.save();ctx.translate(p.flip?sx+r.w/2:sx+r.w/2,sy+r.h/2);
                    if(p.flip)ctx.scale(-0.6,0.6);else ctx.scale(0.6,0.6);
                    ctx.drawImage(fz,-iw/2,-ih/2);
                    ctx.restore();
                }
                continue;
            }
            let animKey, animFrame;
            if(p.animOverride === 'death'){
                animKey = 'death';
                animFrame = p.animFrame || 1;
            } else if(p.animOverride === 'heal'){
                animKey = 'heal';
                animFrame = p.animFrame || 1;
            } else if(p.animOverride === 'buff'){
                animKey = 'buff';
                animFrame = p.animFrame || 1;
            } else if(p.animOverride === 'speed'){
                animKey = 'speed';
                animFrame = p.animFrame || 1;
            } else if(p.animOverride === 'slash'){
                animKey = 'slash';
                animFrame = p.animFrame || 1;
            } else if(p.animOverride && this.animPaths[p.animOverride]){
                // 通用动画映射（melee系列、受击、盾等）
                animKey = p.animOverride;
                animFrame = p.animFrame || 1;
            } else if(this.moving && i===this.moving.pi){
                animKey = this.moving.speedAnim?'speed':this.moving.type;
                animFrame = this.moving.curFrame;
            } else if(p.buff){
                animKey = 'buffIdle';
                animFrame = fn;
            } else {
                animKey = 'idle';
                animFrame = fn;
            }

            // 死亡动画：播完停住最后一帧，不消失
            if(p.animOverride === 'death'){
                ctx.globalAlpha = 1;
                const df = Math.min(p.animFrame||1, this.frameCounts.death||121);
                let cf2 = this._getFrame('death', df);
                if(!cf2 || !this._ok(cf2)) cf2 = p._lastDeathFrame;
                else p._lastDeathFrame = cf2;
                if(this._ok(cf2)){
                    if(p.flip){ctx.save();ctx.translate(sx+r.w,sy);ctx.scale(-1,1);this._draw(ctx,cf2,0,0,r.w,r.h);ctx.restore();}
                    else this._draw(ctx,cf2,sx,sy,r.w,r.h);
                }
                ctx.globalAlpha = 1;
            } else {
                // 统一走 _getFrame 获取帧（雪碧图走缓存描述符，逐帧走缓存 PNG）
                const cf = this._getFrame(animKey, animFrame);
                if(this._ok(cf)){
                    let alpha = 1;
                    if(this.moving && i===this.moving.pi && this.moving.type==='float'){
                        const f=this.moving.curFrame;
                        if(f>=100)alpha=1-(f-100)/21;
                    }
                    ctx.globalAlpha=Math.max(0,alpha);
                    if(p.stealthed>0) ctx.globalAlpha = 0.3;
                    if(p.flip){
                        ctx.save();ctx.translate(sx+r.w,sy);ctx.scale(-1,1);
                        this._draw(ctx,cf,0,0,r.w,r.h);
                        ctx.restore();
                    } else {
                        this._draw(ctx,cf,sx,sy,r.w,r.h);
                    }
                    ctx.globalAlpha=1;
                }
            }
        }

        // 淬毒刃特效渲染
        if(this.melee && this.melee.poisonStarted && !this.melee.defStarted){
            const m = this.melee;
            const pf = m.poisonFrame;
            const p = this.players[m.pi], enemy = this.players[1-m.pi];
            const atkPos = this.pos[p.pos], defPos = this.pos[enemy.pos];
            const effFaceRight = p.pos===enemy.pos ? p._meleeOffX < enemy._meleeOffX : defPos.cx > atkPos.cx;
            const gap = p.pos===enemy.pos ? Math.abs(p._meleeOffX-enemy._meleeOffX)||140 : Math.abs(defPos.cx-atkPos.cx)||406;
            const ratio = gap/406;
            const f6Off = 50*ratio, f50Off = 350*ratio;
            const t = Math.max(0, Math.min(1, (pf-6)/(51-6)));
            const offX = f6Off + (f50Off - f6Off) * t;
            const effX = atkPos.cx + 960 + (effFaceRight ? offX : -offX);
            const yFrac = 0.02 + 0.88 * t; // 从攻方斜飞到防方
            const effY = atkPos.cy + 540 + (defPos.cy - atkPos.cy) * yFrac + 11.06;
            const sc = 0.151, bw = 1280*sc, bh = 720*sc;
            const pb = this._getFrame('poisonBlade', pf);
            if(this._ok(pb)){
                this._draw(ctx, pb, effX - bw/2, effY - bh/2, bw, bh);
            }
        }

        // 烈焰斩特效渲染
        if(this.melee && this.melee.flameStarted && !this.melee.defStarted){
            const m = this.melee;
            const ff = m.flameFrame;
            const p = this.players[m.pi], enemy = this.players[1-m.pi];
            const atkPos = this.pos[p.pos], defPos = this.pos[enemy.pos];
            const effFaceRight = p.pos===enemy.pos ? p._meleeOffX < enemy._meleeOffX : defPos.cx > atkPos.cx;
            let f0Off = 87, f119Off = 222;
            if(p.pos===enemy.pos){ f0Off = 10; f119Off = 10; }
            const t = Math.max(0, Math.min(1, (ff-1)/(119-1)));
            const offX = f0Off + (f119Off - f0Off) * t;
            const effX = atkPos.cx + 960 + (effFaceRight ? offX : -offX);
            const yFrac = 0.02 + 0.88 * t;
            const effY = atkPos.cy + 540 + (defPos.cy - atkPos.cy) * yFrac + 13;
            const sc = 0.67, fw = 720, fh = 960, bw = fw*sc, bh = fh*sc;
            const fb = this._getFrame('flameBlade', ff);
            if(this._ok(fb)){
                ctx.save();
                if(effFaceRight){ ctx.translate(effX,effY); ctx.scale(-1,1); this._draw(ctx,fb,-bw/2,-bh/2,bw,bh); }
                else this._draw(ctx,fb, effX-bw/2, effY-bh/2, bw, bh);
                ctx.restore();
            }
        }

        // 激光特效渲染（melee活跃期间，且激光帧未播完）
        if(this.melee && this.melee.laserStarted && this.melee.active!==false && this.melee.laserFrame <= 121){
            const m = this.melee;
            const lf = m.laserFrame;
            const p = this.players[m.pi], enemy = this.players[1-m.pi];
            const atkPos = this.pos[p.pos], defPos = this.pos[enemy.pos];
            const angle = Math.atan2(defPos.cy - atkPos.cy, defPos.cx - atkPos.cx);
            const atkOnRight = atkPos.cx > defPos.cx;
            // 倾斜激光：JSON标定(V8↔V6), 位置=攻方+(守方-攻方)×比例
            const fracX = atkOnRight ? 0.564 : 0.563;
            const fracY = atkOnRight ? 0.483 : 0.514;
            const lx = atkPos.cx + 960 + (defPos.cx - atkPos.cx) * fracX;
            const ly = atkPos.cy + 540 + (defPos.cy - atkPos.cy) * fracY;
            const dist = this._graphDist(p.pos, enemy.pos);
            const scX = 0.618 * (dist===1 ? 0.5 : 1);
            const scY = 0.508;
            const rotRad = -32 * Math.PI / 180;
            const lb = this._getFrame('laser', lf);
            if(this._ok(lb)){
                ctx.save();
                const sameHeightBottom = Math.abs(defPos.cy - atkPos.cy) < 1 && atkPos.cy > 300;
                const v56flat = (p.pos==='V5'&&enemy.pos==='V6')||(p.pos==='V6'&&enemy.pos==='V5');
                if(sameHeightBottom || v56flat){
                    const dist = this._graphDist(p.pos, enemy.pos);
                    const fsX = 0.508 * (dist===0 ? 0.2 : dist===1 ? 0.5 : 1);
                    const fbw = 1280*fsX, fbh = 720*scY;
                    if(atkOnRight){ ctx.translate(lx,ly); ctx.scale(-1,1); this._draw(ctx,lb,-fbw/2,-fbh/2,fbw,fbh); }
                    else this._draw(ctx,lb, lx-fbw/2, ly-fbh/2, fbw, fbh);
                } else {
                    const bw = 1280*scX, bh = 720*scY;
                    ctx.translate(lx, ly);
                    ctx.rotate(rotRad);
                    if(atkOnRight) ctx.scale(-1, 1);
                    this._draw(ctx,lb, -bw/2, -bh/2, bw, bh);
                }
                ctx.restore();
            }
        }

        // 震雷枪特效渲染
        if(this.melee && this.melee.thunderStarted && this.melee.active!==false){
            const m = this.melee;
            const tf = m.thunderFrame;
            if(tf >= 50 && tf <= 121){
                // 帧81-83之间插值位置
                let tcx, tcy;
                if(tf <= 81){
                    tcx = m.t81x; tcy = m.t81y;
                } else if(tf >= 83){
                    tcx = m.t83x; tcy = m.t83y;
                } else {
                    const tt = (tf - 81) / 2;
                    tcx = m.t81x + (m.t83x - m.t81x) * tt;
                    tcy = m.t81y + (m.t83y - m.t81y) * tt;
                }
                const tb = this._getFrame('thunder', tf);
                if(this._ok(tb)){
                    const fw = this._fw(tb), fh = this._fh(tb);
                    const tbw = fw*0.44, tbh = fh*0.44;
                    ctx.save();
                    const tsx = tcx + 960, tsy = tcy + 540;
                    const atkP = this.players[m.pi], defP = this.players[1-m.pi];
                    const same = atkP.pos===defP.pos;
                    const atkOnRight = same ? !atkP.flip : this.pos[atkP.pos].cx > this.pos[defP.pos].cx;
                    if(atkOnRight){
                        ctx.translate(tsx, tsy);
                        ctx.scale(-1, 1);
                        this._draw(ctx, tb, -tbw/2, -tbh/2, tbw, tbh);
                    } else {
                        this._draw(ctx, tb, tsx-tbw/2, tsy-tbh/2, tbw, tbh);
                    }
                    ctx.restore();
                }
            }
        }

        // 玩家标签（炫酷版：轮到谁谁亮白底金字+发光）
        ctx.font='bold 22px "Microsoft YaHei",sans-serif';ctx.textAlign='center';
        for(let i=0;i<this.players.length;i++){
            const p=this.players[i];
            const pos=this.pos[p.pos],lx=pos.cx+960,ly=pos.cy+540-r.h/2+210;
            const m=ctx.measureText(p.label);
            const pw=m.width+28, ph=30, px=lx-pw/2, py=ly-22;
            const isTurn = i===this.turn;
            if(isTurn){
                // 轮到：白底金字+微光
                ctx.shadowColor='#ffd700';ctx.shadowBlur=4;
                ctx.fillStyle='rgba(255,255,255,0.95)';this.rr(ctx,px,py,pw,ph,8);
                ctx.shadowBlur=0;
                ctx.fillStyle='#c8960a';ctx.fillText(p.label,lx,ly-1);
                ctx.fillStyle='#ffd700';ctx.fillText(p.label,lx,ly);
            } else {
                // 未轮到：暗底灰字
                ctx.fillStyle='rgba(0,0,0,0.65)';this.rr(ctx,px,py,pw,ph,8);
                ctx.strokeStyle='rgba(255,255,255,0.1)';ctx.lineWidth=1;this.rr(ctx,px,py,pw,ph,8,true);
                ctx.fillStyle='#aaa';ctx.fillText(p.label,lx,ly-1);
            }
        }

        // 血条
        const tp=this.players[this.turn];
        const barW=260,barH=20,barR=10,barTop=12;
        for(let i=0;i<2;i++){
            const pp=this.players[i],bx=i===0?200:this.w-barW-200;
            const ratio=Math.max(0,pp.dispHp/pp.maxHp);
            const hue=ratio>0.5?120:ratio>0.2?42:0;
            const barFill=`hsla(${hue},85%,${ratio>0.5?45:ratio>0.2?52:48}%,1)`;
            const isTurn = i===this.turn;
            // 外框
            if(isTurn){
                ctx.shadowColor='#ffd700';ctx.shadowBlur=10;
            }
            ctx.fillStyle='rgba(0,0,0,0.6)';this.rr(ctx,bx-4,barTop-4,barW+8,barH+36,barR+2);
            ctx.strokeStyle=isTurn?'#ffd700':'rgba(255,255,255,0.2)';ctx.lineWidth=isTurn?2:1;
            this.rr(ctx,bx-4,barTop-4,barW+8,barH+36,barR+2,true);
            ctx.shadowBlur=0;
            // 玩家标签（外侧）
            ctx.font='bold 22px "Microsoft YaHei",sans-serif';
            if(i===0){
                ctx.textAlign='right';
                ctx.fillStyle=isTurn?'#ffd700':'#aaa';ctx.fillText(pp.label,bx-16,barTop+28);
            } else {
                ctx.textAlign='left';
                ctx.fillStyle=isTurn?'#ffd700':'#aaa';ctx.fillText(pp.label,bx+barW+16,barTop+28);
            }
            // 血槽底
            ctx.fillStyle='rgba(20,20,20,0.9)';this.rr(ctx,bx,barTop+18,barW,barH,barR);
            // 血量填充
            const g2=ctx.createLinearGradient(bx,barTop+18,bx,barTop+18+barH);
            g2.addColorStop(0,barFill);g2.addColorStop(0.4,barFill);g2.addColorStop(1,'rgba(0,0,0,0.3)');
            ctx.fillStyle=g2;this.rr(ctx,bx,barTop+18,barW*ratio,barH,barR);
            // 低血量脉冲光
            if(ratio<=0.2 && ratio>0){
                const pulse=0.3+0.3*Math.sin(Date.now()/200);
                ctx.fillStyle=`rgba(255,50,30,${pulse*0.2})`;
                this.rr(ctx,bx,barTop+18,barW*ratio,barH,barR);
            }
            // 血量数字（写在血条内部，居中）
            ctx.font='bold 16px monospace';ctx.textAlign='center';
            const hpText=`${Math.round(pp.dispHp)} / ${pp.maxHp}`;
            const cy=barTop+18+barH/2;
            // 描边文字（确保在任何血量颜色上都可见）
            ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillText(hpText,bx+barW/2+1,cy+5);
            ctx.fillStyle='#fff';ctx.fillText(hpText,bx+barW/2,cy+4);
            // 血槽边框（轮到者加发光）
            if(isTurn){
                ctx.shadowColor='#ffd700';ctx.shadowBlur=8;
            }
            ctx.strokeStyle=isTurn?'#ffd700':'rgba(255,255,255,0.3)';
            ctx.lineWidth=isTurn?2.5:1;
            this.rr(ctx,bx,barTop+18,barW,barH,barR,true);
            ctx.shadowBlur=0;
            // 高光渐变
            const grd=ctx.createLinearGradient(bx,barTop+18,bx,barTop+18+barH);
            grd.addColorStop(0,'rgba(255,255,255,0.25)');
            grd.addColorStop(0.5,'rgba(255,255,255,0)');
            grd.addColorStop(1,'rgba(0,0,0,0.15)');
            ctx.fillStyle=grd;this.rr(ctx,bx,barTop+18,barW*ratio,barH,barR);
        }

        // 伤害飘字
        const rh=this.charR.h;
        for(const dp of this.dmgPopups){
            const pp=this.players[dp.px],pos=this.pos[pp.pos];
            const px=pos.cx+960,py=pos.cy+540-rh/2+100-dp.timer*60;
            const alpha=Math.max(0,1-dp.timer/1.2);
            // 外发光+描边更显眼
            ctx.shadowColor='rgba(0,0,0,0.8)';ctx.shadowBlur=6;
            ctx.font='bold 38px "Microsoft YaHei",sans-serif';ctx.textAlign='center';
            ctx.strokeStyle=`rgba(0,0,0,${alpha*0.8})`;ctx.lineWidth=3;
            const isHeal = dp.type==='heal';
            ctx.strokeText(isHeal?`+${dp.dmg}`:`-${dp.dmg}`,px,py);
            ctx.fillStyle = isHeal ? `rgba(100,255,100,${alpha})` : dp.type==='poison' ? `rgba(180,60,255,${alpha})` : `rgba(255,60,30,${alpha})`;
            ctx.fillText(`-${dp.dmg}`,px,py);
            ctx.shadowBlur=0;ctx.lineWidth=1;
        }

        // 浮动提示 — 画面中央
        for (const h of this.hints) {
            const alpha = Math.min(1, 1 - Math.max(0, h.timer - 0.3) / 0.9);
            ctx.font = 'bold 32px "Microsoft YaHei",sans-serif'; ctx.textAlign = 'center';
            const mw = ctx.measureText(h.text).width;
            // 背景药丸
            ctx.fillStyle = `rgba(0,0,0,${alpha*0.75})`;
            this.rr(ctx, 960-mw/2-22, 370, mw+44, 44, 22);
            ctx.strokeStyle = `rgba(${h.color||'255,60,60'},${alpha*0.5})`;
            ctx.lineWidth = 1; this.rr(ctx, 960-mw/2-22, 370, mw+44, 44, 22, true);
            // 文字
            ctx.fillStyle = `rgba(${h.color||'255,60,60'},${alpha})`;
            ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4;
            ctx.fillText(h.text, 960, 402);
            ctx.shadowBlur = 0;
        }

        // ═══ 技能图标（左右两侧，从上到下：技1/技2/技3/回血）═══
        const ss=[this.skills1, this.skills2];
        for(let pi=0;pi<2;pi++){
            const skills=ss[pi];const pos=this.skPos[pi];const cd=this.cd[pi];
            const pp = this.players[pi];
            for(let si=0;si<4;si++){
                const sname = si<3?(skills[si]||''):'回血';
                if(!sname)continue;
                const icon = this.im['sk_'+sname];
                const p = pos[si]; if(!p)continue;
                const [sw,sh] = this.skSizes[sname] || [90.52,90.52];
                // 以位置点为中心绘制
                const ix = p.x - sw/2, iy = p.y - sh/2;
                if(icon && icon.naturalWidth>0){
                    const realCd = (sname==='无敌之盾' && pp.shieldCdUI>0) ? 0 : cd[si];
                ctx.globalAlpha = realCd>0?0.35:1;
                    ctx.drawImage(icon, ix, iy, sw, sh);
                    ctx.globalAlpha = 1;
                }
                // 冷却数字（改用交互框范围+圆角）
                if(cd[si]>0){
                    if(sname==='无敌之盾' && pp.shieldCdUI>0){/* 隐藏冷却UI */} else {
                    const h=this.skHit[pi][si];
                    const realCd2 = cd[si];
                    ctx.fillStyle='rgba(0,0,0,0.7)';this.rr(ctx,h.x,h.y,h.w,h.h,8);
                    ctx.fillStyle='#fff';ctx.font='bold 40px sans-serif';ctx.textAlign='center';
                    ctx.fillText(realCd2, h.x+h.w/2, h.y+h.h/2+14);
                    }
                }
                // 按下反馈（300ms持续，按交互框范围，圆角）
                if(this._pressFlash===('sk'+pi+si)){
                    const h=this.skHit[pi][si];
                    ctx.fillStyle='rgba(0,0,0,0.3)';this.rr(ctx,h.x,h.y,h.w,h.h,8);
                }
            }
        }

        // 比分显示（BO3模式）
        if(this.gameMode==='三局两胜' || this.round>1){
            ctx.fillStyle='rgba(0,0,0,0.5)';this.rr(ctx,this.w/2-80,0,160,30,0);
            ctx.fillStyle='#ffd700';ctx.font='bold 20px monospace';ctx.textAlign='center';
            ctx.fillText(this.wins[0]+' : '+this.wins[1],this.w/2,22);
        }

        // 底部提示栏
        ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(0,this.h-30,this.w,30);
        ctx.fillStyle='#ffd700';ctx.font='bold 16px sans-serif';ctx.textAlign='center';
        let hint;
        if(this.moveLoading) hint='加载移动动画中...';
        else if(this.moving) hint='移动中...';
        else {
            const pp = this.players[this.turn];
            const sp = pp.speedMode?' [神速]':'';
            hint = '轮到: '+tp.label+sp;
            if(!this.moved) hint += ' — 点击光圈移动';
            if(this.moved) hint += ' — 移动已用';
            if(this.skillUsed) hint += ' | 技能已用';
            else hint += ' | 可用技能';
            hint += ' | Enter结束';
        }
        ctx.fillText(hint,960,this.h-8);

        if(this.paused){
            if(this.victoryAnim) this.renderVictory(ctx);
            else if(this.showSettings)this.renderSettings(ctx);
            else this.renderPause(ctx);
        }
    }

    renderPause(ctx){
        ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(0,0,this.w,this.h);
        const w=400,h=260,x=(this.w-w)/2,y=(this.h-h)/2;
        const pg=ctx.createLinearGradient(x,y,x,y+h);
        pg.addColorStop(0,'rgba(20,18,30,0.92)');pg.addColorStop(1,'rgba(10,8,16,0.95)');
        ctx.fillStyle=pg;this.rr(ctx,x,y,w,h,16);
        ctx.strokeStyle='rgba(224,192,112,0.25)';ctx.lineWidth=1.5;this.rr(ctx,x,y,w,h,16,true);
        ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=1;this.rr(ctx,x+2,y+2,w-4,h-4,14,true);
        ctx.fillStyle='#e0c070';ctx.font='bold 28px sans-serif';ctx.textAlign='center';ctx.fillText('暂停',this.w/2,y+50);
        // "继续游戏"
        ctx.fillStyle='rgba(255,255,255,0.12)';this.rr(ctx,x+100,y+100,200,45,10);
        ctx.strokeStyle='rgba(224,192,112,0.3)';ctx.lineWidth=1.5;this.rr(ctx,x+100,y+100,200,45,10,true);
        if(this._pressed==='cont'){ctx.fillStyle='rgba(0,0,0,0.25)';this.rr(ctx,x+100,y+100,200,45,10);}
        ctx.fillStyle='#fff';ctx.font='bold 20px sans-serif';ctx.fillText('继续游戏',this.w/2,y+132);
        // "退出"
        ctx.fillStyle='rgba(160,50,50,0.6)';this.rr(ctx,x+60,y+170,120,45,8);
        ctx.strokeStyle='rgba(255,150,150,0.2)';ctx.lineWidth=1;this.rr(ctx,x+60,y+170,120,45,8,true);
        if(this._pressed==='exit'){ctx.fillStyle='rgba(0,0,0,0.35)';this.rr(ctx,x+60,y+170,120,45,8);}
        ctx.fillStyle='#fff';ctx.font='bold 18px sans-serif';ctx.fillText('退出',x+120,y+202);
        // "设置"
        ctx.fillStyle='rgba(255,255,255,0.15)';this.rr(ctx,x+220,y+170,120,45,8);
        ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=1;this.rr(ctx,x+220,y+170,120,45,8,true);
        if(this._pressed==='set'){ctx.fillStyle='rgba(0,0,0,0.25)';this.rr(ctx,x+220,y+170,120,45,8);}
        ctx.fillStyle='#fff';ctx.font='bold 18px sans-serif';ctx.fillText('设置',x+280,y+202);
    }
    pauseClick(x,y){
        const w=400,h=260,px=(this.w-w)/2,py=(this.h-h)/2;
        if(x>=px+60&&x<=px+180&&y>=py+170&&y<=py+215){this.paused=!1;this.g.switchScene('主菜单');return;}
        if(x>=px+220&&x<=px+340&&y>=py+170&&y<=py+215){this.showSettings=!0;return;}
        if(x>=px+100&&x<=px+300&&y>=py+100&&y<=py+145){this.paused=!1;this.showSettings=!1;}
    }

    renderVictory(ctx){
        const va = this.victoryAnim; if(!va)return;
        ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,0,this.w,this.h);
        // 缩放动画图片
        const s = va.scale;
        if(va.type==='final'){
            const f = Math.min(va.frame||1, 121);
            const cf = this.frameCache.get('vicFinal'+f);
            if(cf && cf.naturalWidth>0){
                ctx.save();ctx.translate(this.w/2,this.h/2);
                ctx.scale(1.5,1.5); // JSON scale: 1280×720 → 1920×1080
                ctx.drawImage(cf,-640,-360,1280,720);
                ctx.restore();
            }
        } else {
            const img = this.im['vic_'+va.imgKey];
            if(img && img.naturalWidth>0){
                const iw=img.naturalWidth, ih=img.naturalHeight;
                ctx.save();ctx.translate(this.w/2,this.h/2);
                ctx.scale(s,s);ctx.drawImage(img,-iw/2,-ih/2,iw,ih);
                ctx.restore();
            }
        }
        // 文字和按钮（缩放完成后显示）
        if(va.showText){
            const izCx=960, izCy=901.3;
            ctx.textAlign='center';
            if(this.winner || this.roundWinner){
                const label = this.winner ? this.winner.label : this.roundWinner;
                ctx.save();
                ctx.fillStyle='#000';ctx.font='bold 36px sans-serif';
                ctx.translate(izCx, izCy-15);ctx.scale(1.4,1);
                ctx.fillText(label+' 获得胜利！',0,0);
                ctx.restore();
                ctx.save();
                ctx.fillStyle='#000';ctx.font='bold 60px monospace';
                ctx.translate(izCx, izCy+35);ctx.scale(1.4,1);
                ctx.fillText(this.wins[0]+' : '+this.wins[1],0,0);
                ctx.restore();
            }
            if(this.winner){
                const bx=izCx-110, by=izCy+55, bw=220, bh=45;
                const vg=ctx.createLinearGradient(bx,by,bx,by+bh);
                vg.addColorStop(0,'rgba(30,25,20,0.85)');vg.addColorStop(1,'rgba(15,10,5,0.9)');
                ctx.fillStyle=vg;this.rr(ctx,bx,by,bw,bh,10);
                ctx.strokeStyle='#ffd700';ctx.lineWidth=2;this.rr(ctx,bx,by,bw,bh,10,true);
                ctx.fillStyle='#ffd700';ctx.shadowColor='rgba(255,215,0,0.3)';ctx.shadowBlur=6;
                ctx.font='bold 20px sans-serif';ctx.fillText('返回主菜单',izCx,by+31);
                ctx.shadowBlur=0;
            } else if(this.roundWinner){
                const bx=izCx-110, by=izCy+55, bw=220, bh=45;
                const vg2=ctx.createLinearGradient(bx,by,bx,by+bh);
                vg2.addColorStop(0,'rgba(30,25,20,0.85)');vg2.addColorStop(1,'rgba(15,10,5,0.9)');
                ctx.fillStyle=vg2;this.rr(ctx,bx,by,bw,bh,10);
                ctx.strokeStyle='#ffd700';ctx.lineWidth=2;this.rr(ctx,bx,by,bw,bh,10,true);
                ctx.fillStyle='#ffd700';ctx.shadowColor='rgba(255,215,0,0.3)';ctx.shadowBlur=6;
                ctx.font='bold 20px sans-serif';ctx.fillText('下一局',izCx,by+31);
                ctx.shadowBlur=0;
            }
        }
    }

    // 胜利画面点击
    victoryClick(x,y){
        const va = this.victoryAnim; if(!va||!va.showText)return;
        const izCx=960, izCy=901.3;
        if(this.winner){
            // 返回主菜单按钮
            const bx=izCx-110, by=izCy+55, bw=220, bh=45;
            if(x>=bx&&x<=bx+bw&&y>=by&&y<=by+bh){
                this.g.switchScene('主菜单',{gameMode:this.gameMode});
            }
        } else if(this.roundWinner){
            // 下一局按钮
            const bx=izCx-110, by=izCy+55, bw=220, bh=45;
            if(x>=bx&&x<=bx+bw&&y>=by&&y<=by+bh){
                this.g.switchScene('技能选择',{mode:this.mode,gameMode:this.gameMode,
                    p1:this.skills1,p2:this.skills2,wins:this.wins,round:this.round+1});
            }
        }
    }
    settingsClick(x,y){
        const w=500,h=405,px=(this.w-w)/2,py=(this.h-h)/2;
        if(x>=this.w/2-50&&x<=this.w/2+50&&y>=py+340&&y<=py+380){this.showSettings=!1;this.sliderDrag=null;return;}
        if(x>=px+200&&x<=px+400&&y>=py+95&&y<=py+125){this.sliderDrag='sfx';return;}
        if(x>=px+200&&x<=px+400&&y>=py+140&&y<=py+170){this.sliderDrag='bgm';}
        if(x>=px+200&&x<=px+400&&y>=py+185&&y<=py+215){this.sliderDrag='voice';}
    }
    updateSlider(x){
        const px=(this.w-500)/2,sx=px+200,sw=200;
        const v=Math.max(0,Math.min(1,(x-sx)/sw));
        if(this.sliderDrag==='sfx')this.g.sfxVol=v;else if(this.sliderDrag==='bgm')this.g.setBgmVol(v);else if(this.sliderDrag==='voice')this.g.voiceVol=v;
    }

    renderSettings(ctx){
        ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,0,this.w,this.h);
        const w=500,h=405,x=(this.w-w)/2,y=(this.h-h)/2;
        const pg=ctx.createLinearGradient(x,y,x,y+h);
        pg.addColorStop(0,'rgba(20,18,30,0.92)');pg.addColorStop(1,'rgba(10,8,16,0.95)');
        ctx.fillStyle=pg;this.rr(ctx,x,y,w,h,16);
        ctx.strokeStyle='rgba(224,192,112,0.25)';ctx.lineWidth=1.5;this.rr(ctx,x,y,w,h,16,true);
        ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=1;this.rr(ctx,x+2,y+2,w-4,h-4,14,true);
        ctx.fillStyle='#e0c070';ctx.font='bold 28px sans-serif';ctx.textAlign='center';ctx.fillText('设置',this.w/2,y+45);
        ctx.fillStyle='#ccc';ctx.font='20px sans-serif';ctx.textAlign='left';
        ctx.fillText('音效',x+60,y+110);this.drawSlider(ctx,x+200,y+95,200,24,this.g.sfxVol);
        ctx.fillText('背景音乐',x+60,y+155);this.drawSlider(ctx,x+200,y+140,200,24,this.g.bgmVol);
        ctx.fillText('配音',x+60,y+200);this.drawSlider(ctx,x+200,y+185,200,24,this.g.voiceVol);
        ctx.fillStyle='rgba(0,0,0,0.3)';this.rr(ctx,x+20,y+230,w-40,110,10);
        ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=1;this.rr(ctx,x+20,y+230,w-40,110,10,true);
        ctx.fillStyle='#aaa';ctx.font='13px monospace';ctx.textAlign='center';
        ctx.fillText('玩家1: 空格=普攻  U/I/O=技能1/2/3  P=回血',this.w/2,y+255);
        ctx.fillText('玩家2: 0=普攻  Num1/2/3=技能1/2/3  Num4=回血',this.w/2,y+283);
        ctx.fillStyle='rgba(255,255,255,0.4)';ctx.font='11px monospace';
        ctx.fillText('* 技能按选择先后顺序对应1/2/3键位',this.w/2,y+310);
        ctx.fillStyle='rgba(180,60,60,0.6)';this.rr(ctx,this.w/2-50,y+340,100,40,8);
        ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=1;this.rr(ctx,this.w/2-50,y+340,100,40,8,true);
        if(this._pressed==='close'){ctx.fillStyle='rgba(0,0,0,0.2)';this.rr(ctx,this.w/2-50,y+340,100,40,8);}
        ctx.fillStyle='#fff';ctx.font='18px sans-serif';ctx.textAlign='center';ctx.fillText('关闭',this.w/2,y+367);
    }
    drawSlider(ctx,x,y,w,h,val){
        const by=y+h/2-5;
        ctx.fillStyle='rgba(255,255,255,0.1)';this.rr(ctx,x,by,w,10,5);
        const fg=ctx.createLinearGradient(x,0,x+w*val,0);
        fg.addColorStop(0,'rgba(224,192,112,0.4)');fg.addColorStop(1,'rgba(255,215,0,0.7)');
        ctx.fillStyle=fg;this.rr(ctx,x,by,w*val,10,5);
        const hx=x+w*val, hy=y+h/2;
        const grd=ctx.createRadialGradient(hx-2,hy-2,2,hx,hy,12);
        grd.addColorStop(0,'#fff8dc');grd.addColorStop(0.5,'#ffd700');grd.addColorStop(1,'#b8960a');
        ctx.fillStyle=grd;ctx.beginPath();ctx.arc(hx,hy,12,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,0.5)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(hx,hy,12,0,Math.PI*2);ctx.stroke();
    }
    rr(ctx,x,y,w,h,r,s=false){
        ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);
        ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h-r);
        ctx.arcTo(x+w,y+h,x+w-r,y+h,r);ctx.lineTo(x+r,y+h);
        ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);
        ctx.arcTo(x,y,x+r,y,r);ctx.closePath();
        if(s)ctx.stroke();else ctx.fill();
    }

    /** 后台延迟加载：结算大图、冻结图、剩余结算帧 */
    async _deferredLoad(){
        const L = (k, u) => new Promise(r => {
            const i = new Image(); i.onload = () => { this.im[k] = i; r(); };
            i.onerror = () => r(); i.src = u;
        });
        await Promise.all([
            L('vic_第一局胜利','游戏资源/图像/UI/第一局胜利_透明.png'),
            L('vic_第二局胜利','游戏资源/图像/UI/第二局胜利_透明.png'),
            L('frozen','游戏资源/图像/人物/被冻住1_透明.png'),
        ]);
        // 结算帧剩余 11-121
        const vicPad = n => String(n).padStart(5,'0');
        for (let n = 61; n <= 121; n++) {
            const ck = 'vicFinal'+n;
            if(!this.frameCache.has(ck)){
                const img = new Image();
                img.onload = () => this.frameCache.set(ck, img);
                img.onerror = () => {};
                img.src = `${this.victoryFrameDir}/frame_${vicPad(n)}.png`;
            }
            if(n%10===0) await new Promise(r => setTimeout(r, 100));
        }
    }

    renderLoading(ctx){
        const t=Date.now();
        ctx.fillStyle='#0a0a15';ctx.fillRect(0,0,this.w,this.h);
        // 标题
        ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='bold 48px sans-serif';
        ctx.textAlign='center';ctx.fillText('骑士对决',960,430);
        // 转圈粒子
        for(let i=0;i<8;i++){
            const a=i/8*Math.PI*2+t/2000;
            const p=0.3+0.3*Math.sin(t/300+i);
            ctx.fillStyle=`rgba(224,192,112,${p})`;
            ctx.beginPath();ctx.arc(960+Math.cos(a)*60,500+Math.sin(a)*60,5+p*2,0,Math.PI*2);ctx.fill();
        }
        ctx.fillStyle='#e0c070';ctx.font='bold 24px sans-serif';
        ctx.fillText('加载中'+'.'.repeat(Math.floor(t/400)%4),960,570);
        // 进度条 — 假进度：超过10秒无更新则自动蠕动
        let pct = this.loadingProgress || 0;
        const realPct = pct;
        if (pct === this._lastRealPct) {
            const stuck = (Date.now() - this._lastProgressTime) / 1000;
            if (stuck > 10) pct = Math.min(94, Math.floor(realPct + (stuck - 10)));
        } else {
            this._lastRealPct = pct;
            this._lastProgressTime = Date.now();
        }
        const bx = 660, by = 600, bw = 600, bh = 18, br = 9;
        // 底色
        ctx.fillStyle='rgba(255,255,255,0.08)';
        ctx.beginPath();ctx.moveTo(bx+br,by);ctx.lineTo(bx+bw-br,by);
        ctx.arcTo(bx+bw,by,bx+bw,by+bh,br);ctx.lineTo(bx+bw,by+bh-br);
        ctx.arcTo(bx+bw,by+bh,bx+bw-br,by+bh,br);ctx.lineTo(bx+br,by+bh);
        ctx.arcTo(bx,by+bh,bx,by+bh-br,br);ctx.lineTo(bx,by+br);
        ctx.arcTo(bx,by,bx+br,by,br);ctx.fill();
        // 进度填充 (带渐变色)
        const fw = Math.max(br*2, (pct/100)*(bw-4));
        if(pct>0){
            const pg = ctx.createLinearGradient(bx,by,bx+bw,by);
            pg.addColorStop(0,'#c89a3c');pg.addColorStop(1,'#e0c070');
            ctx.fillStyle=pg;
            ctx.beginPath();ctx.moveTo(bx+2+br,by+2);ctx.lineTo(bx+2+fw-br,by+2);
            ctx.arcTo(bx+2+fw,by+2,bx+2+fw,by+bh-2,br);ctx.lineTo(bx+2+fw,by+bh-2-br);
            ctx.arcTo(bx+2+fw,by+bh-2,bx+2+fw-br,by+bh-2,br);ctx.lineTo(bx+2+br,by+bh-2);
            ctx.arcTo(bx+2,by+bh-2,bx+2,by+bh-2-br,br);ctx.lineTo(bx+2,by+2+br);
            ctx.arcTo(bx+2,by+2,bx+2+br,by+2,br);ctx.fill();
        }
        // 边框
        ctx.strokeStyle='rgba(224,192,112,0.4)';ctx.lineWidth=1.5;
        ctx.beginPath();ctx.moveTo(bx+br,by);ctx.lineTo(bx+bw-br,by);
        ctx.arcTo(bx+bw,by,bx+bw,by+bh,br);ctx.lineTo(bx+bw,by+bh-br);
        ctx.arcTo(bx+bw,by+bh,bx+bw-br,by+bh,br);ctx.lineTo(bx+br,by+bh);
        ctx.arcTo(bx,by+bh,bx,by+bh-br,br);ctx.lineTo(bx,by+br);
        ctx.arcTo(bx,by,bx+br,by,br);ctx.stroke();
        // 百分比文字（取整，不显示小数）
        ctx.fillStyle='#e0c070';ctx.font='bold 14px sans-serif';
        ctx.fillText(Math.floor(pct)+'%',960,638);
    }
    destroy(){
        const c=this.g.canvas;
        if(this._cl)c.removeEventListener('click',this._cl);
        if(this._mm)c.removeEventListener('mousemove',this._mm);
        if(this._mu)c.removeEventListener('mouseup',this._mu);
        if(this._md)c.removeEventListener('mousedown',this._md);
        if(this._kd)window.removeEventListener('keydown',this._kd);
        if(this._ts)c.removeEventListener('touchstart',this._ts);
        if(this._tm)c.removeEventListener('touchmove',this._tm);
        if(this._te)c.removeEventListener('touchend',this._te);
        if(this._te)c.removeEventListener('touchcancel',this._te);
        // 清理帧缓存释放内存
        this.frameCache.clear();
        this.tilePattern = null;
    }
}

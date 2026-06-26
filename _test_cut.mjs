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
        this._prevPos = ['','']; // 上一回合站位（用于近战方向判断）
        this.fps = 24; this.fTime = 1000/24;
        this.timer = 0; this.fIdx = 0; this.total = 121;
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
            meleeSlash: '游戏资源/雪碧图/meleeSlash.json',
            meleeChop: '游戏资源/雪碧图/meleeChop.json',
            buffAttack: '游戏资源/雪碧图/buffAttack.json',
            giantSword: '游戏资源/雪碧图/giantSword.json',
            hitReact: '游戏资源/雪碧图/hitReact.json',
            shield: '游戏资源/雪碧图/shield.json',
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
            poisonBlade:121, flameBlade:121,
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
        const pad = n => String(n).padStart(5, '0');
        const img = new Image();
        img.onload = () => {
            this.frameCache.set(ck, img);
            this.frameLoading.delete(ck);
            // 修剪缓存（保留最近使用的）
            if (this.frameCache.size > this.cacheMax) {
                // 优先删除非关键帧（保护scene/death动画）
                let deleted=0;
                for(const [k] of this.frameCache){
                    if(k[0]==='b'||k[0]==='s'||k[0]==='f'||k[0]==='i'||k.startsWith('death')) continue;
                    this.frameCache.delete(k); deleted++;
                    if(deleted>=50) break;
                }
                // 还不够就删最老的
                if(deleted<50){
                    const it2=this.frameCache.keys();
                    for(let i=0;i<50-deleted;i++){const k=it2.next().value;if(k)this.frameCache.delete(k);}
                }
            }
        };
        img.onerror = () => { this.frameLoading.delete(ck); };
        img.src = `${dir}/frame_${pad(num)}.png`;
    }

    /** 获取帧（带fallback：找最近的已加载帧） */
    _getFrame(key, num) {
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

    /** 后台渐进加载场景动画帧 */
    _bgLoad() {
        if (this.bgLoadIdx >= this.total * 4) return; // 4种动画全加载完
        const keys = ['bg', 'sz', 'fz', 'idle'];
        let loaded = 0;
        const maxPerTick = 8; // 每帧最多加载8张
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

    /** 预加载移动动画（全部帧） */
    async _preloadMove(type) {
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
                        if(k[0]==='b'||k[0]==='s'||k[0]==='f'||k[0]==='i'||k.startsWith('death')) continue;
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

        await Promise.all([
            L('地面', '游戏资源/图像/场景/地面.png'),
            L('平台', '游戏资源/图像/场景/平台_透明.png'),
            L('光圈', '游戏资源/图像/场景/光圈站位_透明.png'),
            L('暂停', '游戏资源/图像/UI/暂停1_透明.png'),
            LF('bg', 1), LF('sz', 1), LF('fz', 1), LF('idle', 1),
            LF('heal', 1), LF('death', 1), LF('buff', 1), LF('buffIdle', 1), LF('speed', 1), LF('slash', 1),
            LF('meleeSlash', 1), LF('meleeChop', 1), LF('buffAttack', 1), LF('giantSword', 1), LF('hitReact', 1), LF('shield', 1),
        ]);
        // 加载技能图标
        const allSkills = [...new Set([...this.skills1, ...this.skills2, '回血'])];
        const iconTasks = allSkills.map(s => L('sk_'+s, `游戏资源/图像/UI/${s}1_透明.png`));
        await Promise.all(iconTasks);
        // 预加载胜利结算图
        await Promise.all([
            L('vic_第一局胜利','游戏资源/图像/UI/第一局胜利_透明.png'),
            L('vic_第二局胜利','游戏资源/图像/UI/第二局胜利_透明.png'),
            L('frozen','游戏资源/图像/人物/被冻住1_透明.png'),
        ]);
        // 预加载最终结算关键帧（直接路径加载）
        const vicDir = this.victoryFrameDir;
        const pad5 = n => String(n).padStart(5,'0');
        const vicPreload = [1,30,60,90,121].map(n => new Promise(r=>{
            const img = new Image();
            img.onload=()=>{this.frameCache.set('vicFinal'+n,img);r();};
            img.onerror=()=>r();
            img.src=`${vicDir}/frame_${pad5(n)}.png`;
        }));
        await Promise.all(vicPreload);
        // 雪碧图预加载（仅已生成的）
        if(this.useSprite){
            this.sprite.load('meleeChop', '游戏资源/雪碧图/meleeChop.json').catch(()=>this.useSprite=false);
        }
        this.ok = true;

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
        this.players = [
            { pos:'V2', flip:true,  label:this.mode==='好友对战'?'房主':'玩家1', hp:2100, maxHp:2100, dispHp:2100, dead:false, buff:false, buffTurns:0, speedMode:false, stealthed:0, frozen:false, frozenTurns:0, shielded:false, shieldCdUI:0, poisoned:false, poisonTurns:0, weakened:false, weakenTurns:0, animOverride:null, animFrame:1, animTimer:0 },
            { pos:'V4', flip:false, label:this.mode==='好友对战'?'好友':'玩家2', hp:2100, maxHp:2100, dispHp:2100, dead:false, buff:false, buffTurns:0, speedMode:false, stealthed:0, frozen:false, frozenTurns:0, shielded:false, shieldCdUI:0, poisoned:false, poisonTurns:0, weakened:false, weakenTurns:0, animOverride:null, animFrame:1, animTimer:0 },
        ];

        this.pauseBtn = { x:-924.6+960, y:-515.76+540, w:63.31, h:63.31 };
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
            if(this.paused){
                if(this.victoryAnim){this.victoryClick(x,y);return;}
                if(!this.showSettings)this.pauseClick(x,y);
                else this.settingsClick(x,y);
                return;
            }
            if(x>=this.pauseBtn.x&&x<=this.pauseBtn.x+this.pauseBtn.w&&y>=this.pauseBtn.y&&y<=this.pauseBtn.y+this.pauseBtn.h){
                this.paused=!0;this.showSettings=!1;return;
            }
            if(this.moving||this.moveLoading)return;
            // 技能图标点击（使用JSON交互框）
            const pi=this.turn;
            for(let si=0;si<4;si++){
                const h=this.skHit[pi][si];
                if(x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h){
                    this._pressFlash='sk'+pi+si; this._pressTimer=0.3;
                    this.useSkill(pi,si);return;
                }
            }
            // 光圈点击（仅可到达的）
            const cp=this.players[pi];
            const reachable=this._getReachable();
            for(const z of this.zones){
                if(!reachable[z.id])continue;
                if(x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h){
                    this.onClickZone(z.id);return;
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
                const pw=500,ph=360,px=(this.w-pw)/2,py=(this.h-ph)/2;
                if(x>=px+200&&x<=px+400&&y>=py+95&&y<=py+125){this.sliderDrag='sfx';this._pressed='sfx';return;}
                if(x>=px+200&&x<=px+400&&y>=py+140&&y<=py+170){this.sliderDrag='bgm';this._pressed='bgm';return;}
                if(x>=this.w/2-50&&x<=this.w/2+50&&y>=py+300&&y<=py+340){this._pressed='close';return;}
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
        if(p.pos===vid||this.moving||this.moveLoading||this.moved||p.frozen)return;
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
        const faceRight = to.cx > from.cx; p.flip = faceRight;
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
        // 隐身计数（所有玩家）
        for(const pl of this.players){
            if(pl.stealthed>0){pl.stealthed--; if(pl.stealthed<=0)pl.stealthed=0;}
            if(pl.shieldCdUI>0) pl.shieldCdUI--;
        }
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

    _startVictory(){
        this.paused = true;
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
        if(this.moving||this.moveLoading||this.skillUsed)return;
        const p = this.players[pi];
        if(si<4 && this.cd[pi][si]>0)return;
        const skills = pi===0?this.skills1:this.skills2;
        const sname = si===4?'普攻':(si===3?'回血':(skills[si]||''));
        if(!sname)return;
        // 冰冻状态：只能使用回血和无敌之盾
        if(p.frozen && sname!=='回血' && sname!=='无敌之盾') return;
        // 隐身：无法选中 → 攻击技能无效（自buff类除外）
        const selfSkills = ['回血','强化','无敌之盾','隐身面具','神速'];
        const enemy = this.players[1-pi];
        if(!selfSkills.includes(sname) && enemy.stealthed>0) return;
        const cdMap = {回血:2,淬毒刃:3,震雷枪:2,隐身面具:3,无敌之盾:3,烈焰斩:3,强化:4,激光:3,巨剑术:4,神速:4,冰冻:3,普攻:0};
        const cdVal = cdMap[sname]||0;
        if(sname==='回血'){
            await this._preloadMove('heal');
            p.hp = Math.min(p.maxHp, p.hp + 800);
            this.dmgPopups.push({px:pi, dmg:800, timer:0, type:'heal'});
            if(si<4) this.cd[pi][si] = cdVal;
            this.skillUsed = true;
            p.animOverride = 'heal'; p.animFrame = 1; p.animTimer = 0;
        } else if(sname==='强化'){
            await this._preloadMove('buff');
            await this._preloadMove('buffIdle');
            if(si<4) this.cd[pi][si] = cdVal;
            // 强化不占用技能机会，可继续使用普攻
            p.buff = true; p.buffTurns = 2;
            p.animOverride = 'buff'; p.animFrame = 1; p.animTimer = 0;
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
            if(!isAdj) return;
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
            p._freezeTarget = 1-pi; // 挥砍结束后冰冻敌人
            // 敌人有盾：同时播放防御动画
            if(enemy.shielded){
                enemy.animOverride = 'shield'; enemy.animFrame = 1; enemy.animTimer = 0;
                p._shieldDef = 1-pi; // 记录对方播放盾
            }
        } else if(sname==='普攻'){
            await this._startMelee(pi);
        } else if(sname==='巨剑术'){
            if(si<4) this.cd[pi][si] = cdVal;
            await this._startMelee(pi, 'giantSword');
        } else if(sname==='淬毒刃'){
            const enemy = this.players[1-pi];
            // 攻击距离1：允许同身位(0)和邻身位(1)
            const isAdj = p.pos===enemy.pos || (this.graph[p.pos] && this.graph[p.pos][enemy.pos]);
            if(!isAdj) return;
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
            if(!isAdj) return;
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

        // 清除旧移动状态，防止update重复处理
        this.moving = null;
        // 预加载动画帧
        this.moveLoading = true;
        await this._preloadMove(animType);
        this.moveLoading = false;

        this.moving={pi,fromV,toV,type:animType,fps,totalFrames,kfs,curFrame:1,timer:0};
    }

    p(e){const r=this.g.canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*(1920/r.width),y:(e.clientY-r.top)*(1080/r.height)};}
    cf(){return(this.fIdx%this.total)+1;}
    bf(){return this.pingpongSeq[this.fIdx%this.ppLen];}

    update(dt){
        if(!this.ok || !this.players) return;
        // 按下反馈计时器
        if(this._pressTimer>0){this._pressTimer-=dt;if(this._pressTimer<=0)this._pressFlash=null;}
        // 胜利动画（即使paused也要更新）
        if(this.victoryAnim){
            const va=this.victoryAnim;
            va.timer += dt;
            if(va.type==='final'){
                va.frameTimer += dt*1000;
                const fps=120, fInt=1000/fps;
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
            const atkFps = m.fps, atkInt = 1000/atkFps;
            m.atkTimer += dt*1000;
            // 攻击延迟（盾需提前时，按帧延迟）
            if(m.atkDelay > 0){
                m.atkTimer += dt*1000;
                while(m.atkTimer >= atkInt && m.atkDelay > 0){m.atkTimer -= atkInt; m.atkDelay--;}
            } else {
                while(m.atkTimer >= atkInt){m.atkTimer -= atkInt; if(m.atkFrame < 121) m.atkFrame++;}
            }
            // 淬毒刃特效更新
            if(m.poisonHitFrame!==undefined && !m.poisonStarted && !m.defStarted && m.atkFrame >= m.hitFrame){
                m.poisonStarted = true; m.poisonFrame = 6; m.poisonTimer = 0;
            }
            if(m.poisonStarted && !m.defStarted){
                m.poisonTimer += dt*1000;
                const pInt = 1000/m.poisonFps;
                while(m.poisonTimer >= pInt){m.poisonTimer -= pInt; m.poisonFrame++;}
                // 帧命中 或 攻击动画播完+200ms兜底
                if(m.poisonFrame >= m.poisonHitFrame || (m.atkFrame >= 121 && m.poisonTimer > 200)){
                    const defPlayer = this.players[1-m.pi];
                    if(defPlayer.shielded){
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
            }
            if(m.flameStarted && !m.defStarted && !m.flameHit){
                m.flameTimer += dt*1000;
                const fInt = 1000/m.flameFps;
                while(m.flameTimer >= fInt){m.flameTimer -= fInt; m.flameFrame++;}
                // 烈焰斩第85帧启动盾动画
                if(!m.shieldPre && m.flameFrame >= m.flameShieldStart && this.players[1-m.pi].shielded){
                    m.shieldPre = true; m.shieldFrame = 1; m.shieldTimer = 0;
                }
                if(m.flameFrame >= m.flameHitFrame || (m.atkFrame >= 121 && m.flameTimer > 500)){
                    const defPlayer = this.players[1-m.pi];
                    if(defPlayer.shielded){
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
            // 盾动画：正常120fps播放，反推起点
            if(m.shieldPre && !m.shieldActive){
                if(m.shieldFrame > 0 || (m.shieldStartAt!=null && m.atkFrame >= m.shieldStartAt)){
                    if(m.shieldFrame===0) m.shieldFrame = 1;
                    m.shieldTimer += dt*1000;
                    while(m.shieldTimer >= 1000/120){m.shieldTimer -= 1000/120; m.shieldFrame++;}
                }
            }
            // 命中帧（淬毒刃跳过，由特效命中处理）
            if(!m.defStarted && m.atkFrame >= m.hitFrame && m.poisonHitFrame===undefined && m.flameHitFrame===undefined){
                m.defStarted = true;
                const defPlayer = this.players[1-m.pi];
                if(defPlayer.shielded){
                    m.shieldActive = true;
                    // 反伤200
                    const atkPlayer = this.players[m.pi];
                    atkPlayer.hp = Math.max(0, atkPlayer.hp - 200);
                    this.dmgPopups.push({px:m.pi, dmg:200, timer:0});
                    defPlayer.shielded = false;
                } else {
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
                    const shInt = 1000/120;
                    while(m.shieldTimer >= shInt){m.shieldTimer -= shInt; m.shieldFrame++;}
                    if(m.shieldFrame > 121) m.shieldFrame = 121;
                } else {
                    m.defTimer += dt*1000;
                    const defInt = 1000/m.defFps;
                    while(m.defTimer >= defInt){m.defTimer -= defInt; m.defFrame++;}
                }
            // 结束（淬毒刃/烈焰斩：受击播完才结束）
            if(m.poisonHitFrame!==undefined||m.flameHitFrame!==undefined ? (m.defStarted && m.defFrame>121) : (m.atkFrame>=121 || (m.shieldActive&&m.shieldFrame>121))){
                this.melee.active = false;
                this.players[0]._meleeOffX = 0; this.players[1]._meleeOffX = 0;
                this.players[0].animOverride = null; this.players[0].animFrame = 1;
                this.players[1].animOverride = null; this.players[1].animFrame = 1;
                if(this.skillUsed && this.moved) this.endTurn();
            }
        }
        if(this.paused) return;
        this.timer+=dt*1000;
        while(this.timer>=this.fTime){this.timer-=this.fTime;this.fIdx++;}

        // 后台渐进加载场景动画帧
        this._bgLoad();

        // 预加载当前帧附近的帧
        const fn=this.cf();
        const bf=this.bf();
        for(let i=0;i<8;i++){
            this._loadFrame('bg', this.pingpongSeq[(this.fIdx+i)%this.ppLen]);
            this._loadFrame('sz', ((this.fIdx+i)%this.total)+1);
            this._loadFrame('fz', ((this.fIdx+i)%this.total)+1);
            this._loadFrame('idle', ((this.fIdx+i)%this.total)+1);
        }

        // 血条插值 + 死亡检测
        for(const p of this.players){
            if(Math.abs(p.dispHp - p.hp) > 1) p.dispHp += (p.hp - p.dispHp) * Math.min(1, dt * 8);
            else p.dispHp = p.hp;
            // HP归零触发死亡
            if(p.hp <= 0 && !p.dead){
                p.dead = true;
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
                const dfps = 120, dfInt = 1000/dfps;
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
                const afps = (p.animOverride==='speed'||p.animOverride==='giantSword')?60:120;
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

        if(this.moving){
            const m=this.moving;
            m.timer+=dt*1000;
            const fInt=1000/m.fps;
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
                if(this.skillUsed && this.moved) this.endTurn();
            }
        }
    }

}

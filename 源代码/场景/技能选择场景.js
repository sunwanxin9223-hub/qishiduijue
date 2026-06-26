/**
 * 备战界面 — 严格按 备战界面正式 (1).json
 */
export class SkillSelectScene {
    constructor(g, d = {}) { this.g = g; this.w = 1920; this.h = 1080; this.im = {}; this.ok = false; this.md = d.mode || '本地对战'; this.role = d.role || ''; this.gameMode = d.gameMode || '一局定胜负'; this.pwins = d.wins || [0,0]; this.pround = d.round || 1; this.ph = 1; this.p1 = d.p1 || []; this.p2 = d.p2 || []; this.mx = 3; this.tr = false; this.hv = null; this._t = null; this.waiting = false; this._pressed = null; this._tip = null; this._hoverKey = null; this._hoverTime = 0; }

    async init() {
        const L = (k, u) => new Promise(r => { const i = new Image(); i.onload = () => { this.im[k] = i; r(); }; i.onerror = () => { this.im[k] = i; r(); }; i.src = u; });
        const B = '游戏资源/图像';
        // 后台异步加载图片，不阻塞界面显示
        Promise.all([
            L('bg', `${B}/场景/准备界面的背景1.webp`),
            L('ch', `${B}/人物/主角_透明.webp`),
            L('rdy',`${B}/UI/准备好了UI1_透明.webp`),
            L('淬毒刃1',  `${B}/UI/淬毒刃1_透明.webp`), L('震雷枪1',  `${B}/UI/震雷枪1_透明.webp`),
            L('隐身面具1',`${B}/UI/隐身面具1_透明.webp`), L('无敌之盾1',`${B}/UI/无敌之盾1_透明.webp`),
            L('烈焰斩1',  `${B}/UI/烈焰斩1_透明.webp`), L('强化1',    `${B}/UI/强化1_透明.webp`),
            L('激光1',    `${B}/UI/激光1_透明.webp`),   L('巨剑术1',  `${B}/UI/巨剑术1_透明.webp`),
            L('神速1',    `${B}/UI/神速1_透明.webp`),   L('冰冻1',    `${B}/UI/冰冻1_透明.webp`),
        ]);
        this.ok = true; // 立即显示界面，图片后台加载

        // 渲染层
        this.bg = { x: 0, y: 0, w: 1920, h: 1080 };
        this.chars = [
            { flip: true,  x: -945.07+960, y: -595.73+540, w: 921.43, h: 1228.57 },
            { flip: false, x: 44.62+960,   y: -595.73+540, w: 921.43, h: 1228.57 },
        ];
        this.skills = [
            { n:'淬毒刃1',   label:'淬毒刃',   x:-934.04+960, y:-561.53+540, w:243.92, h:243.92 }, { n:'震雷枪1',   label:'震雷枪',   x:-716.08+960, y:-528.01+540, w:174.28, h:174.28 },
            { n:'隐身面具1', label:'隐身面具', x:-528.42+960, y:-524.43+540, w:167.12, h:167.12 }, { n:'无敌之盾1', label:'无敌之盾', x:-386.63+960, y:-566.72+540, w:248.22, h:248.22 },
            { n:'烈焰斩1',   label:'烈焰斩',   x:-161.49+960, y:-522.18+540, w:162.61, h:162.61 }, { n:'巨剑术1',   label:'巨剑术',   x:332.31+960,  y:-561.50+540, w:241.25, h:241.25 },
            { n:'强化1',     label:'强化术',   x:165.83+960,  y:-550.85+540, w:219.96, h:219.96 }, { n:'神速1',     label:'神速决',   x:-3.34+960,   y:-538.46+540, w:200.70, h:200.70 },
            { n:'激光1',     label:'激光',     x:526.84+960,  y:-544.09+540, w:206.44, h:206.44 }, { n:'冰冻1',     label:'冰冻',     x:709.30+960,  y:-537.03+540, w:192.31, h:192.31 },
        ];
        this.readyBtns = [
            { x:-698.81+960, y:284.47+540, w:369.43, h:246.29 },
            { x:331.09+960,  y:282.76+540, w:369.43, h:246.29 },
        ];
        // 交互区
        this.hitSk = [
            { n:'淬毒刃1',   x:-896.95+960, y:-524.45+540, w:169.75, h:169.75 }, { n:'震雷枪1',   x:-709.85+960, y:-521.78+540, w:161.82, h:161.82 },
            { n:'隐身面具1', x:-522.52+960, y:-518.53+540, w:155.31, h:155.31 }, { n:'无敌之盾1', x:-342.75+960, y:-522.84+540, w:160.46, h:160.46 },
            { n:'烈焰斩1',   x:-155.98+960, y:-516.67+540, w:151.59, h:151.59 }, { n:'巨剑术1',   x:369.10+960,  y:-524.70+540, w:167.66, h:167.66 },
            { n:'强化1',     x:193.52+960,  y:-523.16+540, w:164.57, h:164.57 }, { n:'神速1',     x:16.17+960,   y:-518.95+540, w:161.67, h:161.67 },
            { n:'激光1',     x:547.21+960,  y:-523.72+540, w:165.70, h:165.70 }, { n:'冰冻1',     x:728.23+960,  y:-518.09+540, w:154.44, h:154.44 },
        ];
        this.hitRd = [
            { x:-651.01+960, y:362.24+540, w:273.83, h:90.76 },
            { x:378.64+960,  y:360.93+540, w:274.32, h:89.95 },
        ];

        // 技能说明数据
        this._desc = {
            '普攻':     '普攻 | 冷却:0\n基础伤害200（随机挥砍/竖劈）\n强化状态下伤害700\n需贴身释放\n贴身后自动分离面向对方',
            '回血':     '回血 | 冷却:2\n立即恢复800血量\n不可超过2100上限',
            '强化术':   '强化术 | 冷却:4\n进入强化状态2回合\n普攻伤害提升至700\n使用后本回合仍可移动+普攻\n但不能使用其他技能',
            '淬毒刃':   '淬毒刃 | 冷却:3\n挥砍起手→远程毒刃\n命中造成300伤害\n附带中毒（每回合-300）+弱化\n（减伤200，被攻击时少受200）\nⓘ 需距离≤1身位',
            '烈焰斩':   '烈焰斩 | 冷却:3\n竖劈起手→远程火焰斩\n命中造成1000伤害\nⓘ 需距离≤1身位',
            '激光':     '激光 | 冷却:3\n挥砍起手→持续激光照射\n造成225×4段=900伤害\nⓘ 需距离≤2身位\n盾首次触发反伤200后不再减伤',
            '震雷枪':   '震雷枪 | 冷却:2\n挥砍起手→雷电枪投掷\n命中造成800伤害\n并将敌人向后击退1个身位\nⓘ 需距离≤1身位',
            '巨剑术':   '巨剑术 | 冷却:4\n召唤巨剑重击\n命中造成1200伤害\nⓘ 需贴身同身位释放',
            '隐身面具': '隐身面具 | 冷却:3\n进入隐身1回合\n隐身期间无法被攻击技能选中\n（回血/强化/盾/神速仍可使用）',
            '无敌之盾': '无敌之盾 | 冷却:3（UI延迟显示）\n预先释放可格挡1次攻击\n并反伤攻击者200\n护盾持续到敌人回合结束后消失\nⓘ 需预判：在敌人攻击前使用\n提前放盾可挡住一切（含中毒/冰冻）',
            '神速决':   '神速决 | 冷却:4\n移动距离翻倍（可达2步）\n移动动画变为神速特效\n速度状态下正常移动不额外占用回合',
            '冰冻':     '冰冻 | 冷却:3\n挥砍前刺→冻结敌人1回合\n冻结期间敌人只能回血或开盾\nⓘ 需距离≤1身位\n若敌人有盾→只破盾不冻结',
        };

        const cv = this.g.canvas;
        this._mm = (e) => { const { x, y } = this.p(e); this._mx = x; this._my = y; this.hv = null;
            for (const h of [...this.hitSk, ...this.hitRd.map((r,i)=>({...r,n:'rd'+i}))]) { if(x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h){
                this.hv=h.n; cv.style.cursor='pointer';
                // 鼠标停留在技能图标上累积时间
                if (this._hoverKey !== h.n) { this._hoverKey = h.n; this._hoverTime = 0; this._tip = null; }
                return;
            } } cv.style.cursor='default'; this._hoverKey = null; this._hoverTime = 0; this._tip = null; };
        this._cl = (e) => { if(this.tr){this.tr=false;this.ph=2;if(this._t)clearTimeout(this._t);return;} const {x,y}=this.p(e); if(x>=10&&x<=130&&y>=this.h-50&&y<=this.h-10){this.g.playClick();this.g.switchScene('主菜单',{gameMode:this.gameMode});return;} for(const h of this.hitSk){if(x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h){this.g.playClick();this.tg(h.n);return;}} for(let i=0;i<2;i++){const r=this.hitRd[i];if(x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h){if(!this.role||(this.role==='房主'?i===0:i===1)){this.g.playClick2();this.cf(i);}return;}} };
        this._md = (e) => { const {x,y}=this.p(e); for(const h of this.hitSk){if(x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h){this._pressed=h.n;return;}} for(let i=0;i<2;i++){const r=this.hitRd[i];if(x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h){this._pressed='rd'+i;return;}} this._pressed=null; };
        this._mu = () => { this._pressed=null; };
        cv.addEventListener('mousemove',this._mm); cv.addEventListener('click',this._cl);
        cv.addEventListener('mousedown',this._md); cv.addEventListener('mouseup',this._mu);
        // 手机端长按提示
        cv.addEventListener('touchstart', (e) => {
            const t = e.touches[0]; const {x,y} = this.p(t);
            this._mx = x; this._my = y;
            for (const h of this.hitSk) {
                if (x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h) {
                    this._hoverKey = h.n; this._hoverTime = 0.6; // 立显
                    const s = this.skills.find(sk => sk.n === h.n);
                    if (s) this._tip = {label:s.label, x, y};
                    return;
                }
            }
        }, {passive:true});
        cv.addEventListener('touchend', () => { this._hoverKey = null; this._hoverTime = 0; this._tip = null; });
        cv.addEventListener('touchmove', () => { this._hoverKey = null; this._hoverTime = 0; this._tip = null; });
    }

    get cur(){return this.ph===1?this.p1:this.p2;}
    cl(n){return n.replace(/1$/,'');}
    tg(n){const c=this.cl(n);const s=this.cur;const i=s.indexOf(c);if(i>=0)s.splice(i,1);else if(s.length<this.mx)s.push(c);}
    cf(i){if(this.cur.length!==this.mx)return;if(this.role){this.waiting=true;return;}if(this.ph===1){this.tr=true;this._t=setTimeout(()=>{this.tr=false;this.ph=2;},1500);}else if(this.ph===2){this.g.switchScene('战斗',{mode:this.md,p1:this.p1,p2:this.p2,gameMode:this.gameMode,wins:this.pwins,round:this.pround});}}
    p(e){const r=this.g.canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*(this.w/r.width),y:(e.clientY-r.top)*(this.h/r.height)};}
    update(dt){
        if (this._hoverKey) {
            this._hoverTime += dt;
            if (this._hoverTime >= 0.6) {
                const s = this.skills.find(sk => sk.n === this._hoverKey);
                if (s) this._tip = { label: s.label, x: this._mx || 0, y: this._my || 0 };
            }
        }
    }

    render(ctx) {
        ctx.fillStyle='#0a0a15';ctx.fillRect(0,0,this.w,this.h);
        if(!this.ok){this.renderLoading(ctx);return;}
        // 背景图
        const bgImg = this.im['bg'];

        // 背景
        const bg=this.im['bg'];if(bg&&bg.naturalWidth>0)ctx.drawImage(bg,this.bg.x,this.bg.y,this.bg.w,this.bg.h);
        // 角色
        const ch=this.im['ch'];if(ch&&ch.naturalWidth>0)for(const c of this.chars){if(c.flip){ctx.save();ctx.translate(c.x+c.w,c.y);ctx.scale(-1,1);ctx.drawImage(ch,0,0,c.w,c.h);ctx.restore();}else ctx.drawImage(ch,c.x,c.y,c.w,c.h);}
        // 技能图标（原始大小，不缩放）
        for(let i=0;i<this.skills.length;i++){const s=this.skills[i];const img=this.im[s.n];if(!img||img.naturalWidth===0)continue;
            if(this.cur.includes(this.cl(s.n))){
                const h=this.hitSk[i];
                // 外发光
                ctx.shadowColor='#ffd700';ctx.shadowBlur=12;
                ctx.fillStyle='rgba(255,215,0,0.15)';this.rr(ctx,h.x-3,h.y-3,h.w+6,h.h+6,10);
                ctx.shadowBlur=0;
                // 粗金线圆角边框
                ctx.strokeStyle='#ffd700';ctx.lineWidth=3.5;this.rr(ctx,h.x-2,h.y-2,h.w+4,h.h+4,10,true);
                // 内层亮线（立体感）
                ctx.strokeStyle='rgba(255,255,240,0.6)';ctx.lineWidth=1;this.rr(ctx,h.x,h.y,h.w,h.h,8,true);
            }
            ctx.drawImage(img,s.x,s.y,s.w,s.h);
        }
        // 准备好了按钮 — 根据角色决定哪个按钮活跃
        const activeIdx = this.role === '好友' ? 1 : (this.ph === 1 ? 0 : 1);
        const rd=this.im['rdy'];if(rd&&rd.naturalWidth>0)for(let i=0;i<2;i++){const b=this.readyBtns[i];ctx.globalAlpha=i===activeIdx?(this.cur.length===this.mx?1:0.4):0.15;ctx.drawImage(rd,b.x,b.y,b.w,b.h);}ctx.globalAlpha=1;
        // 悬停 + 按下反馈
        if(this.hv||this._pressed){const all=[...this.hitSk,...this.hitRd.map((r,i)=>({...r,n:'rd'+i}))];const h=all.find(h=>h.n===this.hv||h.n===this._pressed);if(h){const press=this._pressed===h.n;
            ctx.fillStyle=`rgba(255,255,255,${press?0.08:0.12})`;ctx.fillRect(h.x,h.y,h.w,h.h);
            if(press){ctx.fillStyle='rgba(0,0,0,0.1)';ctx.fillRect(h.x,h.y,h.w,h.h);}
        }}

        // ═══ UI 标注（在所有图像之后绘制，确保不被遮挡）═══
        // 技能名称 — 按交互框位置标注，选中技能显示序号
        ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
        for (let i = 0; i < this.skills.length; i++) {
            const s = this.skills[i];
            const h = this.hitSk[i];
            const lx = h.x + h.w / 2;
            const ly = h.y + h.h + 6;
            const label = s.label;
            const selIdx = this.cur.indexOf(this.cl(s.n));
            if(selIdx >= 0){
                // 已选中：显示技能序号
                const numLabel = '技能'+(selIdx+1);
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                const m1 = ctx.measureText(label);
                ctx.fillRect(lx - m1.width/2 - 8, ly, m1.width + 16, 22);
                ctx.fillStyle = '#fff';
                ctx.fillText(label, lx, ly + 15);
                // 序号标签
                ctx.fillStyle = 'rgba(0,0,0,0.8)';
                const m2 = ctx.measureText(numLabel);
                ctx.fillRect(lx - m2.width/2 - 6, ly - 20, m2.width + 12, 18);
                ctx.fillStyle = '#ffd700';
                ctx.fillText(numLabel, lx, ly - 8);
            } else {
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                const m = ctx.measureText(label);
                ctx.fillRect(lx - m.width / 2 - 8, ly, m.width + 16, 22);
                ctx.fillStyle = '#fff';
                ctx.fillText(label, lx, ly + 15);
            }
        }

        // 玩家标签 — 放在角色头顶可见位置
        if (this.md === '本地对战') {
            ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center';
            for (let i = 0; i < 2; i++) {
                const c = this.chars[i];
                const label = i === 0 ? '玩家1' : '玩家2';
                const lx = c.x + c.w / 2, ly = c.y + 50;
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                const m = ctx.measureText(label);
                ctx.fillRect(lx - m.width / 2 - 12, ly - 22, m.width + 24, 30);
                ctx.fillStyle = '#ffd700'; ctx.fillText(label, lx, ly);
            }
        } else if (this.role) {
            // 在线模式：只在对应角色头顶显示标签
            const idx = this.role === '好友' ? 1 : 0;
            const c = this.chars[idx];
            ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center';
            const lx = c.x + c.w / 2, ly = c.y + 50;
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            const m = ctx.measureText(this.role);
            ctx.fillRect(lx - m.width / 2 - 12, ly - 22, m.width + 24, 30);
            ctx.fillStyle = '#ffd700'; ctx.fillText(this.role, lx, ly);
        }

        // 顶部提示
        ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(0,0,this.w,36);
        ctx.fillStyle='#ffd700';ctx.font='bold 20px sans-serif';ctx.textAlign='center';
        const myLabel = this.role || (this.ph===1?'玩家1':'玩家2');
        const isP1 = (!this.role) ? this.ph===1 : this.role==='房主';
        const keys = isP1 ? '技能1=U 技能2=I 技能3=O 回血=P' : '技能1=Num1 技能2=Num2 技能3=Num3 回血=Num4';
        ctx.fillText(myLabel+' — 请选择 3 个技能 | 已选 '+this.cur.length+'/3',960,20);
        ctx.font='bold 12px monospace';ctx.fillStyle='#aaa';
        ctx.fillText(keys,960,34);

        if(this.tr){const trLabel=this.md==='好友对战'?'好友':'玩家2';ctx.fillStyle='rgba(0,0,0,0.8)';ctx.fillRect(0,0,this.w,this.h);ctx.fillStyle='#ffd700';ctx.font='bold 48px sans-serif';ctx.textAlign='center';ctx.fillText('请将设备交给 '+trLabel,960,540);ctx.fillStyle='#aaa';ctx.font='24px sans-serif';ctx.fillText('点击任意位置继续',960,600);}
        if(this.waiting){const other=this.role==='房主'?'好友':'房主';ctx.fillStyle='rgba(0,0,0,0.8)';ctx.fillRect(0,0,this.w,this.h);ctx.fillStyle='#ffd700';ctx.font='bold 36px sans-serif';ctx.textAlign='center';ctx.fillText('已准备就绪，等待'+other+'选择...',960,540);ctx.fillStyle='#aaa';ctx.font='20px sans-serif';ctx.fillText('双方都准备好后将自动开始',960,590);}

        // 返回按钮 — 最上层渲染，圆角
        ctx.fillStyle='rgba(0,0,0,0.6)';this.rr(ctx,10,this.h-50,120,40,8);
        ctx.strokeStyle='rgba(255,255,255,0.3)';ctx.lineWidth=1;this.rr(ctx,10,this.h-50,120,40,8,true);
        ctx.fillStyle='#fff';ctx.font='18px sans-serif';ctx.textAlign='center';ctx.fillText('← 返回',70,this.h-25);
        // ═══ 技能提示框 ═══
        if (this._tip) {
            const desc = this._desc[this._tip.label];
            if (desc) {
                const lines = desc.split('\n');
                ctx.font = 'bold 18px sans-serif';
                const lw = Math.max(...lines.map(l => ctx.measureText(l).width)) + 32;
                const lh = lines.length * 26 + 28;
                let tx = this._tip.x + 20, ty = this._tip.y - lh - 10;
                if (tx + lw > this.w - 10) tx = this.w - lw - 10;
                if (ty < 10) ty = this._tip.y + 20;
                ctx.fillStyle = 'rgba(0,0,0,0.85)'; this.rr(ctx, tx, ty, lw, lh, 10);
                ctx.strokeStyle = 'rgba(224,192,112,0.4)'; ctx.lineWidth = 1; this.rr(ctx, tx, ty, lw, lh, 10, true);
                ctx.fillStyle = '#ffd700'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'left';
                ctx.fillText(lines[0], tx + 16, ty + 26);
                ctx.fillStyle = '#ddd'; ctx.font = '16px sans-serif';
                for (let i = 1; i < lines.length; i++) ctx.fillText(lines[i], tx + 16, ty + 26 + i * 26);
            }
        }
    }

    renderLoading(ctx) {
        // 转场动画：脉冲圆点
        const t=Date.now();
        const cx=960,cy=540;
        ctx.fillStyle='#0a0a15';ctx.fillRect(0,0,this.w,this.h);

        // 装饰圆环
        for(let i=0;i<8;i++){
            const a=i/8*Math.PI*2+t/2000;
            const r=60+Math.sin(t/500+i)*10;
            const ox=cx+Math.cos(a)*r;
            const oy=cy+Math.sin(a)*r;
            const alpha=0.3+0.3*Math.sin(t/300+i);
            ctx.fillStyle=`rgba(224,192,112,${alpha})`;
            ctx.beginPath();ctx.arc(ox,oy,5+alpha*2,0,Math.PI*2);ctx.fill();
        }

        // 中心文字
        const dots='.'.repeat(Math.floor(t/400)%4);
        ctx.fillStyle='#e0c070';ctx.font='28px sans-serif';ctx.textAlign='center';
        ctx.fillText('加载中'+dots,cx,cy+80);

        // 标题
        ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='bold 48px sans-serif';
        ctx.fillText('骑士对决',cx,cy-40);
    }

    destroy(){const c=this.g.canvas;c.style.cursor='default';if(this._mm)c.removeEventListener('mousemove',this._mm);if(this._cl)c.removeEventListener('click',this._cl);if(this._md)c.removeEventListener('mousedown',this._md);if(this._mu)c.removeEventListener('mouseup',this._mu);if(this._t)clearTimeout(this._t);}

    rr(ctx,x,y,w,h,r,s=false){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();if(s)ctx.stroke();else ctx.fill();}
}

/**
 * 主菜单 — 骑士对决
 */
export class MenuScene {
    constructor(g, d={}) { this.g = g; this.w = 1920; this.h = 1080; this.im = {}; this.ok = false; this.s = false; this.hv = null; this.gameMode = d.gameMode || localStorage.getItem('gameMode') || '一局定胜负'; this.sliderDrag = null; this._pressed = null; }

    async init() {
        const L = (k, u) => new Promise(r => { const i = new Image(); i.onload = () => { this.im[k] = i; r(); }; i.onerror = () => r(); i.src = u; });
        await Promise.all([L('bg','游戏资源/图像/UI/主页.png'),L('bg_morning','游戏资源/图像/场景/主页早晨.png'),L('bg_evening','游戏资源/图像/场景/主页晚上.png')]);
        this.ok = true;
        // 时间自适应背景：6-12早晨 12-19下午 19-6晚上
        const h = new Date().getHours();
        this.bgKey = h>=6&&h<12?'bg_morning':h>=12&&h<19?'bg':'bg_evening';
        this.layers = [{i:this.bgKey,x:0,y:0,w:1920,h:1080,o:0}];
        // JSON交互框数据（topLeft相对画布中心，需+960/+540转绝对坐标）
        const C=(x,y,w,h,go)=>({x:x+960,y:y+540,w,h,go});
        const btnSets = {
            morning: [
                C(334.98,-54.03,490.05,136.05, ()=>this.g.switchScene('技能选择',{mode:'本地对战',gameMode:this.gameMode})),
                C(329.98,119.97,496.05,136.05, ()=>this.g.switchScene('房间',{mode:'创建'})),
                C(769.01,367.01,125.97,125.97, ()=>{this.s=true}),
            ],
            afternoon: [
                C(352.57,-128.34,494.17,133.86, ()=>this.g.switchScene('技能选择',{mode:'本地对战',gameMode:this.gameMode})),
                C(356.9,68.79,485.51,132.15, ()=>this.g.switchScene('房间',{mode:'创建'})),
                C(783.07,391.75,105.21,100.34, ()=>{this.s=true}),
            ],
            evening: [
                C(364.97,-62.48,466.07,108.96, ()=>this.g.switchScene('技能选择',{mode:'本地对战',gameMode:this.gameMode})),
                C(367,98,466,108, ()=>this.g.switchScene('房间',{mode:'创建'})),
                C(804,394,108,108, ()=>{this.s=true}),
            ],
        };
        const key = h>=6&&h<12?'morning':h>=12&&h<19?'afternoon':'evening';
        this.btns = [
            { id:'本地对战', ...btnSets[key][0] },
            { id:'好友联机', ...btnSets[key][1] },
            { id:'设置', ...btnSets[key][2] },
        ];
        const cv=this.g.canvas;
        this._mm=(e)=>{const{x,y}=this.p(e);this.hv=null;
            if(this.sliderDrag){this.updateSlider(x);return;}
            for(const b of this.btns){if(x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h){this.hv=b.id;cv.style.cursor='pointer';return;}}
            if(this.s){const pw=700,ph=550,px=(this.w-pw)/2-30,py=(this.h-ph)/2;
                if(x>=px&&x<=px+pw&&y>=py&&y<=py+ph&&y>=py+440&&y<=py+500){cv.style.cursor='pointer';return;}
                if(x>=px+350&&x<=px+450&&y>=py+215&&y<=py+250){cv.style.cursor='pointer';return;}
                // BGM曲目切换按钮
                const btx=px+580,bty=py+130,btw=70,bth=30;
                if(x>=btx&&x<=btx+btw&&y>=bty&&y<=bty+bth){cv.style.cursor='pointer';return;}
                // 滑块区域
                const sx1=px+200,sw=380,sy1=py+88,sh=24; const sx2=px+200,sy2=py+133; const sx3=px+200,sy3=py+178;
                if(x>=sx1&&x<=sx1+sw&&y>=sy1&&y<=sy1+sh){cv.style.cursor='ew-resize';return;}
                if(x>=sx2&&x<=sx2+sw&&y>=sy2&&y<=sy2+sh){cv.style.cursor='ew-resize';return;}
                if(x>=sx3&&x<=sx3+sw&&y>=sy3&&y<=sy3+sh){cv.style.cursor='ew-resize';return;}
            }cv.style.cursor='default';};
        this._cl=(e)=>{const{x,y}=this.p(e);this.g.playClick();
            if(this.s){this.sClick(x,y);return;}for(const b of this.btns){if(x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h){b.go();return;}}};
        this._md=(e)=>{
            const{x,y}=this.p(e);
            if(this.s){
                const pw=700,ph=550,px=(this.w-pw)/2-30,py=(this.h-ph)/2;
                const sx=px+200,sw=380;
                if(x>=sx&&x<=sx+sw&&y>=py+88&&y<=py+112){this.sliderDrag='sfx';this.updateSlider(x);return;}
                if(x>=sx&&x<=sx+sw&&y>=py+133&&y<=py+157){this.sliderDrag='bgm';this.updateSlider(x);return;}
                if(x>=sx&&x<=sx+sw&&y>=py+178&&y<=py+202){this.sliderDrag='voice';this.updateSlider(x);return;}
                if(x>=px+350&&x<=px+450&&y>=py+215&&y<=py+250){this._pressed='mode';return;}
                const btx=px+580,bty=py+130,btw=70,bth=30;
                if(x>=btx&&x<=btx+btw&&y>=bty&&y<=bty+bth){this._pressed='bgmtrack';return;}
                if(x>=this.w/2-50&&x<=this.w/2+50&&y>=py+440&&y<=py+500){this._pressed='close';return;}
                return;
            }
            for(const b of this.btns){if(x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h){this._pressed=b.id;return;}}
            this._pressed=null;
        };
        this._mu=()=>{this.sliderDrag=null;this._pressed=null;};
        cv.addEventListener('mousemove',this._mm);cv.addEventListener('click',this._cl);
        cv.addEventListener('mousedown',this._md);cv.addEventListener('mouseup',this._mu);
        // 移动端触摸
        this._ts = e => { e.preventDefault(); this._md(e.touches[0]); };
        this._tm = e => { e.preventDefault(); this._mm(e.touches[0]); };
        this._te = e => { e.preventDefault(); this._mu(); this._cl(e.changedTouches[0]); };
        cv.addEventListener('touchstart', this._ts, {passive: false});
        cv.addEventListener('touchmove', this._tm, {passive: false});
        cv.addEventListener('touchend', this._te);
        cv.addEventListener('touchcancel', this._te);
    }

    sClick(x,y){
        const pw=700,ph=550,px=(this.w-pw)/2-30,py=(this.h-ph)/2;
        if(x>=this.w/2-50&&x<=this.w/2+50&&y>=py+440&&y<=py+500){this.s=false;return;}
        if(x>=px+350&&x<=px+450&&y>=py+215&&y<=py+250){this.gameMode=this.gameMode==='一局定胜负'?'三局两胜':'一局定胜负';localStorage.setItem('gameMode',this.gameMode);return;}
        // BGM 曲目切换
        const btx=px+580,bty=py+130,btw=70,bth=30;
        if(x>=btx&&x<=btx+btw&&y>=bty&&y<=bty+bth){this.g.switchBgm((this.g.bgmIndex+1)%4);return;}
        if(x<px||x>px+pw||y<py||y>py+ph){this.s=false;}
    }

    p(e){const r=this.g.canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*(this.w/r.width),y:(e.clientY-r.top)*(this.h/r.height)};}
    updateSlider(x){const sx=580+200;const sw=380;const val=Math.max(0,Math.min(1,(x-sx)/sw));if(this.sliderDrag==='sfx')this.g.sfxVol=val;else if(this.sliderDrag==='bgm')this.g.setBgmVol(val);else if(this.sliderDrag==='voice')this.g.voiceVol=val;}
    update(dt){}

    render(ctx){
        ctx.fillStyle='#000';ctx.fillRect(0,0,this.w,this.h);
        if(!this.ok){this.renderLoading(ctx);return;}
        for(const l of this.layers){const img=this.im[l.i];if(img&&img.naturalWidth>0)ctx.drawImage(img,l.x,l.y,l.w,l.h);}
        if(this.hv||this._pressed){const b=this.btns.find(b=>b.id===this.hv||b.id===this._pressed);if(b){
            const press=this._pressed===b.id;
            ctx.fillStyle=`rgba(255,255,255,${press?0.08:0.12})`;this.rr(ctx,b.x,b.y,b.w,b.h,12);
            if(press){ctx.fillStyle='rgba(0,0,0,0.15)';this.rr(ctx,b.x,b.y,b.w,b.h,12);}
        }}
        if(this.s)this.renderSettings(ctx);
    }

    renderSettings(ctx){
        ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(0,0,this.w,this.h);
        const pw=700,ph=550,px=(this.w-pw)/2-30,py=(this.h-ph)/2;
        // 面板：暗色渐变底
        const pg=ctx.createLinearGradient(px,py,px,py+ph);
        pg.addColorStop(0,'rgba(20,18,30,0.92)');pg.addColorStop(1,'rgba(10,8,16,0.95)');
        ctx.fillStyle=pg;this.rr(ctx,px,py,pw,ph,16);
        ctx.strokeStyle='rgba(224,192,112,0.25)';ctx.lineWidth=1.5;this.rr(ctx,px,py,pw,ph,16,true);
        // 面板内发光线
        ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=1;this.rr(ctx,px+2,py+2,pw-4,ph-4,14,true);
        ctx.fillStyle='#e0c070';ctx.font='bold 28px sans-serif';ctx.textAlign='center';ctx.fillText('设置',this.w/2-30,py+45);

        ctx.fillStyle='#ccc';ctx.font='20px sans-serif';
        ctx.fillText('音效: 开启',px+150,py+105);
        const bgmNames = ['慷慨激昂','低调振奋','悠扬唯美','磅礴大气'];
        ctx.fillText('背景音乐: '+bgmNames[this.g.bgmIndex],px+150,py+145);
        ctx.fillText('配音: 开启',px+150,py+195);
        // 音量滑块
        this.drawSlider(ctx,px+200,py+88,380,24,this.g.sfxVol);
        this.drawSlider(ctx,px+200,py+133,380,24,this.g.bgmVol);
        // 切换曲目按钮
        const btx=px+580, bty=py+130, btw=70, bth=30;
        const btg=ctx.createLinearGradient(btx,bty,btx,bty+bth);
        btg.addColorStop(0,'rgba(255,255,255,0.1)');btg.addColorStop(1,'rgba(255,255,255,0.04)');
        ctx.fillStyle=btg;this.rr(ctx,btx,bty,btw,bth,6);
        ctx.strokeStyle='rgba(224,192,112,0.25)';ctx.lineWidth=1.5;this.rr(ctx,btx,bty,btw,bth,6,true);
        if(this._pressed==='bgmtrack'){ctx.fillStyle='rgba(0,0,0,0.25)';this.rr(ctx,btx,bty,btw,bth,6);}
        ctx.fillStyle='rgba(255,255,255,0.85)';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText('▶ 切换',btx+btw/2,bty+20);ctx.textAlign='left';
        this.drawSlider(ctx,px+200,py+178,380,24,this.g.voiceVol);
        ctx.fillText('胜负方式:',this.w/2-110,py+248);
        ctx.fillStyle='rgba(255,255,255,0.2)';this.rr(ctx,px+350,py+215,100,35,6);
        if(this._pressed==='mode'){ctx.fillStyle='rgba(0,0,0,0.2)';this.rr(ctx,px+350,py+215,100,35,6);}
        ctx.fillStyle='#ffd700';ctx.font='bold 18px sans-serif';ctx.textAlign='center';ctx.fillText(this.gameMode,px+400,py+238);

        ctx.fillStyle='rgba(0,0,0,0.3)';this.rr(ctx,px+30,py+280,pw-60,150,10);
        ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=1;this.rr(ctx,px+30,py+280,pw-60,150,10,true);
        ctx.fillStyle='rgba(255,255,255,0.7)';ctx.font='bold 16px sans-serif';ctx.textAlign='center';
        ctx.fillText('玩家1',px+120,py+310);
        ctx.fillStyle='#aaa';ctx.font='15px monospace';
        ctx.fillText('空格 = 普攻',px+80,py+340);
        ctx.fillText('U/I/O = 技能 1/2/3',px+120,py+370);
        ctx.fillStyle='rgba(255,255,255,0.7)';ctx.font='bold 16px sans-serif';
        ctx.fillText('玩家2',px+520,py+310);
        ctx.fillStyle='#aaa';ctx.font='15px monospace';
        ctx.fillText('0 = 普攻',px+500,py+340);
        ctx.fillText('Num1/2/3 = 技能 1/2/3',px+550,py+370);

        ctx.fillStyle='rgba(180,60,60,0.6)';this.rr(ctx,this.w/2-50,py+440,100,40,8);
        ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=1;this.rr(ctx,this.w/2-50,py+440,100,40,8,true);
        if(this._pressed==='close'){ctx.fillStyle='rgba(0,0,0,0.2)';this.rr(ctx,this.w/2-50,py+440,100,40,8);}
        ctx.fillStyle='#fff';ctx.font='18px sans-serif';ctx.textAlign='center';ctx.fillText('关闭',this.w/2,py+467);
    }

    rr(ctx,x,y,w,h,r,strokeOnly=false){
        ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();
        if(strokeOnly)ctx.stroke();else ctx.fill();
    }

    drawSlider(ctx,x,y,w,h,val){
        const by=y+h/2-5;
        // 轨道底
        ctx.fillStyle='rgba(255,255,255,0.1)';this.rr(ctx,x,by,w,10,5);
        // 填充渐变
        const fg=ctx.createLinearGradient(x,0,x+w*val,0);
        fg.addColorStop(0,'rgba(224,192,112,0.4)');fg.addColorStop(1,'rgba(255,215,0,0.7)');
        ctx.fillStyle=fg;this.rr(ctx,x,by,w*val,10,5);
        // 手柄
        const hx=x+w*val, hy=y+h/2;
        const grd=ctx.createRadialGradient(hx-2,hy-2,2,hx,hy,12);
        grd.addColorStop(0,'#fff8dc');grd.addColorStop(0.5,'#ffd700');grd.addColorStop(1,'#b8960a');
        ctx.fillStyle=grd;ctx.beginPath();ctx.arc(hx,hy,12,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,0.5)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(hx,hy,12,0,Math.PI*2);ctx.stroke();
    }

    renderLoading(ctx){
        const t=Date.now();ctx.fillStyle='#0a0a15';ctx.fillRect(0,0,this.w,this.h);
        for(let i=0;i<8;i++){
            const a=i/8*Math.PI*2+t/2000;
            const p=0.3+0.3*Math.sin(t/300+i);
            ctx.fillStyle=`rgba(224,192,112,${p})`;ctx.beginPath();
            ctx.arc(960+Math.cos(a)*80,540+Math.sin(a)*80,6+2*p,0,Math.PI*2);ctx.fill();
        }
        ctx.font='bold 28px sans-serif';ctx.textAlign='center';
        ctx.fillStyle='#e0c070';ctx.fillText('加载中'+'.'.repeat(Math.floor(t/400)%4),960,620);
        ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='bold 48px sans-serif';ctx.fillText('骑士对决',960,500);
    }

    destroy(){const c=this.g.canvas;c.style.cursor='default';if(this._mm)c.removeEventListener('mousemove',this._mm);if(this._cl)c.removeEventListener('click',this._cl);if(this._md)c.removeEventListener('mousedown',this._md);if(this._mu)c.removeEventListener('mouseup',this._mu);if(this._ts)c.removeEventListener('touchstart',this._ts);if(this._tm)c.removeEventListener('touchmove',this._tm);if(this._te){c.removeEventListener('touchend',this._te);c.removeEventListener('touchcancel',this._te);}}
}

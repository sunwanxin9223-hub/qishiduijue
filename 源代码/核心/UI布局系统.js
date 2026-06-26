/**
 * Canvas UI 布局系统
 *
 * 使用方式：
 *   const panel = new Panel(x, y, w, h, { glass: true })
 *     .add(Label('标题', { bold: true, color: '#e0c070' }))
 *     .add(Row(
 *       Label('音效'), Label('开启'), Slider(0.8),
 *     ))
 *     .add(Row(
 *       Label('胜负方式'), Toggle(['一局定胜负','三局两胜']),
 *     ))
 *
 * panel.render(ctx)
 * panel.click(mx, my)  → 返回被点击的 widget 或 null
 */
export class Panel {
    constructor(x, y, w, h, opts = {}) {
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.glass = opts.glass !== false; // 默认玻璃面板
        this.padding = opts.padding ?? 24;
        this.rowGap = opts.rowGap ?? 8;
        this.rows = [];
        this._cursorY = this.y + this.padding;
    }

    add(row) {
        if (Array.isArray(row)) row = makeRow(row);
        row.panel = this;
        row.x = this.x + this.padding;
        row.y = this._cursorY;
        row.w = this.w - this.padding * 2;
        row.layout();
        this._cursorY += row.h + this.rowGap;
        this.rows.push(row);
        return this;
    }

    /** 添加空白间距 */
    gap(h) { this._cursorY += h; return this; }

    /** 绘制 */
    render(ctx) {
        // 背景玻璃框
        if (this.glass) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            rr(ctx, this.x, this.y, this.w, this.h, 16);
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 1.5;
            rr(ctx, this.x, this.y, this.w, this.h, 16, true);
        }
        // 绘制行
        for (const row of this.rows) row.render(ctx);
        return this;
    }

    /** 点击检测，返回被点击的 widget */
    click(mx, my) {
        for (const row of this.rows) {
            const hit = row.click(mx, my);
            if (hit) return hit;
        }
        return null;
    }

    get bottom() { return this.y + this.h; }
}

// ── Row ──
export class Row {
    constructor(widgets = []) {
        this.widgets = widgets;
        this.panel = null;
        this.x = 0; this.y = 0; this.w = 0;
        this.gap = 12;
        this.h = 30;
    }

    layout() {
        let cx = this.x;
        let maxH = 24;
        for (const w of this.widgets) {
            if (!w.measured) w.measure();
            w.rect = { x: cx, y: this.y + (maxH - w.h) / 2, w: w.w, h: w.h };
            cx += w.w + this.gap;
        }
        this.h = maxH + 4;
    }

    render(ctx) {
        for (const w of this.widgets) {
            if (w.render) w.render(ctx, w.rect);
        }
    }

    click(mx, my) {
        for (const w of this.widgets) {
            const r = w.rect;
            if (r && mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
                if (w.clickAt) { const hit = w.clickAt(mx, my); if (hit) return hit; }
                if (w.onClick) { w.onClick(); return w; }
            }
        }
        return null;
    }

    /** 给行一个标签 */
    static labeled(labelText, ...widgets) {
        return new Row([new Label(labelText, {}), ...widgets]);
    }
}

// ── Widget 类型 ──

class BaseWidget {
    constructor(opts = {}) { this.measured = false; this.w = 0; this.h = 0; this.rect = null; this.onClick = null; }
    measure() { this.measured = true; }
    render(ctx, r) {}
}

/** 标签 */
export class Label extends BaseWidget {
    constructor(text, opts = {}) {
        super(opts);
        this.text = text;
        this.font = opts.bold
            ? `bold ${opts.fontSize ?? 20}px sans-serif`
            : `${opts.fontSize ?? 18}px sans-serif`;
        this.color = opts.color ?? '#ccc';
        this.align = opts.align ?? 'left';
    }
    measure() {
        this.measured = true;
        // 估算文字宽度
        this.w = this.text.length * (this.font.includes('bold') ? 20 : 16);
        this.h = 24;
    }
    render(ctx, r) {
        ctx.fillStyle = this.color;
        ctx.font = this.font;
        ctx.textAlign = this.align;
        ctx.fillText(this.text, r.x, r.y + r.h * 0.75);
        ctx.textAlign = 'left';
    }
}

/** 切换按钮 */
export class Toggle extends BaseWidget {
    constructor(options, opts = {}) {
        super(opts);
        this.options = options;       // ['一局定胜负', '三局两胜']
        this.index = 0;
        this.w = 120; this.h = 32;
    }
    get value() { return this.options[this.index]; }
    onClick() { this.index = (this.index + 1) % this.options.length; }

    render(ctx, r) {
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        rr(ctx, r.x, r.y, r.w, r.h, 6);
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.value, r.x + r.w / 2, r.y + r.h * 0.7);
        ctx.textAlign = 'left';
    }
}

/** 按钮 */
export class Button extends BaseWidget {
    constructor(text, opts = {}) {
        super(opts);
        this.text = text;
        this.w = opts.w ?? 200;
        this.h = opts.h ?? 40;
        this.bgColor = opts.bgColor ?? 'rgba(60,120,200,0.7)';
        this.action = opts.action ?? (() => {});
    }
    onClick() { this.action(); }
    render(ctx, r) {
        ctx.fillStyle = this.bgColor;
        rr(ctx, r.x, r.y, r.w, r.h, 8);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1.5;
        rr(ctx, r.x, r.y, r.w, r.h, 8, true);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.text, r.x + r.w / 2, r.y + r.h * 0.7);
        ctx.textAlign = 'left';
    }
}

/** 滑块 */
export class Slider extends BaseWidget {
    constructor(val = 0.8, opts = {}) {
        super(opts);
        this.val = val;
        this.w = 180; this.h = 20;
        this.barH = 8;
    }
    render(ctx, r) {
        const by = r.y + r.h / 2 - this.barH / 2;
        // 轨道
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        rr(ctx, r.x, by, r.w, this.barH, 4);
        // 填充
        ctx.fillStyle = 'rgba(224,192,112,0.6)';
        rr(ctx, r.x, by, r.w * this.val, this.barH, 4);
        // 手柄
        const hx = r.x + r.w * this.val;
        ctx.fillStyle = '#e0c070';
        ctx.beginPath(); ctx.arc(hx, r.y + r.h / 2, 8, 0, Math.PI * 2); ctx.fill();
    }
    set(dx) { this.val = Math.max(0, Math.min(1, this.val + dx / this.w)); }
}

/** 输入框 */
export class Input extends BaseWidget {
    constructor(opts = {}) {
        super(opts);
        this.text = '';
        this.maxLen = opts.maxLen ?? 4;
        this.placeholder = opts.placeholder ?? '';
        this.w = 240; this.h = 44;
        this.focused = false;
    }
    render(ctx, r) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        rr(ctx, r.x, r.y, r.w, r.h, 8);
        ctx.strokeStyle = this.focused ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1.5;
        rr(ctx, r.x, r.y, r.w, r.h, 8, true);
        const display = this.text + '_'.repeat(this.maxLen - this.text.length);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(display.split('').join(' '), r.x + r.w / 2, r.y + r.h * 0.72);
        ctx.textAlign = 'left';
    }
    onInput(key, backspace) {
        if (backspace) this.text = this.text.slice(0, -1);
        else if (this.text.length < this.maxLen) this.text += key;
    }
}

/** 面板包装器（把 Panel 作为 Widget 嵌入 Row） */
export class PanelWrapper extends BaseWidget {
    constructor(panel) {
        super();
        this.panel = panel;
        this.w = panel.w; this.h = panel.h;
        this.clickThrough = true;
    }
    render(ctx, r) {
        this.panel.x = r.x; this.panel.y = r.y;
        this.panel.render(ctx);
    }
    // 点击穿透到内部 widget
    clickAt(mx, my) {
        return this.panel.click(mx, my);
    }
}

// ── 辅助函数 ──

export function makeRow(widgets) { return new Row(widgets); }

function rr(ctx, x, y, w, h, r, strokeOnly = false) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    if (strokeOnly) ctx.stroke(); else ctx.fill();
}

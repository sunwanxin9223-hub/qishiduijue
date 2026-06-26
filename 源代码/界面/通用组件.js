/**
 * ============================================
 * 通用组件 — 按钮、弹窗、输入框等 UI 原子
 * ============================================
 * 职责：
 *  - 按钮（支持触屏和鼠标）
 *  - 弹窗/确认框
 *  - 滑块（音量调节等）
 *  - 输入框（房间码输入）
 *
 * 所有组件自动适配触屏和鼠标两种交互方式
 */
export class Button {
    constructor(x, y, width, height, text, onClick) {
        this.x = x; this.y = y;
        this.width = width; this.height = height;
        this.text = text;
        this.onClick = onClick;
    }
    render(ctx) { /* TODO */ }
    hitTest(px, py) { /* TODO */ }
}

export class Slider {
    constructor(x, y, width, min, max, value, onChange) {
        // TODO
    }
    render(ctx) { /* TODO */ }
}

export class Popup {
    constructor(title, message, buttons) {
        // TODO
    }
    render(ctx) { /* TODO */ }
}

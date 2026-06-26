/**
 * ============================================
 * 事件总线 — 模块间解耦通信
 * ============================================
 * 职责：
 *  - 提供全局发布/订阅机制
 *  - 各系统通过事件通信，不直接互相引用
 *  - 降低耦合度，新增系统只需订阅感兴趣的事件
 *
 * 使用方式：
 *   EventBus.on('玩家移动', (data) => { ... });
 *   EventBus.emit('玩家移动', { from: 'V2', to: 'V3' });
 *
 * 扩展性：新增事件类型无需修改此文件，emit 即用
 */

export const EventBus = {
    _listeners: {},

    /** 订阅事件 */
    on(event, callback) {
        if (!this._listeners[event]) {
            this._listeners[event] = [];
        }
        this._listeners[event].push(callback);
    },

    /** 取消订阅 */
    off(event, callback) {
        if (!this._listeners[event]) return;
        this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
    },

    /** 触发事件 */
    emit(event, data) {
        if (!this._listeners[event]) return;
        this._listeners[event].forEach(cb => cb(data));
    }
};

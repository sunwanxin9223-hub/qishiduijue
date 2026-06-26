/**
 * ============================================
 * 房间管理 — P2P 房间创建和加入
 * ============================================
 * 职责：
 *  - 创建房间（生成 6 位房间码）
 *  - 加入房间（输入房间码连接）
 *  - WebSocket 连接生命周期管理
 *  - 消息收发（移动、攻击、状态同步）
 *
 * 通信协议：
 *  - 创建房间 → 服务端生成房间码
 *  - 对手加入 → 服务端通知房主
 *  - 双方选完技能 → 进入战斗
 *  - 战斗中：每回合同步移动和技能
 */
export class RoomManager {
    constructor() {
        this.ws = null;
        this.roomCode = null;
        this.isHost = false;
    }

    /** 创建房间（房主） */
    createRoom() {
        // TODO: 连接 WebSocket，请求创建房间
    }

    /** 加入房间（客机） */
    joinRoom(code) {
        // TODO: 连接 WebSocket，请求加入房间
    }

    /** 发送游戏动作给对手 */
    sendAction(action) {
        // TODO: { type: 'move', from: 'V2', to: 'V3' }
        //       { type: 'skill', skill: '烈焰斩', target: 'V4' }
    }

    /** 接收对手动作 */
    onOpponentAction(callback) {
        // TODO: 注册回调
    }

    /** 断开连接 */
    disconnect() {
        // TODO
    }
}

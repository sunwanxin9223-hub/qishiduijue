/**
 * ============================================
 * 回合系统 — 管理回合流转
 * ============================================
 * 职责：
 *  - 回合计数
 *  - 决定当前行动方（玩家1 / 玩家2）
 *  - 回合阶段管理（移动阶段 → 攻击阶段 → 结束阶段）
 *  - 回合超时处理
 *
 * 事件：
 *  发出：回合开始、回合结束、玩家行动
 *  监听：（无，回合系统是主动调度者）
 */
export class TurnSystem {
    constructor(players) {
        this.players = players;
        this.turnCount = 0;
        this.currentPlayerIndex = 0;
        this.timeLimit = 30; // 秒
    }

    /** 开始新回合 */
    startTurn() {
        this.turnCount++;
        // TODO: 通知 UI，启动计时器
    }

    /** 切换行动权到下一个玩家 */
    switchPlayer() {
        this.currentPlayerIndex = 1 - this.currentPlayerIndex;
    }

    /** 结束当前回合 */
    endTurn() {
        // TODO: 触发回合结束事件
        this.switchPlayer();
        if (this.currentPlayerIndex === 0) {
            this.startTurn(); // 两个人都动完，开新回合
        }
    }
}

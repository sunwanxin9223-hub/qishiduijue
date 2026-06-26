/**
 * ============================================
 * 战斗界面 — HUD（血量条、技能栏、回合指示器）
 * ============================================
 * 职责：
 *  - 渲染双方血量条
 *  - 渲染当前回合数和行动方指示
 *  - 渲染可用技能按钮（含冷却状态）
 *  - 渲染移动可选站位高亮
 *
 * 扩展性：所有 UI 位置使用比例定位，自动适配不同分辨率
 */
export class BattleHUD {
    constructor(ctx, canvasWidth, canvasHeight) {
        this.ctx = ctx;
        this.w = canvasWidth;
        this.h = canvasHeight;
    }

    /** 渲染血量条 */
    renderHealthBar(player, isPlayer1) {
        // TODO: 左侧/顶部显示玩家1血量，右侧/底部显示玩家2血量
    }

    /** 渲染技能栏 */
    renderSkillBar(player) {
        // TODO: 显示 3 个主动技能 + 回血按钮，冷却中的灰色+倒计时
    }

    /** 渲染回合指示器 */
    renderTurnIndicator(turnCount, currentPlayer) {
        // TODO: "第 X 回合" / "轮到玩家X行动"
    }

    /** 高亮可选移动站位 */
    highlightReachablePositions(positions) {
        // TODO: 在地图站位点上叠加高亮圆圈
    }

    /** 渲染伤害弹出数字 */
    showDamagePopup(position, damage) {
        // TODO: 浮动数字动画
    }
}

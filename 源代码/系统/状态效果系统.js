/**
 * ============================================
 * 状态效果系统 — 管理所有 Buff/Debuff
 * ============================================
 * 职责：
 *  - 状态效果的施加和移除
 *  - 每回合状态效果结算（中毒扣血、状态到期）
 *  - 状态之间的互斥和叠加规则
 *
 * 状态类型：
 *  - 中毒（淬毒刃）：每回合扣 300，持续 2 回合
 *  - 冰冻：无法移动和攻击，持续 1 回合
 *  - 隐身：无法被攻击，持续 1 回合
 *  - 神速：移动距离×2，持续 2 回合
 *  - 强化：普攻+500，持续 2 回合
 *  - 无敌之盾：下次受击免疫+弹反（一次性）
 *
 * 扩展性：新增状态效果 → 在此文件添加处理器即可
 */
export class StatusEffectSystem {
    /**
     * 施加状态效果
     * @param {Player} target - 目标玩家
     * @param {string} effectType - 效果类型
     * @param {number} duration - 持续回合数
     * @param {object} params - 额外参数（如伤害值）
     */
    applyEffect(target, effectType, duration, params = {}) {
        // TODO: 添加状态效果
    }

    /**
     * 每回合结束时结算所有状态效果
     * - 中毒：扣血
     * - 所有效果：持续回合-1，到期移除
     */
    tickEffects(player) {
        // TODO
    }

    /** 检查玩家是否处于某状态 */
    hasEffect(player, effectType) {
        // TODO
        return false;
    }

    /** 移除指定效果 */
    removeEffect(player, effectType) {
        // TODO
    }
}

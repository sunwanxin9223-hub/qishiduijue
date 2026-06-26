/**
 * ============================================
 * 伤害系统 — 计算伤害和血量变更
 * ============================================
 * 职责：
 *  - 伤害计算公式
 *  - 血量增减操作
 *  - 致死判定
 *  - 无敌之盾弹反逻辑
 *
 * 规则：
 *  - 普通攻击 = 200 伤害
 *  - 强化状态下普攻 = 200 + 500 = 700
 *  - 盾牌防御状态下受伤 = 伤害 × 0.5（被无敌之盾替代）
 *  - 无敌之盾 = 免疫 + 反伤 500
 *  - 血量最低为 0
 */
export class DamageSystem {
    /**
     * 计算实际伤害
     * @param {number} baseDamage - 基础伤害值
     * @param {Player} defender - 防御方（检查状态效果）
     * @returns {number} 实际伤害
     */
    calculateDamage(baseDamage, defender) {
        // TODO: 检查防御方是否有盾牌/无敌之盾状态
        return baseDamage;
    }

    /**
     * 对玩家造成伤害
     * @returns {{ damage: number, killed: boolean }}
     */
    dealDamage(player, damage) {
        player.hp = Math.max(0, player.hp - damage);
        return { damage, killed: player.hp <= 0 };
    }

    /** 治疗 */
    heal(player, amount) {
        player.hp = Math.min(player.maxHp, player.hp + amount);
    }
}

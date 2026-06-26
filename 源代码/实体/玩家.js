/**
 * ============================================
 * 玩家实体
 * ============================================
 * 职责：封装玩家所有状态数据
 *
 * 属性：
 *  - 血量（当前/最大）
 *  - 当前站位
 *  - 已选技能列表
 *  - 当前状态效果（中毒/冰冻/隐身/神速/强化）
 *  - 各技能冷却剩余回合
 *
 * 扩展性：新增角色 → 继承此 Player 类，覆盖属性即可
 */
export class Player {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.maxHp = 2100;
        this.hp = 2100;
        this.position = null;      // 当前站位编号 (V1~V8)
        this.skills = [];          // 携带的 3 个技能
        this.cooldowns = {};       // { 技能名: 剩余冷却回合 }
        this.statusEffects = [];   // 当前状态效果数组

        // 回血是默认技能
        this.hasHeal = true;
    }

    /** 检查某个技能是否在冷却中 */
    isOnCooldown(skillName) {
        return (this.cooldowns[skillName] || 0) > 0;
    }

    /** 每回合结束时冷却减 1 */
    tickCooldowns() {
        for (const key in this.cooldowns) {
            if (this.cooldowns[key] > 0) this.cooldowns[key]--;
        }
    }
}

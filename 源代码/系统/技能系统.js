/**
 * ============================================
 * 技能系统 — 管理技能释放和效果
 * ============================================
 * 职责：
 *  - 技能释放合法性校验（冷却、距离、状态限制）
 *  - 执行技能效果（伤害、状态附加、恢复）
 *  - 管理技能冷却计时
 *
 * 核心依赖：数据/技能配置.js
 *
 * 扩展性：新增技能只需在 数据/技能配置.js 添加条目，
 *         此文件通过配置驱动，无需修改逻辑
 */
import { 技能列表 } from '../数据/技能配置.js';

export class SkillSystem {
    constructor() {
        this.skills = 技能列表;
    }

    /**
     * 检查技能是否可用
     * @returns {{ canUse: boolean, reason: string }}
     */
    canUseSkill(player, skillName, targetPosition) {
        const skill = this.skills.find(s => s.名称 === skillName);
        if (!skill) return { canUse: false, reason: '技能不存在' };
        if (player.isOnCooldown(skillName)) return { canUse: false, reason: '冷却中' };
        // TODO: 检查距离、状态限制（冰冻不能行动等）
        return { canUse: true, reason: '' };
    }

    /**
     * 释放技能
     * @returns {{ success: boolean, damage: number, effects: [] }}
     */
    useSkill(player, targetPlayer, skillName) {
        // TODO: 执行伤害计算，附加状态效果，设置冷却
        return { success: false, damage: 0, effects: [] };
    }
}

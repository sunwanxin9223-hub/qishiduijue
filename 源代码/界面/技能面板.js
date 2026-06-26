/**
 * ============================================
 * 技能面板 — 技能选择界面
 * ============================================
 * 职责：
 *  - 渲染 10 个可选技能的卡片/按钮
 *  - 显示技能详细信息（伤害、距离、冷却、效果描述）
 *  - 处理点击选择/取消，最多选 3 个
 *  - 确认按钮 → 通知对手并进入战斗
 *
 * 扩展性：新增技能自动出现在列表中（从 数据/技能配置.js 读取）
 */
export class SkillPanel {
    constructor(ctx, skills) {
        this.ctx = ctx;
        this.skills = skills;
        this.selected = [];
    }

    /** 渲染技能选择界面 */
    render() {
        // TODO: 网格布局显示 10 个技能卡片
        //       已选的 3 个高亮
        //       点击卡片查看详情
    }

    /** 选中/取消技能 */
    toggleSkill(skillName) {
        // TODO
    }

    /** 确认选择 */
    confirm() {
        return this.selected.length === 3;
    }
}

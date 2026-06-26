/**
 * ============================================
 * 寻路系统 — 计算两个站位间的距离和路径
 * ============================================
 * 职责：
 *  - 计算两个站位间的最短距离（BFS）
 *  - 生成移动路径
 *  - 判断技能能否命中目标（距离校验）
 *
 * 依赖：站位数据.js
 */
import { 邻接关系, 传送规则 } from './站位数据.js';

export class PathFinder {
    constructor() {
        // 预计算所有站位对距离（距离矩阵），加速查询
        this.distanceCache = {};
    }

    /**
     * 计算 from 到 to 的最短距离（身位数）
     * @returns {number} 距离，-1 表示不可达
     */
    getDistance(from, to) {
        // TODO: BFS 搜索，考虑单向边（V4→V9→V5）
        return -1;
    }

    /**
     * 检查技能是否在攻击范围内
     * @param {string} attackerPos - 攻击方站位
     * @param {string} targetPos - 目标站位
     * @param {number} range - 技能距离（身位数）
     */
    isInRange(attackerPos, targetPos, range) {
        const dist = this.getDistance(attackerPos, targetPos);
        return dist >= 0 && dist <= range;
    }
}

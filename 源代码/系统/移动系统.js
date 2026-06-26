/**
 * ============================================
 * 移动系统 — 管理站位移动
 * ============================================
 * 职责：
 *  - 计算当前站位可达的相邻站位
 *  - 执行移动（包括传送阵自动传送）
 *  - 平台跳跃落地（可选，扣血）
 *  - 移动合法性校验
 *
 * 核心依赖：站位数据.js（地图/站位数据.js）
 *
 * 扩展性：新地图只需替换站位数据，移动系统逻辑不变
 */
import { 邻接关系, 传送规则 } from '../地图/站位数据.js';

export class MovementSystem {
    /**
     * 获取玩家从当前位置可达的站位列表
     * @param {string} currentPos - 当前位置 (V1~V8)
     * @param {number} moveRange - 可移动身位数（默认1，神速=2）
     * @returns {string[]} 可达站位数组
     */
    getReachablePositions(currentPos, moveRange = 1) {
        // TODO: BFS 搜索可达站位
        return [];
    }

    /**
     * 执行移动
     * @returns {{ success: boolean, newPos: string, fallDamage: number }}
     */
    move(player, targetPos, isJumpDown = false) {
        // TODO: 校验合法性，处理传送阵，处理跳跃掉血
        return { success: false, newPos: player.position, fallDamage: 0 };
    }

    /** 获取跳跃落地选项 */
    getJumpOptions(currentPos) {
        // TODO: V6→V4(-700), V7→V3(-200), V8→V2(0)
        return [];
    }
}

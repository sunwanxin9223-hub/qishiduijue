/**
 * ============================================
 * 动画系统 — 管理序列帧播放
 * ============================================
 * 职责：
 *  - 加载序列帧资源
 *  - 按帧率播放动画
 *  - 动画切换和混合
 *  - 特效动画触发
 *
 * 资源映射（对应 游戏资源/序列帧/）
 *  人物动作/  → 骑士的各种动作动画
 *  场景动画/  → 石柱、风阵、背景动画
 *  特效/      → 技能特效动画
 *
 * 扩展性：新增动画资源 → 放入对应资源目录，
 *         在 数据/ 中注册即可，无需修改动画系统
 */
export class AnimationSystem {
    constructor() {
        this.animations = {};  // 已加载的动画数据
        this.playing = {};     // 当前播放状态
    }

    /** 加载序列帧（从 JSON + PNG spritesheet 或逐帧 PNG） */
    loadAnimation(name, path) {
        // TODO
    }

    /** 播放指定动画 */
    play(name, loop = false) {
        // TODO
    }

    /** 停止动画 */
    stop(name) {
        // TODO
    }

    /** 每帧更新 */
    update(deltaTime) {
        // TODO
    }
}

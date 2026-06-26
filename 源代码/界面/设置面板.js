/**
 * ============================================
 * 设置面板 — 游戏设置界面
 * ============================================
 * 职责：
 *  - 音效 开关 + 音量滑块
 *  - 背景音乐 开关 + 音量滑块
 *  - 胜负方式 选择（一局定胜负 / 三局两胜）
 *  - 设置持久化到 localStorage
 *
 * 规则：
 *  - 本地对战时使用本地设置
 *  - P2P 对战时，房主的胜负方式覆盖客机
 *  - 音效/BGM 设置始终本地独立
 */
export class SettingsPanel {
    constructor() {
        this.settings = this.loadSettings();
    }

    /** 默认设置 */
    getDefaults() {
        return {
            音效开关: true,
            音效音量: 80,
            背景音乐开关: true,
            背景音乐音量: 80,
            胜负方式: '一局定胜负',
        };
    }

    /** 从 localStorage 加载 */
    loadSettings() {
        // TODO
        return this.getDefaults();
    }

    /** 保存到 localStorage */
    saveSettings() {
        // TODO: localStorage.setItem('game_settings', JSON.stringify(this.settings))
    }

    /** 渲染设置面板 */
    render() {
        // TODO
    }
}

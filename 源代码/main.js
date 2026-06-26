/**
 * 骑士对决 — 主入口
 */
import { Game } from './核心/游戏主循环.js?v=49';
import { Config } from './核心/全局配置.js?v=49';
import { MenuScene } from './场景/主菜单场景.js?v=49';
import { SkillSelectScene } from './场景/技能选择场景.js?v=49';
import { BattleScene } from './场景/战斗场景.js?v=49';
import { RoomScene } from './场景/房间场景.js?v=49';

// 占位
class P {
    constructor(g, d) { this.g = g; }
    async init() { this._f = () => this.g.switchScene('主菜单'); this.g.canvas.addEventListener('click', this._f); }
    update(dt) {}
    render(ctx) { ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, 1920, 1080); ctx.fillStyle = '#e0c070'; ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('开发中，点击返回', 960, 540); }
    destroy() { if (this._f) this.g.canvas.removeEventListener('click', this._f); }
}

const game = new Game(Config);
game.registerScene('主菜单', MenuScene);
game.registerScene('技能选择', SkillSelectScene);
game.registerScene('战斗', BattleScene);
game.registerScene('房间', RoomScene);
game.registerScene('结算', P);
game.start('主菜单');

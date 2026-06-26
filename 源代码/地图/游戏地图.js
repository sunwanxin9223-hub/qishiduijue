/**
 * ============================================
 * 游戏地图 — 地图渲染和站位管理
 * ============================================
 * 职责：
 *  - 渲染地图背景、平台、石柱、传送阵
 *  - 渲染 8 个站位标记
 *  - 管理玩家在地图上的视觉位置
 *
 * 依赖：站位数据.js（位置坐标和邻接关系）
 *
 * 扩展性：新增地图 → 新建 地图/XX地图.js，替换站位数据即可
 */
import { 站位坐标, 站位列表 } from './站位数据.js';

export class GameMap {
    constructor(ctx, canvasWidth, canvasHeight) {
        this.ctx = ctx;
        this.width = canvasWidth;
        this.height = canvasHeight;
    }

    /** 渲染完整地图 */
    render() {
        // TODO: 绘制背景、平台、石柱、传送阵、站位标记
    }

    /** 获取站位像素坐标 */
    getPositionCoords(positionId) {
        return 站位坐标[positionId];
    }

    /** 将玩家渲染到指定位 */
    renderPlayer(player, positionId) {
        // TODO
    }
}

/**
 * ============================================
 * 排行榜 — 积分排名
 * ============================================
 * 职责：
 *  - 获取排行榜数据（服务端）
 *  - 显示排名列表
 *  - P2P 胜利后上报积分（+10 分/胜场）
 *
 * 数据存储：服务端数据库
 * 积分规则：P2P 每胜一场 +10 分，本地对战不计分
 */
export class Leaderboard {
    constructor() {
        this.entries = [];
    }

    /** 从服务端获取排行榜 */
    async fetch() {
        // TODO: GET /api/leaderboard
    }

    /** 上报胜利积分 */
    async reportWin(playerName) {
        // TODO: POST /api/leaderboard/report
    }

    /** 获取排名列表 */
    getRankings() {
        return this.entries.sort((a, b) => b.score - a.score);
    }
}

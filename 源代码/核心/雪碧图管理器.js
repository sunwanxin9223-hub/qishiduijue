/**
 * 雪碧图管理器
 * 为人物动作动画提供雪碧图支持，替代逐帧 PNG 加载
 * 
 * 用法：
 *   const sm = new SpriteManager();
 *   await sm.load('meleeChop', '游戏资源/雪碧图/meleeChop.json');
 *   sm.getFrame('meleeChop', 63);  // → {img, sx, sy, sw, sh} 用于 drawImage
 */

export class SpriteManager {
    constructor() {
        /** @type {Map<string, {img:HTMLImageElement, meta:object}>} */
        this.sheets = new Map();
    }

    /**
     * 加载雪碧图 JSON 描述文件
     * JSON 格式：{ frameW, frameH, cols, rows, total, sheetW, sheetH }
     * PNG 文件同路径同名（.json → .png）
     */
    async load(key, jsonPath) {
        if (this.sheets.has(key)) return this.sheets.get(key);
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                const ctrl = new AbortController();
                const t = setTimeout(() => ctrl.abort(), 15000);
                const resp = await fetch(jsonPath, {signal: ctrl.signal}).finally(() => clearTimeout(t));
                const meta = await resp.json();
                // 多sheet支持
                if(meta.sheets){
                    const imgs = await Promise.all(meta.sheets.map(s => {
                        const pp = jsonPath.replace(/\/[^\/]+$/, '/'+s.file);
                        return new Promise((resolve, reject) => {
                            const i = new Image();
                            i.onload = () => resolve({img:i, start:s.start});
                            i.onerror = reject;
                            i.src = pp;
                        });
                    }));
                    const entry = { imgs, meta };
                    this.sheets.set(key, entry);
                    return entry;
                } else {
                    const pngPath = jsonPath.replace(/\.json$/, '.png');
                    const img = await new Promise((resolve, reject) => {
                        const i = new Image();
                        i.onload = () => resolve(i);
                        i.onerror = reject;
                        i.src = pngPath;
                    });
                    const entry = { img, meta };
                    this.sheets.set(key, entry);
                    return entry;
                }
            } catch(e) {
                if (attempt === 2) throw e;
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    }

    /**
     * 获取指定帧的裁剪坐标
     * @param {string} key - 动画键名
     * @param {number} frame - 帧号 (1-based)
     * @returns {{img:HTMLImageElement, sx:number, sy:number, sw:number, sh:number}|null}
     */
    getFrame(key, frame) {
        const entry = this.sheets.get(key);
        if (!entry) return null;
        if(entry.img){
            // 单sheet
            const { img, meta } = entry;
            const idx = Math.max(1, Math.min(frame, meta.total)) - 1;
            const col = idx % meta.cols;
            const row = Math.floor(idx / meta.cols);
            return { img, sx: col*meta.frameW, sy: row*meta.frameH, sw: meta.frameW, sh: meta.frameH };
        }
        // 多sheet
        if(!entry.imgs) return null;
        const { imgs, meta } = entry;
        const idx = Math.max(1, Math.min(frame, meta.total)) - 1;
        const perSheet = meta.cols * (meta.rowsPerSheet || meta.rows_per_sheet || 8);
        const si = Math.floor(idx / perSheet);
        if(si >= imgs.length) return null;
        const sheet = imgs[si];
        if(!sheet || !sheet.img) return null;
        const local = idx - si * perSheet;
        const col = local % meta.cols;
        const row = Math.floor(local / meta.cols);
        return { img: imgs[si].img, sx: col*meta.frameW, sy: row*meta.frameH, sw: meta.frameW, sh: meta.frameH };
    }

    has(key) { return this.sheets.has(key); }

    /** 预热GPU纹理：解码+触发整张雪碧图上传（非仅子图） */
    async prewarm(key) {
        const entry = this.sheets.get(key);
        if (!entry) return;
        const imgs = entry.img ? [entry.img] : (entry.imgs || []).map(s => s.img);
        // Step 1: 强制图片解码
        await Promise.all(imgs.map(img => {
            if (img.decode) return img.decode().catch(() => {});
            return Promise.resolve();
        }));
        // Step 2: 从原图直接采样1px，强制 GPU 上传整张雪碧图纹理
        for (const img of imgs) {
            const c = document.createElement('canvas');
            c.width = 1; c.height = 1;
            c.getContext('2d').drawImage(img, 0, 0, 1, 1, 0, 0, 1, 1);
        }
    }

    destroy() { this.sheets.clear(); }
}

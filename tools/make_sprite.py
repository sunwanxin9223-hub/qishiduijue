"""
雪碧图生成工具
将帧序列拼成一张大图，额外输出 JSON 记录单帧尺寸和网格信息
"""
import sys, json, math
from pathlib import Path
try:
    from PIL import Image, ImageFilter
except ImportError:
    print("请先安装 Pillow: pip install Pillow")
    sys.exit(1)

def make_sprite(src_dir, out_path, cols=None):
    """
    src_dir: 帧序列目录（含 frame_00001.png ... frame_00121.png）
    out_path: 输出雪碧图路径（不含扩展名，自动加 .png）
    cols: 每行列数，不指定自动算（尽量接近正方形）
    """
    src = Path(src_dir)
    frames = sorted(src.glob("frame_*.png"))
    if not frames:
        print(f"未找到帧文件: {src_dir}")
        return

    # 读第一帧获取尺寸
    first = Image.open(frames[0])
    fw, fh = first.size
    print(f"帧数: {len(frames)}, 单帧: {fw}x{fh}")

    # 自动计算列数
    if cols is None:
        total = len(frames)
        cols = math.ceil(math.sqrt(total))
    rows = math.ceil(len(frames) / cols)

    # 合成
    sheet = Image.new("RGBA", (fw * cols, fh * rows), (0, 0, 0, 0))
    for i, fp in enumerate(frames):
        img = Image.open(fp)
        if img.size != (fw, fh):
            img = img.resize((fw, fh))
        row, col = divmod(i, cols)  # i // cols, i % cols
        sheet.paste(img, (col * fw, row * fh))
        if (i + 1) % 20 == 0:
            print(f"  已合成 {i+1}/{len(frames)} 帧")
        img.close()

    # 输出
    out_png = f"{out_path}.png"
    out_json = f"{out_path}.json"
    sheet.save(out_png, "PNG", optimize=True)
    sheet.close()

    meta = {
        "frameW": fw, "frameH": fh,
        "cols": cols, "rows": rows,
        "total": len(frames),
        "sheetW": fw * cols, "sheetH": fh * rows,
    }
    json.dump(meta, open(out_json, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"完成: {out_png} ({meta['sheetW']}x{meta['sheetH']})")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("用法: python make_sprite.py <帧目录> <输出路径> [列数]")
        sys.exit(1)
    make_sprite(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else None)

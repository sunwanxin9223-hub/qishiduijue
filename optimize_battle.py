"""
战斗场景资源优化 — PNG→WebP (保持原尺寸)
A: 场景逐帧 (bg/sz/fz/idle/结算/待机) 
B: 战斗静态图 (地面/平台/光圈/暂停)
C: 胜利结算图 (第一局/第二局胜利)
"""
from PIL import Image
import os, sys

BASE = r'D:\回合制格斗'
PY = r'C:\ProgramData\WorkBuddy\chromium-env\6lvokk\.workbuddy\binaries\python\versions\3.13.12\python.exe'

def png_to_webp(src, quality=85):
    """PNG→WebP，保持原尺寸，透明图保留alpha"""
    if not os.path.exists(src): return
    dst = src.replace('.png', '.webp').replace('.PNG', '.webp')
    img = Image.open(src)
    has_alpha = img.mode in ('RGBA', 'LA', 'PA') or (img.mode == 'P' and 'transparency' in img.info)
    mode = 'RGBA' if has_alpha else 'RGB'
    img = img.convert(mode)
    img.save(dst, 'WEBP', quality=quality)
    orig = os.path.getsize(src)
    new = os.path.getsize(dst)
    return orig, new

def batch_convert(directory, quality=85):
    """批量转换目录下所有PNG"""
    if not os.path.exists(directory): return 0, 0, 0
    total_orig, total_new, cnt = 0, 0, 0
    for f in sorted(os.listdir(directory)):
        if f.lower().endswith('.png'):
            src = os.path.join(directory, f)
            result = png_to_webp(src, quality)
            if result:
                o, n = result
                total_orig += o; total_new += n; cnt += 1
    return cnt, total_orig, total_new

# ═══ A: 场景逐帧 ═══
print('═══ A: 场景逐帧 PNG→WebP ═══')
dirs = [
    '游戏资源/序列帧/场景动画/背景动画_色键输出/透明帧',
    '游戏资源/序列帧/场景动画/石柱_色键输出/透明帧',
    '游戏资源/序列帧/场景动画/风阵_色键输出/透明帧',
    '游戏资源/序列帧/场景动画/最终胜利结算_色键输出/透明帧',
    '游戏资源/序列帧/人物动作/待机动作/透明帧',
]
grand_orig = grand_new = grand_cnt = 0
for d in dirs:
    dp = os.path.join(BASE, d)
    cnt, orig, new = batch_convert(dp)
    if cnt > 0:
        grand_cnt += cnt; grand_orig += orig; grand_new += new
        print(f'  {os.path.basename(BASE)}…/{d.split("/",2)[-1]}: {cnt}帧 {orig//1024}KB→{new//1024}KB ({100-new*100//orig}%↓)')

# ═══ B: 战斗静态图 ═══
print('\n═══ B: 战斗静态图 PNG→WebP ═══')
statics = [
    '游戏资源/图像/场景/地面.png',
    '游戏资源/图像/场景/平台_透明.png',
    '游戏资源/图像/场景/光圈站位_透明.png',
    '游戏资源/图像/UI/暂停1_透明.png',
]
for s in statics:
    result = png_to_webp(os.path.join(BASE, s))
    if result:
        o, n = result
        grand_orig += o; grand_new += n; grand_cnt += 1
        print(f'  {os.path.basename(s)}: {o//1024}KB→{n//1024}KB ({100-n*100//o}%↓)')

# ═══ C: 胜利结算图 ═══
print('\n═══ C: 胜利结算图 PNG→WebP ═══')
victory = [
    '游戏资源/图像/UI/第一局胜利_透明.png',
    '游戏资源/图像/UI/第二局胜利_透明.png',
]
for v in victory:
    result = png_to_webp(os.path.join(BASE, v))
    if result:
        o, n = result
        grand_orig += o; grand_new += n; grand_cnt += 1
        print(f'  {os.path.basename(v)}: {o//1024}KB→{n//1024}KB ({100-n*100//o}%↓)')

print(f'\n═══ 总计: {grand_cnt}文件 {grand_orig/1024/1024:.1f}MB→{grand_new/1024/1024:.1f}MB ({100-grand_new*100//grand_orig}%↓) ═══')

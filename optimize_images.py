"""
图片优化脚本 — 缩小 + 转 WebP
"""
from PIL import Image
import os, sys

BASE = r'D:\回合制格斗'
PY = r'C:\ProgramData\WorkBuddy\chromium-env\6lvokk\.workbuddy\binaries\python\versions\3.13.12\python.exe'

def webp(img, path, quality=85, lossless=False):
    """保存为 WebP，透明图用 lossless 避免边缘锯齿"""
    img.save(path, 'WEBP', quality=quality, lossless=lossless)
    orig = os.path.getsize(path.replace('.webp','.png') if not os.path.exists(path.replace('.webp','.png')) else '')
    new = os.path.getsize(path)
    print(f'  {os.path.basename(path)}: {new//1024}KB')

def resize_webp(src, dst, size, quality=85, lossless=False):
    img = Image.open(src).convert('RGBA')
    img = img.resize(size, Image.LANCZOS)
    img.save(dst, 'WEBP', quality=quality, lossless=lossless)
    orig_sz = os.path.getsize(src)
    new_sz = os.path.getsize(dst)
    print(f'  {os.path.basename(src)}: {orig_sz//1024}KB → {size[0]}×{size[1]} → {new_sz//1024}KB ({100-new_sz*100//orig_sz}%↓)')

# ═══ 1. 技能图标: 2048×2048 → 256×256 WebP ═══
print('\n═══ 技能图标 2048→256 WebP ═══')
skills = ['淬毒刃1_透明','震雷枪1_透明','隐身面具1_透明','无敌之盾1_透明',
          '烈焰斩1_透明','巨剑术1_透明','强化1_透明','神速1_透明',
          '激光1_透明','冰冻1_透明','回血1_透明','普攻_透明','准备好了UI1_透明']
for s in skills:
    src = os.path.join(BASE, '游戏资源/图像/UI', f'{s}.png')
    dst = os.path.join(BASE, '游戏资源/图像/UI', f'{s}.webp')
    if os.path.exists(src):
        resize_webp(src, dst, (256, 256), quality=80)

# ═══ 2. 主角图: 1773×2364 → 355×474 WebP ═══
print('\n═══ 主角图 缩小 WebP ═══')
src = os.path.join(BASE, '游戏资源/图像/人物/主角_透明.png')
dst = os.path.join(BASE, '游戏资源/图像/人物/主角_透明.webp')
resize_webp(src, dst, (355, 474), quality=80)

# ═══ 3. 背景图保持原尺寸转 WebP ═══
print('\n═══ 背景图 PNG→WebP ═══')
bgs = [
    ('游戏资源/图像/UI/主页.png', '游戏资源/图像/UI/主页.webp'),
    ('游戏资源/图像/场景/主页早晨.png', '游戏资源/图像/场景/主页早晨.webp'),
    ('游戏资源/图像/场景/主页晚上.png', '游戏资源/图像/场景/主页晚上.webp'),
    ('游戏资源/图像/场景/准备界面的背景1.jpg', '游戏资源/图像/场景/准备界面的背景1.webp'),
    ('游戏资源/图像/场景/联机界面背景1.jpg', '游戏资源/图像/场景/联机界面背景1.webp'),
]
for sp, dp in bgs:
    src = os.path.join(BASE, sp)
    dst = os.path.join(BASE, dp)
    if os.path.exists(src):
        img = Image.open(src).convert('RGB')
        img.save(dst, 'WEBP', quality=85)
        orig_sz = os.path.getsize(src)
        new_sz = os.path.getsize(dst)
        print(f'  {os.path.basename(sp)}: {orig_sz//1024}KB → {new_sz//1024}KB ({100-new_sz*100//orig_sz}%↓)')

# ═══ 4. 房间趣味动画帧: 720×960 → 363×484 (一半) WebP ═══
print('\n═══ 房间动画帧 缩小 WebP ═══')
anim_dir = os.path.join(BASE, '游戏资源/序列帧/人物动作/联机准备界面趣味动画_色键输出/透明帧')
cnt = 0
for j in range(1, 122):
    fn = f'frame_{j:05d}.png'
    src = os.path.join(anim_dir, fn)
    dst = os.path.join(anim_dir, f'frame_{j:05d}.webp')
    if os.path.exists(src):
        resize_webp(src, dst, (363, 484), quality=75, lossless=False)
        cnt += 1
print(f'  共处理 {cnt} 帧')

# ═══ 5. 统计 ═══
print('\n═══ 完成 ═══')
total_new = 0
total_old = 0
for root, dirs, files in os.walk(os.path.join(BASE, '游戏资源')):
    for f in files:
        if f.endswith('.webp'):
            fp = os.path.join(root, f)
            total_new += os.path.getsize(fp)
            # 尝试找原文件
            png = os.path.join(root, f.replace('.webp','.png'))
            jpg = os.path.join(root, f.replace('.webp','.jpg'))
            if os.path.exists(png): total_old += os.path.getsize(png)
            elif os.path.exists(jpg): total_old += os.path.getsize(jpg)
print(f'原始: {total_old/1024/1024:.1f}MB → WebP: {total_new/1024/1024:.1f}MB')
if total_old > 0:
    print(f'节省: {100 - total_new*100//total_old}%')

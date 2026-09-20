# -*- coding: utf-8 -*-
"""生成「上海青浦世外高级中学 · 社团招新」海报。

内容全部取自本项目（社团官网 qpwflhsclub.com）：
分类、社团名、简介、社长/副社长/指导老师、点赞数，以及官网功能点（浏览/详情/点赞/青源智造/中英双语）。
图片素材复用 src/main/resources/static/other photo/ 下的校徽与「青源智造」插画。

用法：
    python3 tools/poster/make_poster.py
依赖：Pillow（二维码缺失时会用 qrcode 库现场生成，可 pip3 install qrcode）
输出：~/Desktop/社团招新海报.png （A4 竖版 2480×3508，300dpi）
"""
import math
import os
import tempfile

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

PROJ = "/Users/a15356015027/Documents/GitHub/clubSpringBoot"
ASSETS = os.path.join(PROJ, "src/main/resources/static/other photo")
LOGO = os.path.join(ASSETS, "WFL-logo.png")
MASCOT = os.path.join(ASSETS, "advice-logo.png")
QR = os.path.join(tempfile.gettempdir(), "club_qr.png")
OUT = os.path.expanduser("~/Desktop/社团招新海报.png")

W, H = 2480, 3508          # A4 @300dpi
M = 170                    # 左右页边距
CW = W - 2 * M             # 内容宽度 2140
SITE = "qpwflhsclub.com"
SITE_URL = "https://" + SITE + "/"

# ---- 配色：取自官网 index_style.css / common.css ----
C_BG = (4, 7, 18)          # #01040d 系
C_TEXT = (246, 247, 252)   # #F6F7FC
C_DIM = (158, 169, 204)    # #8B91B0 提亮
C_FAINT = (108, 120, 156)  # #5A6180
C_BLUE = (69, 137, 255)    # #4589FF
C_DEEP = (8, 57, 183)      # #0839B7
C_CYAN = (56, 189, 248)    # #38BDF8
C_TEAL = (6, 182, 212)     # #06B6D4
C_AMBER = (255, 184, 77)   # #FFB84D
C_CORAL = (255, 123, 123)  # #FF7B7B
C_CARD = (16, 23, 47)
C_LINE = (44, 58, 104)

# ---- 字体（macOS 内置，无需外挂） ----
F_TITLE = ("/System/Library/Fonts/Supplemental/STHeiti Medium.ttc", 1)   # Heiti SC Medium
F_REG = ("/System/Library/Fonts/Hiragino Sans GB.ttc", 0)                # 冬青黑体 W3
F_BOLD = ("/System/Library/Fonts/Hiragino Sans GB.ttc", 2)               # 冬青黑体 W6
F_LAT_B = ("/System/Library/Fonts/Avenir Next.ttc", 0)                   # Latin 粗
F_LAT_D = ("/System/Library/Fonts/Avenir Next.ttc", 2)                   # Latin 半粗
F_LAT_M = ("/System/Library/Fonts/Avenir Next.ttc", 5)                   # Latin 中

_font_cache = {}


def font(spec, size):
    key = (spec, size)
    if key not in _font_cache:
        _font_cache[key] = ImageFont.truetype(spec[0], size, index=spec[1])
    return _font_cache[key]


# ---------------------------------------------------------------- 基础绘制
def linear_grad(size, colors, direction="h"):
    """线性渐变图。colors = [(0.0,(r,g,b)), (1.0,(r,g,b))...]"""
    w, h = size
    n = max(2, w if direction == "h" else h)
    strip = Image.new("RGB", (n, 1) if direction == "h" else (1, n))
    px = strip.load()
    for i in range(n):
        t = i / (n - 1)
        rgb = colors[-1][1]
        for k in range(len(colors) - 1):
            p0, c0 = colors[k]
            p1, c1 = colors[k + 1]
            if p0 <= t <= p1 or k == len(colors) - 2:
                u = 0.0 if p1 == p0 else min(1.0, max(0.0, (t - p0) / (p1 - p0)))
                rgb = tuple(int(c0[j] + (c1[j] - c0[j]) * u) for j in range(3))
                break
        px[(i, 0) if direction == "h" else (0, i)] = rgb
    return strip.resize((w, h), Image.BILINEAR)


def text_w(d, text, f, ls=0.0):
    if not text:
        return 0.0
    return d.textlength(text, font=f) + ls * (len(text) - 1)


def draw_ls(base, xy, text, f, fill, ls=0.0, anchor="la"):
    """带字距绘制文本；anchor: la 左 / ca 居中 / ra 右（按整体宽度对齐）"""
    d = ImageDraw.Draw(base)
    total = text_w(d, text, f, ls)
    x, y = xy
    if anchor[0] == "c":
        x -= total / 2
    elif anchor[0] == "r":
        x -= total
    for ch in text:
        d.text((x, y), ch, font=f, fill=fill)
        x += d.textlength(ch, font=f) + ls
    return total


def grad_text(base, xy, text, f, colors, ls=0.0, direction="h", anchor="la"):
    """渐变填充文字：先在遮罩上排版，再把渐变贴回去"""
    d = ImageDraw.Draw(base)
    total = text_w(d, text, f, ls)
    asc, desc = f.getmetrics()
    mask = Image.new("L", (int(total) + 16, asc + desc + 16), 0)
    md = ImageDraw.Draw(mask)
    x = 8
    for ch in text:
        md.text((x, 8), ch, font=f, fill=255)
        x += d.textlength(ch, font=f) + ls
    grad = linear_grad(mask.size, colors, direction)
    x0 = xy[0]
    if anchor[0] == "c":
        x0 -= mask.width / 2
    elif anchor[0] == "r":
        x0 -= mask.width
    base.paste(grad, (int(x0), int(xy[1] - 8)), mask)
    return total


def wrap_cjk(text, f, max_w, ls=0.0):
    d = ImageDraw.Draw(Image.new("RGB", (8, 8)))
    lines, cur = [], ""
    for ch in text:
        if ch == "\n":
            lines.append(cur)
            cur = ""
            continue
        if cur and text_w(d, cur + ch, f, ls) > max_w:
            lines.append(cur)
            cur = ch
        else:
            cur += ch
    if cur:
        lines.append(cur)
    return lines


def wrap_balanced(text, f, max_w):
    """先按宽度折行，再按行数平均分配字数（避免末行只剩一两个字）"""
    lines = wrap_cjk(text, f, max_w)
    if len(lines) <= 1:
        return lines
    per = -(-len(text) // len(lines))
    return [text[i:i + per] for i in range(0, len(text), per)]


def prep_mascot(path, white_thresh=232):
    """把近白像素统一成纯白并裁掉白边，使插画与白色卡片无缝衔接（不做暴力抠图，避免误删）"""
    im = Image.open(path).convert("RGB")
    r, g, b = im.split()
    mn = ImageChops.darker(ImageChops.darker(r, g), b)
    near_white = mn.point(lambda v: 255 if v >= white_thresh else 0)
    white = Image.new("RGB", im.size, (255, 255, 255))
    out = Image.composite(white, im, near_white)
    bbox = ImageChops.difference(out, white).convert("L").point(lambda v: 255 if v > 14 else 0).getbbox()
    if bbox:
        out = out.crop(bbox)
    return out.convert("RGBA")


def rounded(base, box, radius, fill, outline=None, width=0, alpha=255):
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    f = fill if len(fill) == 4 else fill + (alpha,)
    d.rounded_rectangle(box, radius=radius, fill=f, outline=outline, width=width)
    base.alpha_composite(layer)


def shadow(base, box, radius=36, blur=26, alpha=120, offset=(0, 16)):
    sh = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(sh)
    d.rounded_rectangle((box[0] + offset[0], box[1] + offset[1],
                         box[2] + offset[0], box[3] + offset[1]),
                        radius=radius, fill=(0, 0, 0, alpha))
    base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(blur)))


def glow(base, cx, cy, r, color, strength=105):
    """径向光晕（外淡内亮）"""
    n = max(32, r // 5)
    g = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(g)
    steps = 26
    for i in range(steps, 0, -1):
        t = i / steps
        a = int(strength * (1 - t) ** 1.7)
        rr = (n / 2) * t
        d.ellipse([n / 2 - rr, n / 2 - rr, n / 2 + rr, n / 2 + rr],
                  fill=color + (max(0, min(255, a)),))
    g = g.filter(ImageFilter.GaussianBlur(n / 14)).resize((2 * r, 2 * r), Image.BICUBIC)
    base.alpha_composite(g, (int(cx - r), int(cy - r)))


def cutout_white(path, thresh=16, feather=1.2):
    """抠掉近白背景（严格阈值 + 边缘收缩羽化）；残留的封闭白斑会在白卡片上自然融入"""
    im = Image.open(path).convert("RGB")
    w, h = im.size
    work = im.copy()
    sentinel = (1, 254, 3)
    seeds = []
    for x in range(0, w, 10):
        seeds += [(x, 0), (x, h - 1)]
    for y in range(0, h, 10):
        seeds += [(0, y), (w - 1, y)]
    for s in seeds:
        if work.getpixel(s) == sentinel:
            continue
        try:
            ImageDraw.floodfill(work, s, sentinel, thresh=thresh)
        except Exception:
            pass
    diff = ImageChops.difference(work, Image.new("RGB", (w, h), sentinel)).convert("L")
    mask = diff.point(lambda v: 0 if v < 8 else 255)
    mask = mask.filter(ImageFilter.MinFilter(3))
    if feather:
        mask = mask.filter(ImageFilter.GaussianBlur(feather))
    out = im.convert("RGBA")
    out.putalpha(mask)
    return out


def paste_fit(base, img, box, align="center"):
    """等比缩放后贴入 box（不裁切），align: center/left/right"""
    bw, bh = box[2] - box[0], box[3] - box[1]
    im = img.copy()
    im.thumbnail((int(bw), int(bh)), Image.LANCZOS)
    if align == "left":
        x = box[0]
    elif align == "right":
        x = box[2] - im.width
    else:
        x = box[0] + (bw - im.width) // 2
    y = box[1] + (bh - im.height) // 2
    base.alpha_composite(im, (int(x), int(y)))


# ---------------------------------------------------------------- 矢量小图标
def icon_bars(d, cx, cy, s, color):
    """学科竞赛：柱状图"""
    bw = s * 0.26
    for i, hh in enumerate((0.46, 0.78, 1.0)):
        x = cx - s / 2 + i * (bw + s * 0.14)
        d.rounded_rectangle([x, cy + s / 2 - s * hh, x + bw, cy + s / 2],
                            radius=bw * 0.32, fill=color)


def icon_star(d, cx, cy, s, color):
    """创意艺术：五角星"""
    pts = []
    for i in range(10):
        rr = s / 2 if i % 2 == 0 else s / 4.8
        a = -math.pi / 2 + i * math.pi / 5
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    d.polygon(pts, fill=color)


def icon_bolt(d, cx, cy, s, color):
    """体育活动：闪电"""
    pts = [(cx - s * 0.14, cy - s * 0.52), (cx + s * 0.46, cy - s * 0.52),
           (cx + s * 0.06, cy - s * 0.06), (cx + s * 0.40, cy - s * 0.06),
           (cx - s * 0.28, cy + s * 0.52), (cx - s * 0.02, cy + s * 0.10),
           (cx - s * 0.40, cy + s * 0.10)]
    d.polygon(pts, fill=color)


def icon_heart(d, cx, cy, s, color):
    """社会服务：爱心"""
    r = s * 0.28
    d.ellipse([cx - s * 0.50, cy - s * 0.44, cx - s * 0.50 + 2 * r, cy - s * 0.44 + 2 * r], fill=color)
    d.ellipse([cx + s * 0.50 - 2 * r, cy - s * 0.44, cx + s * 0.50, cy - s * 0.44 + 2 * r], fill=color)
    d.polygon([(cx - s * 0.50, cy - s * 0.04), (cx + s * 0.50, cy - s * 0.04), (cx, cy + s * 0.50)], fill=color)


def icon_check(d, cx, cy, s, color, ring):
    """功能清单：圆底对勾"""
    d.ellipse([cx - s / 2, cy - s / 2, cx + s / 2, cy + s / 2], fill=ring)
    d.line([(cx - s * 0.24, cy + s * 0.02), (cx - s * 0.05, cy + s * 0.21),
            (cx + s * 0.26, cy - s * 0.22)],
           fill=color, width=max(4, int(s * 0.12)), joint="curve")


# ---------------------------------------------------------------- 海报内容（全部取自项目）
SCHOOL_CN = "上海青浦世外高级中学"
SCHOOL_EN = "SHANGHAI QINGPU WORLD FOREIGN LANGUAGE HIGH SCHOOL"
KICKER = "2026 秋季招新 · 校园社团官网"
TITLE = "社团招新"
TITLE_EN = "JOIN A CLUB · FIND YOUR PEOPLE"
LEAD = "发现你真正想加入的社团"
LEAD_DESC = "探索丰富的校园社团活动，找到属于你的热爱与归属。"
CTA = "浏览全部社团"

NOTICES = [
    ("新版社团官网上线，社团信息一站浏览", C_BLUE),
    ("青源智造（创意箱）已开放，欢迎留言", C_AMBER),
    ("登录注册功能暂不开放，敬请期待", C_CORAL),
]

CATEGORIES = [
    ("学科竞赛", "STUDY", "建模 · 竞赛 · 学术研讨", C_BLUE, icon_bars),
    ("创意艺术", "CREATIVITY", "影像 · 设计 · 舞台表达", C_CORAL, icon_star),
    ("体育活动", "ACTIVITY", "训练 · 赛事 · 团队默契", C_AMBER, icon_bolt),
    ("社会服务", "SERVICE", "志愿 · 公益 · 社区行动", C_TEAL, icon_heart),
]

CLUBS = [
    ("光影影像社", "创意艺术", C_CORAL, 24,
     "聚焦摄影、短片拍摄与后期制作，欢迎热爱影像表达的同学一起创作。",
     "社长 陈同学 · 副社长 林同学 · 指导老师 王老师"),
    ("羽毛球社", "体育活动", C_AMBER, 31,
     "从基础步伐到双打配合，每周训练与校内友谊赛，不同水平都能找到默契。",
     "社长 赵同学 · 副社长 吴同学 · 指导老师 周老师"),
    ("志愿服务社", "社会服务", C_TEAL, 18,
     "策划校园与社区志愿活动，把服务精神落到具体项目和持续行动里。",
     "社长 李同学 · 副社长 徐同学 · 指导老师 陈老师"),
    ("数学建模社", "学科竞赛", C_BLUE, 42,
     "围绕建模思维、算法基础和竞赛协作，建立更完整的问题分析能力。",
     "社长 孙同学 · 副社长 郑同学 · 指导老师 刘老师"),
]

FEATURES = [
    ("浏览全部社团", "学科竞赛 / 创意艺术 / 体育活动 / 社会服务 四大分类"),
    ("社团详情", "社长 · 副社长 · 指导老师 · 社团简介 · 视频展示"),
    ("一键点赞", "为你支持的社团打 call，热度一目了然"),
    ("青源智造（创意箱）", "一般建议 / Bug 反馈 / 功能请求，支持匿名提交"),
    ("中英双语", "中文 / EN 一键切换，外教与交换生也能一起参与"),
]

STEPS = [
    ("打开社团官网", "浏览器输入 qpwflhsclub.com，或扫描右侧二维码"),
    ("浏览全部社团", "按四大分类筛选，找到属于你的热爱与归属"),
    ("查看详情 · 点赞", "看社长与指导老师、社团视频，为心仪社团打 call"),
    ("青源智造留言", "写下你的创意与期待，我们会认真看到"),
]


# ---------------------------------------------------------------- 版面区块
def build_background(base):
    bg = linear_grad((W, H), [(0.0, (6, 11, 28)), (0.11, (12, 26, 64)),
                              (0.27, (6, 11, 30)), (1.0, C_BG)], "v").convert("RGBA")
    base.alpha_composite(bg)
    grid = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grid)
    for x in range(0, W + 1, 80):
        gd.line([(x, 0), (x, H)], fill=(255, 255, 255, 7))
    for y in range(0, H + 1, 80):
        gd.line([(0, y), (W, y)], fill=(255, 255, 255, 7))
    base.alpha_composite(grid)
    glow(base, 2080, 220, 880, C_DEEP, 170)
    glow(base, 2330, 640, 560, C_CYAN, 60)
    glow(base, 160, 1160, 700, C_TEAL, 38)
    glow(base, 1240, 3220, 820, C_DEEP, 70)
    top = linear_grad((W, 10), [(0.0, C_DEEP), (0.45, C_BLUE), (1.0, C_CYAN)], "h").convert("RGBA")
    base.alpha_composite(top, (0, 0))


def grad_pill(base, box, colors, radius=None, direction="h"):
    """渐变胶囊/圆角块"""
    bw, bh = box[2] - box[0], box[3] - box[1]
    r = radius if radius is not None else bh // 2
    m = Image.new("L", (bw, bh), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, bw - 1, bh - 1], radius=r, fill=255)
    base.paste(linear_grad((bw, bh), colors, direction), (box[0], box[1]), m)


def section_label(base, y, cn, en, accent=C_BLUE):
    d = ImageDraw.Draw(base)
    d.rounded_rectangle([M, y + 4, M + 10, y + 52], radius=5, fill=accent + (255,))
    draw_ls(base, (M + 30, y - 8), cn, font(F_TITLE, 48), C_TEXT, 3)
    draw_ls(base, (W - M, y + 12), en, font(F_LAT_D, 23), (118, 132, 172), 4.5, "ra")


def pill(base, box, fill, outline=None, alpha=255):
    rounded(base, box, (box[3] - box[1]) // 2, fill, outline, 2 if outline else 0, alpha)


def build_hero(base):
    d = ImageDraw.Draw(base)
    # 校徽 + 校名
    rounded(base, (M, 118, M + 216, 334), 46, (255, 255, 255, 248))
    paste_fit(base, Image.open(LOGO).convert("RGBA"), (M + 24, 142, M + 192, 310))
    draw_ls(base, (M + 256, 128), SCHOOL_CN, font(F_TITLE, 66), C_TEXT, 3)
    draw_ls(base, (M + 258, 230), SCHOOL_EN, font(F_LAT_D, 25), (128, 142, 180), 2.6)
    # 右上两枚胶囊
    f_site = font(F_LAT_D, 30)
    pw = text_w(d, SITE, f_site, 1.4) + 100
    pill(base, (W - M - pw, 136, W - M, 214), (255, 255, 255, 20), (255, 255, 255, 46))
    draw_ls(base, (W - M - pw / 2, 152), SITE, f_site, (208, 228, 255), 1.4, "ca")
    f_lang = font(F_REG, 28)
    lang = "中文 / EN · 双语站点"
    pw2 = text_w(d, lang, f_lang, 1.2) + 100
    pill(base, (W - M - pw2, 232, W - M, 310), (69, 137, 255, 30), (69, 137, 255, 80))
    draw_ls(base, (W - M - pw2 / 2, 248), lang, f_lang, (168, 206, 255), 1.2, "ca")
    # 眉标
    d.rounded_rectangle([M, 402, M + 12, 450], radius=6, fill=C_AMBER + (255,))
    draw_ls(base, (M + 34, 394), KICKER, font(F_TITLE, 46), (163, 226, 255), 4)
    # 主标题
    grad_text(base, (M - 8, 462), TITLE, font(F_TITLE, 250),
              [(0.0, (172, 208, 255)), (0.45, (92, 216, 246)), (1.0, (255, 199, 122))], 8, "h")
    draw_ls(base, (M, 772), TITLE_EN, font(F_LAT_B, 36), (112, 214, 255), 9)
    # 公告栏
    nb = (1428, 470, W - M, 764)
    rounded(base, nb, 34, (255, 255, 255, 12), (255, 255, 255, 34), 2)
    draw_ls(base, (nb[0] + 40, nb[1] + 28), "公告栏", font(F_TITLE, 34), C_TEXT, 2)
    draw_ls(base, (nb[2] - 40, nb[1] + 36), "NOTICE BOARD", font(F_LAT_D, 20), (130, 146, 186), 2.4, "ra")
    ny = nb[1] + 96
    for text, color in NOTICES:
        d.rounded_rectangle([nb[0] + 40, ny + 6, nb[0] + 46, ny + 34], radius=3, fill=color + (255,))
        draw_ls(base, (nb[0] + 66, ny), text, font(F_REG, 27), (198, 210, 236), 1.0)
        ny += 60
    # 副标题 + 说明 + CTA
    draw_ls(base, (M, 826), LEAD, font(F_TITLE, 62), C_TEXT, 4)
    draw_ls(base, (M, 908), LEAD_DESC, font(F_REG, 36), (166, 180, 214), 1.2)
    cta = (W - M - 560, 822, W - M, 942)
    grad_pill(base, cta, [(0.0, C_DEEP), (0.5, C_BLUE), (1.0, C_CYAN)])
    draw_ls(base, ((cta[0] + cta[2]) / 2, 856), CTA + "   →", font(F_BOLD, 38), (255, 255, 255), 2, "ca")


def build_categories(base, y):
    gap = 30
    cw = (CW - gap * 3) // 4
    ch = 300
    for i, (cn, en, tag, color, icon) in enumerate(CATEGORIES):
        x = M + i * (cw + gap)
        box = (x, y, x + cw, y + ch)
        shadow(base, box, 34, 22, 110, (0, 12))
        rounded(base, box, 34, C_CARD, C_LINE, 2)
        layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        cx, cy, r = x + 78, y + 78, 38
        ld.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color + (48,))
        icon(ld, cx, cy, 44, color + (255,))
        base.alpha_composite(layer)
        draw_ls(base, (x + 40, y + 142), cn, font(F_TITLE, 46), C_TEXT, 3)
        draw_ls(base, (x + 42, y + 204), en, font(F_LAT_D, 23), (118, 132, 172), 3.4)
        draw_ls(base, (x + 40, y + 246), tag, font(F_REG, 27), (170, 184, 218), 0.8)


def build_clubs(base, y0):
    gap_x, gap_y, ch = 40, 30, 270
    cw = (CW - gap_x) // 2
    d = ImageDraw.Draw(base)
    for i, (name, tag, color, likes, desc, meta) in enumerate(CLUBS):
        row, col = divmod(i, 2)
        x = M + col * (cw + gap_x)
        y = y0 + row * (ch + gap_y)
        box = (x, y, x + cw, y + ch)
        shadow(base, box, 30, 20, 105, (0, 10))
        rounded(base, box, 30, C_CARD, C_LINE, 2)
        # 左侧色条
        m = Image.new("L", (12, ch), 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, 11, ch - 1], radius=6, fill=255)
        base.paste(linear_grad((12, ch), [(0.0, color), (1.0, tuple(int(c * 0.30) for c in color))], "v"),
                   (x + 22, y + 24), m)
        # 社名 + 分类标签
        f_name = font(F_TITLE, 50)
        nw = text_w(d, name, f_name, 3)
        draw_ls(base, (x + 58, y + 28), name, f_name, C_TEXT, 3)
        f_tag = font(F_REG, 24)
        tw = text_w(d, tag, f_tag, 1)
        light = tuple(int(c + (255 - c) * 0.28) for c in color)
        pill(base, (x + 58 + nw + 20, y + 36, x + 58 + nw + 20 + tw + 44, y + 92),
             color + (40,), color + (130,))
        draw_ls(base, (x + 58 + nw + 42, y + 48), tag, f_tag, light, 1)
        # 点赞数
        f_like = font(F_LAT_D, 28)
        lt = "%d" % likes
        lw = text_w(d, lt, f_like, 1)
        hx = x + cw - 66 - lw
        icon_heart(d, hx - 26, y + 64, 30, C_CORAL + (255,))
        draw_ls(base, (hx, y + 48), lt, f_like, C_CORAL, 1)
        # 简介 + 人员
        f_desc = font(F_REG, 32)
        yy = y + 102
        for ln in wrap_balanced(desc, f_desc, cw - 160)[:2]:
            draw_ls(base, (x + 58, yy), ln, f_desc, (176, 190, 222), 1.0)
            yy += 46
        draw_ls(base, (x + 58, y + 214), meta, font(F_REG, 25), C_FAINT, 0.8)


def build_features(base, x, y0):
    for i, (title, desc) in enumerate(FEATURES):
        y = y0 + i * 96
        layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        icon_check(ld, x + 24, y + 24, 46, C_BLUE + (255,), C_BLUE + (48,))
        base.alpha_composite(layer)
        draw_ls(base, (x + 78, y - 6), title, font(F_BOLD, 36), C_TEXT, 2)
        draw_ls(base, (x + 78, y + 44), desc, font(F_REG, 27), (150, 165, 200), 0.8)


def build_mascot_card(base, box):
    x0, y0, x1, y1 = box
    shadow(base, box, 36, 30, 150, (0, 16))
    rounded(base, box, 36, (255, 255, 255, 255))
    d = ImageDraw.Draw(base)
    draw_ls(base, (x0 + 44, y0 + 34), "青源智造（创意箱）", font(F_TITLE, 40), C_DEEP, 1.5)
    draw_ls(base, (x0 + 44, y0 + 100), "你的声音，是我们前进的方向。", font(F_REG, 27), (110, 124, 160), 1.0)
    tags = ["一般建议", "Bug 反馈", "功能请求", "匿名提交"]
    f_tag = font(F_REG, 24)
    tx, ty = x0 + 44, y0 + 164
    for t in tags:
        bw = text_w(d, t, f_tag, 1) + 52
        if tx + bw > x0 + 500:
            tx = x0 + 44
            ty += 62
        rounded(base, (tx, ty, tx + bw, ty + 52), 26, (234, 241, 255, 255), (198, 216, 255, 255), 2)
        draw_ls(base, (tx + 26, ty + 11), t, f_tag, C_DEEP, 1.0)
        tx += bw + 16
    draw_ls(base, (x0 + 44, y0 + 302), "在官网导航栏「青源智造」即可留言", font(F_REG, 24), (150, 164, 198), 0.8)
    paste_fit(base, prep_mascot(MASCOT), (x0 + 524, y0 + 18, x1 - 14, y1 - 14))


def build_steps(base, y0, x=M):
    d = ImageDraw.Draw(base)
    for i, (title, desc) in enumerate(STEPS):
        y = y0 + i * 88
        layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        cx, cy, r = x + 30, y + 30, 30
        ld.ellipse([cx - r, cy - r, cx + r, cy + r], fill=C_BLUE + (44,), outline=(122, 176, 255, 200), width=3)
        base.alpha_composite(layer)
        d.text((cx, cy - 2), str(i + 1), font=font(F_LAT_B, 30), fill=(196, 224, 255), anchor="mm")
        draw_ls(base, (x + 88, y - 8), title, font(F_BOLD, 36), C_TEXT, 2)
        draw_ls(base, (x + 88, y + 42), desc, font(F_REG, 26), (150, 165, 200), 0.8)


def build_qr_card(base, box):
    shadow(base, box, 32, 24, 140, (0, 14))
    rounded(base, box, 32, (255, 255, 255, 255))
    paste_fit(base, Image.open(QR).convert("RGBA"),
              (box[0] + 38, box[1] + 36, box[0] + 278, box[1] + 276))
    d = ImageDraw.Draw(base)
    draw_ls(base, (box[0] + 300, box[1] + 62), "扫码直达", font(F_TITLE, 40), C_DEEP, 2)
    draw_ls(base, (box[0] + 300, box[1] + 118), "社团官网", font(F_TITLE, 40), C_DEEP, 2)
    draw_ls(base, (box[0] + 300, box[1] + 186), SITE, font(F_LAT_D, 26), (110, 124, 160), 1.0)
    draw_ls(base, (box[0] + 300, box[1] + 232), "中文 / EN 双语 · 手机浏览更佳", font(F_REG, 23), (140, 156, 192), 0.8)


def build_footer(base):
    d = ImageDraw.Draw(base)
    d.line([(M, 3390), (W - M, 3390)], fill=(255, 255, 255, 30), width=2)
    draw_ls(base, (M, 3416), SCHOOL_CN + " · 校园社团官网", font(F_REG, 30), (152, 166, 200), 1.5)
    draw_ls(base, (W - M, 3420), SITE + "   ·   中文 / EN", font(F_LAT_M, 27), (140, 154, 190), 1.2, "ra")


def ensure_qr():
    """确保二维码图片存在；缺失时用 qrcode 库现场生成（指向官网首页）"""
    if os.path.exists(QR):
        return
    try:
        import qrcode
    except ImportError:
        raise SystemExit("缺少二维码图片 %s，且未安装 qrcode：pip3 install qrcode" % QR)
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=16, border=4)
    qr.add_data(SITE_URL)
    qr.make(fit=True)
    qr.make_image(fill_color="black", back_color="white").convert("RGB").save(QR)
    print("已生成二维码:", QR, "->", SITE_URL)


def main():
    ensure_qr()
    base = Image.new("RGBA", (W, H), C_BG + (255,))
    build_background(base)
    build_hero(base)
    section_label(base, 1046, "四大分类，总有一款适合你", "CATEGORIES")
    build_categories(base, 1130)
    section_label(base, 1492, "优秀社团展示", "FEATURED CLUBS")
    build_clubs(base, 1576)
    section_label(base, 2210, "社团官网能帮你做什么", "PLATFORM FEATURES")
    build_features(base, M, 2294)
    build_mascot_card(base, (1370, 2294, W - M, 2814))
    section_label(base, 2878, "四步加入你心仪的社团", "HOW TO JOIN")
    build_steps(base, 2962)
    build_qr_card(base, (1750, 2962, W - M, 3314))
    build_footer(base)
    base.convert("RGB").save(OUT, "PNG", optimize=True)
    print("已生成:", OUT, base.size)


if __name__ == "__main__":
    main()

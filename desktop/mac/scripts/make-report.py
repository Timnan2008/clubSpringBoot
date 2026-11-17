"""Create the plain-language handoff PDF from actual app screenshots."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
import shutil

root = Path(__file__).resolve().parent.parent
out = root / 'docs'
out.mkdir(exist_ok=True)
for name in ('home-1440', 'discover', 'settings'):
    shutil.copyfile(root / 'qa' / f'{name}.png', out / f'{name}.png')
pdfmetrics.registerFont(TTFont('Chinese', '/System/Library/Fonts/STHeiti Medium.ttc', subfontIndex=0))
c = canvas.Canvas(str(out / 'Mac客户端-这次做了什么.pdf'), pagesize=(595.28, 841.89))
c.setTitle('青浦世外社团 Mac 客户端 - 这次做了什么')
c.setAuthor('QPWFL Club')
W, H = 595.28, 841.89

def line(text, x, y, size=11, color='#37323F'):
    c.setFillColor(HexColor(color)); c.setFont('Chinese', size); c.drawString(x, y, text)

def paragraph(text, x, y, width=499, size=10.5, leading=18, color='#57515F'):
    row = ''
    for char in text:
        if char == '\n' or pdfmetrics.stringWidth(row + char, 'Chinese', size) > width:
            line(row, x, y, size, color); y -= leading; row = '' if char == '\n' else char
        else: row += char
    if row: line(row, x, y, size, color); y -= leading
    return y

def heading(number, title, y):
    c.setFillColor(HexColor('#EEE7FB')); c.roundRect(40, y - 5, 24, 23, 6, fill=1, stroke=0)
    line(number, 47, y + 2, 10, '#7443B5'); line(title, 76, y + 1, 13, '#261A36')
    return y - 22

def frame(page, title, subtitle):
    c.setFillColor(HexColor('#FAF9FC')); c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(HexColor('#20162F')); c.rect(0, H-122, W, 122, fill=1, stroke=0)
    line('QPWFL / CAMPUS DESKTOP', 40, H-32, 9, '#B89CD9')
    line(title, 40, H-66, 23, '#FFFFFF'); line(subtitle, 40, H-93, 10, '#C3B5D1')
    c.setStrokeColor(HexColor('#DDD6E8')); c.line(40, 42, W-40, 42)
    line('青浦世外社团 · Mac 预览版 0.1.0', 40, 25, 8, '#8F849D')
    line(f'{page} / 2', W-65, 25, 8, '#8F849D')

frame(1, '这次，把网站做成了 Mac App', '完成清单 · 2026.11.17 · 界面截图来自实际运行的客户端')
image = ImageReader(str(out / 'home-1440.png'))
iw, ih = image.getSize(); width = W-80; height = width * ih / iw
c.drawImage(image, 40, H-148-height, width=width, height=height)
y = H-148-height-27
line('已经做好的内容', 40, y, 15, '#382447'); y -= 30
items = [
 ('独立软件', '有自己的 Mac 窗口、红黄绿按钮和校徽图标，双击 App 就能打开。'),
 ('紫黑色界面', '首页、发现社团、我的社团、活动日程、消息、设置，共 6 个页面。'),
 ('真实校园内容', '社团名称、简介、图片和公告来自原网站，检查时读到 43 个社团。'),
 ('能用的操作', '社团分类、关键词搜索、详情弹窗、Command + K 搜索和显示设置。'),
 ('沿用原有账号', '登录、入社、活动管理、完整日历和聊天在 App 内打开原站功能。'),
]
for title, text in items:
    line(title, 40, y, 11, '#563477'); y = paragraph(text, 129, y, width=426, size=10, leading=16) - 9
c.showPage()

frame(2, '你现在怎么打开、怎么看', '先看效果，再用自己的校园账号体验个人功能')
y = heading('1', '打开软件', 686)
y = paragraph('本机 App 放在项目里的 desktop/mac/release/mac-arm64 文件夹，名字是“青浦世外社团.app”。本次已生成 Apple 芯片 Mac 用的 App、DMG 和 ZIP。', 76, y, width=475) - 18
y = heading('2', '先看首页和社团', y)
y = paragraph('打开后可以直接看公告、浏览社团、搜索“编程”并打开详情。这些公开内容不需要登录，也不用先启动 Java、数据库或 SSH。', 76, y, width=475) - 18
y = heading('3', '再登录你自己的账号', y)
y = paragraph('点右上角“登录”，在弹出的校园服务窗口里，用原网站账号登录。返回首页，点搜索框右侧的刷新按钮，再看“我的社团”“活动日程”和“消息”。', 76, y, width=475) - 18
y = heading('4', '点功能继续操作', y)
y = paragraph('点“了解与加入”“创建活动”“打开完整日历”或“打开聊天”，会进入 App 内的原站功能窗口。页面的权限和操作规则沿用网站。', 76, y, width=475) - 24

line('代码放在哪里', 40, y, 15, '#382447'); y -= 25
y = paragraph('同一个 clubSpringBoot 仓库，新内容集中在 desktop/mac。原网站的 Java、页面和配置没有改动，队友已有的 Windows 客户端也保留。源码上传到该仓库的 codex/mac-desktop 分支。', 40, y) - 10
c.setFillColor(HexColor('#F0EBF6')); c.roundRect(40, y-130, W-80, 130, 10, fill=1, stroke=0)
line('这版需要知道的 3 件事', 55, y-24, 12, '#5A3978')
paragraph('1. 已检查公开数据、搜索、详情、设置、窗口缩放和登录窗口。\n2. 没有代填账号密码；登录后的真实入社、聊天与活动操作，需账号持有人验收。\n3. 安装包是未签名预览版；Apple 签名、公证、自动更新和上架还没做。', 55, y-47, width=W-110, size=10, leading=18)
c.showPage(); c.save()
print(out / 'Mac客户端-这次做了什么.pdf')

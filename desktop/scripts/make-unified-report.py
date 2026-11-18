from pathlib import Path
from shutil import copyfile
import re
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
root=Path(__file__).resolve().parents[1]
out=root/'docs';out.mkdir(exist_ok=True)
for source,target in [('windows-light-home','统一版-首页'),('windows-light-settings','统一版-外观设置')]:
    copyfile(root/'mac/qa/unified'/f'{source}.png',out/f'{target}.png')
pdfmetrics.registerFont(TTFont('Chinese','/System/Library/Fonts/STHeiti Medium.ttc',subfontIndex=0))
W,H=595.28,841.89
c=canvas.Canvas(str(out/'Windows与Mac统一版-说明与操作.pdf'),pagesize=(W,H))
c.setTitle('青浦世外社团 1.2.0 - Windows 与 Mac 统一版')
c.setAuthor('QPWFL Club')
def text(t,x,y,size=10,color='#354057'):
 c.setFillColor(HexColor(color));c.setFont('Chinese',size);c.drawString(x,y,t)
def paragraph(t,x,y,width=500,size=10,leading=17):
 row=''
 tokens=re.findall(r'[A-Za-z0-9_./-]+|\s+|.',t)
 joined=[]
 for token in tokens:
  if token in '，。；：、？！）”' and joined:joined[-1]+=token
  else:joined.append(token)
 for token in joined:
  if row and pdfmetrics.stringWidth(row+token,'Chinese',size)>width:
   text(row.rstrip(),x,y,size);y-=leading;row=token.lstrip()
  else:row+=token
 if row:text(row,x,y,size);y-=leading
 return y
def frame(n,title,subtitle):
 c.setFillColor(HexColor('#F7F8FC'));c.rect(0,0,W,H,stroke=0,fill=1)
 c.setFillColor(HexColor('#28233E'));c.rect(0,H-112,W,112,stroke=0,fill=1)
 text('QPWFL / CAMPUS DESKTOP 1.2.0',40,H-30,9,'#C4B8E8')
 text(title,40,H-64,23,'#FFFFFF');text(subtitle,40,H-90,10,'#E3DFF2')
 c.setStrokeColor(HexColor('#D9DEEA'));c.line(40,42,W-40,42)
 text('2026.11.18 · 项目内统一版说明 · 实际 Electron 界面截图',40,26,8,'#667085');text(f'{n} / 2',W-65,26,8,'#667085')
def image(name,y):
 p=ImageReader(str(out/name));w,h=p.getSize();height=(W-80)*h/w
 c.drawImage(p,40,y-height,width=W-80,height=height);return y-height-22
def item(number,title,body,y):
 text(number,40,y,12,'#7952D9');text(title,65,y,11,'#29263A')
 return paragraph(body,65,y-20,W-105,9.5,16)-13
frame(1,'两端统一，继续一起改','Windows 和 Mac 共用一套界面，还是 Electron。')
y=image('统一版-首页.png',H-132)
y=item('01','界面统一了','导航、卡片、按钮、表单和提示统一。默认浅色，也可以换深色；登录、社团和日常页面都在软件里操作。',y)
y=item('02','外观可以自己选','浅色 / 深色 / 跟随系统、主题色、文字大小、预设背景和自己的图片，都能在设置里修改，关闭后会保留。',y)
y=item('03','Windows 的管理入口也搬进来','工作台、账号管理、添加社团、内容审核、建议管理都在软件里，按账号权限显示入口和操作。',y)
y=item('04','大家改同一份代码','先拉 main，再进入 desktop。软件页面改 desktop/mac/src，窗口和接口改 desktop/mac/electron。原网站代码没有修改。',y)
assert y>48,y
c.showPage()
frame(2,'换皮肤，照着点就行','打开软件，左侧点“设置”。')
y=image('统一版-外观设置.png',H-132)
for s in ['1. “外观模式”选浅色、深色，或跟随系统。','2. “主题颜色”点圆圈；最后一个图标可以选自己的颜色。','3. “文字大小”选默认、大或更大。','4. “工作台背景”点预设，或点“选择图片”选电脑里的图片。','5. 调下面的“背景浓度”和“背景模糊”，改完自动保存。','6. 想改回原样，点“恢复默认外观”。']:
 y=paragraph(s,40,y,W-80,10,18)-3
text('文件与检查',40,y-3,11,'#7952D9');y-=24
y=paragraph('安装包：Windows 在 desktop/release，Mac 在 desktop/mac/release。安装后直接打开，无需 Java 或 SSH。',40,y,W-80,9.2,16)-6
y=paragraph('本机检查通过：公开社团读取、主要表单、三种窗口大小、外观重启保存、图片导入、管理页权限。Windows 安装包在 Mac 交叉构建，仍需在 Windows 安装验收。',40,y,W-80,9.2,16)-6
y=paragraph('未完成：新账号注册、附件与工作台文档、任职邀请、旧聊天记录加载、预约 Excel 导出和青源作品内容。真实账号操作还需本人验收。',40,y,W-80,9.2,16)
assert y>48,y
c.showPage();c.save();print(out/'Windows与Mac统一版-说明与操作.pdf')

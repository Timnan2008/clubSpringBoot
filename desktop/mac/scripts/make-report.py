"""Plain-language v0.2 handoff. Screenshots are from the real Electron app."""
from pathlib import Path
import shutil
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
root=Path(__file__).resolve().parent.parent
out=root/'docs';out.mkdir(exist_ok=True)
for name in ('home-1440','discover','settings','club-detail','login'):
    shutil.copyfile(root/'qa'/f'{name}.png',out/f'{name}.png')
im=Image.open(root/'qa/login.png'); w,h=im.size
im.crop((int(w*.196),int(h*.18),int(w*.804),int(h*.82))).save(out/'login-form.png')
pdfmetrics.registerFont(TTFont('Chinese','/System/Library/Fonts/STHeiti Medium.ttc',subfontIndex=0))
W,H=595.28,841.89
c=canvas.Canvas(str(out/'Mac客户端-这次做了什么.pdf'),pagesize=(W,H))
c.setTitle('青浦世外社团 Mac 客户端 0.2.0 - 这次改了什么')
c.setAuthor('QPWFL Club')
def line(t,x,y,size=11,color='#3B3045'):
    c.setFillColor(HexColor(color));c.setFont('Chinese',size);c.drawString(x,y,t)
def paragraph(t,x,y,width=505,size=10.5,leading=18):
    row=''
    for char in t:
        if char=='\n' or pdfmetrics.stringWidth(row+char,'Chinese',size)>width:
            line(row,x,y,size);y-=leading;row='' if char=='\n' else char
        else:row+=char
    if row:line(row,x,y,size);y-=leading
    return y
def frame(page,title,sub):
    c.setFillColor(HexColor('#FAF8FC'));c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(HexColor('#21162E'));c.rect(0,H-118,W,118,fill=1,stroke=0)
    line('QPWFL / CAMPUS DESKTOP 0.2.0',40,H-31,9,'#BAA0D8')
    line(title,40,H-65,23,'#FFFFFF');line(sub,40,H-91,10,'#C6B6D8')
    c.setStrokeColor(HexColor('#DCD2E7'));c.line(40,42,W-40,42)
    line('2026.11.17 · Mac 预览版 · 实际软件截图',40,25,8,'#95879F')
    line(f'{page} / 2',W-66,25,8,'#95879F')
def picture(name,y,width=W-80):
    img=ImageReader(str(out/name));iw,ih=img.getSize();height=width*ih/iw
    c.drawImage(img,40,y-height,width=width,height=height)
    return y-height-25
def item(number,title,body,y):
    line(number,40,y,12,'#8A60B7');line(title,65,y,12,'#55336E')
    return paragraph(body,65,y-21,width=W-105,size=10,leading=17)-14
frame(1,'这次，界面都搬进软件了','四类社团、登录和主要功能，都有自己的软件页面。')
y=picture('home-1440.png',H-140)
y=item('01','四类社团全部搬过来','创造类、活动类、服务类、学术类，每类都有自己的入口；可搜索、看介绍和负责人、提交入社申请。',y)
y=item('02','校园日常也在软件里','校园墙、私信、月历、羽毛球场预约、个人资料、社团工作台和青源智造，都能从左侧打开。',y)
y=item('03','统一成紫黑色桌面界面','重新安排导航、卡片、表单和空白页面。没有内容时会说明，不用网站页面顶替。',y)
y=item('04','代码继续放在原项目','新增内容集中在 desktop/mac，上传到同仓库 codex/mac-desktop 分支。原网站代码和 Windows 客户端保持原样。',y)
assert y>52, y
c.showPage()
frame(2,'登录，也用软件自己的界面','右上角点“登录”，输入原来的校园账号即可。')
y=picture('login-form.png',H-140)
y=item('05','这些操作已经接入原来的服务','登录和找回密码、入社申请、日程增删改、动态与回复、文字私信、活动创建与审核、场地预约，均在软件里操作。具体能做什么仍由账号权限决定。',y)
y=item('06','暂时还没开放的内容','新账号注册、附件预览与上传、文档打开、任职邀请处理暂未接入。青源智造先保留独立页面，内容待补。不会打开网站代替。',y)
y=item('07','怎么打开、检查到哪一步','打开项目内 desktop/mac/release/mac-arm64 的“青浦世外社团.app”。已检查 43 个真实社团、全部导航及测试数据下的主要表单；真实账号的邮件、入社和预约需要本人实际确认。',y)
y=paragraph('安装包为 Apple 芯片 Mac 的未签名预览版，尚未做 Apple 签名、公证或自动更新。',40,y-2,size=9.5,leading=16)
assert y>50,y
c.showPage();c.save()
print(out/'Mac客户端-这次做了什么.pdf')

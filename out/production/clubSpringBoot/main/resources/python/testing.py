import smtplib
from email.mime.text import MIMEText
# 配置 SMTP 信息
smtp_server = "smtp.qiye.aliyun.com"
port = 465
username = "qpwflhs_cs@shwfl.edu.cn"
password = "dJv4iQZVNBTwNKQy"
# 创建邮件内容
msg = MIMEText("这是测试邮件内容", "plain", "utf-8")
msg["Subject"] = "测试邮件"
msg["From"] = username
msg["To"] = "timnan2008@outlook.com"
# 发送邮件
try:
    with smtplib.SMTP_SSL(smtp_server, port) as server:
        server.login(username, password)
        server.sendmail(username, ["timnan2008@outlook.com"], msg.as_string())
    print("邮件发送成功！")
except Exception as e:
    print(f"邮件发送失败: {e}")
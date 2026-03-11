package com.qpwflshclub.formal_club;

import javax.mail.*;
import javax.mail.internet.*;
import java.util.Properties;

public class EmailTest {
    public static void main(String[] args) {
        // 邮箱SMTP服务器信息
        String host = "smtp.qiye.aliyun.com";  // Gmail SMTP服务器（可以根据自己的邮件提供商调整）
        final String user = "qpwflhs_cs@shwfl.edu.cn";  // 你的邮箱地址
        final String password = "sMwIXvDAP5VZ0B3Q";  // 你的邮箱密码

        // 收件人邮件地址
        String to = "timnan2008@outlook.com";  // 收件人的邮箱地址

        // 设置邮件服务器的属性
        Properties properties = new Properties();
        properties.put("mail.smtp.host", host);
        properties.put("mail.smtp.auth", "true");
        properties.put("mail.smtp.port", "465");  // 使用465端口进行TLS连接
        properties.put("mail.smtp.starttls.enable", "true");

        // 获取会话对象，设置用户名和密码
        Session session = Session.getInstance(properties, new Authenticator() {
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(user, password);
            }
        });

        try {
            // 创建一个默认的 MimeMessage 对象
            Message message = new MimeMessage(session);
            // 设置发件人地址
            message.setFrom(new InternetAddress(user));
            // 设置收件人地址
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(to));
            // 设置邮件的主题
            message.setSubject("Test Email from Java");
            // 设置邮件的内容
            message.setText("Hello, this is a test email sent from Java.");

            // 发送邮件
            Transport.send(message);

            System.out.println("邮件已发送!");

        } catch (MessagingException e) {
            e.printStackTrace();
        }
    }
}

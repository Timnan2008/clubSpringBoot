package com.qpwflshclub.formal_club;

import jakarta.mail.*;
import jakarta.mail.internet.*;
import java.util.Properties;

public class EmailTest {

    public static void main(String[] args) {
        // 手动 SMTP 排查工具：仅显式运行 main 才发送，不属于自动测试。
        // 凭据与收件人由运行环境提供，不能写进源码。
        String host = requiredEnvironment("SMTP_HOST");
        final String user = requiredEnvironment("SMTP_USERNAME");
        final String password = requiredEnvironment("SMTP_PASSWORD");
        String to = requiredEnvironment("SMTP_TEST_RECIPIENT");

        // 设置邮件服务器的属性
        Properties properties = new Properties();
        properties.put("mail.smtp.host", host);
        properties.put("mail.smtp.auth", "true");
        properties.put("mail.smtp.port", "465"); // 使用465端口进行TLS连接
        properties.put("mail.smtp.starttls.enable", "true");

        // 获取会话对象，设置用户名和密码
        Session session = Session.getInstance(
            properties,
            new Authenticator() {
                protected PasswordAuthentication getPasswordAuthentication() {
                    return new PasswordAuthentication(user, password);
                }
            }
        );

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

    private static String requiredEnvironment(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Missing environment variable: " + name);
        }
        return value;
    }
}

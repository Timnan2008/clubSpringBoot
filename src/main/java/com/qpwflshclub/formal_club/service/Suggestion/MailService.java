package com.qpwflshclub.formal_club.service.Suggestion;

import org.springframework.stereotype.Service;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

@Service
public class MailService {

    /**
     * 发送邮箱验证码
     *
     * @param smtpHost SMTP服务器
     * @param smtpPort SMTP端口
     * @param smtpUser 发件邮箱
     * @param smtpPass 授权码或密码
     * @param to 收件人邮箱
     * @param code 验证码内容
     */
    public void sendCode(String smtpHost, int smtpPort, String smtpUser, String smtpPass, String to, String code) {

        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(smtpHost);
        sender.setPort(smtpPort);
        sender.setUsername(smtpUser);
        sender.setPassword(smtpPass);
        sender.setProtocol("smtp");

        Properties props = sender.getJavaMailProperties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true"); // 对应 587
        props.put("mail.smtp.ssl.trust", "*"); // 信任所有 SSL/TLS 证书

        // 构建邮件
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(smtpUser);
        message.setTo(to);
        message.setSubject("【验证码】邮箱验证");
        message.setText("您的验证码是：" + code + "\n有效期 5 分钟，请勿泄露给他人。");

        sender.send(message);
    }
}



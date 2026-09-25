package com.qpwflshclub.formal_club.service.Suggestion;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import java.util.Properties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);
    private static final String FROM_NAME = "青浦世外校园社团";

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
    public void sendCode(
        String smtpHost,
        int smtpPort,
        String smtpUser,
        String smtpPass,
        String to,
        String code
    ) {
        send(
            smtpHost,
            smtpPort,
            smtpUser,
            smtpPass,
            to,
            "青浦世外校园社团注册验证码",
            "你的校园社团注册验证码是：" +
                code +
                "\n5 分钟内有效。若非本人操作，请忽略此邮件。\n\nQPWFLHS Clubs verification code: " +
                code +
                "\nThis code expires in 5 minutes."
        );
    }

    public void sendRecoveryCode(
        String host,
        int port,
        String user,
        String password,
        String to,
        String code,
        boolean en
    ) {
        send(
            host,
            port,
            user,
            password,
            to,
            en ? "Reset your QPWFLHS Clubs password" : "青浦世外校园社团密码重置",
            en
                ? "Your password reset code is: " +
                      code +
                      "\nExpires in 5 minutes. If you did not request this, ignore this email."
                : "你的校园社团密码重置验证码是：" +
                      code +
                      "\n5 分钟内有效。若非本人操作，请忽略此邮件。"
        );
    }

    private void send(
        String smtpHost,
        int smtpPort,
        String smtpUser,
        String smtpPass,
        String to,
        String subject,
        String text
    ) {
        JavaMailSenderImpl sender = sender(smtpHost, smtpPort, smtpUser, smtpPass);
        try {
            sender.send(message(sender, smtpUser, to, subject, text));
        } catch (RuntimeException | MessagingException | UnsupportedEncodingException e) {
            log.warn("SMTP delivery failed to {}: {}", to, e.getClass().getSimpleName());
            throw new IllegalStateException("Cannot send mail", e);
        }
    }

    JavaMailSenderImpl sender(String smtpHost, int smtpPort, String smtpUser, String smtpPass) {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(smtpHost);
        sender.setPort(smtpPort);
        sender.setUsername(smtpUser);
        sender.setPassword(smtpPass);
        sender.setProtocol("smtp");
        sender.setDefaultEncoding(StandardCharsets.UTF_8.name());
        Properties props = sender.getJavaMailProperties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.from", smtpUser);
        props.put("mail.smtp.localhost", "qpwflhsclub.com");
        if (smtpPort == 465) {
            props.put("mail.smtp.ssl.enable", "true");
            props.put("mail.smtp.ssl.protocols", "TLSv1.2 TLSv1.3");
            props.put("mail.smtp.ssl.trust", smtpHost);
        } else {
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.starttls.required", "true");
        }
        props.put("mail.smtp.connectiontimeout", "8000");
        props.put("mail.smtp.timeout", "15000");
        props.put("mail.smtp.writetimeout", "15000");
        props.put("mail.smtp.ssl.checkserveridentity", "true");
        return sender;
    }

    MimeMessage message(
        JavaMailSenderImpl sender,
        String smtpUser,
        String to,
        String subject,
        String text
    ) throws MessagingException, UnsupportedEncodingException {
        MimeMessage mime = sender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(
            mime,
            false,
            StandardCharsets.UTF_8.name()
        );
        helper.setFrom(new InternetAddress(smtpUser, FROM_NAME, StandardCharsets.UTF_8.name()));
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(text);
        return mime;
    }
}

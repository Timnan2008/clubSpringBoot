package com.qpwflshclub.formal_club.service.Suggestion;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSenderImpl;

class MailServiceTest {

    @Test
    void registrationMailUsesSchoolBrandingAndUtf8() throws Exception {
        var mail = new MailService();
        JavaMailSenderImpl sender = mail.sender(
            "smtp.qiye.aliyun.com",
            465,
            "qpwflhs_cs@shwfl.edu.cn",
            "secret"
        );
        assertThat(sender.getDefaultEncoding()).isEqualTo(StandardCharsets.UTF_8.name());
        assertThat(sender.getJavaMailProperties().getProperty("mail.smtp.ssl.enable")).isEqualTo(
            "true"
        );
        assertThat(sender.getJavaMailProperties().getProperty("mail.from")).isEqualTo(
            "qpwflhs_cs@shwfl.edu.cn"
        );
        assertThat(sender.getJavaMailProperties().getProperty("mail.smtp.localhost")).isEqualTo(
            "qpwflhsclub.com"
        );
        MimeMessage message = mail.message(
            sender,
            "qpwflhs_cs@shwfl.edu.cn",
            "student@example.com",
            "青浦世外校园社团注册验证码",
            "你的校园社团注册验证码是：123456"
        );
        assertThat(message.getSubject()).isEqualTo("青浦世外校园社团注册验证码");
        assertThat(message.getSubject()).doesNotContain("【验证码】");
        var from = (InternetAddress) message.getFrom()[0];
        assertThat(from.getAddress()).isEqualTo("qpwflhs_cs@shwfl.edu.cn");
        assertThat(from.getPersonal()).isEqualTo("青浦世外校园社团");
        assertThat(message.getAllRecipients()[0].toString()).contains("student@example.com");
        assertThat((String) message.getContent()).contains("123456");
    }
}

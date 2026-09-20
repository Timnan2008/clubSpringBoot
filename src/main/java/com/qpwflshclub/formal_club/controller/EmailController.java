package com.qpwflshclub.formal_club.controller;

import com.qpwflshclub.formal_club.config.LoginEmails;
import com.qpwflshclub.formal_club.pojo.ResponseMessage;
import com.qpwflshclub.formal_club.service.Suggestion.EmailCodeService;
import com.qpwflshclub.formal_club.social.AccountProfiles;
import com.qpwflshclub.formal_club.social.SchoolAccounts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/email")
public class EmailController {

    private static final Logger log = LoggerFactory.getLogger(EmailController.class);

    @Autowired
    private EmailCodeService emailCodeService;

    @Autowired
    LoginEmails loginEmails;

    @Autowired
    AccountProfiles profiles;

    @PostMapping("/send")
    public ResponseMessage<?> send(@RequestParam String email) {
        try {
            if (loginEmails != null) loginEmails.requireAvailable(email);
            if (profiles != null) profiles.requireEmailAvailable(email);
            emailCodeService.sendCode(email);
            return ResponseMessage.success("验证码已发送");
        } catch (org.springframework.web.server.ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Registration email send failed: {}", e.getClass().getSimpleName());
            throw SchoolAccounts.error(
                503,
                "邮件发送失败，请稍后重试 / Could not send the verification email. Please try again."
            );
        }
    }

    @PostMapping("/verify")
    public ResponseMessage<?> verify(
        @RequestParam String email,
        @RequestParam String code,
        jakarta.servlet.http.HttpServletRequest request
    ) {
        boolean ok = emailCodeService.verifyCode(email, code);
        if (ok) {
            com.qpwflshclub.formal_club.config.RegistrationProof.verified(request, email);
            return ResponseMessage.success("验证成功");
        } else {
            return ResponseMessage.error(
                "验证码错误或已过期，请重新获取 / Email code is invalid or expired; request a new code"
            );
        }
    }
}

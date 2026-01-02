package com.qpwflshclub.formal_club.controller;

import com.qpwflshclub.formal_club.pojo.ResponseMessage;
import com.qpwflshclub.formal_club.service.Suggestion.EmailCodeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/email")
public class EmailController {

    @Autowired
    private EmailCodeService emailCodeService;

    @PostMapping("/send")
    public ResponseMessage<?> send(@RequestParam String email) {
        System.out.println(email);
        emailCodeService.sendCode(email);
        return ResponseMessage.success("验证码已发送");
    }

    @PostMapping("/verify")
    public ResponseMessage<?> verify(
            @RequestParam String email,
            @RequestParam String code
    ) {
        boolean ok = emailCodeService.verifyCode(email, code);
        if (ok) {
            return ResponseMessage.success("验证成功");
        } else {
            return ResponseMessage.error("超时");
        }
    }

}

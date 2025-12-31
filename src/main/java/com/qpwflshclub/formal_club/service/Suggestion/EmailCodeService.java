package com.qpwflshclub.formal_club.service.Suggestion;

import com.qpwflshclub.formal_club.Util.CodeUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
public class EmailCodeService {

    @Autowired
    private MailService mailService;

    @Autowired
    private StringRedisTemplate redisTemplate;

    // 发件邮箱配置（可改成配置文件或环境变量）
    private final String SMTP_HOST = "smtp.qq.com";
    private final int SMTP_PORT = 587;
    private final String SMTP_USER = "123456789@qq.com";
    private final String SMTP_PASS = "xxxx授权码xxxx";

    /**
     * 发送验证码
     *
     * @param email 收件邮箱
     */
    public void sendCode(String email) {
        // 生成 6 位随机验证码
        String code = CodeUtil.generateCode();

        // 保存到 Redis 5 分钟
        redisTemplate.opsForValue().set("email:code:" + email, code, 5, TimeUnit.MINUTES);

        // 调用 MailService 发送
        mailService.sendCode(SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, email, code);
    }

    /**
     * 校验验证码
     *
     * @param email 邮箱
     * @param code 用户输入的验证码
     * @return true 校验通过
     */
    public boolean verifyCode(String email, String code) {
        String redisCode = redisTemplate.opsForValue().get("email:code:" + email);
        if (redisCode != null && redisCode.equals(code)) {
            // 验证成功，删除验证码
            redisTemplate.delete("email:code:" + email);
            return true;
        }
        return false;
    }
}

package com.qpwflshclub.formal_club.service.Suggestion;

import com.qpwflshclub.formal_club.Util.CodeUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
public class EmailCodeService {

    @Autowired
    private MailService mailService;

    @Autowired(required = false)
    private StringRedisTemplate redisTemplate;

    // 内存存储作为Redis的替代方案
    private final Map<String, CodeInfo> codeStorage = new HashMap<>();

    // 从配置文件读取 SMTP 配置
    @Value("${spring.mail.host:smtp.qiye.aliyun.com}")
    private String smtpHost;

    @Value("${spring.mail.port:465}")
    private int smtpPort;

    @Value("${spring.mail.username:}")
    private String smtpUser;

    @Value("${spring.mail.password:}")
    private String smtpPass;

    /**
     * 验证码信息类
     */
    private static class CodeInfo {
        private final String code;
        private final long expireTime;

        public CodeInfo(String code, long expireTime) {
            this.code = code;
            this.expireTime = expireTime;
        }

        public String getCode() {
            return code;
        }

        public boolean isExpired() {
            return System.currentTimeMillis() > expireTime;
        }
    }

    /**
     * 发送验证码
     *
     * @param email 收件邮箱
     */
    public void sendCode(String email) {
        // 生成 6 位随机验证码
        String code = CodeUtil.generateCode();

        // 保存验证码，优先使用Redis，否则使用内存存储
        if (redisTemplate != null) {
            try {
                // 保存到 Redis 5 分钟
                redisTemplate.opsForValue().set("email:code:" + email, code, 5, TimeUnit.MINUTES);
            } catch (Exception e) {
                // Redis 连接失败，使用内存存储
                System.out.println("Redis 连接失败，使用内存存储: " + e.getMessage());
                saveToMemory(email, code);
            }
        } else {
            // 使用内存存储
            saveToMemory(email, code);
        }

        // 调用 MailService 发送
        mailService.sendCode(smtpHost, smtpPort, smtpUser, smtpPass, email, code);

        System.out.println("验证码已发送至: " + email);
    }

    /**
     * 保存验证码到内存
     */
    private void saveToMemory(String email, String code) {
        long expireTime = System.currentTimeMillis() + 5 * 60 * 1000;
        codeStorage.put(email, new CodeInfo(code, expireTime));
    }

    /**
     * 校验验证码
     *
     * @param email 邮箱
     * @param code  用户输入的验证码
     * @return true 校验通过
     */
    public boolean verifyCode(String email, String code) {
        // 先尝试从Redis获取
        if (redisTemplate != null) {
            try {
                String redisCode = redisTemplate.opsForValue().get("email:code:" + email);
                if (redisCode != null && redisCode.equals(code)) {
                    // 验证成功，删除验证码
                    redisTemplate.delete("email:code:" + email);
                    return true;
                }
            } catch (Exception e) {
                System.out.println("Redis 连接失败，尝试从内存获取: " + e.getMessage());
            }
        }

        // 从内存存储验证
        CodeInfo codeInfo = codeStorage.get(email);
        if (codeInfo != null && !codeInfo.isExpired() && codeInfo.getCode().equals(code)) {
            // 验证成功，删除验证码
            codeStorage.remove(email);
            return true;
        }

        return false;
    }
}

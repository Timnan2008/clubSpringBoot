package com.qpwflshclub.formal_club.Util;

import java.security.SecureRandom;

public class CodeUtil {

    /** 验证码必须不可预测：java.util.Random 的种子可被推算，改用 SecureRandom。 */
    private static final SecureRandom RANDOM = new SecureRandom();

    public static String generateCode() {
        int code = 100000 + RANDOM.nextInt(900000); // 生成 6 位数字
        return String.valueOf(code);
    }
}

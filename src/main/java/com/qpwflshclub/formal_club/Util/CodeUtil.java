package com.qpwflshclub.formal_club.Util;

import java.util.Random;

public class CodeUtil {

    public static String generateCode() {
        Random random = new Random();
        int code = 100000 + random.nextInt(900000); // 生成 6 位数字
        return String.valueOf(code);
    }
}

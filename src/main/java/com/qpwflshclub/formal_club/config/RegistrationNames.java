package com.qpwflshclub.formal_club.config;

import com.qpwflshclub.formal_club.social.ContentModeration;
import com.qpwflshclub.formal_club.social.service.SchoolAccounts;

public final class RegistrationNames {

    private RegistrationNames() {}

    /** Both names are required; only the Chinese name is checked against the student roster. */
    public static void validate(String chinese, String english) {
        if (chinese == null || chinese.isBlank()) throw SchoolAccounts.error(
            400,
            "请填写中文名 / Enter your Chinese name"
        );
        if (english == null || english.isBlank()) throw SchoolAccounts.error(
            400,
            "请填写英文名或姓名拼音 / Enter your English name or Pinyin"
        );
        for (String value : new String[] { chinese, english })
            if (
                value.strip().length() > 100 || value.codePoints().anyMatch(Character::isISOControl)
            ) throw SchoolAccounts.error(
                400,
                "姓名每项不超过 100 字 / Each name can contain up to 100 characters"
            );
        ContentModeration.check(chinese, english);
    }
}

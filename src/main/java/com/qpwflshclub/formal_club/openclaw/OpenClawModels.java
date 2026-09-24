package com.qpwflshclub.formal_club.openclaw;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Page choices. Flash and Pro go through OpenClaw. MiMo is called directly. */
public final class OpenClawModels {

    public static final String FLASH = "flash";
    public static final String V4 = "v4";
    public static final String MIMO = "mimo";

    private static final Map<String, String> REFS = Map.of(
        FLASH,
        "deepseek/deepseek-flash",
        V4,
        "deepseek/deepseek-v4-pro",
        MIMO,
        "mimo/mimo-v2.6-pro"
    );

    private OpenClawModels() {}

    public static List<Map<String, String>> choices() {
        return choices(false);
    }

    public static List<Map<String, String>> choices(boolean english) {
        return List.of(
            Map.of("id", FLASH, "label", "DeepSeek V4.1 Flash"),
            Map.of("id", V4, "label", "DeepSeek V4 Pro"),
            Map.of(
                "id",
                MIMO,
                "label",
                "MiMo V2.6",
                "badge",
                english ? "Not yet open" : "暂未开放",
                "detail",
                english ? "A powerful open model from Xiaomi Group" : "由小米集团开发的强大开源模型"
            )
        );
    }

    public static String known(String key) {
        if (V4.equals(key) || MIMO.equals(key)) return key;
        return FLASH;
    }

    public static String ref(String key) {
        String ref = REFS.get(key == null ? "" : key);
        if (ref == null) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "请选择 DeepSeek V4.1 Flash、DeepSeek V4 Pro 或 MiMo V2.6"
        );
        return ref;
    }
}

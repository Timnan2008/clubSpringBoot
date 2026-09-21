package com.qpwflshclub.formal_club.social.controller;

import com.qpwflshclub.formal_club.User.pojo.Admin;
import com.qpwflshclub.formal_club.User.pojo.UserBase;
import com.qpwflshclub.formal_club.social.ContentModeration;
import com.qpwflshclub.formal_club.social.service.ModerationPenalty;
import com.qpwflshclub.formal_club.social.service.SchoolAccounts;
import jakarta.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.web.bind.annotation.*;

/**
 * 违禁词后台（第三十四轮）：让管理员在网页上加词、删词、看违规记录、手动解除封禁。
 *
 * 之前词库只能改文件（`resources/moderation/banned-words.txt` 打包，或者服务器上
 * `data/moderation/banned-words.txt`），违规记录只能翻 JSON —— 老师/网管没法自助处理。
 *
 * 设计上的两个约束：
 * <ol>
 *   <li><b>打包词库只读</b>：后台只能增删「本机补充词库」，改错了删一行就回退，
 *       不会把随版本发布的词库改花；</li>
 *   <li><b>只有管理员能进</b>：`Admin` 或 `userRight >= 3`，其余一律 403。</li>
 * </ol>
 *
 * 路径放在 `/api/campus-social/moderation/**`，跟其他社交接口一样先过 {@code AuthFilter} 的登录检查。
 */
@RestController
@RequestMapping("/api/campus-social/moderation")
public class ModerationAdminController {

    private final SchoolAccounts accounts;
    private final ModerationPenalty penalties;

    public ModerationAdminController(SchoolAccounts accounts, ModerationPenalty penalties) {
        this.accounts = accounts;
        this.penalties = penalties;
    }

    /**
     * 权限：**看**（词库 / 违规记录）老师以上（userRight ≥ 2 或 Admin）；
     * **改**（加词 / 删词 / 解封）只有管理员（Admin 或 userRight ≥ 3），其余 403。
     */
    private UserBase staff(HttpServletRequest request, boolean write) {
        UserBase user = accounts.current(request);
        boolean admin = user instanceof Admin || (user != null && user.getUserRight() >= 3);
        boolean allowed = admin || (!write && user != null && user.getUserRight() >= 2);
        if (!allowed) {
            throw SchoolAccounts.error(
                403,
                write
                    ? "无权修改内容审核设置（只有管理员可以加词 / 删词 / 解封）"
                    : "无权访问内容审核后台"
            );
        }
        return user;
    }

    /** 词库明细：每条词来自哪一份词库（打包 / 本机 / 环境变量）。 */
    @GetMapping("/words")
    public Object words(HttpServletRequest request) {
        staff(request, false);
        List<ContentModeration.WordInfo> words = ContentModeration.wordInfo();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("file", ContentModeration.extraFile());
        out.put("count", words.size());
        out.put("words", words);
        return out;
    }

    public record WordInput(String word) {}

    /** 加词：只写本机补充词库，写完立刻生效。 */
    @PostMapping("/words")
    public Object addWord(@RequestBody WordInput input, HttpServletRequest request) {
        UserBase user = staff(request, true);
        String word = ContentModeration.addWord(input == null ? null : input.word());
        return Map.of("word", word, "by", Objects.toString(user.getUsername(), ""));
    }

    /** 删词：只能删本机词库里的词。 */
    @DeleteMapping("/words/{word}")
    public Object removeWord(@PathVariable String word, HttpServletRequest request) {
        staff(request, true);
        if (!ContentModeration.removeWord(word)) {
            throw SchoolAccounts.error(400, "只能删「本机」词库里的词；打包词库是只读的。");
        }
        return Map.of("removed", word);
    }

    /** 违规记录：账号、次数、是否封禁中、剩余分钟、最近 50 条明细。 */
    @GetMapping("/strikes")
    public Object strikes(HttpServletRequest request) {
        staff(request, false);
        long now = System.currentTimeMillis();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Map.Entry<String, ModerationPenalty.State> entry : penalties.all().entrySet()) {
            ModerationPenalty.State state = entry.getValue();
            long remaining = Math.max(0L, state.banUntil() - now);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("account", entry.getKey());
            row.put("strikes", state.strikes());
            row.put("banned", remaining > 0);
            row.put("remainingMinutes", remaining / 60_000L);
            row.put("until", remaining > 0 ? ModerationPenalty.untilText(state.banUntil()) : "");
            row.put("history", state.history());
            rows.add(row);
        }
        return Map.of("accounts", rows);
    }

    public record ForgiveInput(String account) {}

    /** 手动解除封禁（网管确认是误封时用）。 */
    @PostMapping("/forgive")
    public Object forgive(@RequestBody ForgiveInput input, HttpServletRequest request) {
        UserBase user = staff(request, true);
        if (input == null || input.account() == null || input.account().isBlank()) {
            throw SchoolAccounts.error(400, "缺少账号");
        }
        boolean done = penalties.forgive(input.account());
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("forgiven", done);
        out.put("account", input.account());
        out.put("by", Objects.toString(user.getUsername(), ""));
        return out;
    }
}

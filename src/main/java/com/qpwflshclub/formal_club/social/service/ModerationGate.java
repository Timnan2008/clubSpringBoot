package com.qpwflshclub.formal_club.social.service;

import com.qpwflshclub.formal_club.social.ContentModeration;
import java.util.Collection;
import org.springframework.stereotype.Service;

/**
 * 违禁词统一入口：所有「用户能打字的地方」都调它。
 *
 * <p>命中违禁词时：
 * <ol>
 *   <li>拒绝这次提交（返回 400，错误信息里直接告诉学生「第几次提醒 / 封了几天」）</li>
 *   <li>给这个账号记一次过（{@link ModerationPenalty}）</li>
 * </ol>
 * 前 2 次只提醒；第 3 次起封 1 天、4 次 2 天、5 次 4 天……（见 {@link ModerationPenalty#banDaysFor}）
 */
@Service
public class ModerationGate {

    /** 各输入位置的中文名，会写进违规记录，方便老师/网管回看。 */
    public static final String CHAT = "私信/聊天";
    public static final String POST = "校园墙帖子";
    public static final String REPLY = "帖子评论/回复";
    public static final String PROFILE = "个人资料";
    public static final String BOOKING = "羽毛球场地预约备注";
    public static final String SUGGESTION = "清源建议";
    public static final String CALENDAR = "个人日历";
    public static final String WORKSPACE = "社团工作台";
    public static final String REGISTER = "注册资料";
    public static final String FILES = "附件文件名";

    private final ModerationPenalty penalties;

    public ModerationGate(ModerationPenalty penalties) {
        this.penalties = penalties;
    }

    /** 网管账号 id（通知里显示成「网管」）。 */
    public static String wardenId() {
        return ModerationPenalty.wardenId();
    }

    /**
     * 检查并（命中时）拒绝提交。
     *
     * @param account 违规账号的 key；未登录场景可传 null（只拦截、不记过）
     * @param where   违规位置，用上面的常量
     */
    public void inspect(String account, String where, String... texts) {
        String hit = ContentModeration.findAny(texts);
        if (hit == null) return;
        throw com.qpwflshclub.formal_club.social.service.SchoolAccounts.error(
            400,
            complain(account, where, hit)
        );
    }

    /** 集合版本（标签、附件名列表等）。 */
    public void inspect(String account, String where, Collection<String> texts) {
        if (texts == null) return;
        inspect(account, where, texts.toArray(new String[0]));
    }

    /**
     * 命中也照常返回（用于已经写了一半、不方便整条回滚的地方，例如附件、日历条目）。
     *
     * @return 命中的词；没命中返回 null
     */
    public String inspectQuietly(String account, String where, String... texts) {
        String hit = ContentModeration.findAny(texts);
        if (hit != null && account != null && !account.isBlank()) penalties.strike(account, where, hit);
        return hit;
    }

    /** 只做检查，不记过（查询类、后台校验用）。 */
    public void verify(String... texts) {
        ContentModeration.check(texts.length == 0 ? "" : String.join(" ", texts));
    }

    private String complain(String account, String where, String hit) {
        if (account == null || account.isBlank()) {
            return "内容包含违禁词「" + hit + "」，请修改后提交。 / Please remove inappropriate language.";
        }
        return penalties.strike(account, where, hit).message();
    }
}

package com.qpwflshclub.formal_club.openclaw;

import java.sql.Date;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.Locale;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** One account may spend at most 2 RMB of model usage each Shanghai week. */
@Component
public class OpenClawQuota implements ApplicationRunner {

    static final String EXHAUSTED =
        "本周 Agent Ollie 额度已用完（2 元）。Agent 将于 9 月 28 日起停用。";
    static final String EXHAUSTED_EN =
        "This week's Agent Ollie allowance (2 yuan) is used up. Agent will be disabled from September 28.";
    private static final ZoneId SHANGHAI = ZoneId.of("Asia/Shanghai");
    private static final String DDL = """
    CREATE TABLE IF NOT EXISTS openclaw_usage (
      account_id BIGINT NOT NULL,
      week_start DATE NOT NULL,
      cost_micro BIGINT NOT NULL,
      PRIMARY KEY (account_id, week_start)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """;

    private final JdbcTemplate jdbc;

    @org.springframework.beans.factory.annotation.Value("${club.openclaw.unlimited-accounts:}")
    private String unlimitedAccounts = "";

    boolean unlimited(com.qpwflshclub.formal_club.User.pojo.UserBase user) {
        return false; // All accounts share the allowance, including former exemptions.
    }

    public String blockReason(
        com.qpwflshclub.formal_club.User.pojo.UserBase user,
        boolean english
    ) {
        return unlimited(user) ? null : blockReason(OpenClawIdentity.id(user), english);
    }

    public String remainingText(
        com.qpwflshclub.formal_club.User.pojo.UserBase user,
        boolean english
    ) {
        return unlimited(user)
            ? english
                ? "Unlimited allowance"
                : "不限额"
            : remainingText(OpenClawIdentity.id(user), english);
    }

    public OpenClawQuota(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            jdbc.execute(DDL);
        } catch (RuntimeException e) {
            org.slf4j.LoggerFactory.getLogger(getClass()).warn(
                "OpenClaw usage table missing: {}",
                e.toString()
            );
        }
    }

    public synchronized String blockReason(long accountId) {
        return blockReason(accountId, false);
    }

    public synchronized String blockReason(long accountId, boolean english) {
        try {
            return spent(accountId) >= OpenClawPrice.WEEKLY_LIMIT_MICRO
                ? english
                    ? EXHAUSTED_EN
                    : EXHAUSTED
                : null;
        } catch (RuntimeException e) {
            return english
                ? "Unable to confirm this week's allowance. Try again shortly."
                : "暂时无法确认本周额度，请稍后再试。";
        }
    }

    public synchronized void add(long accountId, long microYuan) {
        if (microYuan <= 0) return;
        Date week = Date.valueOf(weekStart(Instant.now()));
        jdbc.update(
            """
            INSERT INTO openclaw_usage (account_id, week_start, cost_micro)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE cost_micro = cost_micro + ?
            """,
            accountId,
            week,
            microYuan,
            microYuan
        );
    }

    public synchronized String remainingText(long accountId) {
        return remainingText(accountId, false);
    }

    public synchronized String remainingText(long accountId, boolean english) {
        try {
            long left = Math.max(0L, OpenClawPrice.WEEKLY_LIMIT_MICRO - spent(accountId));
            return english
                ? String.format(Locale.US, "%.2f yuan left this week", left / 1_000_000d)
                : String.format(Locale.CHINA, "本周剩余 %.2f 元", left / 1_000_000d);
        } catch (RuntimeException e) {
            return "";
        }
    }

    private long spent(long accountId) {
        Long spent = jdbc.query(
            "SELECT cost_micro FROM openclaw_usage WHERE account_id = ? AND week_start = ?",
            rs -> rs.next() ? rs.getLong(1) : 0L,
            accountId,
            Date.valueOf(weekStart(Instant.now()))
        );
        return spent == null ? 0L : spent;
    }

    static LocalDate weekStart(Instant when) {
        return LocalDate.ofInstant(when, SHANGHAI).with(
            TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)
        );
    }
}

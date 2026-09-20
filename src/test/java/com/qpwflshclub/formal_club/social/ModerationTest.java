package com.qpwflshclub.formal_club.social;

import static org.assertj.core.api.Assertions.*;

import com.qpwflshclub.formal_club.social.service.ModerationGate;
import com.qpwflshclub.formal_club.social.service.ModerationPenalty;
import java.nio.file.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * 违禁词引擎 / 阶梯封禁 / 闸门 的回归测试（第三十四轮补）。
 *
 * <p>这三块是「用户能打字的地方」的安全网，之前一份测试都没有：改一行正则就可能全站误封或全站漏封，
 * 线上很难第一时间发现。这里把关键契约钉住：
 *
 * <ol>
 *   <li>匹配规则：大小写 / 全角半角 / 零宽字符统一化；中文忽略空格标点；英文按整词（fuckery ≠ fuck）；</li>
 *   <li>阶梯处罚：前 2 次只提醒，第 3 次起 1 / 2 / 4 / 8 天翻倍，封禁跨重启保留、可人工解除；</li>
 *   <li>闸门：命中就抛 400 并记过（记录里带「位置」，方便网管回看），干净文本直接放行，
 *       未登录场景只拦截不记过。</li>
 * </ol>
 */
class ModerationTest {

    @TempDir
    Path root;

    ModerationPenalty penalty;
    ModerationGate gate;

    /** 账号 id 在生产环境是 64 位十六进制（见 SchoolAccounts.key），测试里用同样形状。 */
    private static final String A = "a".repeat(64);
    private static final String B = "b".repeat(64);
    private static final String C = "c".repeat(64);
    private static final String D = "d".repeat(64);
    private static final String E = "e".repeat(64);

    @BeforeEach
    void setup() throws Exception {
        penalty = new ModerationPenalty(root.resolve("penalties.json").toString());
        gate = new ModerationGate(penalty);
    }

    // ---------------------------------------------------------------- 引擎

    @Test
    void normalizesFullWidthCaseAndInvisibleCharacters() {
        assertThat(ContentModeration.normalize("Ａ\u200BＢ")).isEqualTo("ab");
        assertThat(ContentModeration.normalize("傻\u200B逼")).isEqualTo("傻逼");
        assertThat(ContentModeration.normalize(null)).isEmpty();
    }

    @Test
    void packagedWordListIsLoaded() {
        assertThat(ContentModeration.words()).isNotEmpty();
        assertThat(ContentModeration.words()).contains("傻逼");
    }

    @Test
    void chineseWordIsFoundEvenWithSpacesAndPunctuationInserted() {
        assertThat(ContentModeration.find("你这个 傻 逼 东西")).isEqualTo("傻逼");
        assertThat(ContentModeration.find("你，傻。逼！")).isEqualTo("傻逼");
    }

    @Test
    void latinWordsMatchWholeWordsOnly() {
        assertThat(ContentModeration.find("what the FUCK")).isEqualTo("fuck");
        assertThat(ContentModeration.find("fuckery")).isNull();
        assertThat(ContentModeration.find("shitake mushroom")).isNull();
    }

    @Test
    void cleanTextIsNotBlocked() {
        assertThat(ContentModeration.find("明天下午三点在操场集合")).isNull();
        assertThat(ContentModeration.findAny(null, "", "   ")).isNull();
    }

    @Test
    void checkThrowsFourHundredForHitsAndPassesCleanText() {
        assertThatThrownBy(() -> ContentModeration.check("傻逼")).hasMessageContaining("400");
        ContentModeration.check("正常内容，不会被拦");
    }

    // ---------------------------------------------------------------- 阶梯封禁

    @Test
    void banLengthStartsAtOneDayAndDoublesFromTheThirdStrike() {
        assertThat(ModerationPenalty.banDaysFor(1)).isZero();
        assertThat(ModerationPenalty.banDaysFor(2)).isZero();
        assertThat(ModerationPenalty.banDaysFor(3)).isEqualTo(1);
        assertThat(ModerationPenalty.banDaysFor(4)).isEqualTo(2);
        assertThat(ModerationPenalty.banDaysFor(5)).isEqualTo(4);
        assertThat(ModerationPenalty.banDaysFor(6)).isEqualTo(8);
    }

    @Test
    void firstTwoStrikesWarnAndTheThirdBansForOneDay() {
        var first = penalty.strike(A, ModerationGate.POST, "傻逼");
        assertThat(first.count()).isEqualTo(1);
        assertThat(first.banned()).isFalse();
        assertThat(first.message()).contains("第 1 次提醒");

        assertThat(penalty.strike(A, ModerationGate.CHAT, "傻逼").banned()).isFalse();

        var third = penalty.strike(A, ModerationGate.PROFILE, "傻逼");
        assertThat(third.count()).isEqualTo(3);
        assertThat(third.banDays()).isEqualTo(1);
        assertThat(third.banned()).isTrue();
        assertThat(third.message()).contains("网管").contains("封禁 1 天");
        assertThat(penalty.banned(A)).isTrue();
        assertThat(penalty.remainingMillis(A)).isPositive();
    }

    @Test
    void strikesSurviveRestartAndCanBeForgiven() throws Exception {
        penalty.strike(B, ModerationGate.POST, "傻逼");
        penalty.strike(B, ModerationGate.POST, "傻逼");

        var reopened = new ModerationPenalty(root.resolve("penalties.json").toString());
        assertThat(reopened.state(B).strikes()).isEqualTo(2);
        assertThat(reopened.forgive(B)).isTrue();
        assertThat(reopened.state(B).strikes()).isZero();
        assertThat(reopened.banned(B)).isFalse();
    }

    @Test
    void historyKeepsWhereTheStrikeHappened() {
        penalty.strike(C, ModerationGate.CLUB, "傻逼");
        assertThat(penalty.state(C).history()).hasSize(1);
        assertThat(penalty.state(C).history().get(0).where()).isEqualTo(ModerationGate.CLUB);
        assertThat(penalty.state(C).history().get(0).word()).isEqualTo("傻逼");
    }

    // ---------------------------------------------------------------- 闸门

    @Test
    void gateRejectsTheSubmissionAndRecordsAStrike() {
        assertThatThrownBy(() ->
            gate.inspect(C, ModerationGate.CLUB, "正常社团名", "傻逼简介")
        ).hasMessageContaining("400");
        assertThat(penalty.state(C).strikes()).isEqualTo(1);
        assertThat(penalty.state(C).history().get(0).where()).isEqualTo(ModerationGate.CLUB);
    }

    @Test
    void gateLetsCleanTextThroughAndIgnoresNullFields() {
        gate.inspect(D, ModerationGate.CLUB, null, "", "书法社", "每周三活动");
        assertThat(penalty.state(D).strikes()).isZero();
    }

    @Test
    void gateWithoutALoginStillBlocksButRecordsNothing() {
        assertThatThrownBy(() ->
            gate.inspect(null, ModerationGate.POST, "傻逼")
        ).hasMessageContaining("违禁词");
        assertThat(penalty.state("f".repeat(64)).strikes()).isZero();
    }

    @Test
    void quietInspectionRecordsTheHitWithoutThrowing() {
        assertThat(gate.inspectQuietly(E, ModerationGate.FILES, "傻逼.txt")).isEqualTo("傻逼");
        assertThat(penalty.state(E).strikes()).isEqualTo(1);
        assertThat(gate.inspectQuietly(E, ModerationGate.FILES, "作业.docx")).isNull();
        assertThat(penalty.state(E).strikes()).isEqualTo(1);
    }

    @Test
    void collectionOverloadChecksEveryElement() {
        assertThatThrownBy(() ->
            gate.inspect(D, ModerationGate.POST, java.util.List.of("标签一", "傻逼标签"))
        ).hasMessageContaining("400");
    }
}

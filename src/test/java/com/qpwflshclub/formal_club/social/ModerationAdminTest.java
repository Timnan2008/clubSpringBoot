package com.qpwflshclub.formal_club.social;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.qpwflshclub.formal_club.User.pojo.Admin;
import com.qpwflshclub.formal_club.User.pojo.User;
import com.qpwflshclub.formal_club.social.controller.ModerationAdminController;
import com.qpwflshclub.formal_club.social.service.ModerationGate;
import com.qpwflshclub.formal_club.social.service.ModerationPenalty;
import com.qpwflshclub.formal_club.social.service.SchoolAccounts;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockHttpServletRequest;

/**
 * 违禁词后台（第三十四轮）的回归测试。
 *
 * <p>后台是给老师/网管自助用的，它自己的安全边界必须钉死：
 *
 * <ol>
 *   <li><b>只有管理员能进</b>：普通学生 403，网管 / 老师（userRight ≥ 3）或 Admin 才放行；</li>
 *   <li><b>打包词库只读</b>：加词只能进「本机词库」，加重复的词、删打包里的词都要被拒；</li>
 *   <li><b>加完立刻生效</b>：加的词马上能被 {@link ContentModeration#find} 命中，删掉马上失效；</li>
 *   <li><b>违规记录能看能解</b>：列出档案里的账号、封禁状态与明细，并能手动解除。</li>
 * </ol>
 */
class ModerationAdminTest {

    @TempDir
    Path root;

    SchoolAccounts accounts = mock(SchoolAccounts.class);
    ModerationPenalty penalties;
    ModerationAdminController controller;
    MockHttpServletRequest request = new MockHttpServletRequest();
    String originalWordsFile;

    @BeforeEach
    void setup() throws Exception {
        penalties = new ModerationPenalty(root.resolve("penalties.json").toString());
        controller = new ModerationAdminController(accounts, penalties);
        originalWordsFile = ContentModeration.extraFile();
        // 指到临时文件：验证真实的写盘路径，但不动仓库里的词库
        ContentModeration.overrideExtraFile(root.resolve("banned-words.txt").toString());
        ContentModeration.reload();
    }

    @AfterEach
    void cleanup() {
        ContentModeration.overrideExtraFile(originalWordsFile);
        ContentModeration.reload();
    }

    private void asAdmin() {
        when(accounts.current(request)).thenReturn(new Admin());
    }

    private void asTeacher() {
        when(accounts.current(request)).thenReturn(
            new com.qpwflshclub.formal_club.User.pojo.Teacher()
        );
    }

    private void asStudent() {
        when(accounts.current(request)).thenReturn(new User());
    }

    // ---------------------------------------------------------------- 权限

    @Test
    void studentsCannotOpenTheConsole() {
        asStudent();
        assertThatThrownBy(() -> controller.words(request)).hasMessageContaining("403");
        assertThatThrownBy(() -> controller.strikes(request)).hasMessageContaining("403");
    }

    @Test
    void teachersCanReadButNotWriteAndAdminsCanDoBoth() {
        asTeacher();
        assertThat(controller.words(request)).isNotNull(); // 老师能回看
        assertThatThrownBy(() ->
            controller.addWord(new ModerationAdminController.WordInput("测试词"), request)
        ).hasMessageContaining("403");

        asAdmin();
        assertThat(controller.words(request)).isNotNull();
        assertThat(
            controller.addWord(new ModerationAdminController.WordInput("测试词"), request)
        ).isNotNull();
    }

    // ---------------------------------------------------------------- 词库增删

    @Test
    void addedWordTakesEffectImmediatelyAndCanBeRemoved() {
        asAdmin();
        controller.addWord(new ModerationAdminController.WordInput("测试违禁词"), request);

        assertThat(ContentModeration.find("这是测试违禁词")).isEqualTo("测试违禁词");
        assertThat(ContentModeration.wordInfo()).anyMatch(
            info -> info.word().equals("测试违禁词") && info.source().equals("本机")
        );

        controller.removeWord("测试违禁词", request);
        assertThat(ContentModeration.find("这是测试违禁词")).isNull();
        assertThat(ContentModeration.wordInfo()).noneMatch(
            info -> info.word().equals("测试违禁词") && info.source().equals("本机")
        );
    }

    @Test
    void packagedWordsAreReadOnlyAndDuplicatesAreRejected() {
        asAdmin();
        // 打包词库里的词不能重复加、也不能删
        assertThatThrownBy(() ->
            controller.addWord(new ModerationAdminController.WordInput("傻逼"), request)
        ).hasMessageContaining("打包词库");
        assertThatThrownBy(() -> controller.removeWord("傻逼", request)).hasMessageContaining(
            "只读"
        );

        controller.addWord(new ModerationAdminController.WordInput("新增词条"), request);
        assertThatThrownBy(() ->
            controller.addWord(new ModerationAdminController.WordInput("新增词条"), request)
        ).hasMessageContaining("已经");
        assertThat(controller.removeWord("新增词条", request)).isNotNull();
    }

    @Test
    void invalidWordsAreRejected() {
        asAdmin();
        for (String bad : new String[] { "", "   ", "带 空格", "带\n换行" }) {
            assertThatThrownBy(() ->
                controller.addWord(new ModerationAdminController.WordInput(bad), request)
            ).hasMessageContaining("词条无效");
        }
    }

    // ---------------------------------------------------------------- 违规记录

    @Test
    void strikesAreListedAndCanBeForgiven() {
        String account = "a".repeat(64);
        for (int i = 0; i < 3; i++) {
            penalties.strike(account, ModerationGate.POST, "傻逼");
        }
        asAdmin();

        Map<?, ?> listed = (Map<?, ?>) controller.strikes(request);
        List<?> rows = (List<?>) listed.get("accounts");
        assertThat(rows).hasSize(1);
        Map<?, ?> row = (Map<?, ?>) rows.get(0);
        assertThat(row.get("account")).isEqualTo(account);
        assertThat(row.get("strikes")).isEqualTo(3);
        assertThat(row.get("banned")).isEqualTo(true);
        assertThat((Long) row.get("remainingMinutes")).isPositive();

        Map<?, ?> forgiven = (Map<?, ?>) controller.forgive(
            new ModerationAdminController.ForgiveInput(account),
            request
        );
        assertThat(forgiven.get("forgiven")).isEqualTo(true);
        assertThat(penalties.banned(account)).isFalse();
        assertThat(penalties.state(account).strikes()).isZero();
    }

    @Test
    void forgiveWithoutAnAccountIsRejected() {
        asAdmin();
        assertThatThrownBy(() ->
            controller.forgive(new ModerationAdminController.ForgiveInput("  "), request)
        ).hasMessageContaining("缺少账号");
    }
}

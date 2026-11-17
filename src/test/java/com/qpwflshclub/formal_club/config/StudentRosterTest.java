package com.qpwflshclub.formal_club.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class StudentRosterTest {

    @TempDir
    Path root;

    @Test
    void matchingNumberAndChineseNameAreAccepted() throws Exception {
        var roster = roster();
        roster.requireMatchingStudent("20260001", "测试甲");
        roster.requireMatchingStudent("20260001", " 测 试 甲 ");
    }

    @Test
    void mismatchedOrUnknownPairsCannotRegister() throws Exception {
        var roster = roster();
        assertThatThrownBy(() -> roster.requireMatchingStudent("20260001", "测试乙"))
            .hasMessageContaining("400")
            .hasMessageContaining("不一致");
        // 英文名不再与名册比对，也不能代替中文名通过核对。
        assertThatThrownBy(() ->
            roster.requireMatchingStudent("20260001", "Alice")
        ).hasMessageContaining("400");
        assertThatThrownBy(() ->
            roster.requireMatchingStudent("99999999", "测试甲")
        ).hasMessageContaining("400");
        assertThatThrownBy(() ->
            roster.requireMatchingStudent("LOCAL-QA-2026", "CodeTester")
        ).hasMessageContaining("400");
    }

    @Test
    void blankChineseNameCannotRegister() throws Exception {
        var roster = roster();
        assertThatThrownBy(() ->
            roster.requireMatchingStudent("20260001", "")
        ).hasMessageContaining("请填写中文名");
        assertThatThrownBy(() ->
            roster.requireMatchingStudent("20260001", null)
        ).hasMessageContaining("请填写中文名");
    }

    @Test
    void rosterEntryWithoutEnglishNameStillMatches() throws Exception {
        var roster = roster();
        roster.requireMatchingStudent("20260104", "朱兆禾");
        assertThatThrownBy(() ->
            roster.requireMatchingStudent("20260104", "朱兆禾错")
        ).hasMessageContaining("不一致");
    }

    @Test
    void missingRosterFileBlocksStudentSignup() throws Exception {
        var roster = new StudentRoster(root.resolve("missing.json").toString());
        assertThatThrownBy(() ->
            roster.requireMatchingStudent("20260001", "测试甲")
        ).hasMessageContaining("503");
        assertThat(StudentRoster.compactName(" 测 试 甲 ")).isEqualTo("测试甲");
    }

    private StudentRoster roster() throws Exception {
        Path file = root.resolve("roster.json");
        Files.writeString(
            file,
            """
            [{"studentNumber":"20260001","name":"测试甲","nameEn":"Alice","grade":"G10","classroom":"1"},{"studentNumber":"20260104","name":"朱兆禾","nameEn":"","grade":"十年级","classroom":"十年级1班"}]
            """
        );
        return new StudentRoster(file.toString());
    }
}

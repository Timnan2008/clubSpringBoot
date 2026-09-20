package com.qpwflshclub.formal_club.social;

import static org.assertj.core.api.Assertions.*;

import com.qpwflshclub.formal_club.social.service.AccountProfiles;
import com.qpwflshclub.formal_club.social.service.SchoolAccounts;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class AccountProfilesTest {

    @TempDir
    Path root;

    @Test
    void duplicateEmailIsRejectedWithSignInHint() throws Exception {
        var store = new AccountProfiles(root.resolve("profiles.json").toString());
        store.register("a@example.com", "100", "", true, () -> true);
        assertThatThrownBy(() -> store.requireEmailAvailable("A@example.com"))
            .hasMessageContaining("409")
            .hasMessageContaining("已注册");
        assertThatThrownBy(() -> store.register("a@example.com", "200", "", true, () -> true))
            .hasMessageContaining("409")
            .hasMessageContaining("请直接登录");
    }

    @Test
    void studentNumberIsUniqueImmutableAndPersists() throws Exception {
        var store = new AccountProfiles(root.resolve("profiles.json").toString());
        store.register("a@example.com", "00123", "Nick", true, () -> true);
        assertThatThrownBy(() ->
            store.register("b@example.com", "00123", "Other", true, () -> true)
        ).hasMessageContaining("409");
        assertThatThrownBy(() ->
            store.update(
                "a@example.com",
                new AccountProfiles.Profile("00456", "", "", "", List.of(), ""),
                true
            )
        ).hasMessageContaining("409");
        assertThat(
            new AccountProfiles(root.resolve("profiles.json").toString())
                .get("a@example.com")
                .studentNumber()
        ).isEqualTo("00123");
    }

    @Test
    void failedRegistrationReleasesNumberAndConcurrentClaimsHaveOneWinner() throws Exception {
        var store = new AccountProfiles(root.resolve("profiles.json").toString());
        assertThatThrownBy(() ->
            store.register("a@example.com", "100", "", true, () -> {
                throw new RuntimeException("DB failed");
            })
        ).hasMessageContaining("DB failed");
        assertThat(store.get("a@example.com").studentNumber()).isEmpty();
        try (var pool = Executors.newFixedThreadPool(6)) {
            var calls = new ArrayList<Callable<Boolean>>();
            for (int i = 0; i < 10; i++) {
                int n = i;
                calls.add(() -> {
                    try {
                        return store.register(
                            "user" + n + "@example.com",
                            "100",
                            "",
                            true,
                            () -> true
                        );
                    } catch (org.springframework.web.server.ResponseStatusException e) {
                        return false;
                    }
                });
            }
            assertThat(
                pool
                    .invokeAll(calls)
                    .stream()
                    .filter(f -> {
                        try {
                            return f.get();
                        } catch (Exception e) {
                            throw new RuntimeException(e);
                        }
                    })
                    .count()
            ).isEqualTo(1);
        }
    }

    @Test
    void tagsAreBoundedAndTeacherCannotSetStudentFields() throws Exception {
        var store = new AccountProfiles(root.resolve("profiles.json").toString());
        var p = store.update(
            "t@shwfl.edu.cn",
            new AccountProfiles.Profile(
                "123",
                "张老师",
                "G10",
                "1",
                List.of("Robotics", "Robotics"),
                "Hello"
            ),
            false
        );
        assertThat(p.studentNumber()).isEmpty();
        assertThat(p.grade()).isEmpty();
        assertThat(p.tags()).containsExactly("Robotics");
    }

    @Test
    void retainDropsOrphanedNumbersWithoutWipingWhenKeepSetIsEmpty() throws Exception {
        var store = new AccountProfiles(root.resolve("profiles.json").toString());
        store.register("gone@example.com", "20260314", "", true, () -> true);
        store.register("keep@example.com", "20260315", "", true, () -> true);
        assertThat(store.retain(Set.of())).isZero();
        assertThatThrownBy(() ->
            store.requireStudentNumberAvailable("", "20260314")
        ).hasMessageContaining("409");
        assertThat(store.retain(Set.of(SchoolAccounts.key("keep@example.com")))).isEqualTo(1);
        store.requireStudentNumberAvailable("", "20260314");
        assertThatThrownBy(() ->
            store.requireStudentNumberAvailable("", "20260315")
        ).hasMessageContaining("409");
    }

    @Test
    void ghostRegistrationsFromDeletedAccountsArePrunedSoSignupWorksAgain() throws Exception {
        var path = root.resolve("profiles.json");
        var store = new AccountProfiles(path.toString());
        store.register("gone@example.com", "20260314", "常云峰", true, () -> true);
        store.register("alive@example.com", "00123", "Existing", true, () -> true);

        // 模拟「只删了数据库那一行」：还有账号活着的只剩 alive@example.com
        var live = new HashSet<String>();
        live.add(
            com.qpwflshclub.formal_club.social.service.SchoolAccounts.key("alive@example.com")
        );
        assertThat(store.pruneStale(live)).isEqualTo(1);

        // 幽灵登记（邮箱 + 学生号）已清掉 → 同一个邮箱、同一个学生号又能注册
        assertThat(
            store.register("gone@example.com", "20260314", "常云峰", true, () -> true)
        ).isEqualTo(true);
        // 还活着的账号不受影响
        assertThat(store.get("alive@example.com").studentNumber()).isEqualTo("00123");
        assertThat(
            new AccountProfiles(path.toString()).get("alive@example.com").nickname()
        ).isEqualTo("Existing");
    }

    @Test
    void forgetRemovesSingleRegistrationByEmail() throws Exception {
        var store = new AccountProfiles(root.resolve("profiles.json").toString());
        store.register("gone@example.com", "20260314", "", true, () -> true);
        assertThat(store.forget("gone@example.com")).isTrue();
        assertThat(store.get("gone@example.com").studentNumber()).isEmpty();
        assertThat(store.register("gone@example.com", "20260314", "", true, () -> true)).isEqualTo(
            true
        );
        assertThat(store.forget("nobody@example.com")).isFalse();
    }
}

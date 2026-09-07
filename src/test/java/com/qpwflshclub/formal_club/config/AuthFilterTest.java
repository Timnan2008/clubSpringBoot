package com.qpwflshclub.formal_club.config;

import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class AuthFilterTest {

    @Test
    void highPrivilegeAccountCreationIsNotPublic() throws Exception {
        Field field = AuthFilter.class.getDeclaredField("PUBLIC_POST_PATHS");
        field.setAccessible(true);

        @SuppressWarnings("unchecked")
        Set<String> publicPostPaths = (Set<String>) field.get(null);

        assertThat(publicPostPaths)
                .doesNotContain("/api/user/add/admin")
                .doesNotContain("/api/user/add/club-president");
    }
}

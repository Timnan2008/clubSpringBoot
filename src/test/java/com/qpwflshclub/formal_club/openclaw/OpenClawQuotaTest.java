package com.qpwflshclub.formal_club.openclaw;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.qpwflshclub.formal_club.User.pojo.Admin;
import com.qpwflshclub.formal_club.social.service.SchoolAccounts;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

class OpenClawQuotaTest {

    @Test
    void formerExemptionsAreAlsoLimitedToTwoYuan() {
        var jdbc = mock(JdbcTemplate.class);
        var quota = new OpenClawQuota(jdbc);
        var admin = new Admin();
        admin.setId(12L);
        admin.setEmail("owner@example.com");
        admin.setUsername("李毅睿");
        ReflectionTestUtils.setField(
            quota,
            "unlimitedAccounts",
            SchoolAccounts.key(admin.getEmail())
        );
        assertFalse(quota.unlimited(admin));
        var other = new Admin();
        other.setId(12L);
        other.setEmail("different@example.com");
        other.setUsername("李毅睿");
        assertFalse(quota.unlimited(other));
        assertEquals(2_000_000L, OpenClawPrice.WEEKLY_LIMIT_MICRO);
    }
}

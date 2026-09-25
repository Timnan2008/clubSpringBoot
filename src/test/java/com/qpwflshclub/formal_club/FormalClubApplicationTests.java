package com.qpwflshclub.formal_club;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@EnabledIfEnvironmentVariable(named = "RUN_DATABASE_TESTS", matches = "(?i)true")
class FormalClubApplicationTests {

    @Test
    void contextLoads() {}
}

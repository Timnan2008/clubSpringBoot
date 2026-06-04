package com.qpwflshclub.formal_club.config;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class ApplicationPropertiesTest {

    @Test
    void hibernateDoesNotModifyDatabaseSchemaAutomatically() throws Exception {
        String properties = Files.readString(Path.of("src/main/resources/application.properties"));

        assertThat(properties).contains("spring.jpa.hibernate.ddl-auto=none");
        assertThat(properties).doesNotContain("spring.jpa.hibernate.ddl-auto=update");
    }
}

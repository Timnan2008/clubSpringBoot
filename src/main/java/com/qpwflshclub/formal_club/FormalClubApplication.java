package com.qpwflshclub.formal_club;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;

@SpringBootApplication
@EntityScan("com.qpwflshclub.formal_club")
public class FormalClubApplication {

    public static void main(String[] args) {
        SpringApplication.run(FormalClubApplication.class, args);
    }

}
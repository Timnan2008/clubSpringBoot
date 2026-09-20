package com.qpwflshclub.formal_club.social;

import com.qpwflshclub.formal_club.repository.User.AdminRepository;
import com.qpwflshclub.formal_club.repository.User.ClubPresidentRepository;
import com.qpwflshclub.formal_club.repository.User.TeacherRepository;
import com.qpwflshclub.formal_club.repository.User.UserRepository;
import java.util.HashSet;
import java.util.Set;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/** Drop profile rows left behind when a user row was deleted without full account cleanup. */
@Component
public class ProfileRetention {

    private final AccountProfiles profiles;
    private final UserRepository students;
    private final TeacherRepository teachers;
    private final ClubPresidentRepository presidents;
    private final AdminRepository admins;

    public ProfileRetention(
        AccountProfiles profiles,
        UserRepository students,
        TeacherRepository teachers,
        ClubPresidentRepository presidents,
        AdminRepository admins
    ) {
        this.profiles = profiles;
        this.students = students;
        this.teachers = teachers;
        this.presidents = presidents;
        this.admins = admins;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void retainLiveAccounts() {
        Set<String> ids = new HashSet<>();
        students.findAll().forEach(u -> add(ids, u.getEmail()));
        teachers.findAll().forEach(u -> add(ids, u.getEmail()));
        presidents.findAll().forEach(u -> add(ids, u.getEmail()));
        admins.findAll().forEach(u -> add(ids, u.getAdminEmail()));
        profiles.retain(ids);
    }

    private static void add(Set<String> ids, String email) {
        if (email != null && !email.isBlank()) ids.add(SchoolAccounts.key(email));
    }
}

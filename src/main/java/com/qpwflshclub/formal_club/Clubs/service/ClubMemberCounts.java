package com.qpwflshclub.formal_club.Clubs.service;

import com.qpwflshclub.formal_club.Clubs.pojo.Club;
import com.qpwflshclub.formal_club.User.pojo.UserBase;
import com.qpwflshclub.formal_club.User.repository.AdminRepository;
import com.qpwflshclub.formal_club.User.repository.ClubPresidentRepository;
import com.qpwflshclub.formal_club.User.repository.UserRepository;
import com.qpwflshclub.formal_club.social.service.OfficerAssignments;
import com.qpwflshclub.formal_club.social.service.SchoolAccounts;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 统计每个社团的真实成员数。
 *
 * <p>口径与社团工作台的成员名单一致：学生、正副社长、管理员以及通过职务任命
 * 加入的账号；同一账号在同一个社团只计一次，指导教师不计入社员人数。
 */
@Service
public class ClubMemberCounts {

    private final UserRepository students;
    private final ClubPresidentRepository presidents;
    private final AdminRepository admins;
    private final OfficerAssignments officers;

    public ClubMemberCounts(
        UserRepository students,
        ClubPresidentRepository presidents,
        AdminRepository admins,
        OfficerAssignments officers
    ) {
        this.students = students;
        this.presidents = presidents;
        this.admins = admins;
        this.officers = officers;
    }

    @Transactional(readOnly = true)
    public Map<Integer, Integer> all() {
        Map<Integer, Set<String>> accounts = new HashMap<>();
        students.findAllWithClubs().forEach(student -> collect(accounts, student));
        presidents
            .findAllWithClubs()
            .forEach(president -> {
                if (president.getMainClub() != null) {
                    add(accounts, president.getMainClub(), identity(president));
                }
                collect(accounts, president);
            });
        admins.findAllWithClubs().forEach(admin -> collect(accounts, admin));
        for (OfficerAssignments.Office office : officers.all()) {
            accounts.computeIfAbsent(office.club(), id -> new HashSet<>()).add(office.account());
        }
        Map<Integer, Integer> counts = new HashMap<>();
        accounts.forEach((club, ids) -> counts.put(club, ids.size()));
        return counts;
    }

    private static void collect(Map<Integer, Set<String>> accounts, UserBase person) {
        if (person == null || person.getClubs() == null) return;
        String key = identity(person);
        for (Club club : person.getClubs()) add(accounts, club, key);
    }

    private static void add(Map<Integer, Set<String>> accounts, Club club, String key) {
        if (club == null || club.getId() == null) return;
        accounts.computeIfAbsent(club.getId(), id -> new HashSet<>()).add(key);
    }

    private static String identity(UserBase person) {
        String email = person.getEmail();
        if (email == null || email.isBlank()) {
            return person.getClass().getSimpleName() + ":" + person.getId();
        }
        return SchoolAccounts.key(email);
    }
}

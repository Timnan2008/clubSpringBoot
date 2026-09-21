package com.qpwflshclub.formal_club.social;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.qpwflshclub.formal_club.Clubs.pojo.Club;
import com.qpwflshclub.formal_club.Clubs.repository.ClubRepository;
import com.qpwflshclub.formal_club.User.pojo.Admin;
import com.qpwflshclub.formal_club.User.pojo.ClubPresident;
import com.qpwflshclub.formal_club.User.pojo.Teacher;
import com.qpwflshclub.formal_club.User.pojo.User;
import com.qpwflshclub.formal_club.User.pojo.UserBase;
import com.qpwflshclub.formal_club.User.repository.AdminRepository;
import com.qpwflshclub.formal_club.User.repository.ClubPresidentRepository;
import com.qpwflshclub.formal_club.User.repository.TeacherRepository;
import com.qpwflshclub.formal_club.User.repository.UserRepository;
import com.qpwflshclub.formal_club.User.service.IUserService;
import com.qpwflshclub.formal_club.social.controller.CommunityController;
import com.qpwflshclub.formal_club.social.service.AccountProfiles;
import com.qpwflshclub.formal_club.social.service.MessageKeys;
import com.qpwflshclub.formal_club.social.service.OfficerAssignments;
import com.qpwflshclub.formal_club.social.service.SchoolAccounts;
import com.qpwflshclub.formal_club.workspace.service.WorkspaceAccess;
import com.qpwflshclub.formal_club.workspace.service.WorkspaceStore;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class CommunityMembershipTest {

    final SchoolAccounts accounts = mock(SchoolAccounts.class);
    final ClubRepository clubs = mock(ClubRepository.class);
    final UserRepository students = mock(UserRepository.class);
    final TeacherRepository teachers = mock(TeacherRepository.class);
    final ClubPresidentRepository presidents = mock(ClubPresidentRepository.class);
    final AdminRepository admins = mock(AdminRepository.class);
    final WorkspaceAccess access = new WorkspaceAccess(mock(IUserService.class), clubs);
    final CommunityController controller = new CommunityController(
        accounts,
        access,
        mock(MessageKeys.class),
        mock(WorkspaceStore.class),
        clubs,
        students,
        teachers,
        presidents,
        admins
    );

    Club club(int id) {
        var c = new Club();
        c.setId(id);
        return c;
    }

    MockHttpServletRequest request(UserBase u) {
        u.setEmail("member@example.com");
        when(accounts.current(any())).thenReturn(u);
        var r = new MockHttpServletRequest();
        r.addHeader("X-Workspace-Token", access.token(r));
        return r;
    }

    @Test
    void leaderLeavingAlsoRemovesStudentMembershipAndManagementRights() throws Exception {
        var c = club(200);
        c.setPresident("Leader");
        var other = club(201);
        var p = new ClubPresident();
        p.setMainClub(c);
        p.setClubs(List.of(other));
        var u = new User();
        u.setClubs(List.of(c, other));
        var r = request(p);
        when(presidents.findByEmail(p.getEmail())).thenReturn(p);
        when(students.findByEmail(p.getEmail())).thenReturn(u);
        when(clubs.findById(200)).thenReturn(Optional.of(c));
        controller.leave(200, r);
        assertThat(p.getMainClub()).isNull();
        assertThat(u.getClubs()).containsExactly(other);
        assertThat(p.getClubs()).containsExactly(other);
        assertThat(c.getPresident()).isEmpty();
        assertThat(access.clubs(p)).isEmpty();
        assertThatThrownBy(() -> access.require(p, 200)).hasMessageContaining("403");
    }

    @Test
    void teacherLeavingPreservesOtherAdvisers() throws Exception {
        var c = club(200);
        var t = new Teacher();
        t.setClubs(List.of(c));
        var remaining = new Teacher();
        remaining.setUsername("李老师");
        remaining.setUsernameEn("Ms Li");
        remaining.setClubs(List.of(c));
        var r = request(t);
        when(teachers.findByEmail(t.getEmail())).thenReturn(t);
        when(teachers.findAll()).thenReturn(List.of(t, remaining));
        when(clubs.findById(200)).thenReturn(Optional.of(c));
        controller.leave(200, r);
        assertThat(t.getClubs()).isEmpty();
        assertThat(c.getTeacher()).isEqualTo("李老师");
        assertThat(c.getTeacherEn()).isEqualTo("Ms Li");
    }

    @Test
    void teacherLeavingSurvivesMissingEnglishNames() throws Exception {
        var c = club(200);
        var t = new Teacher();
        t.setUsername("张扬");
        t.setClubs(List.of(c));
        var remaining = new Teacher();
        remaining.setUsername("李老师");
        remaining.setClubs(List.of(c));
        var r = request(t);
        when(teachers.findByEmail(t.getEmail())).thenReturn(t);
        when(teachers.findAll()).thenReturn(List.of(t, remaining));
        when(clubs.findById(200)).thenReturn(Optional.of(c));
        controller.leave(200, r);
        assertThat(t.getClubs()).isEmpty();
        assertThat(c.getTeacher()).isEqualTo("李老师");
        assertThat(c.getTeacherEn()).isEmpty();
    }

    @Test
    void cannotLeaveAnUnrelatedClubOrWithoutCsrf() throws Exception {
        var u = new User();
        u.setClubs(List.of(club(1)));
        var r = request(u);
        when(students.findByEmail(u.getEmail())).thenReturn(u);
        when(clubs.findById(2)).thenReturn(Optional.of(club(2)));
        assertThatThrownBy(() -> controller.leave(2, r)).hasMessageContaining("409");
        verify(students, never()).save(any());
        r.removeHeader("X-Workspace-Token");
        assertThatThrownBy(() -> controller.leave(1, r)).hasMessageContaining("403");
    }

    @Test
    void contactSelectsPresidentsClubInsteadOfNameOrVice() throws Exception {
        var r = request(new User());
        var c = club(200);
        var vice = new ClubPresident();
        vice.setMainClub(c);
        vice.setVicePresident(true);
        var p = new ClubPresident();
        p.setUsername("真实姓名");
        p.setMainClub(c);
        var unrelated = new ClubPresident();
        unrelated.setMainClub(club(201));
        when(presidents.findAll()).thenReturn(List.of(vice, unrelated, p));
        when(clubs.existsById(200)).thenReturn(true);
        var a = new SchoolAccounts.Account("id", "社长", "President", "president");
        when(accounts.view(p)).thenReturn(a);
        assertThat(controller.contact(200, r)).isEqualTo(a);
        assertThatThrownBy(() -> controller.contact(999, r)).hasMessageContaining("404");
    }

    @Test
    void ordinaryStudentCanLeaveOneClubAndKeepOtherMemberships() throws Exception {
        var one = club(1);
        var two = club(2);
        var u = new User();
        u.setClubs(new ArrayList<>(List.of(one, two)));
        var r = request(u);
        when(students.findByEmail(u.getEmail())).thenReturn(u);
        when(clubs.findById(1)).thenReturn(Optional.of(one));
        controller.leave(1, r);
        assertThat(u.getClubs()).containsExactly(two);
        verify(students).save(u);
        verify(presidents, never()).delete(any());
    }

    @Test
    void resignRequiresExplicitConfirmationAndPreservesMembership() throws Exception {
        var c = club(1);
        var p = new ClubPresident();
        p.setMainClub(c);
        p.setClubs(new ArrayList<>());
        p.setUsername("Leader");
        p.setUsernameEn("Leader");
        p.setPassword("encoded");
        var r = request(p);
        when(presidents.findAll()).thenReturn(List.of(p));
        assertThatThrownBy(() ->
            controller.resign(new CommunityController.ResignInput("no"), r)
        ).hasMessageContaining("400");
        controller.resign(new CommunityController.ResignInput("RESIGN"), r);
        var captured = org.mockito.ArgumentCaptor.forClass(User.class);
        verify(students).save(captured.capture());
        assertThat(captured.getValue().getClubs()).containsExactly(c);
        assertThat(captured.getValue().getPassword()).isEqualTo("encoded");
        verify(presidents).delete(p);
    }

    @Test
    void resigningSecondaryOfficeKeepsPrimaryAndOtherOffices(
        @org.junit.jupiter.api.io.TempDir java.nio.file.Path dir
    ) throws Exception {
        var main = club(28);
        var code = club(1);
        var third = club(3);
        var p = new ClubPresident();
        p.setMainClub(main);
        p.setUsername("李毅睿");
        p.setUsernameEn("Jason");
        var r = request(p);
        var assignments = new OfficerAssignments(
            new com.fasterxml.jackson.databind.ObjectMapper(),
            dir.toString()
        );
        var id = SchoolAccounts.key(p.getEmail());
        assignments.assign(id, 1, "vice_president");
        assignments.assign(id, 3, "president");
        org.springframework.test.util.ReflectionTestUtils.setField(
            controller,
            "officers",
            assignments
        );
        when(clubs.findById(1)).thenReturn(Optional.of(code));
        when(clubs.findById(3)).thenReturn(Optional.of(third));
        when(clubs.existsById(1)).thenReturn(true);
        when(presidents.findAll()).thenReturn(List.of(p));
        assertThatThrownBy(() ->
            controller.resign(new CommunityController.ResignInput("RESIGN", 99), r)
        ).hasMessageContaining("403");
        controller.resign(new CommunityController.ResignInput("RESIGN", 1), r);
        assertThat(p.getMainClub()).isSameAs(main);
        assertThat(p.isVicePresident()).isFalse();
        assertThat(p.getClubs()).contains(code);
        assertThat(assignments.forAccount(id))
            .extracting(OfficerAssignments.Office::club)
            .containsExactly(3);
        verify(presidents, never()).delete(any());
    }

    @Test
    void presidentCanRemoveOnlyOwnViceAndPreservesOtherOffices(
        @org.junit.jupiter.api.io.TempDir java.nio.file.Path dir
    ) throws Exception {
        var code = club(1);
        var robot = club(28);
        var actor = new ClubPresident();
        actor.setMainClub(code);
        var r = request(actor);
        var target = new ClubPresident();
        target.setEmail("vice@example.com");
        target.setMainClub(robot);
        target.setClubs(new ArrayList<>());
        var id = SchoolAccounts.key(target.getEmail());
        var assignments = new OfficerAssignments(
            new com.fasterxml.jackson.databind.ObjectMapper(),
            dir.toString()
        );
        assignments.assign(id, 1, "vice_president");
        org.springframework.test.util.ReflectionTestUtils.setField(
            controller,
            "officers",
            assignments
        );
        when(accounts.find(id)).thenReturn(target);
        when(clubs.findById(1)).thenReturn(Optional.of(code));
        when(clubs.findById(28)).thenReturn(Optional.of(robot));
        when(clubs.existsById(1)).thenReturn(true);
        when(presidents.findAll()).thenReturn(List.of());
        actor.setVicePresident(true);
        assertThatThrownBy(() -> controller.removeVice(1, id, r)).hasMessageContaining("403");
        actor.setVicePresident(false);
        assertThatThrownBy(() -> controller.removeVice(28, id, r)).hasMessageContaining("403");
        controller.removeVice(1, id, r);
        assertThat(target.getMainClub()).isSameAs(robot);
        assertThat(target.getClubs()).contains(code);
        assertThat(assignments.forAccount(id)).isEmpty();
        verify(presidents, never()).delete(any());
    }

    @Test
    void redundantPlaceholderProfileIsHiddenWhenAnotherAccountHoldsTheSameOffices(
        @org.junit.jupiter.api.io.TempDir java.nio.file.Path dir
    ) throws Exception {
        var psych = club(16);
        var fragrance = club(42);
        var leftover = new ClubPresident();
        leftover.setEmail("club016.president@accounts.qpwflhs.invalid");
        leftover.setUsername("心理社社长");
        leftover.setUsernameEn("Club 016 President");
        leftover.setMainClub(psych);
        var shared = new ClubPresident();
        shared.setEmail("fragrance.president@accounts.qpwflhs.invalid");
        shared.setUsername("香氛社社长");
        shared.setUsernameEn("Fragrance Club President");
        shared.setMainClub(fragrance);
        var assignments = new OfficerAssignments(
            new com.fasterxml.jackson.databind.ObjectMapper(),
            dir.toString()
        );
        assignments.assign(SchoolAccounts.key(shared.getEmail()), 16, "president");
        org.springframework.test.util.ReflectionTestUtils.setField(
            controller,
            "officers",
            assignments
        );
        var profiles = mock(AccountProfiles.class);
        when(profiles.get(any())).thenReturn(
            new AccountProfiles.Profile("", "Kimei", "", "", List.of(), "")
        );
        org.springframework.test.util.ReflectionTestUtils.setField(
            controller,
            "profiles",
            profiles
        );
        when(presidents.findAll()).thenReturn(List.of(leftover, shared));
        when(clubs.findById(16)).thenReturn(Optional.of(psych));
        when(clubs.findById(42)).thenReturn(Optional.of(fragrance));
        when(accounts.find(SchoolAccounts.key(leftover.getEmail()))).thenReturn(leftover);
        when(accounts.find(SchoolAccounts.key(shared.getEmail()))).thenReturn(shared);
        when(accounts.view(shared)).thenReturn(
            new SchoolAccounts.Account(
                SchoolAccounts.key(shared.getEmail()),
                "香氛社社长",
                "Fragrance Club President",
                "president"
            )
        );
        var r = request(new User());
        assertThatThrownBy(() ->
            controller.publicProfile(SchoolAccounts.key(leftover.getEmail()), r)
        ).hasMessageContaining("404");
        @SuppressWarnings("unchecked")
        var visible = (Map<String, Object>) controller.publicProfile(
            SchoolAccounts.key(shared.getEmail()),
            r
        );
        assertThat((List<?>) visible.get("offices")).hasSize(2);
    }

    @Test
    void assigningSecondClubRetiresPlaceholderPresident(
        @org.junit.jupiter.api.io.TempDir java.nio.file.Path dir
    ) throws Exception {
        var psych = club(16);
        var fragrance = club(42);
        var leftover = new ClubPresident();
        leftover.setEmail("club016.president@accounts.qpwflhs.invalid");
        leftover.setUsername("心理社社长");
        leftover.setMainClub(psych);
        var shared = new ClubPresident();
        shared.setEmail("fragrance.president@accounts.qpwflhs.invalid");
        shared.setUsername("香氛社社长");
        shared.setMainClub(fragrance);
        var assignments = new OfficerAssignments(
            new com.fasterxml.jackson.databind.ObjectMapper(),
            dir.toString()
        );
        org.springframework.test.util.ReflectionTestUtils.setField(
            controller,
            "officers",
            assignments
        );
        String keep = SchoolAccounts.key(shared.getEmail());
        when(accounts.find(keep)).thenReturn(shared);
        when(clubs.findById(16)).thenReturn(Optional.of(psych));
        when(clubs.existsById(16)).thenReturn(true);
        when(presidents.findAll()).thenReturn(List.of(leftover, shared));
        controller.assignOffice(
            16,
            keep,
            new CommunityController.OfficeInput("president"),
            request(new Admin())
        );
        assertThat(leftover.getMainClub()).isNull();
        verify(presidents).save(leftover);
        assertThat(assignments.forAccount(keep))
            .extracting(OfficerAssignments.Office::club)
            .containsExactly(16);
    }

    @Test
    void adminCanBeAppointedClubPresident(@org.junit.jupiter.api.io.TempDir java.nio.file.Path dir)
        throws Exception {
        var steam = club(28);
        steam.setClubName("OpenSTEAM社团");
        var admin = new Admin();
        admin.setEmail("jason@example.com");
        admin.setUsername("李毅睿");
        var assignments = new OfficerAssignments(
            new com.fasterxml.jackson.databind.ObjectMapper(),
            dir.toString()
        );
        org.springframework.test.util.ReflectionTestUtils.setField(
            controller,
            "officers",
            assignments
        );
        String account = SchoolAccounts.key(admin.getEmail());
        when(accounts.find(account)).thenReturn(admin);
        when(accounts.view(admin)).thenReturn(
            new SchoolAccounts.Account(account, "李毅睿", "Jason", "admin")
        );
        when(clubs.findById(28)).thenReturn(Optional.of(steam));
        when(clubs.existsById(28)).thenReturn(true);
        when(clubs.save(steam)).thenReturn(steam);
        when(presidents.findAll()).thenReturn(List.of());
        when(teachers.findAll()).thenReturn(List.of());
        controller.assignOffice(
            28,
            account,
            new CommunityController.OfficeInput("president"),
            request(new Admin())
        );
        assertThat(assignments.forAccount(account))
            .extracting(OfficerAssignments.Office::club, OfficerAssignments.Office::position)
            .containsExactly(tuple(28, "president"));
    }
}

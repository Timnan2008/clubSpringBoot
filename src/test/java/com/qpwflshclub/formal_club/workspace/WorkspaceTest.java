package com.qpwflshclub.formal_club.workspace;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qpwflshclub.formal_club.pojo.Club.Club;
import com.qpwflshclub.formal_club.pojo.User.*;
import com.qpwflshclub.formal_club.repository.Club.ClubRepository;
import com.qpwflshclub.formal_club.repository.User.*;
import com.qpwflshclub.formal_club.service.User.IUserService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.*;
import org.springframework.web.server.ResponseStatusException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class WorkspaceTest {
    @TempDir Path directory;
    IUserService users;
    ClubRepository clubs;
    UserRepository students;
    ClubPresidentRepository presidents;
    WorkspaceStore store;
    WorkspaceAccess access;
    WorkspaceController controller;
    MockHttpServletRequest request;
    Club club;
    ClubPresident president;
    @BeforeEach void setup() {
        users=mock(IUserService.class); clubs=mock(ClubRepository.class); students=mock(UserRepository.class); presidents=mock(ClubPresidentRepository.class);
        access=new WorkspaceAccess(users,clubs);store=new WorkspaceStore(new ObjectMapper(),directory.toString());controller=new WorkspaceController(access,store,students,presidents);
        club=new Club();club.setId(1);club.setClubName("Test Club");president=new ClubPresident();president.setId(1);president.setEmail("president@example.com");president.setMainClub(club);
        when(users.findByEmail(president.getEmail())).thenReturn(president);
        request=new MockHttpServletRequest();request.getSession().setAttribute("authenticatedEmail",president.getEmail());request.addHeader("X-Workspace-Token",access.token(request));
    }
    @Test void recruitmentFindsNicknamesAndReturnsBothRealNames() {
        var student=new User();student.setId(2);student.setEmail("s@example.com");student.setUsername("张扬");student.setUsernameEn("Eric");student.setClubs(List.of());
        when(students.findAll()).thenReturn(List.of(student));
        var accounts=mock(com.qpwflshclub.formal_club.social.SchoolAccounts.class);
        when(accounts.view(student)).thenReturn(new com.qpwflshclub.formal_club.social.SchoolAccounts.Account("public-id","张扬","Eric","student","","Sunny"));
        org.springframework.test.util.ReflectionTestUtils.setField(controller,"accounts",accounts);
        var results=controller.search(1,"SUNNY",request);
        assertThat(results).hasSize(1);
        assertThat(results.getFirst()).containsEntry("name","张扬").containsEntry("nameEn","Eric").containsEntry("nickname","Sunny");
        student.setClubs(List.of(club));
        assertThat(controller.search(1,"Sunny",request)).isEmpty();
    }
    @Test void anonymousAndForgedEmailCannotAccess() {
        var anon=new MockHttpServletRequest();anon.setCookies(new Cookie("user_session",president.getEmail()));
        assertThatThrownBy(()->controller.bootstrap(anon)).isInstanceOf(ResponseStatusException.class).hasMessageContaining("401");
    }
    @Test void presidentCannotManageAnotherClubOrForgeMutation() {
        assertThatThrownBy(()->controller.data(2,request)).hasMessageContaining("403");
        request.removeHeader("X-Workspace-Token");
        assertThatThrownBy(()->controller.addMember(1,2,request)).hasMessageContaining("403");
        verifyNoInteractions(students);
    }
    @Test void ordinaryStudentCannotEnterManagement() {
        when(users.findByEmail(president.getEmail())).thenReturn(new User());
        assertThatThrownBy(()->controller.bootstrap(request)).hasMessageContaining("403");
    }
    @Test void filesPersistAndDownloadOnlyInsideAuthorizedClub() throws Exception {
        var uploaded=controller.upload(1,new MockMultipartFile("file","../../proposal.pdf","application/pdf","%PDF-test".getBytes()),"Activity plan",request);
        assertThat(uploaded.name()).isEqualTo("proposal.pdf");
        var reopened=new WorkspaceStore(new ObjectMapper(),directory.toString());
        assertThat(reopened.read(1).documents()).hasSize(1);
        assertThat(Files.readString(reopened.file(1,reopened.document(1,uploaded.id())))).isEqualTo("%PDF-test");
        assertThat(controller.download(1,uploaded.id(),request).getHeaders().getFirst("Content-Disposition")).startsWith("attachment");
        assertThatThrownBy(()->controller.download(2,uploaded.id(),request)).hasMessageContaining("403");
        assertThatThrownBy(()->controller.upload(1,new MockMultipartFile("file","script.html","text/html","bad".getBytes()),"",request)).hasMessageContaining("400");
        assertThatThrownBy(()->reopened.document(1,"../../records.json")).hasMessageContaining("404");
    }
    @Test void applicationsRequireAdminReviewAndPersistOutcome() throws Exception {
        String start=LocalDateTime.now().plusDays(2).toString(),end=LocalDateTime.now().plusDays(2).plusHours(1).toString();
        var input=new WorkspaceController.ActivityInput("Campus concert",start,end,"Hall","Plan",30);
        var application=controller.create(1,"applications",input,request);
        assertThat(application.status()).isEqualTo("pending");
        var decision=new WorkspaceController.ReviewInput("approved", "Ready");
        assertThatThrownBy(()->controller.review(1,application.id(),decision,request)).hasMessageContaining("403");
        Admin admin=new Admin();admin.setEmail("admin@example.com");when(users.findByEmail(president.getEmail())).thenReturn(admin);when(clubs.findAll()).thenReturn(List.of(club));
        assertThat(controller.review(1,application.id(),decision,request).status()).isEqualTo("approved");
        assertThat(new WorkspaceStore(new ObjectMapper(),directory.toString()).read(1).activities().getFirst().status()).isEqualTo("approved");
        assertThatThrownBy(()->controller.review(1,application.id(),decision,request)).hasMessageContaining("已处理");
        when(users.findByEmail(president.getEmail())).thenReturn(president);
        assertThatThrownBy(()->controller.removeEvent(1,application.id(),request)).hasMessageContaining("只能删除普通");
    }
    @Test void invalidDatesAreRejectedAndCalendarEventCanBeDeleted() throws Exception {
        var bad=new WorkspaceController.ActivityInput("Meeting","2026-10-02T16:00","2026-10-02T15:00","Room","Plan",20);
        assertThatThrownBy(()->controller.create(1,"events",bad,request)).hasMessageContaining("结束时间");
        var good=new WorkspaceController.ActivityInput("Meeting","2026-10-02T15:00","2026-10-02T16:00","Room","Plan",20);
        var event=controller.create(1,"events",good,request);assertThat(event.status()).isEqualTo("scheduled");
        controller.removeEvent(1,event.id(),request);assertThat(store.read(1).activities()).isEmpty();
    }
    @Test void memberRemovalDoesNotAffectSameIdPresidentOrOtherClubs() {
        Club other=new Club();other.setId(2);
        User student=new User();student.setId(1);student.setClubs(new ArrayList<>(List.of(club,other)));
        when(students.findById(1L)).thenReturn(Optional.of(student));
        controller.removeMember(1,"student",1,request);
        assertThat(student.getClubs()).containsExactly(other);verifyNoInteractions(presidents);
        when(presidents.findById(1L)).thenReturn(Optional.of(president));
        assertThatThrownBy(()->controller.removeMember(1,"president",1,request)).hasMessageContaining("管理员处理");
        assertThat(president.getMainClub()).isSameAs(club);
        controller.addMember(1,1,request);controller.addMember(1,1,request);
        assertThat(student.getClubs()).containsExactly(other,club);
    }
}

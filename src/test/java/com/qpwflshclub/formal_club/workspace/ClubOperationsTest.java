package com.qpwflshclub.formal_club.workspace;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qpwflshclub.formal_club.Clubs.pojo.Club;
import com.qpwflshclub.formal_club.Clubs.repository.ClubRepository;
import com.qpwflshclub.formal_club.User.pojo.ClubPresident;
import com.qpwflshclub.formal_club.User.pojo.User;
import com.qpwflshclub.formal_club.User.repository.ClubPresidentRepository;
import com.qpwflshclub.formal_club.User.repository.UserRepository;
import com.qpwflshclub.formal_club.User.service.IUserService;
import com.qpwflshclub.formal_club.workspace.controller.ClubOperationsController;
import com.qpwflshclub.formal_club.workspace.controller.WorkspaceController;
import com.qpwflshclub.formal_club.workspace.service.ClubOperationsStore;
import com.qpwflshclub.formal_club.workspace.service.WorkspaceAccess;
import com.qpwflshclub.formal_club.workspace.service.WorkspaceStore;
import com.qpwflshclub.formal_club.User.pojo.*;
import com.qpwflshclub.formal_club.User.pojo.ClubPresident;
import com.qpwflshclub.formal_club.User.pojo.User;
import com.qpwflshclub.formal_club.User.repository.*;
import com.qpwflshclub.formal_club.User.repository.ClubPresidentRepository;
import com.qpwflshclub.formal_club.User.repository.UserRepository;
import com.qpwflshclub.formal_club.User.service.IUserService;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockHttpServletRequest;

class ClubOperationsTest {

    @TempDir
    Path dir;

    ClubOperationsStore store;
    WorkspaceStore workspace;
    WorkspaceAccess access;
    WorkspaceController members;
    ClubOperationsController controller;
    MockHttpServletRequest request;
    UserRepository students;
    ClubPresidentRepository presidents;
    IUserService users;
    Club club;
    ClubPresident leader;
    User student;
    String term, event, future;

    @BeforeEach
    void setup() throws Exception {
        users = mock(IUserService.class);
        students = mock(UserRepository.class);
        presidents = mock(ClubPresidentRepository.class);
        var clubs = mock(ClubRepository.class);
        club = new Club();
        club.setId(1);
        club.setClubName("Club");
        leader = new ClubPresident();
        leader.setId(9);
        leader.setEmail("leader@example.com");
        leader.setUsername("Leader");
        leader.setMainClub(club);
        student = new User();
        student.setId(1);
        student.setEmail("student@example.com");
        student.setUsername("Student");
        student.setUsernameEn("Student");
        student.setClubs(new ArrayList<>());
        when(users.findByEmail(leader.getEmail())).thenReturn(leader);
        when(students.findAll()).thenReturn(List.of(student));
        when(students.findById(1L)).thenReturn(Optional.of(student));
        when(presidents.findAll()).thenReturn(List.of(leader));
        access = new WorkspaceAccess(users, clubs);
        workspace = new WorkspaceStore(new ObjectMapper(), dir.toString());
        store = new ClubOperationsStore(new ObjectMapper(), dir.toString());
        members = new WorkspaceController(access, workspace, students, presidents);
        org.springframework.test.util.ReflectionTestUtils.setField(members, "operations", store);
        // 第六个参数是违禁词闸门：该测试只跑工作台逻辑，传 null（控制器里对 null 有保护）
        controller = new ClubOperationsController(
            access,
            workspace,
            store,
            members,
            students,
            null
        );
        request = new MockHttpServletRequest();
        request.getSession().setAttribute("authenticatedEmail", leader.getEmail());
        request.addHeader("X-Workspace-Token", access.token(request));
        LocalDate day = LocalDate.now(ZoneId.of("Asia/Shanghai"));
        term = store
            .term(1, "Semester", day.minusMonths(1).toString(), day.plusMonths(4).toString())
            .id();
        event = add("past", day.minusDays(2).toString());
        future = add("future", day.plusDays(5).toString());
    }

    String add(String id, String day) throws Exception {
        workspace.add(
            1,
            new WorkspaceStore.Activity(
                id,
                id,
                day + "T15:00",
                day + "T16:00",
                "Room",
                "Session",
                10,
                "event",
                "scheduled",
                "author",
                day,
                "",
                ""
            )
        );
        return id;
    }

    ClubOperationsController.ReportInput report(
        String kind,
        String activity,
        String content,
        String feedback,
        String improvements,
        String status
    ) {
        return new ClubOperationsController.ReportInput(
            term,
            kind,
            activity,
            "Title",
            content,
            feedback,
            improvements,
            "",
            status,
            "",
            "",
            "",
            "",
            ""
        );
    }

    ClubOperationsController.ReportInput proposal(String content, String status) {
        return new ClubOperationsController.ReportInput(
            term,
            "proposal",
            "",
            "Title",
            content,
            "",
            "",
            "",
            status,
            "Recruit at the fair",
            "Term project",
            "LO 1 and LO 5",
            "Classroom and printer",
            "[{\"week\":\"第1–6周\",\"plan\":\"Weekly meeting\"}]"
        );
    }

    @Test
    void accessRequiresOwnClubAndMutationToken() throws Exception {
        assertThatThrownBy(() -> controller.data(2, request)).hasMessageContaining("403");
        var anon = new MockHttpServletRequest();
        assertThatThrownBy(() -> controller.data(1, anon)).hasMessageContaining("401");
        when(users.findByEmail(leader.getEmail())).thenReturn(student);
        assertThatThrownBy(() -> controller.data(1, request)).hasMessageContaining("403");
        when(users.findByEmail(leader.getEmail())).thenReturn(leader);
        request.removeHeader("X-Workspace-Token");
        assertThatThrownBy(() ->
            controller.report(1, report("proposal", "", "Plan", "", "", "draft"), request)
        ).hasMessageContaining("403");
        assertThat(store.read(1).reports()).isEmpty();
    }

    @Test
    void semesterReportsPersistAsDraftAndSubmittedRevisions() throws Exception {
        controller.report(1, report("proposal", "", "", "", "", "draft"), request);
        assertThatThrownBy(() ->
            controller.report(1, report("proposal", "", "", "", "", "submitted"), request)
        ).hasMessageContaining("400");
        controller.report(1, proposal("Goals and schedule", "submitted"), request);
        controller.report(1, proposal("Updated plan", "submitted"), request);
        var data = new ClubOperationsStore(new ObjectMapper(), dir.toString()).read(1);
        assertThat(data.reports()).hasSize(1);
        assertThat(data.reports().getFirst().content()).isEqualTo("Updated plan");
        assertThat(data.reports().getFirst().submittedAt()).isNotBlank();
        assertThatThrownBy(() ->
            controller.report(1, report("proposal", "", "Draft again", "", "", "draft"), request)
        ).hasMessageContaining("已提交");
        assertThatThrownBy(() ->
            controller.report(1, report("review", "", "Summary", "", "", "submitted"), request)
        ).hasMessageContaining("400");
        controller.report(
            1,
            report("review", "", "Summary", "Members liked it", "Improve next term", "submitted"),
            request
        );
        assertThat(store.read(1).reports()).hasSize(2);
    }

    @Test
    void proposalSubmitRequiresCasTemplateSections() throws Exception {
        assertThatThrownBy(() ->
            controller.report(1, report("proposal", "", "Goals only", "", "", "submitted"), request)
        ).hasMessageContaining("请完整填写");
        var saved = (ClubOperationsStore.Report) controller.report(
            1,
            proposal("Goals and schedule", "submitted"),
            request
        );
        assertThat(saved.recruitment()).contains("Recruit");
        assertThat(saved.project()).isEqualTo("Term project");
        assertThat(saved.outcomes()).contains("LO");
        assertThat(saved.resources()).contains("Classroom");
        assertThat(saved.weeklyPlan()).contains("Weekly meeting");
        Files.writeString(
            dir.resolve("1/operations.json"),
            """
            {"terms":[],"reports":[{"id":"old","term":"t","kind":"proposal","activity":"","title":"A","content":"B","feedback":"","improvements":"","document":"","status":"draft","updatedAt":"","submittedAt":"","author":"a"}],"attendance":[],"candidates":[]}
            """
        );
        assertThat(
            new ClubOperationsStore(new ObjectMapper(), dir.toString())
                .read(1)
                .reports()
                .getFirst()
                .recruitment()
        ).isEmpty();
    }

    @Test
    void feedbackMustBelongToThisTermAndAnEndedActivity() throws Exception {
        assertThatThrownBy(() ->
            controller.report(
                1,
                report("feedback", future, "Session", "Response", "Next", "submitted"),
                request
            )
        ).hasMessageContaining("活动结束");
        controller.report(1, report("feedback", future, "Draft", "", "", "draft"), request);
        assertThatThrownBy(() ->
            controller.report(
                1,
                report("feedback", event, "Session", "", "Next", "submitted"),
                request
            )
        ).hasMessageContaining("400");
        controller.report(
            1,
            report("feedback", event, "Session", "Response", "Next", "submitted"),
            request
        );
        assertThatThrownBy(() ->
            controller.report(
                1,
                report("feedback", "foreign", "Session", "Response", "Next", "submitted"),
                request
            )
        ).hasMessageContaining("请选择");
        String outside = add("outside", LocalDate.now().minusYears(2).toString());
        assertThatThrownBy(() ->
            controller.report(
                1,
                report("feedback", outside, "Session", "Response", "Next", "submitted"),
                request
            )
        ).hasMessageContaining("不在所选学期");
        assertThatThrownBy(() -> members.removeEvent(1, event, request)).hasMessageContaining(
            "已有签到或反馈"
        );
    }

    @Test
    void feedbackCanBeMarkedNotHeldWithoutFillingFields() throws Exception {
        assertThatThrownBy(() ->
            controller.report(1, report("proposal", "", "", "", "", "not_held"), request)
        ).hasMessageContaining("只有活动反馈");
        controller.report(
            1,
            new ClubOperationsController.ReportInput(
                term,
                "feedback",
                future,
                "",
                "",
                "",
                "",
                "",
                "not_held",
                "",
                "",
                "",
                "",
                ""
            ),
            request
        );
        var saved = store.read(1).reports().getFirst();
        assertThat(saved.status()).isEqualTo("not_held");
        assertThat(saved.content()).isEmpty();
        assertThat(saved.feedback()).isEmpty();
        assertThat(saved.title()).contains("未举行");
        assertThat(saved.submittedAt()).isNotBlank();
        assertThatThrownBy(() ->
            controller.report(1, report("feedback", future, "Draft", "", "", "draft"), request)
        ).hasMessageContaining("已提交");
        controller.report(1, report("feedback", event, "", "", "", "not_held"), request);
        assertThat(
            store
                .read(1)
                .reports()
                .stream()
                .filter(r -> r.activity().equals(event))
                .findFirst()
                .orElseThrow()
                .status()
        ).isEqualTo("not_held");
    }

    @Test
    void attachmentsMustBeStoredInsideTheAuthorizedClub() throws Exception {
        var doc = workspace.upload(
            2,
            new org.springframework.mock.web.MockMultipartFile(
                "file",
                "proposal.pdf",
                "application/pdf",
                "test".getBytes()
            ),
            "",
            "author"
        );
        var input = new ClubOperationsController.ReportInput(
            term,
            "proposal",
            "",
            "Plan",
            "Content",
            "",
            "",
            doc.id(),
            "submitted",
            "",
            "",
            "",
            "",
            ""
        );
        assertThatThrownBy(() -> controller.report(1, input, request)).hasMessageContaining(
            "文件不存在"
        );
    }

    @Test
    void deletingAnAttachmentUnlinksItFromSavedReports() throws Exception {
        var doc = workspace.upload(
            1,
            new org.springframework.mock.web.MockMultipartFile(
                "file",
                "notes.pdf",
                "application/pdf",
                "notes".getBytes()
            ),
            "feedback",
            "author"
        );
        controller.report(
            1,
            new ClubOperationsController.ReportInput(
                term,
                "proposal",
                "",
                "Plan",
                "Content",
                "",
                "",
                doc.id(),
                "submitted",
                "Recruit at the fair",
                "Term project",
                "LO 1 and LO 5",
                "Classroom and printer",
                "[{\"week\":\"第1–6周\",\"plan\":\"Weekly meeting\"}]"
            ),
            request
        );
        assertThat(store.read(1).reports().getFirst().document()).isEqualTo(doc.id());
        store.unlinkDocument(1, doc.id());
        assertThat(store.read(1).reports().getFirst().document()).isEmpty();
        assertThat(store.read(1).reports().getFirst().title()).isEqualTo("Plan");
    }

    @Test
    void attendanceAllowsOnlyActualMembersAndThreeExplicitStates() throws Exception {
        assertThat(store.read(1).attendance()).isEmpty();
        var foreign = new ClubOperationsController.AttendanceInput(
            List.of(new ClubOperationsController.MarkInput("student:1", "present"))
        );
        assertThatThrownBy(() ->
            controller.attendance(1, event, foreign, request)
        ).hasMessageContaining("本社团成员");
        student.getClubs().add(club);
        for (String status : List.of("present", "leave", "absent")) {
            controller.attendance(
                1,
                event,
                new ClubOperationsController.AttendanceInput(
                    List.of(new ClubOperationsController.MarkInput("student:1", status))
                ),
                request
            );
            assertThat(
                new ClubOperationsStore(new ObjectMapper(), dir.toString())
                    .read(1)
                    .attendance()
                    .getFirst()
                    .marks()
                    .getFirst()
                    .status()
            ).isEqualTo(status);
        }
        assertThatThrownBy(() ->
            controller.attendance(
                1,
                event,
                new ClubOperationsController.AttendanceInput(
                    List.of(new ClubOperationsController.MarkInput("student:1", "fake"))
                ),
                request
            )
        ).hasMessageContaining("签到状态");
        student.getClubs().clear();
        controller.attendance(
            1,
            event,
            new ClubOperationsController.AttendanceInput(
                List.of(new ClubOperationsController.MarkInput("president:9", "present"))
            ),
            request
        );
        assertThat(store.read(1).attendance().getFirst().marks()).hasSize(2);
        assertThatThrownBy(() -> members.removeEvent(1, event, request)).hasMessageContaining(
            "不能删除"
        );
    }

    @Test
    void attendanceAllowsAnyScheduledActivity() throws Exception {
        student.getClubs().add(club);
        LocalDate day = LocalDate.now(ZoneId.of("Asia/Shanghai"));
        String later = add("same-day", day.toString());
        workspace.add(
            1,
            new WorkspaceStore.Activity(
                "late-today",
                "late-today",
                day + "T23:59",
                day.plusDays(1) + "T00:30",
                "Room",
                "Evening",
                10,
                "event",
                "scheduled",
                "author",
                day.toString(),
                "",
                ""
            )
        );
        controller.attendance(
            1,
            later,
            new ClubOperationsController.AttendanceInput(
                List.of(new ClubOperationsController.MarkInput("student:1", "present"))
            ),
            request
        );
        controller.attendance(
            1,
            "late-today",
            new ClubOperationsController.AttendanceInput(
                List.of(new ClubOperationsController.MarkInput("student:1", "leave"))
            ),
            request
        );
        controller.attendance(
            1,
            future,
            new ClubOperationsController.AttendanceInput(
                List.of(new ClubOperationsController.MarkInput("student:1", "present"))
            ),
            request
        );
        assertThat(store.read(1).attendance())
            .extracting(ClubOperationsStore.Attendance::activity)
            .contains("same-day", "late-today", "future");
    }

    @Test
    void recruitmentWaitsForConfirmationAndIsIdempotent() throws Exception {
        var c = (ClubOperationsStore.Candidate) controller.candidate(
            1,
            new ClubOperationsController.CandidateInput(term, 1, "Interviewed"),
            request
        );
        assertThat(student.getClubs()).isEmpty();
        verify(students, never()).save(any());
        assertThatThrownBy(() ->
            controller.candidate(
                1,
                new ClubOperationsController.CandidateInput(term, 1, ""),
                request
            )
        ).hasMessageContaining("已在");
        controller.confirm(1, c.id(), request);
        controller.confirm(1, c.id(), request);
        assertThat(student.getClubs()).containsExactly(club);
        verify(students, times(1)).save(student);
        assertThat(
            new ClubOperationsStore(new ObjectMapper(), dir.toString())
                .read(1)
                .candidates()
                .getFirst()
                .status()
        ).isEqualTo("confirmed");
        assertThatThrownBy(() -> controller.decline(1, c.id(), request)).hasMessageContaining(
            "已处理"
        );
    }

    @Test
    void decliningOrWrongClubNeverAddsMembership() throws Exception {
        var c = (ClubOperationsStore.Candidate) controller.candidate(
            1,
            new ClubOperationsController.CandidateInput(term, 1, ""),
            request
        );
        assertThatThrownBy(() -> controller.confirm(2, c.id(), request)).hasMessageContaining(
            "403"
        );
        controller.decline(1, c.id(), request);
        assertThatThrownBy(() -> controller.confirm(1, c.id(), request)).hasMessageContaining(
            "已处理"
        );
        assertThat(student.getClubs()).isEmpty();
        verify(students, never()).save(any());
    }

    @Test
    void overlappingSemestersAreRejected() throws Exception {
        var t = store.read(1).terms().getFirst();
        assertThatThrownBy(() ->
            controller.term(
                1,
                new ClubOperationsController.TermInput("Duplicate", t.start(), t.end()),
                request
            )
        ).hasMessageContaining("已存在学期");
        assertThatThrownBy(() ->
            controller.term(
                1,
                new ClubOperationsController.TermInput("Invalid", t.end(), t.start()),
                request
            )
        ).hasMessageContaining("结束应晚于");
    }
}

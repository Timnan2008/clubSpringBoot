package com.qpwflshclub.formal_club.Booking.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.qpwflshclub.formal_club.Booking.BookingOverseers;
import com.qpwflshclub.formal_club.Booking.BookingPolicy;
import com.qpwflshclub.formal_club.Booking.controller.BookingApiController;
import com.qpwflshclub.formal_club.Booking.repository.BookingRepository;
import com.qpwflshclub.formal_club.Booking.service.BookingService;
import com.qpwflshclub.formal_club.Clubs.repository.ClubRepository;
import com.qpwflshclub.formal_club.User.pojo.Admin;
import com.qpwflshclub.formal_club.User.pojo.Teacher;
import com.qpwflshclub.formal_club.User.pojo.User;
import com.qpwflshclub.formal_club.User.repository.*;
import com.qpwflshclub.formal_club.User.service.IUserService;
import com.qpwflshclub.formal_club.social.service.SchoolAccounts;
import com.qpwflshclub.formal_club.workspace.WorkspaceAccess;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.LocalTime;
import java.util.List;
import java.util.zip.ZipInputStream;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.*;
import org.springframework.transaction.support.TransactionTemplate;

class BookingOverseerTest {

    @Test
    void allowlistMatchesCanonicalTeacherEmail() {
        var overseers = new BookingOverseers("Mengchuan@shwfl.edu.cn");
        var teacher = new Teacher();
        teacher.setEmail("mengchuan@shwfl.edu.cn");
        teacher.setUsername("孟川");
        assertThat(overseers.allows(teacher)).isTrue();
        var other = new Teacher();
        other.setEmail("celiahu@shwfl.edu.cn");
        assertThat(overseers.allows(other)).isFalse();
        assertThat(overseers.allows(null)).isFalse();
        var admin = new Admin();
        admin.setEmail("admin@shwfl.edu.cn");
        assertThat(overseers.allows(admin)).isTrue();
    }

    @Test
    void workbookKeepsReservationNames() throws Exception {
        byte[] xlsx = BookingWorkbook.write(
            "全部预约",
            List.of("预约人", "邮箱"),
            List.of(new BookingWorkbook.Line(List.of("孟川", "Mengchuan@shwfl.edu.cn")))
        );
        assertThat(xlsx[0]).isEqualTo((byte) 'P');
        assertThat(xlsx[1]).isEqualTo((byte) 'K');
        String sheet = "";
        String styles = "";
        try (var zip = new ZipInputStream(new ByteArrayInputStream(xlsx))) {
            for (var entry = zip.getNextEntry(); entry != null; entry = zip.getNextEntry()) {
                if (entry.getName().equals("xl/worksheets/sheet1.xml")) {
                    sheet = new String(zip.readAllBytes(), StandardCharsets.UTF_8);
                }
                if (entry.getName().equals("xl/styles.xml")) {
                    styles = new String(zip.readAllBytes(), StandardCharsets.UTF_8);
                }
            }
        }
        assertThat(sheet).contains("孟川", "Mengchuan@shwfl.edu.cn", "预约人");
        assertThat(sheet).contains(
            "<cols>",
            "customWidth=\"1\"",
            "width=\"" + widthOf("Mengchuan@shwfl.edu.cn") + "\""
        );
        assertThat(styles).contains("wrapText");
        assertThat(BookingWorkbook.displayWidth("Mengchuan@shwfl.edu.cn")).isGreaterThan(28);
    }

    @Test
    void rosterAndExportStayForbiddenWithoutOverseerFlag() {
        var repository = mock(BookingRepository.class);
        var service = new BookingService(
            repository,
            mock(TransactionTemplate.class),
            Clock.systemUTC()
        );
        var student = new BookingService.Actor("student@example.invalid", "Student", false);
        assertThatThrownBy(() -> service.roster(student)).hasMessageContaining("403");
        assertThatThrownBy(() -> service.export(student)).hasMessageContaining("403");
        verify(repository, never()).all();
    }

    @Test
    void overseerCanReadEveryReservationAndExportIt() throws Exception {
        var repository = mock(BookingRepository.class);
        when(repository.courts()).thenReturn(
            List.of(new BookingRepository.Court(1, "一号场", "Court 1", true))
        );
        when(repository.policy(false)).thenReturn(
            new BookingRepository.Policy(
                1,
                new BookingPolicy(
                    "Asia/Shanghai",
                    20,
                    3,
                    1,
                    List.of(1, 2, 3, 4, 5),
                    List.of(7),
                    LocalTime.of(19, 0),
                    LocalTime.of(22, 0),
                    LocalTime.of(19, 0),
                    List.of(new BookingPolicy.Period(LocalTime.of(11, 30), LocalTime.of(12, 50))),
                    List.of(),
                    null,
                    null,
                    null,
                    1
                )
            )
        );
        when(repository.all()).thenReturn(
            List.of(
                new BookingRepository.Reservation(
                    9,
                    1,
                    "key",
                    "student@example.invalid",
                    "李同学",
                    1789572600,
                    1789573800,
                    "confirmed",
                    "课后活动",
                    null,
                    1,
                    "request-key",
                    1
                )
            )
        );
        var service = new BookingService(
            repository,
            mock(TransactionTemplate.class),
            Clock.systemUTC()
        );
        var overseer = new BookingService.Actor("Mengchuan@shwfl.edu.cn", "孟川", true, true);
        assertThat(service.roster(overseer))
            .extracting(BookingService.RosterBooking::displayName)
            .containsExactly("李同学");
        byte[] xlsx = service.export(overseer);
        assertThat(xlsx[0]).isEqualTo((byte) 'P');
        assertThat(xlsx.length).isGreaterThan(200);
        String sheet = "";
        try (var zip = new ZipInputStream(new ByteArrayInputStream(xlsx))) {
            for (var entry = zip.getNextEntry(); entry != null; entry = zip.getNextEntry()) {
                if (entry.getName().equals("xl/worksheets/sheet1.xml")) {
                    sheet = new String(zip.readAllBytes(), StandardCharsets.UTF_8);
                }
            }
        }
        assertThat(sheet).contains("李同学", "课后活动", "customWidth=\"1\"", "<cols>");
        assertThat(sheet).contains(
            "width=\"" + widthOf("2026-09-16") + "\"",
            "width=\"" + widthOf("student@example.invalid") + "\"",
            "width=\"" + widthOf("预约成功") + "\""
        );
    }

    private static String widthOf(String value) {
        return String.format(java.util.Locale.US, "%.2f", BookingWorkbook.displayWidth(value));
    }

    @Test
    void controllerDoesNotTreatOrdinaryTeachersAsOverseers() {
        var users = mock(IUserService.class);
        var accounts = new SchoolAccounts(
            users,
            mock(UserRepository.class),
            mock(ClubPresidentRepository.class),
            mock(TeacherRepository.class),
            mock(AdminRepository.class)
        );
        var access = new WorkspaceAccess(users, mock(ClubRepository.class));
        var service = mock(BookingService.class);
        var controller = new BookingApiController(
            accounts,
            access,
            service,
            new BookingOverseers("Mengchuan@shwfl.edu.cn")
        );
        var request = new MockHttpServletRequest();
        assertThatThrownBy(() ->
            controller.all(request, new MockHttpServletResponse())
        ).hasMessageContaining("401");
        var other = new Teacher();
        other.setEmail("celiahu@shwfl.edu.cn");
        other.setUsername("胡诗萌");
        when(users.findByEmail(other.getEmail())).thenReturn(other);
        request.getSession().setAttribute("authenticatedEmail", other.getEmail());
        controller.all(request, new MockHttpServletResponse());
        verify(service).roster(new BookingService.Actor(other.getEmail(), "胡诗萌", true, false));
        var mengchuan = new Teacher();
        mengchuan.setEmail("Mengchuan@shwfl.edu.cn");
        mengchuan.setUsername("孟川");
        when(users.findByEmail(mengchuan.getEmail())).thenReturn(mengchuan);
        var overseerRequest = new MockHttpServletRequest();
        overseerRequest.getSession().setAttribute("authenticatedEmail", mengchuan.getEmail());
        controller.all(overseerRequest, new MockHttpServletResponse());
        verify(service).roster(new BookingService.Actor(mengchuan.getEmail(), "孟川", true, true));
    }

    @Test
    void studentIdentityIsNeverEnoughForTheRoster() {
        var users = mock(IUserService.class);
        var accounts = new SchoolAccounts(
            users,
            mock(UserRepository.class),
            mock(ClubPresidentRepository.class),
            mock(TeacherRepository.class),
            mock(AdminRepository.class)
        );
        var access = new WorkspaceAccess(users, mock(ClubRepository.class));
        var service = mock(BookingService.class);
        var controller = new BookingApiController(
            accounts,
            access,
            service,
            new BookingOverseers("Mengchuan@shwfl.edu.cn")
        );
        var student = new User();
        student.setEmail("student@example.invalid");
        student.setUsername("Student");
        when(users.findByEmail(student.getEmail())).thenReturn(student);
        var request = new MockHttpServletRequest();
        request.getSession().setAttribute("authenticatedEmail", student.getEmail());
        controller.all(request, new MockHttpServletResponse());
        verify(service).roster(
            new BookingService.Actor(student.getEmail(), "Student", false, false)
        );
    }
}

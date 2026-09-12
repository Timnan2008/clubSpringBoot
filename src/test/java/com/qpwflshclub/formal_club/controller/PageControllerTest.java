package com.qpwflshclub.formal_club.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.qpwflshclub.formal_club.Clubs.pojo.Club;
import com.qpwflshclub.formal_club.User.pojo.Teacher;
import com.qpwflshclub.formal_club.Clubs.service.IClubService;
import com.qpwflshclub.formal_club.User.service.IUserService;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ui.ExtendedModelMap;

@ExtendWith(MockitoExtension.class)
class PageControllerTest {

    @Mock
    IClubService clubService;

    @Mock
    IUserService userService;

    PageController controller;

    @BeforeEach
    void setUp() {
        controller = new PageController();
        controller.clubService = clubService;
        controller.userService = userService;
    }

    @Test
    void legacyEditorUsesGuardedWorkspace() {
        String view = controller.editClubPage("Codecraft", null, new ExtendedModelMap());

        assertThat(view).isEqualTo("redirect:/page/club/workspace");
    }

    @Test
    void legacyEditorCannotOpenTeacherEditor() {
        Teacher teacher = new Teacher();
        Club managedClub = club(1000);
        Club currentClub = club(1000);
        teacher.setClubs(List.of(managedClub));

        String view = controller.editClubPage(
            "Codecraft",
            "teacher@example.com",
            new ExtendedModelMap()
        );

        assertThat(view).isEqualTo("redirect:/page/club/workspace");
    }

    private static Club club(Integer id) {
        Club club = new Club();
        club.setId(id);
        return club;
    }
}

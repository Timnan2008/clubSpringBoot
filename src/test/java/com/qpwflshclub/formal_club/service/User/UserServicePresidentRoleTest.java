package com.qpwflshclub.formal_club.service.User;

import com.qpwflshclub.formal_club.pojo.Club.Club;
import com.qpwflshclub.formal_club.pojo.User.ClubPresident;
import com.qpwflshclub.formal_club.pojo.User.User;
import com.qpwflshclub.formal_club.repository.Club.ClubRepository;
import com.qpwflshclub.formal_club.repository.User.AdminRepository;
import com.qpwflshclub.formal_club.repository.User.ClubPresidentRepository;
import com.qpwflshclub.formal_club.repository.User.TeacherRepository;
import com.qpwflshclub.formal_club.repository.User.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServicePresidentRoleTest {

    @Mock
    TeacherRepository teacherRepository;

    @Mock
    AdminRepository adminRepository;

    @Mock
    ClubPresidentRepository clubPresidentRepository;

    @Mock
    UserRepository userRepository;

    @Mock
    ClubRepository clubRepository;

    UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService();
        userService.teacherRepository = teacherRepository;
        userService.adminRepository = adminRepository;
        userService.clubPresidentRepository = clubPresidentRepository;
        userService.userRepository = userRepository;
        userService.clubRepository = clubRepository;
    }

    @Test
    void appointPresidentCreatesPresidentRecordWithoutChangingUserOrAddingMainClubToPresidentClub() {
        Club managedClub = club(8, "Codecraft");
        Club otherClub = club(10, "Basketball");
        User student = user(12L, "王艺蒙", "Thomas", List.of(managedClub, otherClub));

        when(clubRepository.findById(8)).thenReturn(Optional.of(managedClub));
        when(userRepository.findAll()).thenReturn(List.of(student));
        when(clubPresidentRepository.save(any(ClubPresident.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ClubPresident appointed = userService.appointPresident("Thomas", 8, false);

        assertThat(appointed.getMainClub()).isSameAs(managedClub);
        assertThat(appointed.isVicePresident()).isFalse();
        assertThat(appointed.getClubs()).containsExactly(otherClub);
        assertThat(appointed.getClubs()).doesNotContain(managedClub);
        verify(userRepository, never()).delete(any(User.class));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void appointPresidentReusesExistingPresidentRecordWhenBaseUserStillExists() {
        Club managedClub = club(8, "Codecraft");
        Club otherClub = club(10, "Basketball");
        User student = user(12L, "王艺蒙", "Thomas", List.of(managedClub, otherClub));
        ClubPresident existingPresident = president(3L, "王艺蒙", "Thomas", otherClub, List.of(otherClub));

        when(clubRepository.findById(8)).thenReturn(Optional.of(managedClub));
        when(userRepository.findAll()).thenReturn(List.of(student));
        when(clubPresidentRepository.findAll()).thenReturn(List.of(existingPresident));
        when(clubPresidentRepository.save(any(ClubPresident.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ClubPresident appointed = userService.appointPresident("Thomas", 8, true);

        assertThat(appointed).isSameAs(existingPresident);
        assertThat(appointed.getId()).isEqualTo(3L);
        assertThat(appointed.getMainClub()).isSameAs(managedClub);
        assertThat(appointed.isVicePresident()).isTrue();
        assertThat(appointed.getClubs()).containsExactly(otherClub);
        assertThat(appointed.getClubs()).doesNotContain(managedClub);
        verify(userRepository, never()).delete(any(User.class));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void revokePresidentClearsPresidentClubRowsBeforeDeletingPresidentRecord() {
        Club managedClub = club(8, "Codecraft");
        Club otherClub = club(10, "Basketball");
        ClubPresident president = president(3L, "王艺蒙", "Thomas", managedClub, List.of(otherClub));

        when(clubPresidentRepository.findById(3L)).thenReturn(Optional.of(president));

        userService.revokePresident(3L);

        ArgumentCaptor<ClubPresident> deleted = ArgumentCaptor.forClass(ClubPresident.class);
        verify(clubPresidentRepository).delete(deleted.capture());
        assertThat(deleted.getValue().getClubs()).isEmpty();
        verify(userRepository, never()).delete(any(User.class));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void clubMembersShowPresidentRoleOnceWhenBaseUserStillBelongsToManagedClub() {
        Club managedClub = club(8, "Codecraft");
        User student = user(12L, "王艺蒙", "Thomas", List.of(managedClub));
        ClubPresident president = president(3L, "王艺蒙", "Thomas", managedClub, List.of());

        when(clubRepository.findById(8)).thenReturn(Optional.of(managedClub));
        when(userRepository.findAll()).thenReturn(List.of(student));
        when(clubPresidentRepository.findAll()).thenReturn(List.of(president));

        List<Map<String, Object>> members = userService.getClubMembersWithRoles(8);

        assertThat(members).hasSize(1);
        assertThat(members.get(0))
                .containsEntry("usernameEn", "Thomas")
                .containsEntry("roleInClub", "president")
                .containsEntry("userId", 3L);
    }

    @Test
    void removeStudentFromClubRelationshipRemovesPresidentParticipantClubWhenIdsOverlap() {
        Club club = club(8, "Codecraft");
        User unrelatedStudentWithSameId = user(3L, "张三", "Eric", List.of());
        ClubPresident president = president(3L, "王艺蒙", "Thomas", club(10, "Other"), List.of(club));

        when(userRepository.findById(3L)).thenReturn(Optional.of(unrelatedStudentWithSameId));
        when(clubPresidentRepository.findById(3L)).thenReturn(Optional.of(president));

        userService.removeStudentFromClubRelationship(3L, 8);

        assertThat(president.getClubs()).isEmpty();
        verify(clubPresidentRepository).save(president);
        verify(userRepository, never()).save(unrelatedStudentWithSameId);
    }

    private static Club club(Integer id, String nameEn) {
        Club club = new Club();
        club.setId(id);
        club.setClubNameEn(nameEn);
        return club;
    }

    private static User user(Long id, String username, String usernameEn, List<Club> clubs) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        user.setUsernameEn(usernameEn);
        user.setEmail(usernameEn.toLowerCase() + "@example.com");
        user.setPassword("password");
        user.setClubs(clubs);
        return user;
    }

    private static ClubPresident president(Long id, String username, String usernameEn, Club mainClub, List<Club> clubs) {
        ClubPresident president = new ClubPresident();
        president.setId(id);
        president.setUsername(username);
        president.setUsernameEn(usernameEn);
        president.setEmail(usernameEn.toLowerCase() + "@example.com");
        president.setPassword("password");
        president.setMainClub(mainClub);
        president.setClubs(clubs);
        president.setVicePresident(false);
        return president;
    }
}

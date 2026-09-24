package com.qpwflshclub.formal_club.openclaw;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qpwflshclub.formal_club.Clubs.pojo.Club;
import com.qpwflshclub.formal_club.Clubs.repository.ClubRepository;
import com.qpwflshclub.formal_club.User.pojo.Admin;
import com.qpwflshclub.formal_club.User.pojo.Teacher;
import com.qpwflshclub.formal_club.workspace.ClubProfileController;
import com.qpwflshclub.formal_club.workspace.WorkspaceAccess;
import com.qpwflshclub.formal_club.workspace.WorkspaceStore;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

class OpenClawConflictTest {

    @TempDir
    Path temp;

    @Test
    void differentAccountsAndConversationsHaveDifferentAgentSessions() {
        String conversation = "11111111-1111-1111-1111-111111111111";
        Admin admin = new Admin();
        admin.setId(7);
        Teacher teacher = new Teacher();
        teacher.setId(7);
        assertNotEquals(OpenClawIdentity.id(admin), OpenClawIdentity.id(teacher));
        assertNotEquals(
            OpenClawAgent.session(OpenClawIdentity.id(admin), conversation),
            OpenClawAgent.session(OpenClawIdentity.id(teacher), conversation)
        );
        assertNotEquals(
            OpenClawAgent.session(OpenClawIdentity.id(admin), conversation),
            OpenClawAgent.session(
                OpenClawIdentity.id(admin),
                "22222222-2222-2222-2222-222222222222"
            )
        );
    }

    @Test
    void secondAgentCannotOverwriteAProfileRevisionItReadBeforeTheFirstWrite() {
        WorkspaceAccess access = mock(WorkspaceAccess.class);
        ClubRepository clubs = mock(ClubRepository.class);
        EntityManager entityManager = mock(EntityManager.class);
        ClubProfileController controller = new ClubProfileController(access, clubs, null);
        ReflectionTestUtils.setField(controller, "entityManager", entityManager);

        Teacher editor = new Teacher();
        editor.setId(7);
        Club club = new Club();
        club.setId(28);
        club.setClubName("编程社");
        club.setClubNameEn("Code Club");
        club.setSortDescription("旧标语");
        club.setSortDescriptionEn("Old slogan");
        club.setClubDescription("旧简介");
        club.setClubDescriptionEn("Old description");
        when(access.current(null)).thenReturn(editor);
        when(access.require(editor, 28)).thenReturn(club);
        when(clubs.findById(28)).thenReturn(Optional.of(club));
        when(clubs.findByClubNameEn("Code Club")).thenReturn(Optional.of(club));
        String version = ClubProfileController.revision(controller.get(28, null));

        var first = controller.updateIfRevision(
            28,
            version,
            current ->
                new ClubProfileController.Profile(
                    current.name(),
                    "第一位的标语",
                    current.description(),
                    current.president(),
                    current.vicePresident(),
                    current.nameEn(),
                    current.sloganEn(),
                    current.descriptionEn(),
                    current.presidentEn(),
                    current.vicePresidentEn(),
                    current.logo(),
                    current.video(),
                    current.likes()
                ),
            null
        );
        assertEquals("第一位的标语", first.after().slogan());
        assertNotEquals(version, ClubProfileController.revision(first.after()));

        ResponseStatusException conflict = assertThrows(ResponseStatusException.class, () ->
            controller.updateIfRevision(
                28,
                version,
                current ->
                    new ClubProfileController.Profile(
                        current.name(),
                        "第二位的标语",
                        current.description(),
                        current.president(),
                        current.vicePresident(),
                        current.nameEn(),
                        current.sloganEn(),
                        current.descriptionEn(),
                        current.presidentEn(),
                        current.vicePresidentEn(),
                        current.logo(),
                        current.video(),
                        current.likes()
                    ),
                null
            )
        );
        assertEquals(409, conflict.getStatusCode().value());
        assertEquals("第一位的标语", club.getSortDescription());
        verify(entityManager, times(2)).refresh(club, LockModeType.PESSIMISTIC_WRITE);
        verify(clubs, times(1)).save(club);
    }

    @Test
    void twoAgentsCannotSaveDifferentBodiesUnderTheSameDocumentName() throws Exception {
        WorkspaceStore store = new WorkspaceStore(new ObjectMapper(), temp.toString());
        var first = store.saveText(28, "计划书.txt", "", "first@example.com", "第一版");
        ResponseStatusException conflict = assertThrows(ResponseStatusException.class, () ->
            store.saveText(28, "计划书.txt", "", "second@example.com", "第二版")
        );
        assertEquals(409, conflict.getStatusCode().value());
        assertEquals(1, store.read(28).documents().size());
        assertEquals("第一版", Files.readString(store.file(28, first)));
    }
}

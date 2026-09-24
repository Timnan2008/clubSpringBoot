package com.qpwflshclub.formal_club.openclaw;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qpwflshclub.formal_club.Clubs.pojo.Club;
import com.qpwflshclub.formal_club.User.pojo.Teacher;
import com.qpwflshclub.formal_club.workspace.WorkspaceAccess;
import com.qpwflshclub.formal_club.workspace.WorkspaceStore;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class OpenClawDocumentToolTest {

    @TempDir
    Path temp;

    @Test
    void listThenReadDocumentUsesTheUsersClubPermission() throws Exception {
        var access = mock(WorkspaceAccess.class);
        var store = mock(WorkspaceStore.class);
        var tools = new OpenClawTools(
            access,
            store,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null
        );
        var user = new Teacher();
        user.setId(7);
        var club = new Club();
        club.setId(28);
        String id = "11111111-1111-1111-1111-111111111111";
        var document = new WorkspaceStore.Document(
            id,
            "meeting.md",
            20,
            "学期安排",
            "teacher",
            "2026-09-23"
        );
        Path file = temp.resolve(id);
        Files.writeString(file, "周二安排见面会。", StandardCharsets.UTF_8);
        when(access.require(user, 28)).thenReturn(club);
        when(store.read(28)).thenReturn(
            new WorkspaceStore.Data(new ArrayList<>(List.of(document)), new ArrayList<>())
        );
        when(store.document(28, id)).thenReturn(document);
        when(store.file(28, document)).thenReturn(file);
        var args = new ObjectMapper().createObjectNode().put("clubId", 28).put("documentId", id);

        assertTrue(tools.call("list_documents", args, user, null).contains(id));
        assertTrue(tools.call("read_document", args, user, null).contains("周二安排见面会"));
        verify(access, times(2)).require(user, 28);
        verify(access, times(2)).beginAgentRead(user);
        verify(access, times(2)).endAgentRead();
    }

    @Test
    void bulkInventoryIncludesEmptyAndUnreadableClubsWithoutExpandingPermissions()
        throws Exception {
        var access = mock(WorkspaceAccess.class);
        var store = mock(WorkspaceStore.class);
        var tools = new OpenClawTools(
            access,
            store,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null
        );
        var user = new Teacher();
        user.setId(7);
        var a = new Club();
        a.setId(1);
        a.setClubName("编程社");
        var b = new Club();
        b.setId(2);
        b.setClubName("音乐社");
        var c = new Club();
        c.setId(3);
        c.setClubName("读书社");
        when(access.clubs(user)).thenReturn(List.of(a, b, c));
        var doc = new WorkspaceStore.Document(
            "11111111-1111-1111-1111-111111111111",
            "proposal.md",
            20,
            "学期计划书",
            "teacher",
            "2026-09-23"
        );
        when(store.read(1)).thenReturn(
            new WorkspaceStore.Data(new ArrayList<>(List.of(doc)), new ArrayList<>())
        );
        when(store.read(2)).thenReturn(
            new WorkspaceStore.Data(new ArrayList<>(), new ArrayList<>())
        );
        when(store.read(3)).thenThrow(new java.io.IOException("unreadable"));
        var json = new ObjectMapper();
        var data = json.readTree(
            tools.call(
                "list_documents",
                json.createObjectNode().put("query", "proposal 计划书"),
                user,
                null
            )
        );
        org.junit.jupiter.api.Assertions.assertEquals(3, data.path("totalClubs").asInt());
        org.junit.jupiter.api.Assertions.assertEquals(2, data.path("checkedClubs").asInt());
        org.junit.jupiter.api.Assertions.assertEquals(1, data.path("matchingClubs").asInt());
        org.junit.jupiter.api.Assertions.assertEquals(1, data.path("failedClubs").asInt());
        org.junit.jupiter.api.Assertions.assertFalse(data.path("complete").asBoolean());
        org.junit.jupiter.api.Assertions.assertEquals(
            0,
            data.path("clubs").get(1).path("documentCount").asInt()
        );
        org.junit.jupiter.api.Assertions.assertEquals(
            "unavailable",
            data.path("clubs").get(2).path("status").asText()
        );
        verify(store, never()).read(4);
        verify(access).endAgentRead();
    }

    @Test
    void bulkInventoryPagesWithoutSilentlyDroppingClubs() throws Exception {
        var access = mock(WorkspaceAccess.class);
        var store = mock(WorkspaceStore.class);
        var tools = new OpenClawTools(
            access,
            store,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null
        );
        var user = new Teacher();
        user.setId(7);
        var clubs = new ArrayList<Club>();
        for (int id = 1; id <= 51; id++) {
            var club = new Club();
            club.setId(id);
            club.setClubName("Club " + id);
            clubs.add(club);
        }
        when(access.clubs(user)).thenReturn(clubs);
        when(store.read(anyInt())).thenReturn(
            new WorkspaceStore.Data(new ArrayList<>(), new ArrayList<>())
        );
        var json = new ObjectMapper();
        var first = json.readTree(
            tools.call("list_documents", json.createObjectNode(), user, null)
        );
        org.junit.jupiter.api.Assertions.assertEquals(50, first.path("checkedClubs").asInt());
        org.junit.jupiter.api.Assertions.assertEquals(50, first.path("nextOffset").asInt());
        org.junit.jupiter.api.Assertions.assertFalse(first.path("complete").asBoolean());
        var last = json.readTree(
            tools.call("list_documents", json.createObjectNode().put("offset", 50), user, null)
        );
        org.junit.jupiter.api.Assertions.assertEquals(
            51,
            last.path("clubs").get(0).path("clubId").asInt()
        );
        assertTrue(last.path("nextOffset").isNull());
    }
}

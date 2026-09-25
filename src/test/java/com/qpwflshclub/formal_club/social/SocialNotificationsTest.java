package com.qpwflshclub.formal_club.social;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qpwflshclub.formal_club.Clubs.pojo.Club;
import com.qpwflshclub.formal_club.Clubs.repository.ClubRepository;
import com.qpwflshclub.formal_club.User.pojo.User;
import com.qpwflshclub.formal_club.workspace.controller.JoinRequests;
import com.qpwflshclub.formal_club.social.controller.NotificationController;
import com.qpwflshclub.formal_club.social.service.SchoolAccounts;
import com.qpwflshclub.formal_club.social.service.SocialNotifications;
import com.qpwflshclub.formal_club.social.service.SocialStore;
import com.qpwflshclub.formal_club.workspace.service.WorkspaceAccess;
import java.nio.file.Path;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockHttpServletRequest;

class SocialNotificationsTest {

    @TempDir
    Path dir;

    ObjectMapper json = new ObjectMapper();

    @Test
    void recallOnlyOwnMessageErasesPayloadAndSurvivesReload() throws Exception {
        var s = new SocialStore(json, dir.toString());
        var m = s.message("a", "b", "ciphertext");
        assertThatThrownBy(() -> s.recall(m.id(), "b", "a")).hasMessageContaining("403");
        assertThatThrownBy(() -> s.recall(m.id(), "a", "c")).hasMessageContaining("403");
        s.recall(m.id(), "a", "b");
        s.markRead("b", "a");
        var stored = new SocialStore(json, dir.toString()).snapshot().messages().getFirst();
        assertThat(stored.text()).isEmpty();
        assertThat(stored.recalled()).isTrue();
        assertThat(stored.read()).isTrue();
        assertThatThrownBy(() ->
            s.encryptHistory(m.id(), "a", "b", "e2ee:v1:new")
        ).hasMessageContaining("409");
    }

    @Test
    void oldMessageJsonLoadsWithoutNewFields() throws Exception {
        var m = json.readValue(
            "{\"id\":\"1\",\"sender\":\"a\",\"recipient\":\"b\",\"text\":\"hi\",\"createdAt\":\"now\",\"read\":false}",
            SocialStore.Message.class
        );
        assertThat(m.recalled()).isFalse();
    }

    @Test
    void mentionsUnreadIsolationAnonymityDeletionAndRecall() throws Exception {
        var a = mock(SchoolAccounts.class);
        var access = mock(WorkspaceAccess.class);
        var store = new SocialStore(json, dir.toString());
        var notifications = new SocialNotifications(json, dir.toString());
        var c = new NotificationController(a, access, store, notifications, null, null);
        var user = new User();
        user.setEmail("bob@example.com");
        String me = SchoolAccounts.key(user.getEmail());
        var r = new MockHttpServletRequest();
        when(a.current(r)).thenReturn(user);
        when(a.directory()).thenReturn(Map.of());
        when(access.token(r)).thenReturn("token");
        var p = store.post("alice", "@Bob Hi", "general", true);
        notifications.attach(p.id(), List.of(new SocialNotifications.Mention(0, 4, me)));
        var m = store.message("alice", me, "secret");
        var result = json.valueToTree(c.get(r));
        assertThat(result.get("unread").asInt()).isEqualTo(2);
        assertThat(result.toString()).doesNotContain("secret");
        var mention = result.get("items").findValuesAsText("type");
        assertThat(mention).contains("mention", "message");
        assertThat(result.get("items").findValues("actor")).allMatch(v -> v.isNull());
        c.read(new NotificationController.ReadInput("mention:" + p.id(), false), r);
        assertThat(json.valueToTree(c.get(r)).get("unread").asInt()).isEqualTo(1);
        assertThat(
            new SocialNotifications(json, dir.toString()).read(me, "mention:" + p.id())
        ).isTrue();
        assertThat(notifications.read("outsider", "mention:" + p.id())).isFalse();
        store.recall(m.id(), "alice", me);
        assertThat(json.valueToTree(c.get(r)).get("unread").asInt()).isZero();
        var reply = store.reply(p.id(), "alice", "@Bob in a comment");
        notifications.attach(reply.id(), List.of(new SocialNotifications.Mention(0, 4, me)));
        var afterReply = json.valueToTree(c.get(r));
        assertThat(afterReply.get("unread").asInt()).isEqualTo(1);
        assertThat(afterReply.get("items").findValuesAsText("id")).contains(
            "mention:" + reply.id()
        );
        c.read(new NotificationController.ReadInput("mention:" + reply.id(), false), r);
        store.delete(p.id(), "alice", false);
        assertThat(json.valueToTree(c.get(r)).get("items")).isEmpty();
        assertThatThrownBy(() ->
            c.read(new NotificationController.ReadInput("message:other", false), r)
        ).hasMessageContaining("404");
    }

    @Test
    void mentionOffsetsAreValidatedAndTrimmed() throws Exception {
        var a = mock(SchoolAccounts.class);
        var n = new SocialNotifications(json, dir.toString());
        assertThat(n.validate(null, List.of(), a)).isEmpty();
        assertThat(
            n
                .validate("　@Bob", List.of(new SocialNotifications.Mention(1, 5, "b")), a)
                .getFirst()
                .start()
        ).isEqualTo(1);
        var valid = n.validate(
            "  @Bob test",
            List.of(new SocialNotifications.Mention(2, 6, "b")),
            a
        );
        assertThat(valid.getFirst().start()).isZero();
        assertThat(valid.getFirst().end()).isEqualTo(4);
        assertThatThrownBy(() ->
            n.validate("Hi", List.of(new SocialNotifications.Mention(0, 100, "b")), a)
        ).hasMessageContaining("400");
        assertThatThrownBy(() ->
            n.validate(
                "@Bob",
                List.of(
                    new SocialNotifications.Mention(0, 4, "b"),
                    new SocialNotifications.Mention(0, 4, "c")
                ),
                a
            )
        ).hasMessageContaining("400");
    }

    @Test
    void pendingJoinRequestsNotifyOfficersAndDecisionsNotifyApplicants() throws Exception {
        var accounts = mock(SchoolAccounts.class);
        var access = mock(WorkspaceAccess.class);
        var store = new SocialStore(json, dir.toString());
        var notifications = new SocialNotifications(json, dir.toString());
        var joins = new JoinRequests(dir.resolve("join").toString());
        var clubs = mock(ClubRepository.class);
        var inbox = new NotificationController(
            accounts,
            access,
            store,
            notifications,
            joins,
            clubs
        );
        var officer = new User();
        officer.setEmail("leader@example.com");
        var applicant = new User();
        applicant.setEmail("nantian@example.com");
        var club = new Club();
        club.setId(1);
        club.setClubName("测试社");
        when(access.clubs(officer)).thenReturn(List.of(club));
        when(access.clubs(applicant)).thenReturn(List.of());
        when(clubs.findById(1)).thenReturn(Optional.of(club));
        when(accounts.directory()).thenReturn(Map.of());
        when(access.token(any())).thenReturn("token");
        var officerRequest = new MockHttpServletRequest();
        when(accounts.current(officerRequest)).thenReturn(officer);
        var entry = joins.apply(1, SchoolAccounts.key(applicant.getEmail()), "南天", "", "测试");
        var listed = json.valueToTree(inbox.get(officerRequest));
        assertThat(listed.get("unread").asInt()).isEqualTo(1);
        assertThat(listed.get("items").findValuesAsText("type")).contains("join_request");
        assertThat(listed.get("items").findValuesAsText("clubName")).contains("测试社");
        assertThat(listed.get("items").findValuesAsText("url")).contains(
            "/page/club/workspace?tab=recruitment&club=1"
        );
        joins.decide(1, entry.id(), "approved", SchoolAccounts.key(officer.getEmail()));
        assertThat(json.valueToTree(inbox.get(officerRequest)).get("unread").asInt()).isZero();
        var applicantRequest = new MockHttpServletRequest();
        when(accounts.current(applicantRequest)).thenReturn(applicant);
        var decided = json.valueToTree(inbox.get(applicantRequest));
        assertThat(decided.get("items").findValuesAsText("type")).contains("join_approved");
        assertThat(decided.get("unread").asInt()).isEqualTo(1);
    }
}

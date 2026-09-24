package com.qpwflshclub.formal_club.social.controller;

import com.qpwflshclub.formal_club.Clubs.pojo.Club;
import com.qpwflshclub.formal_club.Clubs.repository.ClubRepository;
import com.qpwflshclub.formal_club.User.pojo.UserBase;
import com.qpwflshclub.formal_club.openclaw.OpenClawApprovals;
import com.qpwflshclub.formal_club.social.SocialNotifications;
import com.qpwflshclub.formal_club.social.SocialStore;
import com.qpwflshclub.formal_club.social.service.SchoolAccounts;
import com.qpwflshclub.formal_club.workspace.JoinRequests;
import com.qpwflshclub.formal_club.workspace.WorkspaceAccess;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/campus-social/notifications")
public class NotificationController {

    private final SchoolAccounts accounts;
    private final WorkspaceAccess access;
    private final SocialStore social;
    private final SocialNotifications notifications;
    private final JoinRequests joins;
    private final ClubRepository clubs;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private OpenClawApprovals approvals;

    public NotificationController(
        SchoolAccounts a,
        WorkspaceAccess w,
        SocialStore s,
        SocialNotifications n,
        JoinRequests j,
        ClubRepository c
    ) {
        accounts = a;
        access = w;
        social = s;
        notifications = n;
        joins = j;
        clubs = c;
    }

    public record Item(
        String id,
        String type,
        String actor,
        String url,
        String createdAt,
        boolean unread,
        String clubName
    ) {
        public Item(
            String id,
            String type,
            String actor,
            String url,
            String createdAt,
            boolean unread
        ) {
            this(id, type, actor, url, createdAt, unread, "");
        }
    }

    private List<Item> list(UserBase user) throws IOException {
        String me = SchoolAccounts.key(user.getEmail());
        var d = social.snapshot();
        var list = new ArrayList<Item>();
        for (var p : d.posts())
            if (
                !p.author().equals(me) &&
                notifications
                    .mentions(p.id())
                    .stream()
                    .anyMatch(m -> m.account().equals(me))
            ) {
                String id = "mention:" + p.id();
                list.add(
                    new Item(
                        id,
                        "mention",
                        p.anonymous() ? "" : p.author(),
                        "/page/wall?post=" + p.id(),
                        p.createdAt(),
                        !notifications.read(me, id)
                    )
                );
            }
        var posts = new HashMap<String, SocialStore.Post>();
        for (var p : d.posts()) posts.put(p.id(), p);
        // 先把回复按 id 建索引：原来在循环里又一次扫全部回复找父回复，回复一多就是 O(n²)，
        // 现在查父回复是 O(1)，整体回到 O(n)。判断顺序与结果保持不变。
        var repliesById = new HashMap<String, SocialStore.Reply>();
        for (var r : d.replies()) repliesById.put(r.id(), r);
        for (var r : d.replies()) {
            var parent = posts.get(r.post());
            if (parent == null || r.author().equals(me)) continue;
            if (
                notifications
                    .mentions(r.id())
                    .stream()
                    .anyMatch(m -> m.account().equals(me))
            ) {
                String id = "mention:" + r.id();
                list.add(
                    new Item(
                        id,
                        "mention",
                        parent.anonymous() && parent.author().equals(r.author()) ? "" : r.author(),
                        "/page/wall?post=" + r.post(),
                        r.createdAt(),
                        !notifications.read(me, id)
                    )
                );
            }
        }
        for (var r : d.replies()) {
            var p = posts.get(r.post());
            if (p == null) continue;
            var parent = repliesById.get(r.parentReply());
            if (!p.author().equals(me) && (parent == null || !parent.author().equals(me))) continue;
            String id = "reply:" + r.id();
            list.add(
                new Item(
                    id,
                    "reply",
                    p.anonymous() && p.author().equals(r.author()) ? "" : r.author(),
                    "/page/wall?post=" + r.post(),
                    r.createdAt(),
                    !notifications.read(me, id)
                )
            );
        }
        for (var m : d.messages())
            if (m.recipient().equals(me) && !m.recalled()) list.add(
                new Item(
                    "message:" + m.id(),
                    "message",
                    m.sender(),
                    "/page/messages?with=" + m.sender(),
                    m.createdAt(),
                    !m.read()
                )
            );
        addJoinItems(user, me, list);
        addApprovalItems(user, list);
        list.sort(Comparator.comparing(Item::createdAt).reversed());
        return list;
    }

    private void addApprovalItems(UserBase user, List<Item> list) {
        if (approvals == null) return;
        for (var item : approvals.pendingFor(user)) {
            list.add(
                new Item(
                    "openclaw-approval:" + item.id(),
                    "openclaw_approval",
                    "",
                    "/page/openclaw",
                    item.createdAt(),
                    true,
                    item.tool()
                )
            );
        }
    }

    private void addJoinItems(UserBase user, String me, List<Item> list) throws IOException {
        if (joins == null) return;
        Map<Integer, Club> managed = new LinkedHashMap<>();
        List<Club> managedClubs = access.clubs(user);
        if (managedClubs != null) for (Club club : managedClubs) managed.put(club.getId(), club);
        for (var entry : joins.all().entrySet()) {
            Club club = managed.get(entry.getKey());
            if (club == null && clubs != null) club = clubs.findById(entry.getKey()).orElse(null);
            String clubName = club == null ? "" : Objects.toString(club.getClubName(), "");
            for (var request : entry.getValue()) {
                if (managed.containsKey(entry.getKey()) && request.status().equals("pending")) {
                    if (request.account().equals(me)) continue;
                    String id = "join-request:" + request.id();
                    list.add(
                        new Item(
                            id,
                            "join_request",
                            request.account(),
                            "/page/club/workspace?tab=recruitment&club=" + entry.getKey(),
                            request.createdAt(),
                            !notifications.read(me, id),
                            clubName
                        )
                    );
                }
                if (
                    request.account().equals(me) &&
                    (request.status().equals("approved") || request.status().equals("declined"))
                ) {
                    String id = "join-decision:" + request.id();
                    list.add(
                        new Item(
                            id,
                            request.status().equals("approved") ? "join_approved" : "join_declined",
                            request.reviewedBy(),
                            "/page/clubs/" + entry.getKey(),
                            request.createdAt(),
                            !notifications.read(me, id),
                            clubName
                        )
                    );
                }
            }
        }
    }

    @GetMapping
    public Object get(HttpServletRequest r) throws IOException {
        var user = accounts.current(r);
        String me = SchoolAccounts.key(user.getEmail());
        var all = list(user);
        var people = accounts.directory();
        var items = all
            .stream()
            .sorted(Comparator.comparing(Item::unread).reversed())
            .limit(100)
            .map(i -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", i.id());
                row.put("type", i.type());
                row.put("url", i.url());
                row.put("createdAt", i.createdAt());
                row.put("unread", i.unread());
                row.put("actor", people.get(i.actor()));
                if (i.clubName() != null && !i.clubName().isBlank()) row.put(
                    "clubName",
                    i.clubName()
                );
                return row;
            })
            .toList();
        return Map.of(
            "items",
            items,
            "unread",
            all.stream().filter(Item::unread).count(),
            "notices",
            List.of(),
            "token",
            access.token(r)
        );
    }

    public record ReadInput(String id, boolean all) {}

    @PostMapping("/read")
    public Object read(@RequestBody ReadInput body, HttpServletRequest r) throws IOException {
        var user = accounts.current(r);
        String me = SchoolAccounts.key(user.getEmail());
        access.mutation(r);
        var selected = list(user)
            .stream()
            .filter(i -> body.all() || i.id().equals(body.id()))
            .toList();
        if (!body.all() && selected.isEmpty()) throw SchoolAccounts.error(
            404,
            "通知不存在 / Notification not found"
        );
        social.readMessages(
            selected
                .stream()
                .filter(i -> i.type().equals("message"))
                .map(i -> i.id().substring(8))
                .collect(java.util.stream.Collectors.toSet()),
            me
        );
        notifications.mark(
            me,
            selected
                .stream()
                .filter(i -> !i.type().equals("message"))
                .map(Item::id)
                .toList()
        );
        return Map.of("ok", true);
    }
}

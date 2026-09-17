package com.qpwflshclub.formal_club.social.controller;

import com.qpwflshclub.formal_club.social.service.SchoolAccounts;
import com.qpwflshclub.formal_club.social.SocialNotifications;
import com.qpwflshclub.formal_club.social.SocialStore;
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

    /** 违禁词处罚台账：把「网管」的提醒/封禁通知一起送进通知中心。 */
    @org.springframework.beans.factory.annotation.Autowired
    private com.qpwflshclub.formal_club.social.service.ModerationPenalty penalties;

    /**
     * 「网管」的提醒记录：每次命中违禁词都会留一条，学生在这里能看到自己被提醒/被封到什么时间。
     * 独立的 notices 列表，不改动原有 items 的结构（前端单独渲染一块）。
     */
    private List<Map<String, Object>> wardenNotices(String me) throws IOException {
        if (penalties == null) return List.of();
        var history = penalties.state(me).history();
        List<Map<String, Object>> notices = new ArrayList<>();
        for (int i = history.size() - 1; i >= 0; i--) {
            var strike = history.get(i);
            String id = "warden:" + strike.at() + ":" + i;
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", id);
            row.put("at", strike.at());
            row.put("where", strike.where());
            row.put("word", strike.word());
            row.put("text", String.format(
                "【网管】在第 %d 次违规里拦截了违禁词「%s」（位置：%s），请不要再发类似内容。",
                history.size() - i,
                strike.word(),
                strike.where()
            ));
            row.put("unread", !notifications.read(me, id));
            notices.add(row);
        }
        return notices;
    }

    public NotificationController(
        SchoolAccounts a,
        WorkspaceAccess w,
        SocialStore s,
        SocialNotifications n
    ) {
        accounts = a;
        access = w;
        social = s;
        notifications = n;
    }

    public record Item(
        String id,
        String type,
        String actor,
        String url,
        String createdAt,
        boolean unread
    ) {}

    private List<Item> list(String me) throws IOException {
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
            if (r.author().equals(me)) continue;
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
        list.sort(Comparator.comparing(Item::createdAt).reversed());
        return list;
    }

    @GetMapping
    public Object get(HttpServletRequest r) throws IOException {
        String me = SchoolAccounts.key(accounts.current(r).getEmail());
        var all = list(me);
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
                return row;
            })
            .toList();
        return Map.of(
            "items",
            items,
            "unread",
            all.stream().filter(Item::unread).count(),
            "notices",
            wardenNotices(me),
            "token",
            access.token(r)
        );
    }

    public record ReadInput(String id, boolean all) {}

    @PostMapping("/read")
    public Object read(@RequestBody ReadInput body, HttpServletRequest r) throws IOException {
        String me = SchoolAccounts.key(accounts.current(r).getEmail());
        access.mutation(r);
        var selected = list(me)
            .stream()
            .filter(i -> body.all() || i.id().equals(body.id()))
            .toList();
        // 「网管」提醒也支持已读
        var noticeSelected = wardenNotices(me)
            .stream()
            .filter(n -> body.all() || String.valueOf(n.get("id")).equals(body.id()))
            .map(n -> String.valueOf(n.get("id")))
            .toList();
        if (!body.all() && selected.isEmpty() && noticeSelected.isEmpty()) throw SchoolAccounts.error(
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
        notifications.mark(me, noticeSelected);
        return Map.of("ok", true);
    }
}

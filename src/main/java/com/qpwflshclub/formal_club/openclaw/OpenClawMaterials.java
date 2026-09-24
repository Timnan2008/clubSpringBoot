package com.qpwflshclub.formal_club.openclaw;

import com.qpwflshclub.formal_club.Clubs.pojo.Club;
import com.qpwflshclub.formal_club.User.pojo.UserBase;
import com.qpwflshclub.formal_club.workspace.ClubProfileController;
import com.qpwflshclub.formal_club.workspace.WorkspaceAccess;
import com.qpwflshclub.formal_club.workspace.WorkspaceStore;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Service;

/** Lexical retrieval over the clubs the signed-in officer can already open. */
@Service
public class OpenClawMaterials {

    private final WorkspaceAccess access;
    private final WorkspaceStore store;
    private final ClubProfileController profiles;

    public OpenClawMaterials(
        WorkspaceAccess access,
        WorkspaceStore store,
        ClubProfileController profiles
    ) {
        this.access = access;
        this.store = store;
        this.profiles = profiles;
    }

    public String search(UserBase user, String query, HttpServletRequest request) {
        return search(user, query, request, false);
    }

    public String search(UserBase user, String query, HttpServletRequest request, boolean english) {
        List<Passage> passages = new ArrayList<>();
        for (Club club : access.clubs(user)) {
            try {
                collect(club, request, passages);
            } catch (RuntimeException | IOException ignored) {
                passages.add(
                    new Passage(
                        (club.getClubName() == null ? "" : club.getClubName()) +
                            (english ? " · unreadable" : " · 资料暂时读不到"),
                        ""
                    )
                );
            }
        }
        List<Passage> ranked = rank(query, passages);
        boolean joining = aboutJoining(query);
        if (ranked.isEmpty()) {
            return joining
                ? joinPassage(english).text
                : english
                  ? "No matching text in the profiles, activity notes, or text documents this account can manage."
                  : "没有在可管理社团的简介、活动说明和文本文档里找到相关内容。";
        }
        StringBuilder out = new StringBuilder();
        if (joining) {
            Passage rule = joinPassage(english);
            out.append("【").append(rule.source).append("】\n").append(rule.text);
        }
        for (Passage passage : ranked) {
            if (joining && passage.source.equals(joinPassage(english).source)) continue;
            if (out.length() > 0) out.append("\n\n");
            out.append("【").append(passage.source).append("】\n").append(passage.text);
            if (out.length() > 6000) break;
        }
        return out.substring(0, Math.min(out.length(), 6000));
    }

    static boolean aboutJoining(String query) {
        if (query == null) return false;
        String q = query.toLowerCase(Locale.ROOT);
        return (
            q.contains("报名") ||
            q.contains("加入") ||
            q.contains("join") ||
            q.contains("apply") ||
            q.contains("signup") ||
            q.contains("sign up") ||
            q.contains("register")
        );
    }

    private static Passage joinPassage(boolean english) {
        if (english) {
            return new Passage(
                "Site rule · joining a club",
                """
                Students join from the club page, not from a signup form in the profile or documents. After signing in, open the club and choose Apply to join. A note of up to 1000 characters is optional. The request is reviewed by a club officer. After approval the student appears on the member list. Status is pending or member. Teachers see Manage my clubs instead of Apply to join. A WeChat group or Git collaboration in the profile is how members work together. It is not a registration channel. Do not say there is no way to join, apply, or register just because the documents never mention 报名 or a signup method.
                """
            );
        }
        return new Passage(
            "站点规则 · 加入社团",
            """
            报名方式：学生在社团详情页申请加入社团，不是写在简介或文档里的报名表。登录后打开社团页面，点击「申请加入社团」，可以附上最多 1000 字说明。社长审核通过后，这个人出现在社员名单，状态是 pending 或 member。老师看到的是「管理我的社团」。简介里的微信群、Git 协作是成员交流，不是报名入口，也不能写成报名渠道。不要因为文档里没有「报名」「报名方式」或「加入」就说没有报名渠道。
            """
        );
    }

    private void collect(Club club, HttpServletRequest request, List<Passage> passages)
        throws IOException {
        String clubName = club.getClubName() == null ? "社团" : club.getClubName();
        var profile = profiles.get(club.getId(), request);
        passages.add(
            new Passage(
                clubName + " · 社团资料",
                profile.name() +
                    "\n" +
                    profile.nameEn() +
                    "\n" +
                    profile.slogan() +
                    "\n" +
                    profile.sloganEn() +
                    "\n" +
                    profile.description() +
                    "\n" +
                    profile.descriptionEn()
            )
        );
        WorkspaceStore.Data data = store.read(club.getId());
        for (var activity : data.activities()) {
            passages.add(
                new Passage(
                    clubName + " · 活动 " + activity.title(),
                    activity.title() +
                        "\n" +
                        activity.start() +
                        " 至 " +
                        activity.end() +
                        "\n" +
                        activity.location() +
                        "\n" +
                        activity.description() +
                        "\n状态 " +
                        activity.status()
                )
            );
        }
        int files = 0;
        for (var document : data.documents()) {
            if (files >= 40) break;
            String text = documentText(club.getId(), document);
            if (text.isBlank()) continue;
            files++;
            passages.add(new Passage(clubName + " · 文档 " + document.name(), text));
        }
    }

    private String documentText(int club, WorkspaceStore.Document document) throws IOException {
        String note = document.note() == null ? "" : document.note();
        String name = document.name() == null ? "" : document.name().toLowerCase(Locale.ROOT);
        if (!name.endsWith(".txt") && !name.endsWith(".csv")) return note;
        var path = store.file(club, document);
        if (!Files.exists(path) || Files.size(path) > 200_000) return note;
        String raw = Files.readString(path, StandardCharsets.UTF_8);
        if (raw.indexOf('\0') >= 0) return note;
        String body = raw.length() > 20_000 ? raw.substring(0, 20_000) : raw;
        return note.isBlank() ? body : note + "\n" + body;
    }

    static List<Passage> rank(String query, List<Passage> passages) {
        Set<String> needles = grams(query);
        if (needles.isEmpty()) return List.of();
        List<Passage> scored = new ArrayList<>();
        for (Passage passage : passages) {
            if (passage.text.isBlank()) continue;
            int score = 0;
            Set<String> hay = grams(passage.source + "\n" + passage.text);
            for (String needle : needles) if (hay.contains(needle)) score++;
            if (score > 0) scored.add(new Passage(passage.source, clip(passage.text), score));
        }
        scored.sort(Comparator.comparingInt((Passage p) -> p.score).reversed());
        return scored.size() > 6 ? List.copyOf(scored.subList(0, 6)) : List.copyOf(scored);
    }

    static Set<String> grams(String text) {
        String compact = text == null ? "" : text.toLowerCase(Locale.ROOT).replaceAll("\\s+", "");
        Set<String> grams = new HashSet<>();
        if (compact.length() == 1) grams.add(compact);
        for (int i = 0; i + 1 < compact.length(); i++) grams.add(compact.substring(i, i + 2));
        return grams;
    }

    private static String clip(String text) {
        String trimmed = text.strip();
        return trimmed.length() > 700 ? trimmed.substring(0, 700) : trimmed;
    }

    record Passage(String source, String text, int score) {
        Passage(String source, String text) {
            this(source, text, 0);
        }
    }
}

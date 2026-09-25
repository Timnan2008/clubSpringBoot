package com.qpwflshclub.formal_club.openclaw;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Choices a person can turn on for their own assistant. Unknown ids are ignored. */
public final class OpenClawCatalog {

    private OpenClawCatalog() {}

    public static List<Map<String, String>> choices() {
        return choices(false);
    }

    public static List<Map<String, String>> choices(boolean english) {
        return List.of(
            choice(
                "profile",
                "school",
                english,
                "社团资料",
                "Club profile",
                "查看和修改名称、标语、简介，以及社员和入社申请",
                "Read and edit the profile, members, and join requests"
            ),
            choice(
                "documents",
                "school",
                english,
                "文档",
                "Documents",
                "读取并保存社团文档",
                "Read and save club documents"
            ),
            choice(
                "calendar",
                "school",
                english,
                "日历",
                "Calendar",
                "查看并添加个人或社团日程",
                "Read and add personal or club events"
            ),
            choice(
                "post",
                "school",
                english,
                "校园帖",
                "Campus post",
                "以当前用户的助手名义发帖",
                "Post as the current user's assistant"
            ),
            choice(
                "search",
                "school",
                english,
                "资料检索",
                "Search materials",
                "检索可见的简介、活动和文本文档",
                "Search visible profiles, activities, and text documents"
            ),
            choice(
                "mcp-school",
                "mcp",
                english,
                "校园 MCP",
                "Campus tools",
                "通过工具访问社团资料、社员、入社申请、文档、日历和发帖",
                "Use tools for profiles, members, join requests, documents, calendar, and posts"
            ),
            choice(
                "weather",
                "skill",
                english,
                "天气",
                "Weather",
                "查活动当天的天气",
                "Check the weather for an activity day"
            ),
            choice(
                "markdown-converter",
                "skill",
                english,
                "Markdown",
                "Markdown",
                "把通知和记录整理成 Markdown",
                "Turn notices and notes into Markdown"
            ),
            choice(
                "document-summary",
                "skill",
                english,
                "文档摘要",
                "Document summary",
                "概括已有社团材料",
                "Summarize club materials you can already read"
            ),
            choice(
                "meeting-notes",
                "skill",
                english,
                "会议纪要",
                "Meeting notes",
                "把会议记录整理成决议和行动项",
                "Turn meeting notes into decisions and actions"
            ),
            choice(
                "meeting-agenda-creator",
                "skill",
                english,
                "会议议程",
                "Meeting agenda",
                "按议题安排会议时间和角色",
                "Plan meeting time and roles by topic"
            ),
            choice(
                "word-docx",
                "skill",
                english,
                "Word 文稿",
                "Word document",
                "按文稿结构整理通知和纪要",
                "Shape notices and minutes as a document"
            )
        );
    }

    /** Short skill reminders. The model does not receive the skill files themselves. */
    public static String skillNote(String id, boolean english) {
        return switch (id) {
            case "weather" -> english
                ? "Weather: use current information returned by a tool; do not invent a forecast."
                : "天气：只引用工具返回的实时结果，不要编造预报。";
            case "markdown-converter" -> english
                ? "Markdown: organize user-provided material into Markdown; use give_file for a download or write_document for a club record."
                : "Markdown：把用户材料整理成 Markdown；下载用 give_file，保存社团记录用 write_document。";
            case "document-summary" -> english
                ? "Document summary: use list_documents then read_document for club records, or summarize user attachments. Do not invent facts."
                : "文档摘要：先用 list_documents 再用 read_document 读取社团材料，或概括用户附件。不要编造事实。";
            case "meeting-notes" -> english
                ? "Meeting notes: from a supplied meeting record, list decisions, action items (who, by when, what), and open questions. Leave missing times and names blank."
                : "会议纪要：根据用户给出的记录，列出决议、行动项（谁、何时、做什么）和未决问题。时间和姓名缺失就留空。";
            case "meeting-agenda-creator" -> english
                ? "Meeting agenda: draft a timed agenda with a facilitator and a note-taker. Do not invent attendees or decisions."
                : "会议议程：起草带时间的议程，并写出主持人和记录人。不要编造参会人或决议。";
            case "word-docx" -> english
                ? "Word document: organize the requested content with a title, sections and tables, then use give_file with a .docx filename for download."
                : "Word 文稿：按用户要求整理标题、章节和表格，下载时用 give_file 并以 .docx 命名。";
            default -> "";
        };
    }

    public static Set<String> toolsFor(List<String> selected) {
        Set<String> enabled = new LinkedHashSet<>();
        enabled.add("remember");
        enabled.add("forget");
        enabled.add("web_search");
        enabled.add("web_fetch");
        enabled.add("update_plan");
        enabled.add("give_file");
        List<String> ids =
            selected == null
                ? choices()
                      .stream()
                      .map(item -> item.get("id"))
                      .toList()
                : selected;
        for (String id : ids) {
            switch (id == null ? "" : id) {
                case "profile" -> enabled.addAll(
                    List.of(
                        "list_clubs",
                        "read_club",
                        "update_club_profile",
                        "list_members",
                        "list_join_requests",
                        "review_join_request"
                    )
                );
                case "documents" -> enabled.addAll(
                    List.of("list_documents", "read_document", "write_document")
                );
                case "calendar" -> enabled.addAll(
                    List.of("list_calendar", "add_personal_event", "add_club_event")
                );
                case "post" -> enabled.add("publish_post");
                case "search" -> enabled.add("search_materials");
                case "mcp-school" -> enabled.addAll(
                    List.of(
                        "list_clubs",
                        "read_club",
                        "update_club_profile",
                        "list_documents",
                        "read_document",
                        "write_document",
                        "list_calendar",
                        "add_personal_event",
                        "add_club_event",
                        "publish_post",
                        "search_materials",
                        "list_members",
                        "list_join_requests",
                        "review_join_request"
                    )
                );
                case "sandbox" -> {
                    /* Isolation is always on for the gateway sandbox. */
                }
                default -> {
                    /* Skill names are passed to the prompt, not executed here. */
                }
            }
        }
        return Set.copyOf(enabled);
    }

    public static List<String> ids() {
        return choices()
            .stream()
            .map(item -> item.get("id"))
            .toList();
    }

    public static List<String> skillsFor(List<String> selected) {
        if (selected == null) return List.of();
        Set<String> skills = new LinkedHashSet<>();
        for (Map<String, String> item : choices()) {
            if ("skill".equals(item.get("kind"))) skills.add(item.get("id"));
        }
        return selected.stream().filter(skills::contains).distinct().limit(12).toList();
    }

    private static Map<String, String> choice(
        String id,
        String kind,
        boolean english,
        String label,
        String labelEn,
        String detail,
        String detailEn
    ) {
        return Map.of(
            "id",
            id,
            "kind",
            kind,
            "label",
            english ? labelEn : label,
            "detail",
            english ? detailEn : detail
        );
    }
}

package com.qpwflshclub.formal_club.openclaw;

import com.fasterxml.jackson.databind.JsonNode;
import com.qpwflshclub.formal_club.social.service.SchoolAccounts;
import com.qpwflshclub.formal_club.workspace.service.WorkspaceAccess;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.server.ResponseStatusException;

/** School page in front of OpenClaw. The gateway token and school writes stay on the server. */
@Controller
public class OpenClawController {

    private final OpenClawAccess access;
    private final SchoolAccounts accounts;
    private final WorkspaceAccess workspace;
    private final OpenClawGateway gateway;
    private final OpenClawAgent agent;
    private final OpenClawHistory conversations;
    private final OpenClawQuota quota;
    private final OpenClawFiles files;
    private final OpenClawApprovals approvals;
    private final OpenClawTools tools;

    public OpenClawController(
        OpenClawAccess access,
        SchoolAccounts accounts,
        WorkspaceAccess workspace,
        OpenClawGateway gateway,
        OpenClawAgent agent,
        OpenClawHistory conversations,
        OpenClawQuota quota,
        OpenClawFiles files,
        OpenClawApprovals approvals,
        OpenClawTools tools
    ) {
        this.access = access;
        this.accounts = accounts;
        this.workspace = workspace;
        this.gateway = gateway;
        this.agent = agent;
        this.conversations = conversations;
        this.quota = quota;
        this.files = files;
        this.approvals = approvals;
        this.tools = tools;
    }

    @GetMapping("/page/openclaw")
    public String page(HttpServletRequest request, HttpServletResponse response, Model model) {
        response.setHeader("Cache-Control", "no-store");
        try {
            model.addAttribute("loginUser", access.require(request));
            return "page/openclaw";
        } catch (ResponseStatusException error) {
            if (
                error.getStatusCode().value() == 401
            ) return "redirect:/page/user/login?next=%2Fpage%2Fopenclaw";
            throw error;
        }
    }

    @GetMapping("/api/openclaw/bootstrap")
    @ResponseBody
    public Map<String, Object> bootstrap(HttpServletRequest request, HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-store");
        var user = access.require(request);
        return Map.of(
            "disabledAt",
            OpenClawAccess.DISABLED_AT.toEpochMilli(),
            "account",
            accounts.view(user),
            "connected",
            gateway.configured(),
            "mimo",
            gateway.mimoConfigured(),
            "token",
            workspace.token(request),
            "models",
            OpenClawModels.choices(english(request)),
            "catalog",
            OpenClawCatalog.choices(english(request)),
            "quota",
            quota.remainingText(user, english(request))
        );
    }

    @GetMapping("/api/openclaw/history")
    @ResponseBody
    public Map<String, Object> history(HttpServletRequest request, HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-store");
        return conversations.read(OpenClawIdentity.id(access.require(request)));
    }

    @PutMapping("/api/openclaw/history")
    @ResponseBody
    public Map<String, Object> saveHistory(
        @RequestBody JsonNode body,
        HttpServletRequest request,
        HttpServletResponse response
    ) throws IOException {
        response.setHeader("Cache-Control", "no-store");
        conversations.write(OpenClawIdentity.id(access.require(request)), body);
        return Map.of("saved", true);
    }

    public record ChatRequest(
        String conversationId,
        String text,
        String model,
        List<String> tools,
        Boolean reasoning,
        String language,
        List<OpenClawUploads.Upload> attachments,
        List<OpenClawContext.Message> history,
        Long resetAt
    ) {}

    static boolean english(HttpServletRequest request) {
        if (request == null) return false;
        String query = request.getParameter("lang");
        if ("en".equals(query)) return true;
        if ("zh".equals(query)) return false;
        String cookie = request.getHeader("Cookie");
        return cookie != null && cookie.matches("(?:^|.*;\\s*)club_language=en(?:\\s*;.*|$)");
    }

    static boolean english(String requested, HttpServletRequest request) {
        if ("en".equalsIgnoreCase(requested)) return true;
        if ("zh".equalsIgnoreCase(requested)) return false;
        return english(request);
    }

    @PostMapping("/api/openclaw/chat")
    public void chat(
        @RequestBody ChatRequest body,
        HttpServletRequest request,
        HttpServletResponse response
    ) throws IOException {
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("X-Accel-Buffering", "no");
        var user = access.require(request);
        boolean english = body != null && english(body.language(), request);
        if (body == null || body.conversationId() == null || body.text() == null) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                english ? "Enter a message" : "请输入要发送的内容"
            );
        }
        if (!body.conversationId().matches("[0-9a-fA-F-]{36}")) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                english ? "Invalid conversation" : "对话无效"
            );
        }
        conversations.requireCurrentReset(
            OpenClawIdentity.id(user),
            body.resetAt() == null ? 0L : body.resetAt()
        );
        String text = body.text().trim();
        if (text.isEmpty() || text.length() > 4000) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                english
                    ? "The message must be 1 to 4000 characters"
                    : "内容不能为空，且不能超过 4000 字"
            );
        }
        String modelKey =
            body.model() == null || body.model().isBlank() ? OpenClawModels.FLASH : body.model();
        String modelRef = OpenClawModels.ref(modelKey);
        boolean mimo = modelRef.startsWith("mimo/");
        if (mimo ? !gateway.mimoConfigured() : !gateway.configured()) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                english ? "503 Service Unavailable" : "503 服务暂时不可用"
            );
        }
        String combined = OpenClawUploads.merge(text, body.attachments(), english);
        OpenClawContext.messages(body.history());
        response.setBufferSize(128);
        response.setContentType("text/event-stream;charset=UTF-8");
        agent.reply(
            user,
            body.conversationId(),
            modelRef,
            body.reasoning() == null || body.reasoning(),
            combined,
            OpenClawCatalog.ids(),
            english,
            body.history(),
            request,
            response.getOutputStream()
        );
    }

    public record Decision(String id, Boolean approved) {}

    @PostMapping("/api/openclaw/approve")
    @ResponseBody
    public Map<String, Object> approve(@RequestBody Decision body, HttpServletRequest request) {
        var user = access.require(request);
        if (body == null || body.id() == null || !body.id().matches("[0-9a-fA-F-]{36}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "批准无效");
        }
        boolean ok = approvals.decide(
            OpenClawIdentity.id(user),
            body.id(),
            Boolean.TRUE.equals(body.approved())
        );
        return Map.of("ok", ok);
    }

    @PostMapping("/api/openclaw/rollback")
    @ResponseBody
    public Map<String, Object> rollback(@RequestBody JsonNode body, HttpServletRequest request) {
        var user = access.require(request);
        boolean english = english(request);
        java.util.ArrayList<JsonNode> effects = new java.util.ArrayList<>();
        if (body != null && body.path("effects").isArray()) {
            for (JsonNode effect : body.path("effects")) {
                if (effects.size() >= 24) break;
                effects.add(effect);
            }
        }
        return Map.of("results", tools.undo(user, request, effects, english));
    }

    @GetMapping("/api/openclaw/files/{id}")
    public ResponseEntity<FileSystemResource> file(
        @PathVariable String id,
        HttpServletRequest request,
        HttpServletResponse response
    ) {
        response.setHeader("Cache-Control", "no-store");
        var user = access.require(request);
        OpenClawFiles.Download download = files.load(OpenClawIdentity.id(user), id);
        if (download == null) throw new ResponseStatusException(
            HttpStatus.NOT_FOUND,
            "没有这个文件"
        );
        String encoded = URLEncoder.encode(download.name(), StandardCharsets.UTF_8).replace(
            "+",
            "%20"
        );
        MediaType type = mediaType(download.name());
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + encoded)
            .contentType(type)
            .body(new FileSystemResource(download.path()));
    }

    @DeleteMapping("/api/openclaw/files/{id}")
    @ResponseBody
    public Map<String, Object> deleteFile(@PathVariable String id, HttpServletRequest request)
        throws IOException {
        var user = access.require(request);
        workspace.mutation(request);
        if (files.load(OpenClawIdentity.id(user), id) == null) throw new ResponseStatusException(
            HttpStatus.NOT_FOUND,
            "没有这个文件"
        );
        files.remove(OpenClawIdentity.id(user), id);
        return Map.of("deleted", true);
    }

    private static MediaType mediaType(String name) {
        String lower = name == null ? "" : name.toLowerCase(java.util.Locale.ROOT);
        if (lower.endsWith(".csv")) return MediaType.parseMediaType("text/csv;charset=UTF-8");
        if (lower.endsWith(".md")) return MediaType.parseMediaType("text/markdown;charset=UTF-8");
        if (lower.endsWith(".docx")) {
            return MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            );
        }
        return MediaType.parseMediaType("text/plain;charset=UTF-8");
    }
}

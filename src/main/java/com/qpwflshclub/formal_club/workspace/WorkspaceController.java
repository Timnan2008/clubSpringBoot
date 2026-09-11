package com.qpwflshclub.formal_club.workspace;

import com.qpwflshclub.formal_club.pojo.User.*;
import com.qpwflshclub.formal_club.pojo.Club.Club;
import com.qpwflshclub.formal_club.repository.User.UserRepository;
import com.qpwflshclub.formal_club.repository.User.ClubPresidentRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/club-workspace")
@Transactional(readOnly = true)
public class WorkspaceController {
    @org.springframework.beans.factory.annotation.Autowired private ClubOperationsStore operations;
    @org.springframework.beans.factory.annotation.Autowired private com.qpwflshclub.formal_club.social.SchoolAccounts accounts;
    @org.springframework.beans.factory.annotation.Autowired private com.qpwflshclub.formal_club.social.OfficerAssignments officers;
    @org.springframework.beans.factory.annotation.Autowired private com.qpwflshclub.formal_club.repository.User.AdminRepository admins;
    private final WorkspaceAccess access;
    private final WorkspaceStore store;
    private final UserRepository students;
    private final ClubPresidentRepository presidents;
    public WorkspaceController(WorkspaceAccess access, WorkspaceStore store, UserRepository students, ClubPresidentRepository presidents) {
        this.access = access; this.store = store; this.students = students; this.presidents = presidents;
    }
    private UserBase require(int club, HttpServletRequest request, boolean write) {
        UserBase user = access.current(request); access.require(user, club);
        if (write) access.mutation(request);
        return user;
    }
    @GetMapping
    public Map<String,Object> bootstrap(HttpServletRequest request) {
        UserBase user = access.current(request);
        return Map.of("name", Objects.toString(user.getUsername(), "社团负责人"), "admin", access.admin(user),
                "account", accounts==null?Map.of("name",Objects.toString(user.getUsername(),""),"role",access.admin(user)?"admin":user instanceof Teacher?"teacher":"president"):accounts.view(user), "token", access.token(request), "clubs", access.clubs(user).stream().map(c -> Map.of("id", c.getId(), "name", Objects.toString(c.getClubName(), "社团"), "nameEn", Objects.toString(c.getClubNameEn(), ""))).toList());
    }
    @GetMapping("/{club}")
    public WorkspaceStore.Data data(@PathVariable int club, HttpServletRequest request) throws IOException { require(club, request, false); var data=store.read(club);return new WorkspaceStore.Data(data.documents().stream().map(d->new WorkspaceStore.Document(d.id(),d.name(),d.size(),d.note(),displayAuthor(d.submittedBy()),d.createdAt())).toList(),data.activities().stream().map(a->new WorkspaceStore.Activity(a.id(),a.title(),a.start(),a.end(),a.location(),a.description(),a.participants(),a.kind(),a.status(),displayAuthor(a.submittedBy()),a.createdAt(),a.reviewNote(),displayAuthor(a.reviewedBy()))).toList()); }
    private String displayAuthor(String email){if(email==null||email.isBlank()||accounts==null)return Objects.toString(email,"");var person=accounts.directory().get(com.qpwflshclub.formal_club.social.SchoolAccounts.key(email));if(person==null)return email;return org.springframework.context.i18n.LocaleContextHolder.getLocale().getLanguage().equals("en")?person.nameEn():person.name();}
    @GetMapping("/{club}/members")
    public List<Map<String,Object>> members(@PathVariable int club, HttpServletRequest request) {
        require(club, request, false);
        Map<String,Map<String,Object>> result = new LinkedHashMap<>();
        students.findAll().forEach(s -> { if (contains(s.getClubs(), club)) result.put(s.getEmail().toLowerCase(Locale.ROOT),member(s, "student", "member")); });
        presidents.findAll().forEach(p -> {
            boolean main = p.getMainClub() != null && Objects.equals(p.getMainClub().getId(), club);
            if (main || contains(p.getClubs(), club)) result.put(p.getEmail().toLowerCase(Locale.ROOT),member(p, "president", main ? (p.isVicePresident() ? "vice_president" : "president") : "member"));
        });
        if(admins!=null)admins.findAll().forEach(a -> {if(contains(a.getClubs(),club))result.put(a.getEmail().toLowerCase(Locale.ROOT),member(a,"admin","member"));});
        if(officers!=null)for(var o:officers.all())if(o.club()==club){var u=accounts.find(o.account());result.put(u.getEmail().toLowerCase(Locale.ROOT),member(u,"president",o.position()));}
        return new ArrayList<>(result.values());
    }
    private Map<String,Object> member(UserBase u, String type, String role) {
        return Map.of("id", u.getId(), "name", Objects.toString(u.getUsername(), ""), "nameEn", Objects.toString(u.getUsernameEn(), ""), "type", type, "role", role, "avatarUrl", accounts==null?"":accounts.view(u).avatarUrl(), "nickname", accounts==null?"":accounts.view(u).nickname(), "grade", accounts==null?"":accounts.view(u).grade(), "account", com.qpwflshclub.formal_club.social.SchoolAccounts.key(u.getEmail()));
    }
    private boolean contains(List<Club> clubs, int id) { return clubs != null && clubs.stream().anyMatch(c -> Objects.equals(c.getId(), id)); }
    @GetMapping("/{club}/students")
    public List<Map<String,Object>> search(@PathVariable int club, @RequestParam String keyword, HttpServletRequest request) {
        require(club, request, false);
        if (keyword.isBlank() || keyword.length() > 80) return List.of();
        String q = keyword.trim().toLowerCase(Locale.ROOT);
        List<Map<String,Object>> results = new ArrayList<>();
        students.findAll().forEach(s -> {
            if (results.size() < 20 && !contains(s.getClubs(), club) && (Objects.toString(s.getUsername(), "").toLowerCase(Locale.ROOT).contains(q) || Objects.toString(s.getUsernameEn(), "").toLowerCase(Locale.ROOT).contains(q) || (accounts!=null && accounts.view(s).nickname().toLowerCase(Locale.ROOT).contains(q)))) results.add(member(s,"student","member"));
        });
        return results;
    }
    @PostMapping("/{club}/members/{id}")
    @Transactional
    public Map<String,String> addMember(@PathVariable int club, @PathVariable long id, HttpServletRequest request) {
        UserBase actor = require(club, request, true);
        User target = students.findById(id).orElseThrow(() -> WorkspaceStore.bad("学生账号不存在"));
        List<Club> next = new ArrayList<>(target.getClubs() == null ? List.of() : target.getClubs());
        if (!contains(next, club)) next.add(access.require(actor, club));
        target.setClubs(next); students.save(target);
        return Map.of("message", "已添加社员");
    }
    @DeleteMapping("/{club}/members/{type}/{id}")
    @Transactional
    public Map<String,String> removeMember(@PathVariable int club, @PathVariable String type, @PathVariable long id, HttpServletRequest request) {
        require(club, request, true);
        if (type.equals("student")) {
            User target = students.findById(id).orElseThrow(() -> WorkspaceStore.bad("学生不存在"));
            List<Club> next = new ArrayList<>(target.getClubs() == null ? List.of() : target.getClubs());
            next.removeIf(c -> Objects.equals(c.getId(), club)); target.setClubs(next); students.save(target);
        } else if (type.equals("admin")) {
            Admin target = admins.findById(id).orElseThrow(() -> WorkspaceStore.bad("社员不存在"));
            List<Club> next = new ArrayList<>(target.getClubs() == null ? List.of() : target.getClubs());
            next.removeIf(c -> Objects.equals(c.getId(), club)); target.setClubs(next); admins.save(target);
        } else if (type.equals("president")) {
            ClubPresident target = presidents.findById(id).orElseThrow(() -> WorkspaceStore.bad("社员不存在"));
            if (target.getMainClub() != null && Objects.equals(target.getMainClub().getId(), club)) throw WorkspaceStore.bad("社长与副社长的任免由管理员处理");
            List<Club> next = new ArrayList<>(target.getClubs() == null ? List.of() : target.getClubs());
            next.removeIf(c -> Objects.equals(c.getId(), club)); target.setClubs(next); presidents.save(target);
        } else throw WorkspaceStore.bad("社员类型无效");
        return Map.of("message", "已移出社团");
    }
    @PostMapping("/{club}/documents")
    public WorkspaceStore.Document upload(@PathVariable int club, @RequestParam MultipartFile file,
                                           @RequestParam(defaultValue="") String note, HttpServletRequest request) throws IOException {
        UserBase user = require(club, request, true); return store.upload(club, file, note, user.getEmail());
    }
    @GetMapping("/{club}/documents/{id}")
    public ResponseEntity<FileSystemResource> download(@PathVariable int club, @PathVariable String id, HttpServletRequest request) throws IOException {
        require(club, request, false);
        var document = store.document(club, id);
        return ResponseEntity.ok().header("Cache-Control", "no-store").header("X-Content-Type-Options", "nosniff")
                .header("Content-Disposition", ContentDisposition.attachment().filename(document.name(), StandardCharsets.UTF_8).build().toString())
                .contentType(MediaType.APPLICATION_OCTET_STREAM).body(new FileSystemResource(store.file(club, document)));
    }
    public record ActivityInput(String title, String start, String end, String location, String description, int participants) {}
    @PostMapping("/{club}/{kind:events|applications}")
    public WorkspaceStore.Activity create(@PathVariable int club, @PathVariable String kind, @RequestBody ActivityInput input, HttpServletRequest request) throws IOException {
        UserBase user = require(club, request, true);
        String title = text(input.title(), 100, "活动名称"), location = text(input.location(), 150, "活动地点"), description = text(input.description(), 3000, "活动说明");
        LocalDateTime start, end;
        try { start = LocalDateTime.parse(input.start()); end = LocalDateTime.parse(input.end()); }
        catch (RuntimeException e) { throw WorkspaceStore.bad("请选择有效的开始和结束时间"); }
        if (!end.isAfter(start) || end.isAfter(start.plusDays(14))) throw WorkspaceStore.bad("结束时间应晚于开始时间，活动不能超过 14 天");
        if (input.participants() < (kind.equals("events")?0:1) || input.participants() > 5000) throw WorkspaceStore.bad("参与人数须为 1–5000 人");
        boolean application = kind.equals("applications");
        if (application && !start.isAfter(LocalDateTime.now(java.time.ZoneId.of("Asia/Shanghai")))) throw WorkspaceStore.bad("请申请未来的活动时间");
        return store.add(club, new WorkspaceStore.Activity(UUID.randomUUID().toString(), title, start.toString(), end.toString(), location, description, input.participants(), application ? "application" : "event", application ? "pending" : "scheduled", user.getEmail(), LocalDateTime.now(java.time.ZoneId.of("Asia/Shanghai")).toString(), "", ""));
    }
    private String text(String value, int limit, String label) {
        if (value == null || value.isBlank() || value.length() > limit) throw WorkspaceStore.bad(label + "不能为空，且不能超过 " + limit + " 字");
        return value.trim();
    }
    @DeleteMapping("/{club}/events/{id}")
    public Map<String,String> removeEvent(@PathVariable int club, @PathVariable String id, HttpServletRequest request) throws IOException {
        require(club, request, true); if(operations!=null){var records=operations.read(club);if(records.reports().stream().anyMatch(r->r.activity().equals(id))||records.attendance().stream().anyMatch(a->a.activity().equals(id)))throw WorkspaceStore.bad("该活动已有签到或反馈记录，不能删除");} store.removeEvent(club,id); return Map.of("message", "活动已删除");
    }
    public record ReviewInput(String decision, String note) {}
    @PostMapping("/{club}/applications/{id}/review")
    public WorkspaceStore.Activity review(@PathVariable int club, @PathVariable String id, @RequestBody ReviewInput input, HttpServletRequest request) throws IOException {
        UserBase actor = access.reviewer(request); access.mutation(request);
        if (!access.admin(actor)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "校园活动申请由管理员审核");
        return store.review(club, id, input.decision(), input.note(), actor.getEmail());
    }
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<?> error(ResponseStatusException error) { return ResponseEntity.status(error.getStatusCode()).body(Map.of("message", Objects.toString(error.getReason(), "请求未成功"))); }
    @ExceptionHandler(IOException.class)
    public ResponseEntity<?> storageError(IOException error) { return ResponseEntity.internalServerError().body(Map.of("message", "保存或读取失败，请稍后重试")); }
}

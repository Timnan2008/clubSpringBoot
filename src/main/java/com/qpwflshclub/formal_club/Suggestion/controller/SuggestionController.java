package com.qpwflshclub.formal_club.Suggestion.controller;

import com.qpwflshclub.formal_club.Suggestion.pojo.Suggestion;
import com.qpwflshclub.formal_club.Suggestion.pojo.dto.SuggestionDTO;
import com.qpwflshclub.formal_club.Suggestion.service.ISuggestionService;
import com.qpwflshclub.formal_club.User.pojo.Admin;
import com.qpwflshclub.formal_club.User.pojo.UserBase;
import com.qpwflshclub.formal_club.pojo.ResponseMessage;
import com.qpwflshclub.formal_club.social.service.ContentAudit;
import com.qpwflshclub.formal_club.social.service.SchoolAccounts;
import com.qpwflshclub.formal_club.workspace.service.WorkspaceAccess;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/suggestion")
public class SuggestionController {

    @Autowired
    public ISuggestionService suggestionService;

    @Autowired
    public com.qpwflshclub.formal_club.service.Suggestion.TurnstileService turnstile;

    @Autowired
    public ContentAudit audit;

    @Autowired
    public SchoolAccounts accounts;

    @Autowired
    WorkspaceAccess access;

    /** 违禁词闸门：建议正文也要过检查，命中会记一次过。 */
    @Autowired
    com.qpwflshclub.formal_club.social.service.ModerationGate moderation;

    @GetMapping("/verification")
    public Object verification() {
        return turnstile.configuration();
    }

    @PostMapping()
    @ResponseBody
    public ResponseMessage<Suggestion> addSuggestion(
        @Validated @RequestBody SuggestionDTO suggestionDTO,
        HttpServletRequest request
    ) {
        var actor = accounts.current(request);
        access.mutation(request);
        if (
            suggestionDTO.isAnonymous()
        ) throw com.qpwflshclub.formal_club.social.service.SchoolAccounts.error(
            400,
            "青源智造不支持匿名提交，请使用实名。 / Qingyuan Ideas cannot be submitted anonymously."
        );
        moderation.inspect(
            SchoolAccounts.key(actor.getEmail()),
            com.qpwflshclub.formal_club.social.service.ModerationGate.SUGGESTION,
            suggestionDTO.getTitle(),
            suggestionDTO.getContext()
        );
        suggestionDTO.setAnonymous(false);
        suggestionDTO.setName(java.util.Objects.toString(actor.getUsername(), ""));
        turnstile.verify(suggestionDTO.getTurnstileToken());
        suggestionDTO.setPass(false);
        suggestionDTO.setId(null);
        Suggestion suggestion = suggestionService.add(suggestionDTO);
        org.slf4j.LoggerFactory.getLogger(getClass()).info(
            "campus_suggestion id={} account={} anonymous={}",
            suggestion.getId(),
            com.qpwflshclub.formal_club.social.service.SchoolAccounts.key(actor.getEmail()),
            false
        );
        audit.record(
            "suggestion",
            String.valueOf(suggestion.getId()),
            com.qpwflshclub.formal_club.social.service.SchoolAccounts.key(actor.getEmail()),
            false
        );
        suggestion.setName(suggestionDTO.getName());
        suggestion.setAnonymous(false);
        suggestion.setNameEn(java.util.Objects.toString(actor.getUsernameEn(), ""));
        return ResponseMessage.success(suggestion);
    }

    @PutMapping()
    @ResponseBody
    public ResponseMessage<Suggestion> updateSuggestion(
        @Validated @RequestBody SuggestionDTO suggestionDTO,
        HttpServletRequest request
    ) {
        if (!isAdmin(request)) {
            return adminOnlyError();
        }
        com.qpwflshclub.formal_club.social.ContentModeration.check(suggestionDTO.getContext());
        Suggestion suggestion = suggestionService.update(suggestionDTO);
        return ResponseMessage.success(suggestion);
    }

    @PutMapping("/pass")
    public ResponseMessage<Suggestion> passSuggestion(
        @RequestParam Long id,
        HttpServletRequest request
    ) {
        if (!isAdmin(request)) {
            return adminOnlyError();
        }
        Suggestion suggestion = suggestionService.passSuggestion(id);
        return ResponseMessage.success(suggestion);
    }

    @DeleteMapping("/{id}")
    public ResponseMessage<Suggestion> deleteSuggestion(
        @PathVariable Long id,
        HttpServletRequest request
    ) {
        if (!isAdmin(request)) {
            return adminOnlyError();
        }
        suggestionService.delete(id);
        return ResponseMessage.success();
    }

    @GetMapping("/{suggestionTitle}")
    public ResponseMessage<Suggestion> getSuggestion(@PathVariable String suggestionTitle) {
        Suggestion suggestion = suggestionService.findByTitle(suggestionTitle);
        if (
            suggestion == null || !suggestion.isPass()
        ) throw new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.NOT_FOUND
        );
        return ResponseMessage.success(publicView(suggestion));
    }

    private Suggestion publicView(Suggestion s) {
        var v = new Suggestion();
        v.setId(s.getId());
        v.setTitle(s.getTitle());
        v.setContext(com.qpwflshclub.formal_club.social.ContentModeration.mask(s.getContext()));
        v.setAnonymous(false);
        v.setPass(s.isPass());
        v.setName(java.util.Objects.toString(s.getName(), ""));
        v.setNameEn("");
        if (audit != null && accounts != null) {
            String actor = audit.actor("suggestion", String.valueOf(s.getId()));
            var people = accounts.directory();
            var person = actor == null ? null : people.get(actor);
            if (person == null && s.getName() != null && !s.getName().isBlank()) {
                var matches = people
                    .values()
                    .stream()
                    .filter(p -> java.util.Objects.equals(p.name(), s.getName()))
                    .toList();
                if (matches.size() == 1) person = matches.getFirst();
            }
            if (person != null) {
                v.setName(person.name());
                v.setNameEn(person.nameEn());
            }
        }
        return v;
    }

    @GetMapping("/pass_only")
    public ResponseMessage<List<Suggestion>> getPassOnly() {
        return ResponseMessage.success(
            suggestionService.onlyPass().stream().map(this::publicView).toList()
        );
    }

    @GetMapping("/all")
    public ResponseMessage<List<Suggestion>> getAllSuggestion(HttpServletRequest request) {
        if (!isAdmin(request)) {
            return adminOnlyError();
        }
        return ResponseMessage.success(
            suggestionService.findAll().stream().map(this::publicView).toList()
        );
    }

    private boolean isAdmin(HttpServletRequest request) {
        UserBase currentUser = (UserBase) request.getAttribute("currentUser");
        // 老师(userRight=2)及以上拥有审核/管理意见的权限
        return (
            currentUser instanceof Admin || (currentUser != null && currentUser.getUserRight() >= 2)
        );
    }

    private <T> ResponseMessage<T> adminOnlyError() {
        return ResponseMessage.error("无权限：只有老师或管理员可以审核建议");
    }
}

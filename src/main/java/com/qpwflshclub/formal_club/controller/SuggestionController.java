package com.qpwflshclub.formal_club.controller;

import com.qpwflshclub.formal_club.pojo.ResponseMessage;
import com.qpwflshclub.formal_club.pojo.Suggestion.Suggestion;
import com.qpwflshclub.formal_club.pojo.User.Admin;
import com.qpwflshclub.formal_club.pojo.User.UserBase;
import com.qpwflshclub.formal_club.pojo.dto.Suggestion.SuggestionDTO;
import com.qpwflshclub.formal_club.service.Suggestion.ISuggestionService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/suggestion")
public class SuggestionController {

    @Autowired
    ISuggestionService suggestionService;

    @PostMapping()
    @ResponseBody
    public ResponseMessage<Suggestion> addSuggestion(@Validated @RequestBody SuggestionDTO suggestionDTO) {
        Suggestion suggestion = suggestionService.add(suggestionDTO);
        return ResponseMessage.success(suggestion);
    }

    @PutMapping()
    @ResponseBody
    public ResponseMessage<Suggestion> updateSuggestion(@Validated @RequestBody SuggestionDTO suggestionDTO,
                                                        HttpServletRequest request) {
        if (!isAdmin(request)) {
            return adminOnlyError();
        }
        Suggestion suggestion = suggestionService.update(suggestionDTO);
        return ResponseMessage.success(suggestion);
    }

    @PutMapping("/pass")
    public ResponseMessage<Suggestion> passSuggestion(@RequestParam Long id, HttpServletRequest request){
        if (!isAdmin(request)) {
            return adminOnlyError();
        }
        Suggestion suggestion = suggestionService.passSuggestion(id);
        return ResponseMessage.success(suggestion);
    }

    @DeleteMapping("/{id}")
    public ResponseMessage<Suggestion> deleteSuggestion(@PathVariable Long id, HttpServletRequest request) {
        if (!isAdmin(request)) {
            return adminOnlyError();
        }
        suggestionService.delete(id);
        return ResponseMessage.success();
    }


    @GetMapping("/{suggestion-title}")
    public ResponseMessage<Suggestion> getSuggestion(@PathVariable String suggestionTitle) {
        Suggestion suggestion = suggestionService.findByTitle(suggestionTitle);
        return ResponseMessage.success(suggestion);
    }

    @GetMapping("/pass_only")
    public ResponseMessage<List<Suggestion>> getPassOnly(){
        List<Suggestion> suggestions = suggestionService.onlyPass();
        return ResponseMessage.success(suggestions);
    }

    @GetMapping("/all")
    public ResponseMessage<List<Suggestion>> getAllSuggestion(HttpServletRequest request) {
        if (!isAdmin(request)) {
            return adminOnlyError();
        }
        List<Suggestion> suggestions = suggestionService.findAll();
        return ResponseMessage.success(suggestions);
    }

    private boolean isAdmin(HttpServletRequest request) {
        UserBase currentUser = (UserBase) request.getAttribute("currentUser");
        // 老师(userRight=2)及以上拥有审核/管理意见的权限
        return currentUser instanceof Admin || (currentUser != null && currentUser.getUserRight() >= 2);
    }

    private <T> ResponseMessage<T> adminOnlyError() {
        return ResponseMessage.error("无权限：只有老师或管理员可以审核建议");
    }
}

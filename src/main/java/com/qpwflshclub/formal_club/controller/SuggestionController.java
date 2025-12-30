package com.qpwflshclub.formal_club.controller;

import com.qpwflshclub.formal_club.pojo.ResponseMessage;
import com.qpwflshclub.formal_club.pojo.Suggestion.Suggestion;
import com.qpwflshclub.formal_club.pojo.dto.Suggestion.SuggestionDTO;
import com.qpwflshclub.formal_club.repository.Suggestion.SuggestionRepository;
import com.qpwflshclub.formal_club.service.Suggestion.ISuggestionService;
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
    public ResponseMessage<Suggestion> updateSuggestion(@Validated @RequestBody SuggestionDTO suggestionDTO) {
        Suggestion suggestion = suggestionService.update(suggestionDTO);
        return ResponseMessage.success(suggestion);
    }

    @DeleteMapping("/{id}")
    public ResponseMessage<Suggestion> deleteSuggestion(@PathVariable Long id) {
        suggestionService.delete(id);
        return ResponseMessage.success();
    }

    @GetMapping("/{suggestion-title}")
    public ResponseMessage<Suggestion> getSuggestion(@PathVariable String suggestionTitle) {
        Suggestion suggestion = suggestionService.findByTitle(suggestionTitle);
        return ResponseMessage.success(suggestion);
    }

    @GetMapping("/all")
    public ResponseMessage<List<Suggestion>> getAllSuggestion() {
        List<Suggestion> suggestions = suggestionService.findAll();
        return ResponseMessage.success(suggestions);
    }
}

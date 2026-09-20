package com.qpwflshclub.formal_club.Suggestion.service;

import com.qpwflshclub.formal_club.Suggestion.pojo.Suggestion;
import com.qpwflshclub.formal_club.Suggestion.pojo.dto.SuggestionDTO;
import java.util.List;

public interface ISuggestionService {
    Suggestion add(SuggestionDTO suggestionDTO);

    Suggestion update(SuggestionDTO suggestionDTO);

    void delete(Long ID);

    List<Suggestion> findAll();
    Suggestion findById(Long ID);
    Suggestion findByTitle(String name);

    List<Suggestion> onlyPass();

    Suggestion passSuggestion(Long id);
}

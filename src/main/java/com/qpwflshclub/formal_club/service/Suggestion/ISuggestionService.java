package com.qpwflshclub.formal_club.service.Suggestion;

import com.qpwflshclub.formal_club.pojo.Suggestion.Suggestion;
import com.qpwflshclub.formal_club.pojo.dto.Suggestion.SuggestionDTO;

import java.util.List;

public interface ISuggestionService {
    Suggestion add(SuggestionDTO suggestionDTO);

    Suggestion update(SuggestionDTO suggestionDTO);

    void delete(Long ID);

    List<Suggestion> findAll();
    Suggestion findById(Long ID);
    Suggestion findByTitle(String name);
}

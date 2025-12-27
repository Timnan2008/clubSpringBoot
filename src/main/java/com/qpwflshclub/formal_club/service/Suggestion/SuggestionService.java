package com.qpwflshclub.formal_club.service.Suggestion;

import com.qpwflshclub.formal_club.pojo.Suggestion.Suggestion;
import com.qpwflshclub.formal_club.pojo.dto.Suggestion.SuggestionDTO;
import com.qpwflshclub.formal_club.repository.Suggestion.SuggestionRepository;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

public class SuggestionService implements ISuggestionService{

    @Autowired
    private SuggestionRepository suggestionRepository;

    @Override
    public Suggestion add(SuggestionDTO suggestionDTO) {
        Suggestion suggestion = new Suggestion();
        BeanUtils.copyProperties(suggestionDTO, suggestion);
        return suggestionRepository.save(suggestion);
    }

    @Override
    public Suggestion update(SuggestionDTO suggestionDTO) {
        Suggestion suggestion = suggestionRepository.findById(suggestionDTO.getId()).get();
        BeanUtils.copyProperties(suggestionDTO, suggestion);
        return suggestionRepository.save(suggestion);
    }

    @Override
    public void delete(Long ID) {
        Suggestion suggestion = suggestionRepository.findById(ID).get();
        suggestionRepository.delete(suggestion);
    }

    @Override
    public List<Suggestion> findAll() {
        return (List<Suggestion>) suggestionRepository.findAll();
    }

    @Override
    public Suggestion findById(Long ID) {
        return suggestionRepository.findById(ID).get();
    }

    @Override
    public Suggestion findByTitle(String name) {
        return suggestionRepository.findByTitle(name).orElseThrow(() -> {
            throw new RuntimeException("未找到该意见");
        });
    }
}

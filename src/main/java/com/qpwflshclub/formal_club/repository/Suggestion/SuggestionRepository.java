package com.qpwflshclub.formal_club.repository.Suggestion;

import com.qpwflshclub.formal_club.pojo.Suggestion.Suggestion;
import org.springframework.data.repository.CrudRepository;

import java.util.Optional;

public interface SuggestionRepository extends CrudRepository<Suggestion, Long> {
    Optional<Suggestion> findByTitle(String title);
}

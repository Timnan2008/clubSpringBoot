package com.qpwflshclub.formal_club.controller;

import com.qpwflshclub.formal_club.pojo.ResponseMessage;
import com.qpwflshclub.formal_club.pojo.Suggestion.Suggestion;
import com.qpwflshclub.formal_club.pojo.User.Admin;
import com.qpwflshclub.formal_club.pojo.User.Teacher;
import com.qpwflshclub.formal_club.service.Suggestion.ISuggestionService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SuggestionControllerTest {

    @Mock
    ISuggestionService suggestionService;

    @Mock
    HttpServletRequest request;

    SuggestionController controller;

    @BeforeEach
    void setUp() {
        controller = new SuggestionController();
        controller.suggestionService = suggestionService;
    }

    @Test
    void passSuggestionRejectsNonAdmin() {
        when(request.getAttribute("currentUser")).thenReturn(new Teacher());

        ResponseMessage<Suggestion> response = controller.passSuggestion(1L, request);

        assertThat(response.getCode()).isEqualTo(400);
        assertThat(response.getMessage()).isEqualTo("无权限：只有管理员可以管理建议");
        verify(suggestionService, never()).passSuggestion(1L);
    }

    @Test
    void passSuggestionAllowsAdmin() {
        Suggestion suggestion = new Suggestion();
        when(request.getAttribute("currentUser")).thenReturn(new Admin());
        when(suggestionService.passSuggestion(1L)).thenReturn(suggestion);

        ResponseMessage<Suggestion> response = controller.passSuggestion(1L, request);

        assertThat(response.getCode()).isEqualTo(200);
        assertThat(response.getData()).isSameAs(suggestion);
        verify(suggestionService).passSuggestion(1L);
    }

    @Test
    void deleteSuggestionRejectsNonAdmin() {
        when(request.getAttribute("currentUser")).thenReturn(new Teacher());

        ResponseMessage<Suggestion> response = controller.deleteSuggestion(1L, request);

        assertThat(response.getCode()).isEqualTo(400);
        assertThat(response.getMessage()).isEqualTo("无权限：只有管理员可以管理建议");
        verify(suggestionService, never()).delete(1L);
    }
}

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
        controller.accounts=org.mockito.Mockito.mock(com.qpwflshclub.formal_club.social.SchoolAccounts.class);
        controller.access=org.mockito.Mockito.mock(com.qpwflshclub.formal_club.workspace.WorkspaceAccess.class);
        controller.audit=org.mockito.Mockito.mock(com.qpwflshclub.formal_club.social.ContentAudit.class);
        var actor=new com.qpwflshclub.formal_club.pojo.User.User();actor.setEmail("fixture@example.com");actor.setUsername("测试同学");
        org.mockito.Mockito.lenient().when(controller.accounts.current(request)).thenReturn(actor);

    }

    @Test
    void passSuggestionRejectsStudent() {
        when(request.getAttribute("currentUser")).thenReturn(new com.qpwflshclub.formal_club.pojo.User.User());

        ResponseMessage<Suggestion> response = controller.passSuggestion(1L, request);

        assertThat(response.getCode()).isEqualTo(400);
        assertThat(response.getMessage()).isEqualTo("无权限：只有老师或管理员可以审核建议");
        verify(suggestionService, never()).passSuggestion(1L);
    }

    @Test void teachersCanReviewSuggestions(){when(request.getAttribute("currentUser")).thenReturn(new Teacher());assertThat(controller.passSuggestion(1L,request).getCode()).isEqualTo(200);verify(suggestionService).passSuggestion(1L);}
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
    void deleteSuggestionRejectsStudent() {
        when(request.getAttribute("currentUser")).thenReturn(new com.qpwflshclub.formal_club.pojo.User.User());

        ResponseMessage<Suggestion> response = controller.deleteSuggestion(1L, request);

        assertThat(response.getCode()).isEqualTo(400);
        assertThat(response.getMessage()).isEqualTo("无权限：只有老师或管理员可以审核建议");
        verify(suggestionService, never()).delete(1L);
    }

    @Test void invalidVerificationCannotSaveSuggestion(){
        controller.turnstile=org.mockito.Mockito.mock(com.qpwflshclub.formal_club.service.Suggestion.TurnstileService.class);
        var dto=new com.qpwflshclub.formal_club.pojo.dto.Suggestion.SuggestionDTO();dto.setTurnstileToken("expired");
        org.mockito.Mockito.doThrow(new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST)).when(controller.turnstile).verify("expired");
        org.assertj.core.api.Assertions.assertThatThrownBy(()->controller.addSuggestion(dto,request)).hasMessageContaining("400");org.mockito.Mockito.verifyNoInteractions(suggestionService);
    }
    @Test void successfulVerificationStillCannotAutoApprove(){
        controller.turnstile=org.mockito.Mockito.mock(com.qpwflshclub.formal_club.service.Suggestion.TurnstileService.class);
        var dto=new com.qpwflshclub.formal_club.pojo.dto.Suggestion.SuggestionDTO();dto.setTurnstileToken("valid");dto.setPass(true);dto.setId(8L);org.mockito.Mockito.when(suggestionService.add(dto)).thenReturn(new Suggestion());controller.addSuggestion(dto,request);
        verify(controller.turnstile).verify("valid");assertThat(dto.isPass()).isFalse();assertThat(dto.getId()).isNull();verify(suggestionService).add(dto);
    }
 @org.junit.jupiter.api.Test void publicTitleCannotExposePendingOrAnonymousIdentity(){
  var service=org.mockito.Mockito.mock(com.qpwflshclub.formal_club.service.Suggestion.ISuggestionService.class);var c=new SuggestionController();c.suggestionService=service;var suggestion=new com.qpwflshclub.formal_club.pojo.Suggestion.Suggestion();suggestion.setName("Private name");suggestion.setAnonymous(true);org.mockito.Mockito.when(service.findByTitle("other")).thenReturn(suggestion);
  org.assertj.core.api.Assertions.assertThatThrownBy(()->c.getSuggestion("other")).hasMessageContaining("404");suggestion.setPass(true);var view=c.getSuggestion("other").getData();org.assertj.core.api.Assertions.assertThat(view.getName()).isEmpty();org.assertj.core.api.Assertions.assertThat(suggestion.getName()).isEqualTo("Private name");
 }
}

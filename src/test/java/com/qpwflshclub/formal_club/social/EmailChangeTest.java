package com.qpwflshclub.formal_club.social;
import com.qpwflshclub.formal_club.config.*;
import com.qpwflshclub.formal_club.controller.UserController;
import com.qpwflshclub.formal_club.pojo.User.User;
import com.qpwflshclub.formal_club.pojo.dto.User.LoginDTO;
import com.qpwflshclub.formal_club.service.User.IUserService;
import com.qpwflshclub.formal_club.service.Suggestion.MailService;
import com.qpwflshclub.formal_club.workspace.WorkspaceAccess;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.*;
import org.springframework.test.util.ReflectionTestUtils;
import java.nio.file.Path;
import java.time.Instant;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

class EmailChangeTest {
 @TempDir Path dir;IUserService users;SchoolAccounts accounts;WorkspaceAccess access;MailService mail;RememberMeService remember;LoginEmails emails;EmailChangeController controller;MockHttpServletRequest request;User user;
 @BeforeEach void setup()throws Exception{
  users=mock(IUserService.class);accounts=mock(SchoolAccounts.class);access=mock(WorkspaceAccess.class);mail=mock(MailService.class);remember=mock(RememberMeService.class);
  user=new User();user.setEmail("old@example.com");user.setPassword("test-password");when(users.findByEmail(user.getEmail())).thenReturn(user);
  emails=new LoginEmails(dir.resolve("emails.json").toString(),users);controller=new EmailChangeController(accounts,access,emails,mail,remember);request=new MockHttpServletRequest();request.getSession().setAttribute("authenticatedEmail",user.getEmail());when(accounts.current(request)).thenReturn(user);
 }
 EmailChangeController.Challenge send(){controller.send(new EmailChangeController.Input("new@example.com","test-password"),request);return (EmailChangeController.Challenge)request.getSession().getAttribute("emailChangeChallenge");}
 @Test void verifiedChangePersistsAndKeepsEncryptedIdentityAndNewLogin()throws Exception{
  String id=SchoolAccounts.key(user.getEmail());var challenge=send();assertThat(challenge.code()).matches("[0-9]{6}");verify(mail).sendCode(any(),anyInt(),any(),any(),eq("new@example.com"),eq(challenge.code()));
  controller.confirm(new EmailChangeController.Verify("new@example.com",challenge.code()),request,new MockHttpServletResponse());
  var reopened=new LoginEmails(dir.resolve("emails.json").toString(),users);assertThat(reopened.resolve("NEW@example.com")).isEqualTo("old@example.com");assertThat(reopened.resolve("old@example.com")).isNull();assertThat(reopened.display(user.getEmail())).isEqualTo("new@example.com");assertThat(SchoolAccounts.key(user.getEmail())).isEqualTo(id);assertThat(request.getSession().getAttribute("emailChangeChallenge")).isNull();verify(remember).revoke(eq(request),any());
  var login=new UserController();ReflectionTestUtils.setField(login,"userService",users);ReflectionTestUtils.setField(login,"loginEmails",reopened);var dto=new LoginDTO();dto.setEmail("new@example.com");dto.setPassword("test-password");var r=new MockHttpServletRequest();login.login(dto,new MockHttpServletResponse(),r);assertThat(r.getSession().getAttribute("authenticatedEmail")).isEqualTo("old@example.com");dto.setEmail("old@example.com");r=new MockHttpServletRequest();login.login(dto,new MockHttpServletResponse(),r);assertThat(r.getSession(false)).isNull();
  assertThatThrownBy(()->controller.confirm(new EmailChangeController.Verify("new@example.com",challenge.code()),request,new MockHttpServletResponse())).hasMessageContaining("先发送");
 }
 @Test void passwordCooldownAndOtherSessionAreEnforced(){
  assertThatThrownBy(()->controller.send(new EmailChangeController.Input("new@example.com","bad"),request)).hasMessageContaining("403");verifyNoInteractions(mail);
  var c=send();assertThatThrownBy(()->send()).hasMessageContaining("429");
  var another=new MockHttpServletRequest();when(accounts.current(another)).thenReturn(user);assertThatThrownBy(()->controller.confirm(new EmailChangeController.Verify(c.email(),c.code()),another,new MockHttpServletResponse())).hasMessageContaining("先发送");
 }
 @Test void wrongTargetAttemptsAndExpiryAreRejected(){
  var c=send();for(int i=0;i<5;i++)assertThatThrownBy(()->controller.confirm(new EmailChangeController.Verify("different@example.com",c.code()),request,new MockHttpServletResponse())).hasMessageContaining("不正确");assertThatThrownBy(()->controller.confirm(new EmailChangeController.Verify(c.email(),c.code()),request,new MockHttpServletResponse())).hasMessageContaining("失效");
  request.getSession().setAttribute("emailChangeChallenge",new EmailChangeController.Challenge(c.canonical(),c.email(),c.code(),Instant.now().getEpochSecond()-1,0,user.getPassword()));assertThatThrownBy(()->controller.confirm(new EmailChangeController.Verify(c.email(),c.code()),request,new MockHttpServletResponse())).hasMessageContaining("失效");assertThat(emails.resolve("old@example.com")).isEqualTo("old@example.com");
 }
 @Test void collisionRecheckedAfterCodeAndMailFailureCannotChangeAddress()throws Exception{
  var c=send();when(users.findByEmail("new@example.com")).thenReturn(new User());assertThatThrownBy(()->controller.confirm(new EmailChangeController.Verify(c.email(),c.code()),request,new MockHttpServletResponse())).hasMessageContaining("409");assertThat(emails.display(user.getEmail())).isEqualTo("old@example.com");
 }
 @Test void failedDeliveryDoesNotIssueCode(){
  doThrow(new IllegalStateException("SMTP offline")).when(mail).sendCode(any(),anyInt(),any(),any(),any(),any());assertThatThrownBy(()->send()).hasMessageContaining("503");assertThat(request.getSession().getAttribute("emailChangeChallenge")).isNull();
 }
 @Test void changedEmailCannotBeRegisteredAgain()throws Exception{
  emails.change("old@example.com","new@example.com");assertThatThrownBy(()->emails.requireAvailable("new@example.com")).hasMessageContaining("409");assertThatThrownBy(()->emails.requireAvailable("old@example.com")).hasMessageContaining("409");
 }
}

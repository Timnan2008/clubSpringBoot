package com.qpwflshclub.formal_club.config;
import com.qpwflshclub.formal_club.pojo.User.User;
import com.qpwflshclub.formal_club.service.User.IUserService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.*;
import java.nio.file.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
class RememberMeTest {
 @TempDir Path dir;
 User user(){var u=new User();u.setEmail("preview@example.com");u.setPassword("password-hash");return u;}
 @Test void opaqueCookieRestoresSessionAcrossServiceRestart()throws Exception{var users=mock(IUserService.class);var user=user();when(users.findByEmail(user.getEmail())).thenReturn(user);var service=new RememberMeService(dir.toString(),users);var req=new MockHttpServletRequest();req.setSecure(true);var res=new MockHttpServletResponse();service.issue(user,req,res);Cookie token=res.getCookies()[res.getCookies().length-1];assertThat(token.getMaxAge()).isEqualTo(2592000);assertThat(token.isHttpOnly()).isTrue();assertThat(token.getSecure()).isTrue();assertThat(token.getAttribute("SameSite")).isEqualTo("Lax");try(var files=Files.list(dir)){String saved=Files.readString(files.findFirst().orElseThrow());assertThat(saved).doesNotContain(token.getValue()).doesNotContain(user.getPassword());}var fresh=new MockHttpServletRequest();fresh.setCookies(token);new RememberMeService(dir.toString(),users).restore(fresh,new MockHttpServletResponse());assertThat(fresh.getSession(false).getAttribute("authenticatedEmail")).isEqualTo(user.getEmail());}
 @Test void logoutRevokesToken(){var users=mock(IUserService.class);var service=new RememberMeService(dir.toString(),users);var res=new MockHttpServletResponse();service.issue(user(),new MockHttpServletRequest(),res);var req=new MockHttpServletRequest();req.setCookies(res.getCookies()[res.getCookies().length-1]);service.revoke(req,new MockHttpServletResponse());service.restore(req,new MockHttpServletResponse());assertThat(req.getSession(false)).isNull();verifyNoInteractions(users);}
 @Test void passwordChangeInvalidatesRememberedLogin(){var users=mock(IUserService.class);var u=user();when(users.findByEmail(u.getEmail())).thenReturn(u);var service=new RememberMeService(dir.toString(),users);var res=new MockHttpServletResponse();service.issue(u,new MockHttpServletRequest(),res);u.setPassword("changed-password");var req=new MockHttpServletRequest();req.setCookies(res.getCookies()[res.getCookies().length-1]);service.restore(req,new MockHttpServletResponse());assertThat(req.getSession(false)).isNull();}
 @Test void expiredOrForgedTokensCannotLogIn()throws Exception{var users=mock(IUserService.class);var service=new RememberMeService(dir.toString(),users);var res=new MockHttpServletResponse();service.issue(user(),new MockHttpServletRequest(),res);try(var files=Files.list(dir)){Path file=files.findFirst().orElseThrow();Files.writeString(file,Files.readString(file).replaceAll("\"expires\":\\d+","\"expires\":1"));}var req=new MockHttpServletRequest();req.setCookies(res.getCookies()[res.getCookies().length-1]);service.restore(req,new MockHttpServletResponse());assertThat(req.getSession(false)).isNull();req.setCookies(new Cookie("club_remember","a".repeat(64)),new Cookie("user_session","leader@example.com"));service.restore(req,new MockHttpServletResponse());assertThat(req.getSession(false)).isNull();verifyNoInteractions(users);}
}

package com.qpwflshclub.formal_club.config;

import com.qpwflshclub.formal_club.controller.*;
import com.qpwflshclub.formal_club.pojo.User.*;
import com.qpwflshclub.formal_club.pojo.Club.Club;
import com.qpwflshclub.formal_club.repository.Club.ClubRepository;
import com.qpwflshclub.formal_club.service.User.IUserService;
import com.qpwflshclub.formal_club.workspace.WorkspaceAccess;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.ui.ExtendedModelMap;
import jakarta.servlet.http.Cookie;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ClubExperienceTest {
 @Test void homepageUsesVerifiedSessionAndIgnoresEmailCookie() {
  var advice=new GlobalPageControllerAdvice();var users=mock(IUserService.class);ReflectionTestUtils.setField(advice,"userService",users);
  var r=new MockHttpServletRequest();r.setCookies(new Cookie("user_session","forged@example.com"));var model=new ExtendedModelMap();advice.addGlobalAttributes(r,model);assertThat(model).doesNotContainKey("loginUser");verifyNoInteractions(users);
  var user=new User();when(users.findByEmail("real@example.com")).thenReturn(user);r.getSession().setAttribute("authenticatedEmail","real@example.com");advice.addGlobalAttributes(r,model);assertThat(model.get("loginUser")).isSameAs(user);
 }
 @Test void roleAndClubScopeApplyToBothOfficers() {
  var users=mock(IUserService.class);var clubs=mock(ClubRepository.class);var a=new WorkspaceAccess(users,clubs);var r=new MockHttpServletRequest();r.getSession().setAttribute("authenticatedEmail","x@example.com");
  for(UserBase denied:List.of(new User())){when(users.findByEmail("x@example.com")).thenReturn(denied);assertThatThrownBy(()->a.current(r)).hasMessageContaining("403");assertThat(a.clubs(denied)).isEmpty();}
  var club=new Club();club.setId(4);var unrelated=new Club();unrelated.setId(5);
  var teacher=new Teacher();teacher.setClubs(List.of(club));when(users.findByEmail("x@example.com")).thenReturn(teacher);assertThat(a.require(a.current(r),4)).isSameAs(club);assertThatThrownBy(()->a.require(teacher,5)).hasMessageContaining("403");
  for(boolean vice:List.of(false,true)){var p=new ClubPresident();p.setMainClub(club);p.setVicePresident(vice);p.setClubs(List.of(club,unrelated));when(users.findByEmail("x@example.com")).thenReturn(p);assertThat(a.require(a.current(r),4)).isSameAs(club);assertThatThrownBy(()->a.require(p,5)).hasMessageContaining("403");}
 }
 @Test void namesAcceptEitherScriptButMustBePresent(){for(String name:List.of("Jason","张三","张三 Smith","John123"))RegistrationNames.validate(name,name);assertThatThrownBy(()->RegistrationNames.validate("","" )).hasMessageContaining("400");}
 @Test void legacyLinksResolveToOneDetailRouteAndLoginRedirectsHome() {
  var page=new PageController();var clubs=mock(ClubRepository.class);var users=mock(IUserService.class);ReflectionTestUtils.setField(page,"clubRepository",clubs);ReflectionTestUtils.setField(page,"userService",users);
  var c=new Club();c.setId(7);c.setClubName("舞蹈社");c.setClubNameEn("Dance Club");when(clubs.findAll()).thenReturn(List.of(c));when(clubs.existsById(7)).thenReturn(true);
  assertThat(page.clubPage("Dance+Club",new ExtendedModelMap())).isEqualTo("redirect:/page/clubs/7");assertThat(page.clubPage("舞蹈社",new ExtendedModelMap())).isEqualTo("redirect:/page/clubs/7");var model=new ExtendedModelMap();assertThat(page.clubDetail(7,model)).isEqualTo("page/club-catalog");assertThat(model.get("clubId")).isEqualTo(7);assertThatThrownBy(()->page.clubDetail(999,model)).hasMessageContaining("404");
  var r=new MockHttpServletRequest();r.getSession().setAttribute("authenticatedEmail","test@example.com");when(users.findByEmail("test@example.com")).thenReturn(new User());assertThat(page.loginPage(model,r)).isEqualTo("redirect:/");
 }
 @Test void saltedPasswordWorksWithoutAcceptingHashAsPassword() throws Exception {
  byte[] salt=new byte[16];Arrays.fill(salt,(byte)7);var spec=new javax.crypto.spec.PBEKeySpec("Correct!Password".toCharArray(),salt,600000,256);
  String hash="pbkdf2-sha256$600000$"+Base64.getEncoder().encodeToString(salt)+"$"+Base64.getEncoder().encodeToString(javax.crypto.SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded());
  assertThat(PasswordCodec.matches(hash,"Correct!Password")).isTrue();assertThat(PasswordCodec.matches(hash,hash)).isFalse();assertThat(PasswordCodec.matches(hash,"wrong")).isFalse();assertThat(PasswordCodec.matches("legacy","legacy")).isTrue();assertThat(PasswordCodec.matches("pbkdf2-sha256$oops","anything")).isFalse();
  var p=new ClubPresident();p.setPassword(hash);assertThat(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(p)).doesNotContain(hash);
 }
}

package com.qpwflshclub.formal_club.social;
import org.junit.jupiter.api.*;import org.junit.jupiter.api.io.TempDir;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qpwflshclub.formal_club.pojo.User.*;import com.qpwflshclub.formal_club.pojo.Club.Club;
import com.qpwflshclub.formal_club.repository.Club.ClubRepository;import com.qpwflshclub.formal_club.service.User.IUserService;
import com.qpwflshclub.formal_club.workspace.WorkspaceAccess;
import org.springframework.test.util.ReflectionTestUtils;
import java.nio.file.Path;import java.util.*;
import static org.assertj.core.api.Assertions.*;import static org.mockito.Mockito.*;
class OfficerViewsTest{
 @TempDir Path dir;
 @Test void viewCountsPersistAndDeduplicateAcrossRefreshesFor24Hours()throws Exception{var s=new PostViews(new ObjectMapper(),dir.toString());long now=1700000000000L;assertThat(s.count("post")).isZero();assertThat(s.record(List.of("post","post"),"readerA",now)).containsEntry("post",1L);assertThat(s.record(List.of("post"),"readerA",now+1000)).containsEntry("post",1L);assertThat(s.record(List.of("post"),"readerB",now+1000)).containsEntry("post",2L);var loaded=new PostViews(new ObjectMapper(),dir.toString());assertThat(loaded.count("post")).isEqualTo(2);assertThat(loaded.record(List.of("post"),"readerA",now+86400000)).containsEntry("post",3L);}
 @Test void secondaryOfficePreservesPrimaryClubAndScopesVicePermissions()throws Exception{var s=new OfficerAssignments(new ObjectMapper(),dir.toString());var p=new ClubPresident();p.setEmail("li@example.com");var robotics=new Club();robotics.setId(28);var code=new Club();code.setId(1);p.setMainClub(robotics);p.setVicePresident(false);s.assign(SchoolAccounts.key(p.getEmail()),1,"vice_president");s.assign(SchoolAccounts.key(p.getEmail()),1,"vice_president");assertThat(new OfficerAssignments(new ObjectMapper(),dir.toString()).all()).hasSize(1);var repo=mock(ClubRepository.class);when(repo.findById(1)).thenReturn(Optional.of(code));var access=new WorkspaceAccess(mock(IUserService.class),repo);ReflectionTestUtils.setField(access,"officers",s);assertThat(access.clubs(p)).containsExactly(robotics,code);assertThat(access.vice(p,1)).isTrue();assertThat(access.vice(p,28)).isFalse();assertThatThrownBy(()->access.require(p,99)).hasMessageContaining("403");assertThat(p.getMainClub()).isSameAs(robotics);s.remove(SchoolAccounts.key(p.getEmail()),1);assertThat(access.clubs(p)).containsExactly(robotics);}
 @Test void placeholderHiddenUntilRealNameIsSet(){var p=new ClubPresident();for(var name:List.of("编程社社长","编程社社长 1","编程社社长 2","编程社副社长","Club 001 President")){p.setUsername(name);assertThat(OfficerAssignments.named(p)).isFalse();}p.setUsername("常云峰");assertThat(OfficerAssignments.named(p)).isTrue();}
}

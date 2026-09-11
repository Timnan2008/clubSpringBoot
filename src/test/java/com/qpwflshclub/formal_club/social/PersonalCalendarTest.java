package com.qpwflshclub.formal_club.social;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qpwflshclub.formal_club.pojo.User.User;
import com.qpwflshclub.formal_club.pojo.Club.Club;
import com.qpwflshclub.formal_club.workspace.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockHttpServletRequest;
import java.nio.file.Path;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
class PersonalCalendarTest {
 @TempDir Path root;
 String a=SchoolAccounts.key("a@example.com"),b=SchoolAccounts.key("b@example.com");
 PersonalCalendarStore store;SchoolAccounts accounts;WorkspaceAccess access;CommunityController community;WorkspaceStore workspace;PersonalCalendarController controller;MockHttpServletRequest request;User user;
 PersonalCalendarStore.Entry input(){return new PersonalCalendarStore.Entry(null,"Math homework","2026-09-21T18:00","2026-09-21T19:00","homework","Chapter 3","",15,false);}
 @BeforeEach void setup(){store=new PersonalCalendarStore(new ObjectMapper(),root.toString());accounts=mock(SchoolAccounts.class);access=mock(WorkspaceAccess.class);community=mock(CommunityController.class);workspace=mock(WorkspaceStore.class);controller=new PersonalCalendarController(accounts,access,community,workspace,store);request=new MockHttpServletRequest();user=new User();user.setEmail("a@example.com");when(accounts.current(request)).thenReturn(user);when(accounts.view(user)).thenReturn(new SchoolAccounts.Account(a,"A","A","student"));when(access.token(request)).thenReturn("token");when(community.memberClubs(user)).thenReturn(List.of());}
 @Test void privateEntriesPersistAndCannotBeEditedByAnotherAccount()throws Exception{var e=store.save(a,null,input());assertThat(new PersonalCalendarStore(new ObjectMapper(),root.toString()).read(a)).containsExactly(e);assertThat(store.read(b)).isEmpty();assertThatThrownBy(()->store.save(b,e.id(),input())).hasMessageContaining("404");assertThatThrownBy(()->store.delete(b,e.id())).hasMessageContaining("404");store.delete(a,e.id());assertThat(store.read(a)).isEmpty();}
 @Test void validationRejectsReversedDatesUnknownKindAndReminder(){var good=input();assertThatThrownBy(()->store.save(a,null,new PersonalCalendarStore.Entry(null,"X",good.end(),good.start(),"memo","","",15,false))).hasMessageContaining("400");assertThatThrownBy(()->store.save(a,null,new PersonalCalendarStore.Entry(null,"X",good.start(),good.end(),"club","","",15,false))).hasMessageContaining("400");assertThatThrownBy(()->store.save(a,null,new PersonalCalendarStore.Entry(null,"X",good.start(),good.end(),"memo","","",999,false))).hasMessageContaining("400");}
 @Test void aggregatesOnlyMembershipAndPublishedEventsAndPreservesPersonalCompletion()throws Exception{Club club=new Club();club.setId(1);club.setClubName("Coding");club.setClubNameEn("Coding");when(community.memberClubs(user)).thenReturn(List.of(club));var accepted=new WorkspaceStore.Activity("one","Coding","2026-09-22T12:00","2026-09-22T12:40","A215","",0,"event","scheduled","","","","");var pending=new WorkspaceStore.Activity("two","Private draft","2026-09-22T13:00","2026-09-22T14:00","","",0,"application","pending","","","","");when(workspace.read(1)).thenReturn(new WorkspaceStore.Data(List.of(),List.of(accepted,pending)));var e=store.save(a,null,input());store.save(a,e.id(),new PersonalCalendarStore.Entry(e.id(),e.title(),e.start(),e.end(),e.kind(),e.description(),e.location(),15,true));Map<?,?> result=(Map<?,?>)controller.calendar("2026-09-21","2026-09-28",request);List<?> events=(List<?>)result.get("events");assertThat(events).hasSize(2);assertThat(events.toString()).contains("Coding","completed=true").doesNotContain("Private draft");when(community.memberClubs(user)).thenReturn(List.of());assertThat(((List<?>)((Map<?,?>)controller.calendar("2026-09-21","2026-09-28",request)).get("events"))).hasSize(1);verify(workspace,times(1)).read(1);}
 @Test void mutationTokenAndLoginAreRequired()throws Exception{doThrow(SchoolAccounts.error(403,"token")).when(access).mutation(request);assertThatThrownBy(()->controller.add(input(),request)).hasMessageContaining("403");verifyNoInteractions(workspace);when(accounts.current(request)).thenThrow(SchoolAccounts.error(401,"login"));assertThatThrownBy(()->controller.calendar("2026-09-21","2026-09-28",request)).hasMessageContaining("401");assertThat(store.read(a)).isEmpty();}
 @Test void queryBoundsAndWindowFiltering()throws Exception{store.save(a,null,input());assertThatThrownBy(()->controller.calendar("2026-01-01","2027-01-01",request)).hasMessageContaining("400");Map<?,?> result=(Map<?,?>)controller.calendar("2026-09-22","2026-09-23",request);assertThat((List<?>)result.get("events")).isEmpty();}
}

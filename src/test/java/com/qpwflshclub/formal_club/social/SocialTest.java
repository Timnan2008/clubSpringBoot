package com.qpwflshclub.formal_club.social;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qpwflshclub.formal_club.pojo.User.*;
import com.qpwflshclub.formal_club.pojo.Club.Club;
import com.qpwflshclub.formal_club.repository.Club.ClubRepository;
import com.qpwflshclub.formal_club.repository.User.*;
import com.qpwflshclub.formal_club.service.User.IUserService;
import com.qpwflshclub.formal_club.workspace.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockHttpServletRequest;
import jakarta.servlet.http.Cookie;
import java.nio.file.Path;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
class SocialTest {
 @TempDir Path dir;
 IUserService users;UserRepository students;ClubPresidentRepository presidents;TeacherRepository teachers;AdminRepository admins;ClubRepository clubs;
 SchoolAccounts accounts;WorkspaceAccess access;SocialStore store;SocialController social;ClubAppointments appointments;ClubProfileController profile;MockHttpServletRequest request;
 User alice,bob,charlie;ClubPresident leader;Club club;
 User student(long id,String name,String email){User u=new User();u.setId(id);u.setUsername(name);u.setUsernameEn(name);u.setEmail(email);u.setPassword("test-only");u.setClubs(new ArrayList<>());return u;}
 void actor(UserBase u){request=new MockHttpServletRequest();request.getSession().setAttribute("authenticatedEmail",u.getEmail());request.addHeader("X-Workspace-Token",access.token(request));}
 @BeforeEach void setup(){
  users=mock(IUserService.class);students=mock(UserRepository.class);presidents=mock(ClubPresidentRepository.class);teachers=mock(TeacherRepository.class);admins=mock(AdminRepository.class);clubs=mock(ClubRepository.class);
  alice=student(1,"Alice","alice@example.com");bob=student(2,"Bob","bob@example.com");charlie=student(3,"Charlie","charlie@example.com");when(students.findAll()).thenReturn(List.of(alice,bob,charlie));when(teachers.findAll()).thenReturn(List.of());when(admins.findAll()).thenReturn(List.of());
  club=new Club();club.setId(1);club.setClubName("Test Club");leader=new ClubPresident();leader.setId(9);leader.setUsername("Leader");leader.setUsernameEn("Leader");leader.setEmail("leader@example.com");leader.setMainClub(club);leader.setClubs(new ArrayList<>());when(presidents.findAll()).thenReturn(List.of(leader));
  when(users.findByEmail(alice.getEmail())).thenReturn(alice);when(users.findByEmail(bob.getEmail())).thenReturn(bob);when(users.findByEmail(charlie.getEmail())).thenReturn(charlie);when(users.findByEmail(leader.getEmail())).thenReturn(leader);
  when(students.findByEmail(alice.getEmail())).thenReturn(alice);when(students.findByEmail(bob.getEmail())).thenReturn(bob);when(presidents.findByEmail(leader.getEmail())).thenReturn(leader);
  accounts=new SchoolAccounts(users,students,presidents,teachers,admins);access=new WorkspaceAccess(users,clubs);store=new SocialStore(new ObjectMapper(),dir.toString());appointments=new ClubAppointments(accounts,access,presidents,clubs);social=new SocialController(accounts,access,store,appointments);profile=new ClubProfileController(access,clubs);org.springframework.test.util.ReflectionTestUtils.setField(social,"messageKeys",new MessageKeys(new ObjectMapper(),dir.toString()));org.springframework.test.util.ReflectionTestUtils.setField(appointments,"officers",new OfficerAssignments(new ObjectMapper(),dir.toString()));actor(alice);
 }
 @Test void wallSearchIncludesOwnNicknameAndNormalizesHandles()throws Exception{
  var profiles=new AccountProfiles(dir.resolve("search-profiles.json").toString());org.springframework.test.util.ReflectionTestUtils.setField(accounts,"profiles",profiles);
  profiles.update(alice.getEmail(),new AccountProfiles.Profile("","CARBON","","",List.of(),""),true);
  actor(alice);assertThat(accounts.search("carbon",SchoolAccounts.key(alice.getEmail()))).isEmpty();
  assertThat(social.search("  @ＣＡＲＢＯＮ  ",true,request)).extracting(SchoolAccounts.Account::id).containsExactly(SchoolAccounts.key(alice.getEmail()));
  assertThat(social.search("Alice",true,request)).hasSize(1);assertThat(social.search("@",true,request)).isEmpty();
 }
 @Test void wallSearchFindsAuthorAndTextWithoutRevealingAnonymousAuthors()throws Exception{
  var profiles=new AccountProfiles(dir.resolve("post-search-profiles.json").toString());org.springframework.test.util.ReflectionTestUtils.setField(accounts,"profiles",profiles);
  profiles.update(alice.getEmail(),new AccountProfiles.Profile("","CARBON","","",List.of(),""),true);
  var named=store.post(SchoolAccounts.key(alice.getEmail()),"欢迎同学们参加活动","general",false);
  var hidden=store.post(SchoolAccounts.key(alice.getEmail()),"私下的校园想法","general",true);
  var text=store.post(SchoolAccounts.key(bob.getEmail()),"Discuss carbon science","general",false);
  var anonymousText=store.post(SchoolAccounts.key(bob.getEmail()),"Carbon in the classroom","general",true);
  actor(alice);var results=(List<Map<String,Object>>)social.posts("","",0,"  @CARBON  ",request).get("items");
  assertThat(results).extracting(r->r.get("id")).containsExactlyInAnyOrder(named.id(),text.id(),anonymousText.id()).doesNotContain(hidden.id());
  assertThat((List<?>)social.posts("","",0,"欢迎",request).get("items")).hasSize(1);
  actor(bob);assertThat((List<?>)social.posts("","",0,"alice",request).get("items")).hasSize(1);
  assertThat((List<?>)social.posts("","recruit",0,"carbon",request).get("items")).isEmpty();
 }
 @Test void administratorsCanComposePostReplyAndUploadWithoutBypassingValidation()throws Exception{
  var admin=new Admin();admin.setId(80);admin.setEmail("admin@example.com");admin.setUsername("Administrator");
  when(users.findByEmail(admin.getEmail())).thenReturn(admin);when(admins.findAll()).thenReturn(List.of(admin));actor(admin);
  assertThat(social.bootstrap(request)).containsEntry("canPost",true).containsEntry("admin",true);
  social.post(new SocialController.PostInput("Campus announcement","general",false),request);
  var post=store.snapshot().posts().getFirst();assertThat(post.author()).isEqualTo(SchoolAccounts.key(admin.getEmail()));
  social.reply(post.id(),new SocialController.TextInput("More information"),request);assertThat(store.snapshot().replies()).hasSize(1);
  org.springframework.test.util.ReflectionTestUtils.setField(social,"files",new WallFiles(dir.toString()));
  social.uploadPost("Campus attachment","general",false,0,List.of(new org.springframework.mock.web.MockMultipartFile("files","notes.txt","text/plain","Notes".getBytes())),request);
  assertThat(store.snapshot().posts().getFirst().attachments()).hasSize(1);
  assertThatThrownBy(()->social.post(new SocialController.PostInput("ＦＵＣＫ","general",false),request)).hasMessageContaining("400");
  request.removeHeader("X-Workspace-Token");assertThatThrownBy(()->social.post(new SocialController.PostInput("No token","general",false),request)).hasMessageContaining("403");
 }
 @Test void adminStudentCanApplyBeApprovedAndLeaveWithoutLosingAdministratorRights()throws Exception{
  var admin=new Admin();admin.setId(80);admin.setEmail("admin@example.com");admin.setUsername("Admin Student");admin.setClubs(new ArrayList<>());
  when(users.findByEmail(admin.getEmail())).thenReturn(admin);when(admins.findAll()).thenReturn(List.of(admin));when(admins.findByAdminEmail(admin.getEmail())).thenReturn(admin);when(admins.findById(80L)).thenReturn(Optional.of(admin));when(clubs.findById(1)).thenReturn(Optional.of(club));when(clubs.findAll()).thenReturn(List.of(club));
  var joins=new JoinRequestController(new JoinRequests(dir.resolve("join").toString()),accounts,access,clubs,students,presidents);org.springframework.test.util.ReflectionTestUtils.setField(joins,"admins",admins);
  actor(admin);request.removeHeader("X-Workspace-Token");assertThatThrownBy(()->joins.apply(1,new JoinRequestController.Apply(""),request)).hasMessageContaining("403");actor(admin);
  var entry=(JoinRequests.Entry)joins.apply(1,new JoinRequestController.Apply("I would like to join"),request);assertThat(admin.getClubs()).isEmpty();assertThat(joins.apply(1,new JoinRequestController.Apply("again"),request)).isEqualTo(entry);
  assertThat(accounts.view(admin).role()).isEqualTo("admin");assertThat(accounts.view(admin).roles()).containsExactly("admin","student");assertThat(new ObjectMapper().valueToTree(accounts.view(admin)).get("roles").toString()).isEqualTo("[\"admin\",\"student\"]");
  actor(leader);joins.decide(1,entry.id(),new JoinRequestController.Decision("approved"),request);joins.decide(1,entry.id(),new JoinRequestController.Decision("approved"),request);verify(admins,times(1)).save(admin);verify(students,never()).save(any());verify(presidents,never()).save(any());assertThat(admin.getClubs()).containsExactly(club);
  var ws=new WorkspaceController(access,new WorkspaceStore(new ObjectMapper(),dir.toString()),students,presidents);org.springframework.test.util.ReflectionTestUtils.setField(ws,"admins",admins);assertThat(ws.members(1,request)).anySatisfy(m->assertThat(m).containsEntry("type","admin").containsEntry("role","member").containsEntry("id",80L));
  var community=new CommunityController(accounts,access,new MessageKeys(new ObjectMapper(),dir.toString()),new WorkspaceStore(new ObjectMapper(),dir.toString()),clubs,students,teachers,presidents,admins);
  actor(admin);assertThat(joins.status(1,request).toString()).contains("member");assertThat(community.mine(request).toString()).contains("Test Club");assertThat(community.memberClubs(admin)).containsExactly(club);community.leave(1,request);assertThat(admin.getClubs()).isEmpty();assertThat(community.memberClubs(admin)).isEmpty();assertThat(access.admin(accounts.current(request))).isTrue();assertThat(access.require(admin,1)).isSameAs(club);
  var second=(JoinRequests.Entry)joins.apply(1,new JoinRequestController.Apply("Rejoin"),request);actor(leader);joins.decide(1,second.id(),new JoinRequestController.Decision("approved"),request);ws.removeMember(1,"admin",80L,request);assertThat(admin.getClubs()).isEmpty();assertThat(admin.getUserRight()).isEqualTo(3);verify(admins,never()).delete(any());
 }
 @Test void adminStudentProfileKeepsGradeClassAndImmutableStudentNumber()throws Exception{
  var admin=new Admin();admin.setEmail("admin@example.com");when(users.findByEmail(admin.getEmail())).thenReturn(admin);actor(admin);
  var profiles=new AccountProfiles(dir.resolve("profiles.json").toString());org.springframework.test.util.ReflectionTestUtils.setField(accounts,"profiles",profiles);
  var community=new CommunityController(accounts,access,new MessageKeys(new ObjectMapper(),dir.toString()),new WorkspaceStore(new ObjectMapper(),dir.toString()),clubs,students,teachers,presidents,admins);org.springframework.test.util.ReflectionTestUtils.setField(community,"profiles",profiles);
  var value=new AccountProfiles.Profile("TEST100","Nick","G11","1",List.of(),"");community.details(value,request);assertThat(profiles.get(admin.getEmail())).isEqualTo(value);assertThat(accounts.view(admin).grade()).isEqualTo("G11");assertThat(accounts.view(admin).roles()).containsExactly("admin","student");
  assertThatThrownBy(()->community.details(new AccountProfiles.Profile("TEST200","Nick","G11","1",List.of(),""),request)).hasMessageContaining("409");
  assertThat(accounts.view(alice).roles()).containsExactly("student");assertThat(access.admin(alice)).isFalse();
 }
 @Test void deletingCommentsChecksOwnerAdministratorCsrfAndParentPost()throws Exception{
  var post=store.post(SchoolAccounts.key(alice.getEmail()),"Discussion");var other=store.post(SchoolAccounts.key(bob.getEmail()),"Another discussion");var reply=store.reply(post.id(),SchoolAccounts.key(bob.getEmail()),"My comment");
  actor(alice);assertThatThrownBy(()->social.deleteReply(post.id(),reply.id(),request)).hasMessageContaining("403");assertThat(store.snapshot().replies()).hasSize(1);
  actor(bob);assertThat(social.replies(post.id(),request).getFirst()).containsEntry("own",true);assertThatThrownBy(()->social.deleteReply(other.id(),reply.id(),request)).hasMessageContaining("404");request.removeHeader("X-Workspace-Token");assertThatThrownBy(()->social.deleteReply(post.id(),reply.id(),request)).hasMessageContaining("403");actor(bob);social.deleteReply(post.id(),reply.id(),request);assertThat(new SocialStore(new ObjectMapper(),dir.toString()).snapshot().replies()).isEmpty();assertThat(store.snapshot().posts()).hasSize(2);
  var anon=store.post(SchoolAccounts.key(alice.getEmail()),"Anonymous discussion","general",true);var ar=store.reply(anon.id(),SchoolAccounts.key(alice.getEmail()),"Anonymous author's comment");actor(alice);var view=social.replies(anon.id(),request).getFirst();assertThat(view).containsEntry("own",true);assertThat(((SchoolAccounts.Account)view.get("author")).id()).isEmpty();
  var admin=new Admin();admin.setEmail("admin@example.com");when(users.findByEmail(admin.getEmail())).thenReturn(admin);actor(admin);social.deleteReply(anon.id(),ar.id(),request);assertThat(store.snapshot().replies()).isEmpty();assertThat(store.snapshot().posts()).hasSize(3);
 }
 @Test void forgedCookieAndMissingMutationTokenAreRejected(){var forged=new MockHttpServletRequest();forged.setCookies(new Cookie("user_session",alice.getEmail()));assertThatThrownBy(()->social.bootstrap(forged)).hasMessageContaining("401");request.removeHeader("X-Workspace-Token");assertThatThrownBy(()->social.post(new SocialController.PostInput("Hello","general",false),request)).hasMessageContaining("403");}
 @Test void postLikeReplyAndDeletePermissionsPersist()throws Exception{
  social.post(new SocialController.PostInput("Campus news","general",false),request);var p=store.snapshot().posts().getFirst();actor(bob);social.like(p.id(),new SocialController.LikeInput(true),request);social.like(p.id(),new SocialController.LikeInput(true),request);social.reply(p.id(),new SocialController.TextInput("Nice!"),request);
  assertThatThrownBy(()->social.delete(p.id(),request)).hasMessageContaining("403");var reopened=new SocialStore(new ObjectMapper(),dir.toString());assertThat(reopened.snapshot().posts().getFirst().likes()).hasSize(1);assertThat(reopened.snapshot().replies()).hasSize(1);
  assertThat(social.posts("",request).toString()).doesNotContain("@example.com","test-only");actor(alice);social.delete(p.id(),request);assertThat(store.snapshot().posts()).isEmpty();assertThat(store.snapshot().replies()).isEmpty();
 }
 @Test void privateConversationIsVisibleOnlyToItsParticipants()throws Exception{
  store.message(SchoolAccounts.key(alice.getEmail()),SchoolAccounts.key(bob.getEmail()),"Historical conversation");
  actor(charlie);assertThat(social.inbox(request)).isEmpty();assertThat((List<?>)social.conversation(SchoolAccounts.key(bob.getEmail()),"",request).get("messages")).isEmpty();
  actor(bob);assertThat((List<?>)social.conversation(SchoolAccounts.key(alice.getEmail()),"",request).get("messages")).hasSize(1);social.read(SchoolAccounts.key(alice.getEmail()),request);assertThat(store.snapshot().messages().getFirst().read()).isTrue();
 }
 @Test void studentsCannotInviteAndRecipientMustAccept()throws Exception{
  var input=new SocialController.InviteInput(1,SchoolAccounts.key(bob.getEmail()),"vice_president");assertThatThrownBy(()->social.invite(input,request)).hasMessageContaining("403");actor(leader);var invite=(SocialStore.Invitation)social.invite(input,request);assertThatThrownBy(()->social.invite(input,request)).hasMessageContaining("409");verify(presidents,never()).save(any());
  actor(charlie);assertThatThrownBy(()->social.respond(invite.id(),new SocialController.AcceptInput(true),request)).hasMessageContaining("403");actor(bob);social.respond(invite.id(),new SocialController.AcceptInput(true),request);
  var captor=org.mockito.ArgumentCaptor.forClass(ClubPresident.class);verify(presidents).save(captor.capture());assertThat(captor.getValue().getEmail()).isEqualTo(bob.getEmail());assertThat(captor.getValue().getMainClub()).isSameAs(club);assertThat(captor.getValue().isVicePresident()).isTrue();assertThat(club.getVicePresident()).isEqualTo("Bob");assertThat(club.getPresident()).isEqualTo("Leader");
  assertThat(new SocialStore(new ObjectMapper(),dir.toString()).snapshot().invitations().getFirst().status()).isEqualTo("accepted");assertThatThrownBy(()->social.respond(invite.id(),new SocialController.AcceptInput(true),request)).hasMessageContaining("409");
 }
 @Test void acceptingAdditionalPresidencyKeepsOriginalOfficeAndCanAlsoAcceptVice()throws Exception{
  var other=new Club();other.setId(2);var target=new ClubPresident();target.setId(12);target.setUsername("Bob");target.setUsernameEn("Bob");target.setEmail(bob.getEmail());target.setMainClub(other);target.setVicePresident(false);
  when(presidents.findByEmail(target.getEmail())).thenReturn(target);when(presidents.findAll()).thenReturn(List.of(leader,target));when(users.findByEmail(target.getEmail())).thenReturn(target);
  var assignments=new OfficerAssignments(new ObjectMapper(),dir.toString());org.springframework.test.util.ReflectionTestUtils.setField(appointments,"officers",assignments);org.springframework.test.util.ReflectionTestUtils.setField(access,"officers",assignments);when(clubs.findById(1)).thenReturn(Optional.of(club));
  actor(leader);var invitation=(SocialStore.Invitation)social.invite(new SocialController.InviteInput(1,SchoolAccounts.key(target.getEmail()),"president"),request);actor(target);social.respond(invitation.id(),new SocialController.AcceptInput(true),request);
  assertThat(target.getMainClub()).isSameAs(other);assertThat(target.isVicePresident()).isFalse();assertThat(access.clubs(target)).containsExactly(other,club);assertThat(access.vice(target,1)).isFalse();assertThat(club.getPresident()).contains("Bob");verify(presidents,never()).save(target);
  actor(leader);var vice=(SocialStore.Invitation)social.invite(new SocialController.InviteInput(1,SchoolAccounts.key(target.getEmail()),"vice_president"),request);actor(target);social.respond(vice.id(),new SocialController.AcceptInput(true),request);assertThat(access.vice(target,1)).isTrue();assertThat(access.vice(target,2)).isFalse();assertThat(assignments.all()).hasSize(1);assertThat(club.getVicePresident()).isEqualTo("Bob");
 }
 @Test void declinedInvitationNeverGrantsRights()throws Exception{actor(leader);var i=(SocialStore.Invitation)social.invite(new SocialController.InviteInput(1,SchoolAccounts.key(bob.getEmail()),"president"),request);actor(bob);social.respond(i.id(),new SocialController.AcceptInput(false),request);verify(presidents,never()).save(any());assertThat(store.snapshot().invitations().getFirst().status()).isEqualTo("declined");}
 @Test void inviterWhoLostClubCannotGrantRightsThroughOldInvitation()throws Exception{actor(leader);var i=(SocialStore.Invitation)social.invite(new SocialController.InviteInput(1,SchoolAccounts.key(bob.getEmail()),"president"),request);leader.setMainClub(null);actor(bob);assertThatThrownBy(()->social.respond(i.id(),new SocialController.AcceptInput(true),request)).hasMessageContaining("403");verify(presidents,never()).save(any());}
 @Test void chineseEnglishAndNicknameSearchKeepTeacherAndStudentDistinct() throws Exception {
  alice.setUsername("张扬");alice.setUsernameEn("Eric Student");
  Teacher teacher=new Teacher();teacher.setEmail("teacher@example.com");teacher.setUsername("张扬");teacher.setUsernameEn("Eric Teacher");
  when(teachers.findAll()).thenReturn(List.of(teacher));
  var profiles=new AccountProfiles(dir.resolve("profiles.json").toString());
  profiles.update(alice.getEmail(),new AccountProfiles.Profile("","小太阳","G11","",List.of(),""),true);
  profiles.update(teacher.getEmail(),new AccountProfiles.Profile("","小太阳老师","","",List.of(),""),false);
  org.springframework.test.util.ReflectionTestUtils.setField(accounts,"profiles",profiles);
  for(String query:List.of("张扬","ERIC","小太阳")){
   var results=accounts.search(query,SchoolAccounts.key(bob.getEmail()));
   assertThat(results).hasSize(2);
   assertThat(results).extracting(SchoolAccounts.Account::role).containsExactlyInAnyOrder("student","teacher");
   assertThat(results).extracting(SchoolAccounts.Account::nameEn).containsExactlyInAnyOrder("Eric Student","Eric Teacher");
   assertThat(results).extracting(SchoolAccounts.Account::id).doesNotHaveDuplicates();
  }
  assertThat(accounts.search("小太阳",SchoolAccounts.key(alice.getEmail()))).hasSize(1);
 }
 @Test void searchKeepsSameNameUsersDistinctWithoutLeakingCredentials(){bob.setUsername("Alice");bob.setUsernameEn("Alice");var result=accounts.search("Alice",SchoolAccounts.key(charlie.getEmail()));assertThat(result).hasSize(2);assertThat(result.get(0).id()).isNotEqualTo(result.get(1).id());assertThat(result.toString()).doesNotContain("@example.com","test-only");}
 @Test void clubProfileUpdatesSloganAndDescriptionWithoutChangingOfficers(){actor(leader);var result=profile.update(1,new ClubProfileController.Profile("New Club","A new slogan","Full introduction","Display name","Vice display","New Club EN","English slogan","English introduction","","","","",0),request);assertThat(club.getClubName()).isEqualTo("New Club");assertThat(club.getSortDescription()).isEqualTo("A new slogan");assertThat(result.description()).isEqualTo("Full introduction");verify(presidents,never()).save(any());assertThatThrownBy(()->profile.update(2,result,request)).hasMessageContaining("403");}
 @Test void invalidContentIsRejectedButOtherClubOfficersAreEligible()throws Exception{assertThatThrownBy(()->social.post(new SocialController.PostInput(" ","general",false),request)).hasMessageContaining("400");Club other=new Club();other.setId(2);ClubPresident p=new ClubPresident();p.setMainClub(other);assertThatCode(()->appointments.eligible(p,1)).doesNotThrowAnyException();}
 @Test void paginationKeepsOlderPostsAccessible()throws Exception{for(int n=0;n<23;n++)store.post(SchoolAccounts.key(alice.getEmail()),"Post "+n);var first=social.posts("",request);assertThat((List<?>)first.get("items")).hasSize(20);assertThat((List<?>)social.posts((String)first.get("next"),request).get("items")).hasSize(3);}
 @Test void anonymousPostsAndAuthorRepliesNeverExposeAccountToOthers()throws Exception{var result=social.post(new SocialController.PostInput("Looking for teammates","team",true),request);String id=store.snapshot().posts().getFirst().id();social.reply(id,new SocialController.TextInput("More details"),request);assertThat(result.toString()).doesNotContain("Alice",SchoolAccounts.key(alice.getEmail()));actor(bob);assertThat(social.posts("","team",request).toString()).contains("匿名同学").doesNotContain("Alice",SchoolAccounts.key(alice.getEmail()));assertThat(social.replies(id,request).toString()).contains("匿名楼主").doesNotContain("Alice",SchoolAccounts.key(alice.getEmail()));assertThat((List<?>)social.posts("","help",request).get("items")).isEmpty();}
 @Test void plaintextMessagesAreRejectedByApi(){assertThatThrownBy(()->social.message(SchoolAccounts.key(bob.getEmail()),new SocialController.TextInput("must not store this"),request)).hasMessageContaining("端到端加密");}
 @Test void profileUpdatesNeverAlterMembershipsAndRequireSession()throws Exception{var ws=new WorkspaceStore(new ObjectMapper(),dir.resolve("workspace").toString());var controller=new CommunityController(accounts,access,new MessageKeys(new ObjectMapper(),dir.toString()),ws,clubs,students,teachers,presidents,admins);alice.setClubs(new ArrayList<>(List.of(club)));controller.profile(new CommunityController.ProfileInput("新名字","New Name"),request);assertThat(alice.getClubs()).containsExactly(club);assertThat(controller.mine(request).toString()).contains("Test Club","社员");assertThatThrownBy(()->controller.me(new MockHttpServletRequest())).hasMessageContaining("401");assertThatThrownBy(()->controller.password(new CommunityController.PasswordInput("wrong","new password"),request)).hasMessageContaining("403");}
 @Test void onlyApprovedCampusApplicationsArePublished()throws Exception{var ws=new WorkspaceStore(new ObjectMapper(),dir.resolve("workspace").toString());var controller=new CommunityController(accounts,access,new MessageKeys(new ObjectMapper(),dir.toString()),ws,clubs,students,teachers,presidents,admins);when(clubs.findAll()).thenReturn(List.of(club));ws.add(1,new WorkspaceStore.Activity("a","Published","2026-09-20T10:00","2026-09-20T11:00","Hall","Public information",10,"application","approved","private-email","now","private note","private reviewer"));ws.add(1,new WorkspaceStore.Activity("b","Pending","2026-09-20T10:00","2026-09-20T11:00","Hall","secret",10,"application","pending","private-email","now","",""));String data=controller.events(request).toString();assertThat(data).contains("Published").doesNotContain("Pending","private-email","private note","private reviewer","secret");}
 @Test void historicalMessageMigrationRequiresItsOriginalSender()throws Exception{String a=SchoolAccounts.key(alice.getEmail()),b=SchoolAccounts.key(bob.getEmail());var m=store.message(a,b,"old plaintext");assertThatThrownBy(()->store.encryptHistory(m.id(),b,a,"e2ee:v1:test")).hasMessageContaining("403");assertThat(store.snapshot().messages().getFirst().text()).isEqualTo("old plaintext");store.encryptHistory(m.id(),a,b,"e2ee:v1:test");assertThat(store.snapshot().messages().getFirst().text()).isEqualTo("e2ee:v1:test");store.encryptHistory(m.id(),a,b,"e2ee:v1:replacement");assertThat(store.snapshot().messages().getFirst().text()).isEqualTo("e2ee:v1:test");}
 @Test void otherCategoryPersistsAndFiltersWithoutAllowingForgedActivityAnnouncements()throws Exception{
  social.post(new SocialController.PostInput("Other campus question","other",true),request);
  social.post(new SocialController.PostInput("Team only","team",false),request);
  var reopened=new SocialStore(new ObjectMapper(),dir.toString());assertThat(reopened.snapshot().posts()).anyMatch(p->p.category().equals("other"));
  actor(bob);String filtered=social.posts("","other",request).toString();assertThat(filtered).contains("Other campus question","匿名同学").doesNotContain("Team only","Alice",SchoolAccounts.key(alice.getEmail()));
  assertThatThrownBy(()->social.post(new SocialController.PostInput("Fake approved event","events",false),request)).hasMessageContaining("400");
 }

 @Test void clubPostsAreScopedAndCannotRevealAnonymousPersonalPosts()throws Exception{
  actor(leader);social.post(new SocialController.PostInput("Club recruitment","recruit",false,1),request);social.post(new SocialController.PostInput("Personal anonymous","other",true),request);
  assertThatThrownBy(()->social.post(new SocialController.PostInput("Forged","recruit",false,2),request)).hasMessageContaining("403");
  assertThatThrownBy(()->social.post(new SocialController.PostInput("Anonymous official","recruit",true,1),request)).hasMessageContaining("400");
  actor(alice);assertThatThrownBy(()->social.post(new SocialController.PostInput("Forged","recruit",false,1),request)).hasMessageContaining("403");
  assertThat(social.posts("","",1,request).toString()).contains("Club recruitment","Test Club").doesNotContain("Personal anonymous");
  assertThat((List<?>)social.posts("","",2,request).get("items")).isEmpty();
  var teacher=new Teacher();teacher.setEmail("teacher@example.com");teacher.setClubs(List.of(club));when(users.findByEmail(teacher.getEmail())).thenReturn(teacher);actor(teacher);
  social.post(new SocialController.PostInput("Teacher club update","general",false,1),request);
  assertThatThrownBy(()->social.post(new SocialController.PostInput("Wrong club","general",false,2),request)).hasMessageContaining("403");
 }
 @Test void joinApplicationsRequireApprovalAndAreIdempotent()throws Exception{
  var requests=new JoinRequests(dir.resolve("join").toString());var joins=new JoinRequestController(requests,accounts,access,clubs,students,presidents);when(clubs.findById(1)).thenReturn(Optional.of(club));
  actor(alice);var entry=(JoinRequests.Entry)joins.apply(1,new JoinRequestController.Apply(""),request);
  assertThat(joins.apply(1,new JoinRequestController.Apply("again"),request)).isEqualTo(entry);assertThat(alice.getClubs()).isEmpty();
  assertThatThrownBy(()->joins.list(1,request)).hasMessageContaining("403");
  actor(leader);assertThatThrownBy(()->joins.decide(2,entry.id(),new JoinRequestController.Decision("approved"),request)).hasMessageContaining("403");
  joins.decide(1,entry.id(),new JoinRequestController.Decision("approved"),request);joins.decide(1,entry.id(),new JoinRequestController.Decision("approved"),request);
  assertThat(alice.getClubs()).containsExactly(club);verify(students,times(1)).save(alice);
  actor(alice);assertThat(joins.status(1,request).toString()).contains("member");assertThatThrownBy(()->joins.apply(1,new JoinRequestController.Apply("again"),request)).hasMessageContaining("409");
 }
 @Test void teachersReviewOnlyTheirClubsAndDeclineDoesNotAddMembers()throws Exception{
  var requests=new JoinRequests(dir.resolve("join").toString());var joins=new JoinRequestController(requests,accounts,access,clubs,students,presidents);when(clubs.findById(1)).thenReturn(Optional.of(club));
  actor(alice);request.removeHeader("X-Workspace-Token");assertThatThrownBy(()->joins.apply(1,new JoinRequestController.Apply("hi"),request)).hasMessageContaining("403");actor(alice);var entry=(JoinRequests.Entry)joins.apply(1,new JoinRequestController.Apply("hi"),request);
  var teacher=new Teacher();teacher.setEmail("teacher@example.com");teacher.setClubs(List.of(club));when(users.findByEmail(teacher.getEmail())).thenReturn(teacher);actor(teacher);
  assertThat((List<?>)joins.list(1,request)).hasSize(1);assertThatThrownBy(()->joins.list(2,request)).hasMessageContaining("403");joins.decide(1,entry.id(),new JoinRequestController.Decision("declined"),request);assertThat(alice.getClubs()).isEmpty();verify(students,never()).save(any());
  actor(alice);assertThat(((JoinRequests.Entry)joins.apply(1,new JoinRequestController.Apply("retry"),request)).id()).isNotEqualTo(entry.id());
 }

 @Test void keywordSearchDoesNotRevealAnonymousIdentity()throws Exception{social.post(new SocialController.PostInput("Need ROBOT teammates","team",true),request);social.post(new SocialController.PostInput("Dance practice","general",false),request);actor(bob);var result=social.posts("","",0,"robot",request);assertThat((List<?>)result.get("items")).hasSize(1);assertThat(result.toString()).doesNotContain("Alice",SchoolAccounts.key(alice.getEmail()),"Dance practice");}
 @Test void filteredWordsCannotBypassApiOrReply()throws Exception{assertThatThrownBy(()->social.post(new SocialController.PostInput("傻\u200b逼","other",true),request)).hasMessageContaining("400");var p=store.post(SchoolAccounts.key(alice.getEmail()),"Normal message");assertThatThrownBy(()->social.reply(p.id(),new SocialController.TextInput("ＦＵＣＫ"),request)).hasMessageContaining("400");assertThat(store.snapshot().replies()).isEmpty();}
 @Test void attachmentsAreBoundToPostsAndRequireLogin()throws Exception{var files=new WallFiles(dir.toString());org.springframework.test.util.ReflectionTestUtils.setField(social,"files",files);var file=new org.springframework.mock.web.MockMultipartFile("files","notes.txt","text/plain","Project notes".getBytes());social.uploadPost("Project team","team",true,0,List.of(file),request);var p=store.snapshot().posts().getFirst();var a=p.attachments().getFirst();assertThat(a.name()).isEqualTo("attachment.txt");assertThat(social.download(p.id(),a.id(),request).getHeaders().getFirst("Content-Disposition")).contains("attachment");assertThatThrownBy(()->social.download("wrong-post",a.id(),request)).hasMessageContaining("404");assertThatThrownBy(()->social.download(p.id(),a.id(),new MockHttpServletRequest())).hasMessageContaining("401");social.delete(p.id(),request);assertThatThrownBy(()->social.download(p.id(),a.id(),request)).hasMessageContaining("404");}
 @Test void uploadRejectsExecutableAndOversizedAttachments()throws Exception{var files=new WallFiles(dir.toString());assertThatThrownBy(()->files.save(new org.springframework.mock.web.MockMultipartFile("files","fake.png","image/png","<script>alert(1)</script>".getBytes()),false)).hasMessageContaining("400");assertThatThrownBy(()->files.save(new org.springframework.mock.web.MockMultipartFile("files","script.svg","image/svg+xml","<svg/>".getBytes()),false)).hasMessageContaining("400");assertThatThrownBy(()->files.save(new org.springframework.mock.web.MockMultipartFile("files","huge.txt","text/plain",new byte[10*1024*1024+1]),false)).hasMessageContaining("400");}
 @Test void imageReencodingDropsAppendedMetadata()throws Exception{var files=new WallFiles(dir.toString());var image=new java.awt.image.BufferedImage(2,2,java.awt.image.BufferedImage.TYPE_INT_RGB);var output=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(image,"png",output);output.write("PRIVATE_METADATA".getBytes());var a=files.save(new org.springframework.mock.web.MockMultipartFile("files","photo.png","image/png",output.toByteArray()),true);assertThat(new String(files.read(a.id()),java.nio.charset.StandardCharsets.ISO_8859_1)).doesNotContain("PRIVATE_METADATA");}
 @Test void previewUsesMostLikedReplyAndDetailKeepsAllRepliesAnonymousSafe()throws Exception{
 var p=store.post(SchoolAccounts.key(alice.getEmail()),"Anonymous topic","general",true);var first=store.reply(p.id(),SchoolAccounts.key(alice.getEmail()),"Anonymous reply");var best=store.reply(p.id(),SchoolAccounts.key(bob.getEmail()),"Best reply");store.likeReply(p.id(),best.id(),SchoolAccounts.key(charlie.getEmail()),true);var detail=social.detail(p.id(),request);assertThat(((Map<?,?>)detail.get("previewReply")).get("id")).isEqualTo(best.id());assertThat(detail.get("replies")).isEqualTo(2);var replies=social.replies(p.id(),request);assertThat(replies).hasSize(2);assertThat(((SchoolAccounts.Account)replies.getFirst().get("author")).id()).isEmpty();assertThat(((SchoolAccounts.Account)detail.get("author")).clubName()).isEmpty();assertThatThrownBy(()->store.likeReply("missing",best.id(),"actor",true)).hasMessageContaining("404");var persisted=new SocialStore(new ObjectMapper(),dir.toString());assertThat(persisted.snapshot().replies().getLast().likes()).hasSize(1);
 }
 @Test void officerIdentityIncludesClubAndSeparatePosition(){club.setClubNameEn("Robotics");leader.setVicePresident(true);var a=accounts.view(leader);assertThat(a.clubName()).isEqualTo("Test Club");assertThat(a.clubNameEn()).isEqualTo("Robotics");assertThat(a.position()).isEqualTo("vice_president");}
 @Test void viewsRequireAnExistingPostAndMutationTokenAndDoNotCountReads()throws Exception{
  var views=new PostViews(new ObjectMapper(),dir.toString());org.springframework.test.util.ReflectionTestUtils.setField(social,"views",views);var p=store.post(SchoolAccounts.key(alice.getEmail()),"Views test");
  assertThat(social.detail(p.id(),request)).containsEntry("views",0L);social.posts("",request);assertThat(views.count(p.id())).isZero();
  social.viewed(new SocialController.ViewInput(List.of(p.id())),request);social.viewed(new SocialController.ViewInput(List.of(p.id())),request);assertThat(views.count(p.id())).isEqualTo(1);
  actor(bob);social.viewed(new SocialController.ViewInput(List.of(p.id())),request);assertThat(views.count(p.id())).isEqualTo(2);
  assertThatThrownBy(()->social.viewed(new SocialController.ViewInput(List.of("missing")),request)).hasMessageContaining("404");request.removeHeader("X-Workspace-Token");assertThatThrownBy(()->social.viewed(new SocialController.ViewInput(List.of(p.id())),request)).hasMessageContaining("403");
 }

 @Test void publicHomepageNeverRevealsAnonymousPosts()throws Exception{
 social.post(new SocialController.PostInput("Public","general",false),request);social.post(new SocialController.PostInput("Anonymous","general",true),request);actor(bob);social.post(new SocialController.PostInput("Other","general",false),request);
 var result=social.userPosts(SchoolAccounts.key(alice.getEmail()),1,false,request).toString();assertThat(result).contains("Public").doesNotContain("Anonymous","Other");
 }
 @Test void blockedMessagesRejectedBeforeKeyValidation()throws Exception{var prefs=new ChatPreferences(new ObjectMapper(),dir.toString());org.springframework.test.util.ReflectionTestUtils.setField(social,"preferences",prefs);prefs.update(SchoolAccounts.key(bob.getEmail()),SchoolAccounts.key(alice.getEmail()),new ChatPreferences.Preference(false,true));assertThatThrownBy(()->social.message(SchoolAccounts.key(bob.getEmail()),new SocialController.TextInput("invalid encryption"),request)).hasMessageContaining("403");assertThat(store.snapshot().messages()).isEmpty();}
}

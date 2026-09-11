package com.qpwflshclub.formal_club.workspace;
import com.qpwflshclub.formal_club.social.SchoolAccounts;
import com.qpwflshclub.formal_club.pojo.User.*;
import com.qpwflshclub.formal_club.pojo.Club.Club;
import com.qpwflshclub.formal_club.repository.User.*;
import com.qpwflshclub.formal_club.repository.Club.ClubRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import java.util.*;import java.io.IOException;
@RestController public class JoinRequestController {
 private final JoinRequests store;private final SchoolAccounts accounts;private final WorkspaceAccess access;private final ClubRepository clubs;private final UserRepository students;private final ClubPresidentRepository presidents;
 public JoinRequestController(JoinRequests s,SchoolAccounts a,WorkspaceAccess w,ClubRepository c,UserRepository u,ClubPresidentRepository p){store=s;accounts=a;access=w;clubs=c;students=u;presidents=p;}
 private Club club(int id){return clubs.findById(id).orElseThrow(()->SchoolAccounts.error(404,"社团不存在"));}
 @org.springframework.beans.factory.annotation.Autowired private com.qpwflshclub.formal_club.social.OfficerAssignments officers;
 @org.springframework.beans.factory.annotation.Autowired private AdminRepository admins;
 private boolean member(UserBase u,int id){return officers!=null&&officers.forAccount(SchoolAccounts.key(u.getEmail())).stream().anyMatch(o->o.club()==id)||u.getClubs()!=null&&u.getClubs().stream().anyMatch(c->Objects.equals(c.getId(),id))||u instanceof ClubPresident p&&p.getMainClub()!=null&&Objects.equals(p.getMainClub().getId(),id);}
 public record Apply(String note){} public record Decision(String status){}
 @GetMapping("/api/campus-social/clubs/{id}/join") public Object status(@PathVariable int id,HttpServletRequest r)throws IOException{club(id);var u=accounts.current(r);var latest=store.read(id).stream().filter(e->e.account().equals(SchoolAccounts.key(u.getEmail()))).findFirst();return Map.of("status",member(u,id)?"member":latest.map(JoinRequests.Entry::status).orElse("none"),"token",access.token(r));}
 @PostMapping("/api/campus-social/clubs/{id}/join") public Object apply(@PathVariable int id,@RequestBody Apply input,HttpServletRequest r)throws IOException{club(id);var u=accounts.current(r);access.mutation(r);if(!(u instanceof User||u instanceof ClubPresident||u instanceof Admin))throw SchoolAccounts.error(403,"入社申请面向学生账号");if(member(u,id))throw SchoolAccounts.error(409,"你已是社团成员");return store.apply(id,SchoolAccounts.key(u.getEmail()),Objects.toString(u.getUsername(),""),Objects.toString(u.getUsernameEn(),""),input.note());}
 @GetMapping("/api/club-workspace/{id}/join-requests") public Object list(@PathVariable int id,HttpServletRequest r)throws IOException{access.require(access.current(r),id);return store.read(id);}
 @PostMapping("/api/club-workspace/{id}/join-requests/{entry}") public synchronized Object decide(@PathVariable int id,@PathVariable String entry,@RequestBody Decision decision,HttpServletRequest r)throws IOException{
  var actor=access.current(r);Club c=access.require(actor,id);access.mutation(r);var e=store.read(id).stream().filter(x->x.id().equals(entry)).findFirst().orElseThrow(()->SchoolAccounts.error(404,"申请不存在"));
  if(!Set.of("approved","declined").contains(Objects.toString(decision.status(),"")))throw SchoolAccounts.error(400,"处理结果无效");if(e.status().equals(decision.status()))return e;if(!e.status().equals("pending"))throw SchoolAccounts.error(409,"申请已处理");
  if(decision.status().equals("approved")){var u=accounts.find(e.account());if(!(u instanceof User||u instanceof ClubPresident||u instanceof Admin))throw SchoolAccounts.error(409,"申请人身份已变化，请重新确认");if(!member(u,id)){var list=new ArrayList<Club>(u.getClubs()==null?List.of():u.getClubs());list.add(c);u.setClubs(list);if(u instanceof User student)students.save(student);else if(u instanceof ClubPresident president)presidents.save(president);else admins.save((Admin)u);}}
  return store.decide(id,entry,decision.status(),SchoolAccounts.key(actor.getEmail()));
 }
}

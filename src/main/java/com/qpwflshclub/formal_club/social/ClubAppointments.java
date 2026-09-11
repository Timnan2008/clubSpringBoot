package com.qpwflshclub.formal_club.social;
import com.qpwflshclub.formal_club.pojo.User.*;
import com.qpwflshclub.formal_club.pojo.Club.Club;
import com.qpwflshclub.formal_club.repository.User.ClubPresidentRepository;
import com.qpwflshclub.formal_club.repository.Club.ClubRepository;
import com.qpwflshclub.formal_club.workspace.WorkspaceAccess;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ClubAppointments {
 @org.springframework.beans.factory.annotation.Autowired private OfficerAssignments officers;
 private final SchoolAccounts accounts;private final WorkspaceAccess access;private final ClubPresidentRepository presidents;private final ClubRepository clubs;
 public ClubAppointments(SchoolAccounts accounts,WorkspaceAccess access,ClubPresidentRepository presidents,ClubRepository clubs){this.accounts=accounts;this.access=access;this.presidents=presidents;this.clubs=clubs;}
 public Club authorize(UserBase actor,int club){if(access.vice(actor,club))throw SchoolAccounts.error(403,"任职邀请由社长、指导教师或管理员发送");return access.require(actor,club);}
 public void eligible(UserBase target,int club){if(!(target instanceof User||target instanceof ClubPresident))throw SchoolAccounts.error(400,"请选择学生或社长账号");}
 @Transactional public void accept(SocialStore.Invitation invitation){
  UserBase sender=accounts.find(invitation.sender()),target=accounts.find(invitation.recipient());Club club=authorize(sender,invitation.club());eligible(target,invitation.club());
  ClubPresident p=presidents.findByEmail(target.getEmail());
  if(p!=null&&p.getMainClub()!=null&&!Objects.equals(p.getMainClub().getId(),club.getId())){
   try{officers.assign(SchoolAccounts.key(target.getEmail()),club.getId(),invitation.role());}catch(java.io.IOException e){throw SchoolAccounts.error(503,"任职保存失败，请重试");}
   updateNames(club);accounts.invalidateDirectory();return;
  }
  if(officers!=null)try{officers.remove(SchoolAccounts.key(target.getEmail()),club.getId());}catch(java.io.IOException e){throw SchoolAccounts.error(503,"任职保存失败，请重试");}
  if(p==null){p=new ClubPresident();p.setEmail(target.getEmail());p.setUsername(target.getUsername());p.setUsernameEn(target.getUsernameEn());p.setPassword(target.getPassword());p.setClubs(new ArrayList<>(target.getClubs()==null?List.of():target.getClubs()));}
  p.setMainClub(club);p.setVicePresident(invitation.role().equals("vice_president"));if(p.getClubs()!=null)p.getClubs().removeIf(c->Objects.equals(c.getId(),club.getId()));presidents.save(p);
  List<ClubPresident> team=new ArrayList<>();presidents.findAll().forEach(team::add);ClubPresident accepted=p;if(team.stream().noneMatch(cp->Objects.equals(cp.getEmail(),accepted.getEmail())))team.add(p);
  if(officers!=null)for(var o:officers.all())if(o.club()==club.getId()){var u=accounts.find(o.account());var extra=new ClubPresident();extra.setUsername(u.getUsername());extra.setUsernameEn(u.getUsernameEn());extra.setMainClub(club);extra.setVicePresident(o.position().equals("vice_president"));team.add(extra);}
  List<ClubPresident> scoped=team.stream().filter(cp->cp.getMainClub()!=null&&Objects.equals(cp.getMainClub().getId(),club.getId())).toList();
  club.setPresident(names(scoped,false,false));club.setPresidentEn(names(scoped,false,true));club.setVicePresident(names(scoped,true,false));club.setVicePresidentEn(names(scoped,true,true));clubs.save(club);
 }
 private void updateNames(Club club){List<ClubPresident> team=new ArrayList<>();for(var p:presidents.findAll())if(p.getMainClub()!=null&&Objects.equals(p.getMainClub().getId(),club.getId()))team.add(p);for(var o:officers.all())if(o.club()==club.getId()){var u=accounts.find(o.account());var p=new ClubPresident();p.setUsername(u.getUsername());p.setUsernameEn(u.getUsernameEn());p.setVicePresident(o.position().equals("vice_president"));team.add(p);}club.setPresident(names(team,false,false));club.setPresidentEn(names(team,false,true));club.setVicePresident(names(team,true,false));club.setVicePresidentEn(names(team,true,true));clubs.save(club);}
 private String names(List<ClubPresident> team,boolean vice,boolean english){String value=team.stream().filter(OfficerAssignments::named).filter(p->p.isVicePresident()==vice).map(p->Objects.toString(english?p.getUsernameEn():p.getUsername(),"")).distinct().collect(Collectors.joining("、"));if(value.length()>200)throw SchoolAccounts.error(400,"负责人展示姓名过长，请联系管理员");return value;}
}

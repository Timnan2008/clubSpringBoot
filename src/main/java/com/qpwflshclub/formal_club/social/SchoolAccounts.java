package com.qpwflshclub.formal_club.social;
import com.qpwflshclub.formal_club.pojo.User.*;
import com.qpwflshclub.formal_club.repository.User.*;
import com.qpwflshclub.formal_club.service.User.IUserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Service
public class SchoolAccounts {
 public record Account(String id,String name,String nameEn,String role,String avatarUrl,String nickname,String position,String clubName,String clubNameEn,String grade,String avatarFrame,List<String> badges,Map<String,Object> appearance) {
 @com.fasterxml.jackson.annotation.JsonProperty("roles") public List<String> roles(){return "admin".equals(role)?List.of("admin","student"):"president".equals(role)?List.of("president","student"):List.of(role);}
 public Account(String id,String name,String nameEn,String role,String avatarUrl,String nickname,String position,String clubName,String clubNameEn,String grade,String avatarFrame,List<String> badges){this(id,name,nameEn,role,avatarUrl,nickname,position,clubName,clubNameEn,grade,avatarFrame,badges,Map.of());} public Account(String id,String name,String nameEn,String role,String avatarUrl,String nickname,String position,String clubName,String clubNameEn){this(id,name,nameEn,role,avatarUrl,nickname,position,clubName,clubNameEn,"","",List.of());} public Account(String id,String name,String nameEn,String role,String avatarUrl,String nickname,String position){this(id,name,nameEn,role,avatarUrl,nickname,position,"","");} public Account(String id,String name,String nameEn,String role,String avatarUrl,String nickname){this(id,name,nameEn,role,avatarUrl,nickname,role);} public Account(String id,String name,String nameEn,String role,String avatarUrl){this(id,name,nameEn,role,avatarUrl,"");} public Account(String id,String name,String nameEn,String role){this(id,name,nameEn,role,"","");} }
 @org.springframework.beans.factory.annotation.Autowired private AccountProfiles profiles;
 @org.springframework.beans.factory.annotation.Autowired private AvatarStore avatars;
 @org.springframework.beans.factory.annotation.Autowired private TeacherDayGifts teacherDay;
 @org.springframework.beans.factory.annotation.Autowired private ProfileAppearance appearance;
 private final IUserService users; private final UserRepository students; private final ClubPresidentRepository presidents; private final TeacherRepository teachers; private final AdminRepository admins;
 public SchoolAccounts(IUserService users,UserRepository students,ClubPresidentRepository presidents,TeacherRepository teachers,AdminRepository admins){this.users=users;this.students=students;this.presidents=presidents;this.teachers=teachers;this.admins=admins;}
 public UserBase current(HttpServletRequest request){var session=request.getSession(false);if(session==null||!(session.getAttribute("authenticatedEmail") instanceof String email))throw error(401,"请先登录校园账号");UserBase user=users.findByEmail(email);if(user==null)throw error(401,"账号不存在或会话已失效");return user;}
 public static String key(String email){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(email.trim().toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
 private static String realName(String preferred,String other){return preferred!=null&&!preferred.isBlank()?preferred:Objects.toString(other,"");}
 public Account view(UserBase u){
  String id=key(u.getEmail());boolean gifted=teacherDay!=null&&teacherDay.awarded(u);var look=appearance==null?Map.<String,Object>of():appearance.publicView(id,gifted);var settings=appearance==null?null:appearance.get(id);String frame=look.isEmpty()?(gifted?"teacher-day-2026":""):Objects.toString(look.get("frame"),"");if(frame.equals("none"))frame="";
  return new Account(id,realName(u.getUsername(),u.getUsernameEn()),realName(u.getUsernameEn(),u.getUsername()),u instanceof ClubPresident?"president":u instanceof Teacher?"teacher":u instanceof Admin?"admin":"student",avatars==null?"":avatars.url(id),profiles==null?"":profiles.get(u.getEmail()).nickname(),u instanceof ClubPresident p?(p.isVicePresident()?"vice_president":"president"):u instanceof Teacher?"teacher":u instanceof Admin?"admin":"student",u instanceof ClubPresident p&&p.getMainClub()!=null?Objects.toString(p.getMainClub().getClubName(),""):"",u instanceof ClubPresident p&&p.getMainClub()!=null?Objects.toString(p.getMainClub().getClubNameEn(),""):"",profiles==null?"":profiles.get(u.getEmail()).grade(),frame,gifted&&(settings==null||settings.holidayBadge())?List.of("teacher-day-2026"):List.of(),look);
 }
 private volatile Map<String,Account> cachedDirectory=Map.of();private volatile long directoryUntil=0;private volatile Map<String,String> directoryEmails=Map.of();
 public synchronized Map<String,Account> directory(){if(System.currentTimeMillis()>=directoryUntil){Map<String,Account> next=new HashMap<>();Map<String,String> emails=new HashMap<>();for(var u:all()){var a=view(u);next.put(a.id(),a);emails.put(a.id(),u.getEmail());}cachedDirectory=Map.copyOf(next);directoryEmails=Map.copyOf(emails);directoryUntil=System.currentTimeMillis()+10000;}return cachedDirectory;}
 public void invalidateDirectory(){directoryUntil=0;}
 public List<UserBase> all(){Map<String,UserBase> people=new LinkedHashMap<>();students.findAll().forEach(u->people.put(key(u.getEmail()),u));teachers.findAll().forEach(u->people.put(key(u.getEmail()),u));admins.findAll().forEach(u->people.put(key(u.getEmail()),u));presidents.findAll().forEach(u->people.put(key(u.getEmail()),u));return new ArrayList<>(people.values());}
 public UserBase find(String id){directory();String email=directoryEmails.get(id);var user=email==null?null:users.findByEmail(email);if(user==null)throw error(404,"没有找到这个账号");return user;}
 public static String searchQuery(String keyword){return ContentModeration.normalize(Objects.toString(keyword,"").strip()).replaceFirst("^@","").strip();}
 public static boolean matches(Account account,String query){return account!=null&&(ContentModeration.normalize(account.name()).contains(query)||ContentModeration.normalize(account.nameEn()).contains(query)||ContentModeration.normalize(account.nickname()).contains(query));}
 public List<Account> search(String keyword,String own){return search(keyword,own,false);}
 public List<Account> search(String keyword,String own,boolean includeSelf){
  if(keyword==null||keyword.length()>80)return List.of();String q=searchQuery(keyword);if(q.isBlank())return List.of();
  return directory().values().stream().filter(a->(includeSelf||!a.id().equals(own))&&matches(a,q))
   .sorted(Comparator.<Account>comparingInt(a->ContentModeration.normalize(a.nickname()).equals(q)||ContentModeration.normalize(a.name()).equals(q)||ContentModeration.normalize(a.nameEn()).equals(q)?0:1).thenComparing(Account::name).thenComparing(Account::id)).limit(20).toList();
 }
 public static ResponseStatusException error(int code,String message){return new ResponseStatusException(HttpStatus.valueOf(code),message);}
}

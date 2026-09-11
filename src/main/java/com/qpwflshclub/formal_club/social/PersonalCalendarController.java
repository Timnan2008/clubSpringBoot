package com.qpwflshclub.formal_club.social;
import com.qpwflshclub.formal_club.workspace.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import java.io.IOException;
import java.time.*;
import java.util.*;

@RestController @RequestMapping("/api/campus-social/calendar")
public class PersonalCalendarController {
 private final SchoolAccounts accounts;private final WorkspaceAccess access;private final CommunityController community;private final WorkspaceStore workspace;private final PersonalCalendarStore store;
 public PersonalCalendarController(SchoolAccounts a,WorkspaceAccess x,CommunityController c,WorkspaceStore w,PersonalCalendarStore s){accounts=a;access=x;community=c;workspace=w;store=s;}
 public record Event(String id,String title,String start,String end,String kind,String description,String location,int reminderMinutes,boolean completed,Integer clubId,String clubName,String clubNameEn){}
 @GetMapping public Object calendar(@RequestParam String from,@RequestParam String to,HttpServletRequest request)throws IOException{
  var user=accounts.current(request);LocalDate first,last;try{first=LocalDate.parse(from);last=LocalDate.parse(to);if(!last.isAfter(first)||last.isAfter(first.plusDays(93)))throw new IllegalArgumentException();}catch(Exception e){throw SchoolAccounts.error(400,"日历查询范围须在 1 至 93 天内");}
  String begin=first.atStartOfDay().toString(),end=last.atStartOfDay().toString();List<Event> events=new ArrayList<>();List<Map<String,Object>> clubs=new ArrayList<>();
  for(var club:community.memberClubs(user)){clubs.add(Map.of("id",club.getId(),"name",Objects.toString(club.getClubName(),""),"nameEn",Objects.toString(club.getClubNameEn(),"")));for(var a:workspace.read(club.getId()).activities())if(Set.of("scheduled","approved").contains(a.status())&&overlap(a.start(),a.end(),begin,end))events.add(new Event("club:"+club.getId()+":"+a.id(),a.title(),a.start(),a.end(),"club",a.description(),a.location(),15,false,club.getId(),club.getClubName(),club.getClubNameEn()));}
  for(var e:store.read(SchoolAccounts.key(user.getEmail())))if(overlap(e.start(),e.end(),begin,end))events.add(new Event(e.id(),e.title(),e.start(),e.end(),e.kind(),e.description(),e.location(),e.reminderMinutes(),e.completed(),null,"",""));
  events.sort(Comparator.comparing(Event::start).thenComparing(Event::id));return Map.of("account",accounts.view(user),"token",access.token(request),"clubs",clubs,"events",events,"timezone","Asia/Shanghai");
 }
 private boolean overlap(String start,String end,String first,String last){return start.compareTo(last)<0&&end.compareTo(first)>0;}
 private String owner(HttpServletRequest r){var u=accounts.current(r);access.mutation(r);return SchoolAccounts.key(u.getEmail());}
 @PostMapping public Object add(@RequestBody PersonalCalendarStore.Entry input,HttpServletRequest r)throws IOException{return store.save(owner(r),null,input);}
 @PutMapping("/{id}") public Object update(@PathVariable String id,@RequestBody PersonalCalendarStore.Entry input,HttpServletRequest r)throws IOException{return store.save(owner(r),id,input);}
 @DeleteMapping("/{id}") public Object delete(@PathVariable String id,HttpServletRequest r)throws IOException{store.delete(owner(r),id);return Map.of("ok",true);}
 @ExceptionHandler(ResponseStatusException.class) public ResponseEntity<?> error(ResponseStatusException e){return ResponseEntity.status(e.getStatusCode()).body(Map.of("message",Objects.toString(e.getReason(),"请求失败")));}
 @ExceptionHandler(IOException.class) public ResponseEntity<?> io(IOException e){return ResponseEntity.internalServerError().body(Map.of("message","日历暂时无法保存，请稍后重试"));}
}

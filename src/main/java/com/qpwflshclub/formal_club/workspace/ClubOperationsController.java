package com.qpwflshclub.formal_club.workspace;
import com.qpwflshclub.formal_club.pojo.User.*;
import com.qpwflshclub.formal_club.repository.User.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;import java.time.*;import java.io.IOException;
@RestController @RequestMapping("/api/club-workspace/{club}/operations") public class ClubOperationsController {
 private final WorkspaceAccess access;private final WorkspaceStore workspace;private final ClubOperationsStore store;private final WorkspaceController members;private final UserRepository students;
 public ClubOperationsController(WorkspaceAccess a,WorkspaceStore w,ClubOperationsStore s,WorkspaceController m,UserRepository u){access=a;workspace=w;store=s;members=m;students=u;}
 private UserBase require(int club,HttpServletRequest r,boolean write){var u=access.current(r);access.require(u,club);if(write)access.mutation(r);return u;}
 @GetMapping public Object data(@PathVariable int club,HttpServletRequest r)throws IOException{require(club,r,false);return store.read(club);}
 public record TermInput(String name,String start,String end){}
 @PostMapping("/terms") public Object term(@PathVariable int club,@RequestBody TermInput input,HttpServletRequest r)throws IOException{require(club,r,true);return store.term(club,input.name(),input.start(),input.end());}
 public record ReportInput(String term,String kind,String activity,String title,String content,String feedback,String improvements,String document,String status){}
 private WorkspaceStore.Activity activity(int club,String id)throws IOException{return workspace.read(club).activities().stream().filter(a->a.id().equals(id)&&(a.status().equals("scheduled")||a.status().equals("approved"))).findFirst().orElseThrow(()->WorkspaceStore.bad("请选择已安排或已通过的社团活动"));}
 @PutMapping("/reports") public Object report(@PathVariable int club,@RequestBody ReportInput input,HttpServletRequest r)throws IOException{
  var actor=require(club,r,true);var term=store.term(store.read(club),input.term());if(!Set.of("proposal","review","feedback").contains(Objects.toString(input.kind(),""))||!Set.of("draft","submitted").contains(Objects.toString(input.status(),"")))throw WorkspaceStore.bad("记录类型或提交状态无效");
  boolean submit=input.status().equals("submitted");String activity=Objects.toString(input.activity(),"");
  if(input.kind().equals("feedback")){var a=activity(club,activity);if(a.start().substring(0,10).compareTo(term.start())<0||a.start().substring(0,10).compareTo(term.end())>0)throw WorkspaceStore.bad("该活动不在所选学期内");if(submit&&LocalDateTime.parse(a.end()).isAfter(LocalDateTime.now(ZoneId.of("Asia/Shanghai"))))throw WorkspaceStore.bad("活动结束后才能提交反馈记录，可先保存草稿");}else if(!activity.isEmpty())throw WorkspaceStore.bad("学期记录不能关联单次活动");
  String document=Objects.toString(input.document(),"");if(!document.isEmpty())workspace.document(club,document);
  return store.report(club,new ClubOperationsStore.Report("",term.id(),input.kind(),activity,ClubOperationsStore.text(input.title(),160,submit),ClubOperationsStore.text(input.content(),10000,submit),ClubOperationsStore.text(input.feedback(),5000,submit&&input.kind().equals("feedback")),ClubOperationsStore.text(input.improvements(),5000,submit&&!input.kind().equals("proposal")),document,input.status(),"","",actor.getEmail()));
 }
 public record MarkInput(String member,String status){} public record AttendanceInput(List<MarkInput> marks){}
 @PutMapping("/attendance/{activity}") public Object attendance(@PathVariable int club,@PathVariable String activity,@RequestBody AttendanceInput input,HttpServletRequest r)throws IOException{
  var actor=require(club,r,true);var event=activity(club,activity);if(LocalDateTime.parse(event.start()).isAfter(LocalDateTime.now(ZoneId.of("Asia/Shanghai"))))throw WorkspaceStore.bad("活动开始后才能签到");
  if(input.marks()==null||input.marks().size()>5000)throw WorkspaceStore.bad("签到名单无效");Map<String,ClubOperationsStore.Mark> allowed=new LinkedHashMap<>();var previous=store.read(club).attendance().stream().filter(a->a.activity().equals(activity)).findFirst();if(previous.isPresent())for(var m:previous.get().marks())allowed.put(m.member(),m);
  for(var m:members.members(club,r)){String key=m.get("type")+":"+m.get("id");allowed.put(key,new ClubOperationsStore.Mark(key,m.get("name").toString(),m.get("nameEn").toString(),""));}
  Set<String> seen=new HashSet<>();List<ClubOperationsStore.Mark> marks=new ArrayList<>();for(var m:input.marks()){if(m==null||!allowed.containsKey(m.member())||!seen.add(m.member())||!Set.of("present","leave","absent").contains(Objects.toString(m.status(),"")))throw WorkspaceStore.bad("请选择本社团成员，签到状态为已到、请假或缺勤");var person=allowed.get(m.member());marks.add(new ClubOperationsStore.Mark(m.member(),person.name(),person.nameEn(),m.status()));}
  // Keep already recorded historical members if they were later removed from the roster.
  if(previous.isPresent())for(var m:previous.get().marks())if(!seen.contains(m.member()))marks.add(m);
  return store.attendance(club,activity,marks,actor.getEmail());
 }
 public record CandidateInput(String term,long student,String note){}
 @PostMapping("/candidates") public Object candidate(@PathVariable int club,@RequestBody CandidateInput input,HttpServletRequest r)throws IOException{require(club,r,true);var student=students.findById(input.student()).orElseThrow(()->WorkspaceStore.bad("学生账号不存在"));if(student.getClubs()!=null&&student.getClubs().stream().anyMatch(c->Objects.equals(c.getId(),club)))throw WorkspaceStore.bad("该同学已是本社团成员");return store.candidate(club,input.term(),input.student(),Objects.toString(student.getUsername(),""),Objects.toString(student.getUsernameEn(),""),input.note());}
 @PostMapping("/candidates/{id}/confirm") public synchronized Object confirm(@PathVariable int club,@PathVariable String id,HttpServletRequest r)throws IOException{require(club,r,true);var c=store.candidate(store.read(club),id);if(c.status().equals("confirmed"))return c;if(!c.status().equals("pending"))throw WorkspaceStore.bad("该招新记录已处理");members.addMember(club,c.student(),r);return store.decide(club,id,"confirmed");}
 @PostMapping("/candidates/{id}/decline") public synchronized Object decline(@PathVariable int club,@PathVariable String id,HttpServletRequest r)throws IOException{require(club,r,true);return store.decide(club,id,"declined");}
 @ExceptionHandler(ResponseStatusException.class) public ResponseEntity<?> error(ResponseStatusException e){return ResponseEntity.status(e.getStatusCode()).body(Map.of("message",Objects.toString(e.getReason(),"请求未成功")));}
 @ExceptionHandler(IOException.class) public ResponseEntity<?> io(IOException e){return ResponseEntity.internalServerError().body(Map.of("message","记录暂时无法保存，请稍后重试"));}
}

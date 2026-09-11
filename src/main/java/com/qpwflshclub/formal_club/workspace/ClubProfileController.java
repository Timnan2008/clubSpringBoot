package com.qpwflshclub.formal_club.workspace;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
import com.qpwflshclub.formal_club.repository.Club.ClubRepository;
import com.qpwflshclub.formal_club.pojo.Club.Club;
import java.util.*;
@RestController @RequestMapping("/api/club-workspace/{club}/profile") @Transactional
public class ClubProfileController {
 private final WorkspaceAccess access;private final ClubRepository clubs;public ClubProfileController(WorkspaceAccess access,ClubRepository clubs){this.access=access;this.clubs=clubs;}
 @org.springframework.beans.factory.annotation.Autowired private com.qpwflshclub.formal_club.repository.Club.ClubLikeDeviceRepository likes;
 public record Profile(String name,String slogan,String description,String president,String vicePresident,String nameEn,String sloganEn,String descriptionEn,String presidentEn,String vicePresidentEn,String logo,String video,int likes){public Profile(String name,String slogan,String description,String president,String vicePresident){this(name,slogan,description,president,vicePresident,"","","","","","","",0);}}
 private Club require(int id,HttpServletRequest r,boolean write){var u=access.current(r);var c=access.require(u,id);if(write)access.mutation(r);return c;}
 private String safe(String s){return Objects.toString(s,"");}
 private Profile view(Club c){return new Profile(safe(c.getClubName()),safe(c.getSortDescription()),safe(c.getClubDescription()),safe(c.getPresident()),safe(c.getVicePresident()),safe(c.getClubNameEn()),safe(c.getSortDescriptionEn()),safe(c.getClubDescriptionEn()),safe(c.getPresidentEn()),safe(c.getVicePresidentEn()),safe(c.getClubItem()),safe(c.getVideo()),c.getVideoLike()==null?0:c.getVideoLike());}
 @GetMapping public Profile get(@PathVariable int club,HttpServletRequest r){return view(require(club,r,false));}
 @PutMapping public Profile update(@PathVariable int club,@RequestBody Profile body,HttpServletRequest r){Club c=require(club,r,true);String nameEn=text(body.nameEn(),100,true);var existing=clubs.findByClubNameEn(nameEn);if(existing.isPresent()&&!Objects.equals(existing.get().getId(),c.getId()))throw WorkspaceStore.bad("该英文社团名已使用 / English club name already exists");if(!Objects.equals(c.getClubNameEn(),nameEn)&&likes!=null)likes.renameClub(c.getClubNameEn(),nameEn);c.setClubName(text(body.name(),100,true));c.setClubNameEn(nameEn);c.setSortDescription(text(body.slogan(),200,true));c.setSortDescriptionEn(text(body.sloganEn(),200,true));c.setClubDescription(text(body.description(),1000,true));c.setClubDescriptionEn(text(body.descriptionEn(),1000,true));clubs.save(c);return view(c);}
 private String text(String s,int max,boolean required){if(s==null||(required&&s.isBlank())||s.length()>max)throw WorkspaceStore.bad("请完整填写资料，并遵守字数限制");return s.trim();}
 @ExceptionHandler(ResponseStatusException.class) public ResponseEntity<?> error(ResponseStatusException e){return ResponseEntity.status(e.getStatusCode()).body(Map.of("message",Objects.toString(e.getReason(),"请求失败")));}
}

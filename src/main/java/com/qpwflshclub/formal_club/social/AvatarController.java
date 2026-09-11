package com.qpwflshclub.formal_club.social;
import com.qpwflshclub.formal_club.workspace.WorkspaceAccess;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;import java.io.IOException;
@RestController @RequestMapping("/api/campus-social") public class AvatarController {
 private final AvatarStore store;private final SchoolAccounts accounts;private final WorkspaceAccess access;
 public AvatarController(AvatarStore s,SchoolAccounts a,WorkspaceAccess w){store=s;accounts=a;access=w;}
 @PostMapping("/me/avatar") public Object upload(@RequestParam MultipartFile file,HttpServletRequest r)throws IOException{var u=accounts.current(r);access.mutation(r);String url=store.save(SchoolAccounts.key(u.getEmail()),file);accounts.invalidateDirectory();return Map.of("avatarUrl",url);}
 @DeleteMapping("/me/avatar") public Object remove(HttpServletRequest r)throws IOException{var u=accounts.current(r);access.mutation(r);store.remove(SchoolAccounts.key(u.getEmail()));accounts.invalidateDirectory();return Map.of("ok",true);}
 @GetMapping("/avatars/{id}") public ResponseEntity<byte[]> get(@PathVariable String id,HttpServletRequest r)throws IOException{accounts.current(r);return ResponseEntity.ok().contentType(MediaType.IMAGE_JPEG).header("Cache-Control","private, max-age=86400").header("X-Content-Type-Options","nosniff").body(store.read(id));}
 @ExceptionHandler(ResponseStatusException.class) public ResponseEntity<?> error(ResponseStatusException e){return ResponseEntity.status(e.getStatusCode()).body(Map.of("message",Objects.toString(e.getReason(),"请求未成功")));}
 @ExceptionHandler(IOException.class) public ResponseEntity<?> io(IOException e){return ResponseEntity.internalServerError().body(Map.of("message","头像暂时无法保存，请稍后重试"));}
}

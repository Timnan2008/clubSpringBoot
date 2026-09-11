package com.qpwflshclub.formal_club.social;
import com.qpwflshclub.formal_club.workspace.WorkspaceAccess;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.*;
import java.util.*;
import java.io.IOException;
@RestController @RequestMapping("/api/campus-social")
public class AppearanceController {
 private final SchoolAccounts accounts;private final WorkspaceAccess access;private final ProfileAppearance appearance;private final TeacherDayGifts gifts;private final AccountProfiles profiles;
 public AppearanceController(SchoolAccounts a,WorkspaceAccess w,ProfileAppearance p,TeacherDayGifts g,AccountProfiles d){accounts=a;access=w;appearance=p;gifts=g;profiles=d;}
 @GetMapping("/me/appearance") public Object get(HttpServletRequest r){var u=accounts.current(r);return Map.of("settings",appearance.get(SchoolAccounts.key(u.getEmail())),"gifted",gifts.awarded(u),"tags",profiles.get(u.getEmail()).tags(),"frames",appearance.library(SchoolAccounts.key(u.getEmail())));}
 @PutMapping("/me/appearance") public Object update(@RequestBody ProfileAppearance.Settings body,HttpServletRequest r)throws IOException{var u=accounts.current(r);access.mutation(r);var result=appearance.update(SchoolAccounts.key(u.getEmail()),body,gifts.awarded(u),profiles.get(u.getEmail()).tags());accounts.invalidateDirectory();return result;}
 @PostMapping("/me/appearance/{kind}") public Object upload(@PathVariable String kind,@RequestParam("file")MultipartFile file,HttpServletRequest r)throws IOException{var u=accounts.current(r);access.mutation(r);var result=appearance.upload(SchoolAccounts.key(u.getEmail()),kind,file);accounts.invalidateDirectory();return result;}
 @DeleteMapping("/me/appearance/frame") public Object removeFrame(HttpServletRequest r)throws IOException{var u=accounts.current(r);access.mutation(r);var result=appearance.removeFrame(SchoolAccounts.key(u.getEmail()));accounts.invalidateDirectory();return result;}
 @DeleteMapping("/me/appearance/frames/{frameId}") public Object removeOne(@PathVariable String frameId,HttpServletRequest r)throws IOException{var u=accounts.current(r);access.mutation(r);var result=appearance.removeFrame(SchoolAccounts.key(u.getEmail()),frameId);accounts.invalidateDirectory();return result;}
 @GetMapping("/appearance/files/{name}") public ResponseEntity<Resource> image(@PathVariable String name,HttpServletRequest r){accounts.current(r);return ResponseEntity.ok().contentType(name.endsWith(".webp")?MediaType.parseMediaType("image/webp"):name.endsWith(".png")?MediaType.IMAGE_PNG:MediaType.IMAGE_JPEG).header("Cache-Control","private, max-age=31536000, immutable").header("X-Content-Type-Options","nosniff").body(new FileSystemResource(appearance.file(name)));}
 @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class) public ResponseEntity<?> error(org.springframework.web.server.ResponseStatusException e){return ResponseEntity.status(e.getStatusCode()).body(Map.of("message",Objects.toString(e.getReason(),"Request failed")));}
}

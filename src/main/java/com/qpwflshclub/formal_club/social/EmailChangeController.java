package com.qpwflshclub.formal_club.social;

import com.qpwflshclub.formal_club.config.*;
import com.qpwflshclub.formal_club.workspace.WorkspaceAccess;
import com.qpwflshclub.formal_club.service.Suggestion.MailService;
import com.qpwflshclub.formal_club.pojo.User.*;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.io.IOException;

@RestController
@RequestMapping("/api/campus-social/me/email")
public class EmailChangeController {
 private final SchoolAccounts accounts;private final WorkspaceAccess access;private final LoginEmails emails;private final MailService mail;private final RememberMeService remember;
 @Value("${spring.mail.host:smtp.qiye.aliyun.com}") private String host;
 @Value("${spring.mail.port:465}") private int port;
 @Value("${spring.mail.username:}") private String username;
 @Value("${spring.mail.password:}") private String password;
 private final Map<String,Long> sent=new ConcurrentHashMap<>();
 private final SecureRandom random=new SecureRandom();
 private static final String KEY="emailChangeChallenge";
 public record Input(@NotBlank @Email @Size(max=254) String email,@NotBlank @Size(max=128) String currentPassword){}
 public record Verify(@NotBlank String email,@NotBlank @Size(min=6,max=6) String code){}
 record Challenge(String canonical,String email,String code,long expires,int attempts,String passwordVersion){}
 public EmailChangeController(SchoolAccounts a,WorkspaceAccess w,LoginEmails e,MailService m,RememberMeService r){accounts=a;access=w;emails=e;mail=m;remember=r;}
 @PostMapping("/code") public Object send(@Valid @RequestBody Input input,HttpServletRequest request){
  UserBase user=accounts.current(request);access.mutation(request);
  if(!PasswordCodec.matches(user.getPassword(),input.currentPassword()))throw SchoolAccounts.error(403,"当前密码不正确");
  String target=LoginEmails.normalize(input.email());
  if(user instanceof Teacher&&!target.endsWith("@shwfl.edu.cn"))throw SchoolAccounts.error(400,"教师请使用学校邮箱");
  emails.requireAvailable(target);
  long now=Instant.now().getEpochSecond();String identity=SchoolAccounts.key(user.getEmail());
  synchronized(sent){sent.entrySet().removeIf(e->e.getValue()+60<=now);if(sent.containsKey(identity))throw SchoolAccounts.error(429,"请等待 60 秒后再发送");sent.put(identity,now);}
  HttpSession session=request.getSession();String code=String.format(Locale.ROOT,"%06d",random.nextInt(1000000));
  session.removeAttribute(KEY);
  try{mail.sendCode(host,port,username,password,target,code);}catch(Exception e){throw SchoolAccounts.error(503,"验证码发送失败，请稍后重试");}
  session.setAttribute(KEY,new Challenge(user.getEmail(),target,code,now+300,0,user.getPassword()));
  return Map.of("ok",true,"retryAfter",60);
 }
 @PutMapping public Object confirm(@Valid @RequestBody Verify input,HttpServletRequest request,HttpServletResponse response)throws IOException{
  UserBase user=accounts.current(request);access.mutation(request);HttpSession session=request.getSession();
  synchronized(session){
   Object value=session.getAttribute(KEY);if(!(value instanceof Challenge c))throw SchoolAccounts.error(400,"请先发送验证码");
   if(c.expires()<Instant.now().getEpochSecond()||c.attempts()>=5||!c.canonical().equals(user.getEmail())||!Objects.equals(c.passwordVersion(),user.getPassword())){session.removeAttribute(KEY);throw SchoolAccounts.error(400,"验证码已失效，请重新发送");}
   session.setAttribute(KEY,new Challenge(c.canonical(),c.email(),c.code(),c.expires(),c.attempts()+1,c.passwordVersion()));
   if(!c.email().equals(LoginEmails.normalize(input.email()))||!java.security.MessageDigest.isEqual(c.code().getBytes(java.nio.charset.StandardCharsets.UTF_8),input.code().getBytes(java.nio.charset.StandardCharsets.UTF_8)))throw SchoolAccounts.error(400,"验证码不正确");
   emails.change(user.getEmail(),c.email());session.removeAttribute(KEY);remember.revoke(request,response);request.changeSessionId();
   return Map.of("ok",true,"email",c.email());
  }
 }
}

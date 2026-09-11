package com.qpwflshclub.formal_club.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qpwflshclub.formal_club.pojo.User.UserBase;
import com.qpwflshclub.formal_club.service.User.IUserService;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Instant;
import java.util.*;

/** Random bearer tokens are stored only as hashes, with an absolute 30-day expiry. */
@Service
public class RememberMeService {
 public static final String COOKIE="club_remember";
 public static final int DAYS30=30*24*60*60;
 private final Path root; private final IUserService users; private final ObjectMapper json=new ObjectMapper();
 public record Ticket(String email,String passwordVersion,long expires) {}
 public RememberMeService(@Value("${club.remember-dir:./data/remember}") String directory,IUserService users){this.root=Path.of(directory);this.users=users;}
 private static String hash(String value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
 private String token(HttpServletRequest request){if(request.getCookies()!=null)for(Cookie c:request.getCookies())if(COOKIE.equals(c.getName())&&c.getValue().matches("[a-f0-9]{64}"))return c.getValue();return null;}
 private void cookie(HttpServletRequest request,HttpServletResponse response,String value,int age){Cookie c=new Cookie(COOKIE,value);c.setPath("/");c.setHttpOnly(true);c.setSecure(request.isSecure());c.setMaxAge(age);c.setAttribute("SameSite","Lax");response.addCookie(c);}
 public synchronized void revoke(HttpServletRequest request,HttpServletResponse response){String token=token(request);if(token!=null)try{Files.deleteIfExists(root.resolve(hash(token)+".json"));}catch(java.io.IOException e){throw new IllegalStateException("Cannot revoke remembered login",e);}cookie(request,response,"",0);}
 public synchronized void issue(UserBase user,HttpServletRequest request,HttpServletResponse response){revoke(request,response);byte[] bytes=new byte[32];new SecureRandom().nextBytes(bytes);String token=HexFormat.of().formatHex(bytes);try{Files.createDirectories(root);try{Files.setPosixFilePermissions(root,java.nio.file.attribute.PosixFilePermissions.fromString("rwx------"));}catch(UnsupportedOperationException ignored){}Path file=root.resolve(hash(token)+".json");Files.write(file,json.writeValueAsBytes(new Ticket(user.getEmail(),hash(user.getPassword()),Instant.now().getEpochSecond()+DAYS30)),StandardOpenOption.CREATE_NEW);try{Files.setPosixFilePermissions(file,java.nio.file.attribute.PosixFilePermissions.fromString("rw-------"));}catch(UnsupportedOperationException ignored){}cookie(request,response,token,DAYS30);}catch(java.io.IOException e){throw new IllegalStateException("Cannot remember login",e);}}
 public synchronized void restore(HttpServletRequest request,HttpServletResponse response){if(request.getSession(false)!=null&&request.getSession(false).getAttribute("authenticatedEmail")!=null)return;String token=token(request);if(token==null)return;try{Path file=root.resolve(hash(token)+".json");if(!Files.isRegularFile(file)){cookie(request,response,"",0);return;}Ticket ticket=json.readValue(Files.readAllBytes(file),Ticket.class);UserBase user=ticket.expires()>Instant.now().getEpochSecond()?users.findByEmail(ticket.email()):null;if(user==null||!MessageDigest.isEqual(ticket.passwordVersion().getBytes(StandardCharsets.UTF_8),hash(user.getPassword()).getBytes(StandardCharsets.UTF_8))){revoke(request,response);return;}if(request.getSession(false)!=null)request.getSession(false).invalidate();var session=request.getSession(true);session.setAttribute("authenticatedEmail",user.getEmail());session.setMaxInactiveInterval(7*24*60*60);}catch(java.io.IOException e){cookie(request,response,"",0);}}
}

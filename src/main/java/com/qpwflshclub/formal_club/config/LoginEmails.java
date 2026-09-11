package com.qpwflshclub.formal_club.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qpwflshclub.formal_club.service.User.IUserService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.nio.file.*;
import java.util.*;
import java.io.IOException;

/** Login addresses may change; the original database identity stays stable for encrypted messages. */
@Service
public class LoginEmails {
 private final Path file;
 private final IUserService users;
 private final ObjectMapper json = new ObjectMapper();
 private final Map<String,String> addresses;
 public LoginEmails(@Value("${club.login-emails-file:./data/accounts/login-emails.json}") String path, IUserService users) throws IOException {
  this.file=Path.of(path);this.users=users;
  addresses=Files.exists(file)?json.readValue(Files.readAllBytes(file),new TypeReference<Map<String,String>>(){}):new HashMap<>();
 }
 public static String normalize(String email){return email==null?"":email.strip().toLowerCase(Locale.ROOT);}
 public synchronized String display(String canonical){return addresses.getOrDefault(normalize(canonical),canonical);}
 public synchronized String resolve(String login){String value=normalize(login);for(var e:addresses.entrySet())if(e.getValue().equals(value))return e.getKey();return addresses.containsKey(value)?null:value;}
 public synchronized void requireAvailable(String email){String value=normalize(email);if(addresses.containsValue(value)||users.findByEmail(value)!=null)throw new ResponseStatusException(HttpStatus.CONFLICT,"该邮箱已被使用");}
 public synchronized void change(String canonical,String email) throws IOException {
  requireAvailable(email);
  Map<String,String> next=new HashMap<>(addresses);next.put(normalize(canonical),normalize(email));
  Files.createDirectories(file.toAbsolutePath().getParent());
  Path temp=Files.createTempFile(file.toAbsolutePath().getParent(),"login-emails-",".tmp");
  try {Files.setPosixFilePermissions(temp,java.nio.file.attribute.PosixFilePermissions.fromString("rw-------"));Files.write(temp,json.writeValueAsBytes(next));Files.move(temp,file,StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);addresses.clear();addresses.putAll(next);}finally{Files.deleteIfExists(temp);}
 }
 public synchronized void removeAccount(String canonical)throws IOException{var next=new HashMap<>(addresses);next.remove(normalize(canonical));Files.createDirectories(file.toAbsolutePath().getParent());Path tmp=Files.createTempFile(file.toAbsolutePath().getParent(),"login-",".tmp");try{Files.write(tmp,json.writeValueAsBytes(next));Files.move(tmp,file,StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);addresses.clear();addresses.putAll(next);}finally{Files.deleteIfExists(tmp);}}
}

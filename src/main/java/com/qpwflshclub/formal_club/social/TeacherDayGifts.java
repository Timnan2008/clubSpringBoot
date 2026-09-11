package com.qpwflshclub.formal_club.social;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.qpwflshclub.formal_club.pojo.User.*;
import com.qpwflshclub.formal_club.repository.User.TeacherRepository;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import java.io.IOException;
@Service public class TeacherDayGifts {
 private final Path file;private final TeacherRepository teachers;private final Set<String> recipients;private final ObjectMapper json=new ObjectMapper();
 public TeacherDayGifts(@Value("${club.teacher-day-file:./data/accounts/teacher-day-2026.json}")String path,TeacherRepository teachers)throws IOException{this.file=Path.of(path).toAbsolutePath();this.teachers=teachers;recipients=Files.exists(file)?json.readValue(Files.readAllBytes(file),new TypeReference<LinkedHashSet<String>>(){}):new LinkedHashSet<>();}
 public static boolean celebration(LocalDate date){return date.equals(LocalDate.of(2026,9,10));}
 public boolean today(){return celebration(LocalDate.now(ZoneId.of("Asia/Shanghai")));}
 @EventListener(ApplicationReadyEvent.class) public synchronized void distribute()throws IOException{if(!today())return;Set<String> before=new LinkedHashSet<>(recipients);for(var teacher:teachers.findAll())recipients.add(SchoolAccounts.key(teacher.getEmail()));if(!before.equals(recipients))try{persist();}catch(IOException e){recipients.clear();recipients.addAll(before);throw e;}}
 public synchronized boolean awarded(UserBase user){if(!(user instanceof Teacher))return false;String id=SchoolAccounts.key(user.getEmail());if(!recipients.contains(id)&&today()){recipients.add(id);try{persist();}catch(IOException e){recipients.remove(id);throw new IllegalStateException("Unable to save teacher gift",e);}}return recipients.contains(id);}
 private void persist()throws IOException{Files.createDirectories(file.getParent());Path tmp=Files.createTempFile(file.getParent(),"teacher-gifts-",".tmp");try{Files.write(tmp,json.writeValueAsBytes(recipients));Files.move(tmp,file,StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);}finally{Files.deleteIfExists(tmp);}}
 public synchronized void removeAccount(String id)throws IOException{if(recipients.remove(id))persist();}
}

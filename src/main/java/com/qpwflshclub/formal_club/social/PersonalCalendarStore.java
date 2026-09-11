package com.qpwflshclub.formal_club.social;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.nio.file.*;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;

/** Per-account private calendars, persisted atomically outside the public directory. */
@Service public class PersonalCalendarStore {
 public record Entry(String id,String title,String start,String end,String kind,String description,String location,int reminderMinutes,boolean completed){}
 private final Path root;private final ObjectMapper json;
 public PersonalCalendarStore(ObjectMapper json,@Value("${club.personal-calendar-dir:./data/personal-calendars}")String path){this.json=json;root=Path.of(path).toAbsolutePath();}
 private Path file(String owner){if(!owner.matches("[a-f0-9]{64}"))throw new IllegalArgumentException();return root.resolve(owner+".json");}
 public synchronized List<Entry> read(String owner)throws IOException{Path p=file(owner);return Files.exists(p)?json.readValue(p.toFile(),new TypeReference<ArrayList<Entry>>(){}):new ArrayList<>();}
 private void persist(String owner,List<Entry> entries)throws IOException{Files.createDirectories(root);Path temp=Files.createTempFile(root,"calendar-",".tmp");try{Files.setPosixFilePermissions(temp,java.nio.file.attribute.PosixFilePermissions.fromString("rw-------"));json.writeValue(temp.toFile(),entries);Files.move(temp,file(owner),StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);}finally{Files.deleteIfExists(temp);}}
 public static Entry validate(String id,Entry e){if(e==null)throw SchoolAccounts.error(400,"请填写日历事件");String title=clean(e.title(),120),description=clean(e.description(),2000),location=clean(e.location(),150);if(title.isBlank()||!Set.of("homework","memo","event").contains(Objects.toString(e.kind(),""))||!Set.of(-1,0,5,15,30,60,1440).contains(e.reminderMinutes()))throw SchoolAccounts.error(400,"请检查标题、类型和提醒时间");try{var start=LocalDateTime.parse(e.start());var end=LocalDateTime.parse(e.end());if(!end.isAfter(start)||end.isAfter(start.plusDays(31))||start.getYear()<2020||end.getYear()>2100)throw new IllegalArgumentException();return new Entry(id,title,start.toString(),end.toString(),e.kind(),description,location,e.reminderMinutes(),e.completed());}catch(Exception ex){throw SchoolAccounts.error(400,"结束时间须晚于开始时间，单个事件最多 31 天");}}
 private static String clean(String text,int max){String value=Objects.toString(text,"").strip();if(value.length()>max)throw SchoolAccounts.error(400,"填写内容过长");return value;}
 public synchronized Entry save(String owner,String id,Entry input)throws IOException{List<Entry> entries=read(owner);int index=-1;if(id!=null){for(int i=0;i<entries.size();i++)if(entries.get(i).id().equals(id))index=i;if(index<0)throw SchoolAccounts.error(404,"没有找到此事件");}else if(entries.size()>=2000)throw SchoolAccounts.error(400,"日历最多保留 2000 个个人事件，请清理已完成项目");Entry entry=validate(id==null?UUID.randomUUID().toString():id,input);if(index<0)entries.add(entry);else entries.set(index,entry);persist(owner,entries);return entry;}
 public synchronized void delete(String owner,String id)throws IOException{List<Entry> entries=read(owner);if(!entries.removeIf(e->e.id().equals(id)))throw SchoolAccounts.error(404,"没有找到此事件");persist(owner,entries);}
 public synchronized void removeAccount(String id)throws IOException{Files.deleteIfExists(file(id));}
}

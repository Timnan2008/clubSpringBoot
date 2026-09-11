package com.qpwflshclub.formal_club.social;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.nio.file.*;
import java.io.IOException;
import java.time.*;
import java.util.*;
@Service public class PostViews {
 public record Count(long views,Map<String,Long> readers){}
 private final Path file;private final ObjectMapper mapper;private Map<String,Count> data;
 public PostViews(ObjectMapper mapper,@Value("${club.social-dir:./data/campus-social}")String root){this.mapper=mapper;file=Path.of(root).resolve("post-views.json");}
 private Map<String,Count> data()throws IOException{if(data==null)data=Files.exists(file)?mapper.readValue(file.toFile(),new TypeReference<Map<String,Count>>(){}):new HashMap<>();return data;}
 public synchronized long count(String id)throws IOException{return data().getOrDefault(id,new Count(0,Map.of())).views();}
 public synchronized Map<String,Long> record(List<String> ids,String actor)throws IOException{return record(ids,actor,System.currentTimeMillis());}
 synchronized Map<String,Long> record(List<String> ids,String actor,long now)throws IOException{
  var next=new HashMap<>(data());Map<String,Long> result=new LinkedHashMap<>();boolean changed=false;long cutoff=now-Duration.ofHours(24).toMillis();
  for(String id:new LinkedHashSet<>(ids)){var old=next.getOrDefault(id,new Count(0,Map.of()));var readers=new HashMap<>(old.readers());long count=old.views();if(readers.getOrDefault(actor,Long.MIN_VALUE)<=cutoff){readers.entrySet().removeIf(e->e.getValue()<=cutoff);readers.put(actor,now);count++;next.put(id,new Count(count,readers));changed=true;}result.put(id,count);}
  if(changed){Files.createDirectories(file.toAbsolutePath().getParent());Path tmp=Files.createTempFile(file.toAbsolutePath().getParent(),"views-",".tmp");try{mapper.writeValue(tmp.toFile(),next);Files.move(tmp,file,StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);data=next;}finally{Files.deleteIfExists(tmp);}}return result;
 }
 public synchronized void removeAccount(String id,Set<String> posts)throws IOException{var next=new HashMap<>(data());posts.forEach(next::remove);next.replaceAll((k,v)->{var readers=new HashMap<>(v.readers());readers.remove(id);return new Count(v.views(),readers);});Files.createDirectories(file.toAbsolutePath().getParent());Path tmp=Files.createTempFile(file.toAbsolutePath().getParent(),"views-",".tmp");try{mapper.writeValue(tmp.toFile(),next);Files.move(tmp,file,StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);data=next;}finally{Files.deleteIfExists(tmp);}}
}

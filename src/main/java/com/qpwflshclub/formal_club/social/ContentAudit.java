package com.qpwflshclub.formal_club.social;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import java.nio.file.*;
import java.nio.file.attribute.PosixFilePermissions;
import java.io.IOException;
@Service public class ContentAudit {
 private final Path file;private final java.util.Map<String,String> actors=new java.util.HashMap<>();
 public ContentAudit(@Value("${club.social-dir:./data/campus-social}")String root){file=Path.of(root).resolve("content-audit.log");try{if(Files.exists(file))try(var lines=Files.lines(file)){lines.forEach(line->{var parts=line.split(" ");if(parts.length>=4)actors.put(parts[1]+":"+parts[2].substring(3),parts[3].substring(8));});}}catch(IOException ignored){}}
 public synchronized String actor(String kind,String id){return actors.get(kind+":"+id);}
 public synchronized void record(String kind,String id,String actor,boolean anonymous){actors.put(kind+":"+id,actor);try{Files.createDirectories(file.getParent());if(!Files.exists(file)){Files.createFile(file);try{Files.setPosixFilePermissions(file,PosixFilePermissions.fromString("rw-------"));}catch(UnsupportedOperationException ignored){}}Files.writeString(file,java.time.Instant.now()+" "+kind+" id="+id+" account="+actor+" anonymous="+anonymous+"\n",StandardOpenOption.APPEND);}catch(IOException e){org.slf4j.LoggerFactory.getLogger(getClass()).error("Content audit storage failed for {} {}",kind,id);}}
 public synchronized java.util.Set<String> owned(String id,String kind){java.util.Set<String> out=new java.util.HashSet<>();actors.forEach((key,actor)->{if(actor.equals(id)&&key.startsWith(kind+":"))out.add(key.substring(kind.length()+1));});return out;}
 public synchronized void removeAccount(String id)throws IOException{actors.entrySet().removeIf(e->e.getValue().equals(id));if(!Files.exists(file))return;var kept=Files.readAllLines(file).stream().filter(line->!line.contains(" account="+id+" ")).toList();Path tmp=Files.createTempFile(file.getParent(),"audit-",".tmp");try{Files.write(tmp,kept);Files.move(tmp,file,StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);}finally{Files.deleteIfExists(tmp);}}
}

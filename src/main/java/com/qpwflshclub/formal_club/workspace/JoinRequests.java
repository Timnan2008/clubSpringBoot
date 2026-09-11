package com.qpwflshclub.formal_club.workspace;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import java.nio.file.*;import java.util.*;import java.time.Instant;import java.io.IOException;
@Service public class JoinRequests {
 public record Entry(String id,String account,String name,String nameEn,String note,String status,String createdAt,String reviewedBy){}
 private final Path root;private final ObjectMapper json=new ObjectMapper();
 public JoinRequests(@Value("${club.join-dir:./data/join-requests}") String path){root=Path.of(path);}
 public synchronized List<Entry> read(int club)throws IOException{Path p=root.resolve(club+".json");return Files.exists(p)?json.readValue(Files.readAllBytes(p),new TypeReference<ArrayList<Entry>>(){}):new ArrayList<>();}
 private void write(int club,List<Entry> entries)throws IOException{Files.createDirectories(root);Path p=Files.createTempFile(root,"join-",".tmp");try{Files.setPosixFilePermissions(p,java.nio.file.attribute.PosixFilePermissions.fromString("rw-------"));Files.write(p,json.writeValueAsBytes(entries));Files.move(p,root.resolve(club+".json"),StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);}finally{Files.deleteIfExists(p);}}
 public synchronized Entry apply(int club,String account,String name,String nameEn,String note)throws IOException{var entries=read(club);var pending=entries.stream().filter(e->e.account().equals(account)&&e.status().equals("pending")).findFirst();if(pending.isPresent())return pending.get();if(note!=null&&note.length()>1000)throw WorkspaceStore.bad("申请理由不能超过1000字");var e=new Entry(UUID.randomUUID().toString(),account,name,nameEn,Objects.toString(note,"").strip(),"pending",Instant.now().toString(),"");entries.add(0,e);write(club,entries);return e;}
 public synchronized Entry decide(int club,String id,String status,String reviewer)throws IOException{var entries=read(club);var e=entries.stream().filter(x->x.id().equals(id)).findFirst().orElseThrow(()->WorkspaceStore.bad("申请不存在"));if(!Set.of("approved","declined").contains(status))throw WorkspaceStore.bad("处理结果无效");if(e.status().equals(status))return e;if(!e.status().equals("pending"))throw WorkspaceStore.bad("申请已处理");var next=new Entry(e.id(),e.account(),e.name(),e.nameEn(),e.note(),status,e.createdAt(),reviewer);entries.set(entries.indexOf(e),next);write(club,entries);return next;}
 public synchronized void removeAccount(int club,String id)throws IOException{var rows=read(club);rows.removeIf(v->v.account().equals(id));rows.replaceAll(v->id.equals(v.reviewedBy())?new Entry(v.id(),v.account(),v.name(),v.nameEn(),v.note(),v.status(),v.createdAt(),""):v);write(club,rows);}
}

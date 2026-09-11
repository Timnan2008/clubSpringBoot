package com.qpwflshclub.formal_club.social;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.nio.file.*;import java.util.*;import java.io.IOException;
@Service public class ChatPreferences {
 public record Preference(boolean pinned,boolean blocked){}
 private final Path file;private final ObjectMapper json;private Map<String,Map<String,Preference>> rows;
 public ChatPreferences(ObjectMapper json,@Value("${club.social-dir:./data/campus-social}")String dir)throws IOException{this.json=json;file=Path.of(dir).resolve("chat-preferences.json");rows=Files.exists(file)?json.readValue(file.toFile(),new TypeReference<LinkedHashMap<String,Map<String,Preference>>>(){}):new LinkedHashMap<>();}
 public synchronized Preference get(String me,String peer){return rows.getOrDefault(me,Map.of()).getOrDefault(peer,new Preference(false,false));}
 public synchronized Set<String> peers(String me){return Set.copyOf(rows.getOrDefault(me,Map.of()).keySet());}
 public boolean allowed(String me,String peer){return !get(me,peer).blocked()&&!get(peer,me).blocked();}
 public void requireAllowed(String me,String peer){if(!allowed(me,peer))throw SchoolAccounts.error(403,"当前无法向此账号发送私信 / Messaging is unavailable for this account");}
 public synchronized Preference update(String me,String peer,Preference value)throws IOException{if(me.equals(peer))throw SchoolAccounts.error(400,"不能对自己执行此操作 / Cannot apply to yourself");var next=new LinkedHashMap<>(rows);var mine=new LinkedHashMap<>(rows.getOrDefault(me,Map.of()));mine.put(peer,value);next.put(me,mine);Files.createDirectories(file.toAbsolutePath().getParent());Path tmp=Files.createTempFile(file.toAbsolutePath().getParent(),"chat-",".json");try{json.writeValue(tmp.toFile(),next);Files.move(tmp,file,StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);rows=next;}finally{Files.deleteIfExists(tmp);}return value;}
 public synchronized void removeAccount(String id)throws IOException{var next=new LinkedHashMap<String,Map<String,Preference>>();rows.forEach((account,peers)->{if(!account.equals(id)){var kept=new LinkedHashMap<>(peers);kept.remove(id);next.put(account,kept);}});Files.createDirectories(file.toAbsolutePath().getParent());Path tmp=Files.createTempFile(file.toAbsolutePath().getParent(),"chat-",".tmp");try{json.writeValue(tmp.toFile(),next);Files.move(tmp,file,StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);rows=next;}finally{Files.deleteIfExists(tmp);}}
}

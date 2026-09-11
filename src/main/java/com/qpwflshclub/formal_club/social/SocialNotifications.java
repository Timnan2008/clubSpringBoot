package com.qpwflshclub.formal_club.social;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.nio.file.*;
import java.io.IOException;
import java.util.*;

/** Only IDs and read markers are stored here; encrypted chat content stays in SocialStore. */
@Service public class SocialNotifications {
 public record Mention(int start,int end,String account){}
 public record State(Map<String,List<Mention>> mentions,Map<String,Set<String>> read){}
 private final Path file;private final ObjectMapper json;private State state;
 public SocialNotifications(ObjectMapper json,@Value("${club.social-dir:./data/campus-social}")String root){this.json=json;file=Path.of(root).resolve("notifications.json");}
 private State state()throws IOException{if(state==null)state=Files.exists(file)?json.readValue(file.toFile(),State.class):new State(new HashMap<>(),new HashMap<>());return state;}
 private void save(State next)throws IOException{Files.createDirectories(file.toAbsolutePath().getParent());Path tmp=Files.createTempFile(file.toAbsolutePath().getParent(),"notifications-",".tmp");try{json.writeValue(tmp.toFile(),next);Files.move(tmp,file,StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);state=next;}finally{Files.deleteIfExists(tmp);}}
 public List<Mention> validate(String text,List<Mention> mentions,SchoolAccounts accounts){if(mentions==null||mentions.isEmpty())return List.of();if(mentions.size()>20)throw SchoolAccounts.error(400,"最多提及 20 人 / Mention up to 20 people");int end=0;var sorted=mentions.stream().sorted(Comparator.comparingInt(Mention::start)).toList();for(var m:sorted){if(text==null||m.start()<end||m.end()<=m.start()+1||m.end()>text.length()||text.charAt(m.start())!='@')throw SchoolAccounts.error(400,"提及内容无效 / Invalid mention");accounts.find(m.account());end=m.end();}int leading=text.indexOf(text.trim());return sorted.stream().map(m->new Mention(m.start()-leading,m.end()-leading,m.account())).toList();}
 public synchronized void attach(String post,List<Mention> mentions)throws IOException{if(mentions.isEmpty())return;var s=state();var map=new HashMap<>(s.mentions());map.put(post,mentions);save(new State(map,s.read()));}
 public synchronized List<Mention> mentions(String post)throws IOException{return List.copyOf(state().mentions().getOrDefault(post,List.of()));}
 public synchronized boolean read(String me,String id)throws IOException{return state().read().getOrDefault(me,Set.of()).contains(id);}
 public synchronized void mark(String me,Collection<String> ids)throws IOException{var s=state();var map=new HashMap<>(s.read());var seen=new HashSet<>(map.getOrDefault(me,Set.of()));seen.addAll(ids);map.put(me,seen);save(new State(s.mentions(),map));}
 public synchronized void removeAccount(String id,Set<String> posts)throws IOException{var old=state();var mentions=new HashMap<>(old.mentions());posts.forEach(mentions::remove);mentions.replaceAll((k,v)->v.stream().filter(m->!m.account().equals(id)).toList());var read=new HashMap<>(old.read());read.remove(id);save(new State(mentions,read));}
}

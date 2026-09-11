package com.qpwflshclub.formal_club.config;
import org.springframework.stereotype.Service;
import java.util.*;
import java.time.Clock;
import com.qpwflshclub.formal_club.social.SchoolAccounts;
@Service public class LoginProtection {
 private record Attempt(int count,long expires){}
 private final Map<String,Attempt> failures=new HashMap<>();private final Clock clock;
 public LoginProtection(){this(Clock.systemUTC());} LoginProtection(Clock clock){this.clock=clock;}
 private String account(String email){return "a:"+String.valueOf(email).trim().toLowerCase(Locale.ROOT);}
 private void prune(){long now=clock.millis();failures.values().removeIf(v->v.expires<=now);}
 public synchronized void check(String email,String ip){prune();if(failures.size()>20000||failures.getOrDefault(account(email),new Attempt(0,0)).count>=5||failures.getOrDefault("i:"+ip,new Attempt(0,0)).count>=30)throw SchoolAccounts.error(429,"尝试过于频繁，请 15 分钟后再试 / Too many attempts. Try again in 15 minutes");}
 public synchronized void failed(String email,String ip){for(String key:List.of(account(email),"i:"+ip)){var old=failures.get(key);failures.put(key,new Attempt(old==null?1:old.count+1,old==null?clock.millis()+900000:old.expires));}}
 public synchronized void success(String email){failures.remove(account(email));}
}

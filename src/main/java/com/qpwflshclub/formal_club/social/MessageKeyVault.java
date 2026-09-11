package com.qpwflshclub.formal_club.social;
import org.springframework.stereotype.Service;import org.springframework.transaction.annotation.Transactional;import com.fasterxml.jackson.databind.ObjectMapper;import java.util.*;
@Service public class MessageKeyVault {
 private final MessageKeyBackupRepository repo;private final ObjectMapper mapper;
 public MessageKeyVault(MessageKeyBackupRepository repo,ObjectMapper mapper){this.repo=repo;this.mapper=mapper;}
 public String get(String id){return repo.findById(id).map(v->v.envelope).orElse("");}
 public void validate(String id,String envelope){try{if(envelope==null||envelope.length()>20000)throw new IllegalArgumentException();var e=mapper.readTree(envelope);if(e.size()!=5||e.path("version").asInt()!=1||!id.equals(e.path("account").asText())||Base64.getDecoder().decode(e.path("iv").asText()).length!=12||Base64.getDecoder().decode(e.path("salt").asText()).length!=16)throw new IllegalArgumentException();int n=Base64.getDecoder().decode(e.path("ciphertext").asText()).length;if(n<32||n>12000)throw new IllegalArgumentException();}catch(Exception e){throw SchoolAccounts.error(400,"加密备份格式无效 / Invalid encrypted backup");}}
 @Transactional public synchronized void create(String id,String envelope){validate(id,envelope);if(repo.existsById(id))throw SchoolAccounts.error(409,"已存在加密备份，请重新登录同步 / Sign in again to sync your messages");repo.save(new MessageKeyBackup(id,envelope));}
 @Transactional public void replace(String id,String envelope){validate(id,envelope);var row=repo.findById(id).orElseGet(()->new MessageKeyBackup(id,envelope));row.envelope=envelope;repo.save(row);}
}

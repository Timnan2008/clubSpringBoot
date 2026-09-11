package com.qpwflshclub.formal_club.social;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.nio.file.*;
import java.security.*;
import java.security.spec.*;
import java.security.interfaces.ECPublicKey;
import java.util.*;
import java.io.IOException;

@Service
public class MessageKeys {
 public record PublicKeyInfo(String publicKey,String fingerprint){}
 private final ObjectMapper mapper;private final Path root;private final Map<String,PublicKeyInfo> cache=new HashMap<>();
 public MessageKeys(ObjectMapper mapper,@Value("${club.social-dir:./data/campus-social}")String path){this.mapper=mapper;root=Path.of(path).resolve("keys").toAbsolutePath();}
 private Path file(String account){if(!account.matches("[a-f0-9]{64}"))throw SchoolAccounts.error(400,"账号格式无效");return root.resolve(account+".json");}
 public synchronized PublicKeyInfo get(String account)throws IOException{var f=file(account);var known=cache.get(account);if(known!=null)return known;if(!Files.exists(f))return null;var value=mapper.readValue(f.toFile(),PublicKeyInfo.class);if(cache.size()<20000)cache.put(account,value);return value;}
 public synchronized PublicKeyInfo register(String account,String encoded)throws IOException{
  PublicKeyInfo next;try{if(encoded==null||encoded.length()>300)throw new IllegalArgumentException();byte[] raw=Base64.getDecoder().decode(encoded);var key=(ECPublicKey)KeyFactory.getInstance("EC").generatePublic(new X509EncodedKeySpec(raw));AlgorithmParameters params=AlgorithmParameters.getInstance("EC");params.init(new ECGenParameterSpec("secp256r1"));if(!key.getParams().getOrder().equals(params.getParameterSpec(ECParameterSpec.class).getOrder()))throw new IllegalArgumentException();next=new PublicKeyInfo(Base64.getEncoder().encodeToString(raw),HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(raw)));}catch(Exception e){throw SchoolAccounts.error(400,"加密公钥格式无效");}
  var old=get(account);if(old!=null){if(!old.equals(next))throw SchoolAccounts.error(409,"此账号已有加密密钥，请导入原密钥备份");return old;}
  Files.createDirectories(root);Path tmp=Files.createTempFile(root,"key-",".tmp");try{mapper.writeValue(tmp.toFile(),next);Files.move(tmp,file(account),StandardCopyOption.ATOMIC_MOVE);}finally{Files.deleteIfExists(tmp);}return next;
 }
 public void validateMessage(String sender,String recipient,String payload)throws IOException{
  if(payload==null||!payload.startsWith("e2ee:v1:")||payload.length()>16000)throw SchoolAccounts.error(400,"私信必须在设备上端到端加密后发送");
  var a=get(sender);var b=get(recipient);if(a==null||b==null)throw SchoolAccounts.error(409,"双方都需要先开启加密私信");
  try{var e=mapper.readTree(payload.substring(8));if(e.size()!=5||e.path("v").asInt()!=1||!a.fingerprint().equals(e.path("senderKey").asText())||!b.fingerprint().equals(e.path("recipientKey").asText()))throw new IllegalArgumentException();if(Base64.getDecoder().decode(e.path("iv").asText()).length!=12)throw new IllegalArgumentException();int bytes=Base64.getDecoder().decode(e.path("ciphertext").asText()).length;if(bytes<17||bytes>11016)throw new IllegalArgumentException();}catch(Exception ex){throw SchoolAccounts.error(400,"加密消息格式或密钥不匹配");}
 }
 public synchronized void removeAccount(String id)throws IOException{Files.deleteIfExists(file(id));cache.remove(id);}
}

package com.qpwflshclub.formal_club.service.Suggestion;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qpwflshclub.formal_club.social.SchoolAccounts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;

@Service
public class TurnstileService {
 private final String siteKey,secret;
 private final Set<String> hostnames;
 private final ObjectMapper mapper;
 private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
 public TurnstileService(ObjectMapper mapper,@Value("${club.turnstile.site-key:}")String siteKey,@Value("${club.turnstile.secret-key:}")String secret,@Value("${club.turnstile.hostnames:qpwflhsclub.com,www.qpwflhsclub.com}")String hosts){
  this.mapper=mapper;this.siteKey=siteKey;this.secret=secret;
  this.hostnames=new HashSet<>(Arrays.asList(hosts.toLowerCase(Locale.ROOT).split("\\s*,\\s*")));
 }
 public Map<String,Object> configuration(){return Map.of("siteKey",siteKey,"ready",!siteKey.isBlank()&&!secret.isBlank());}
 public void verify(String token){verify(token,"suggestion");}
 public void verify(String token,String action){
  if(siteKey.isBlank()||secret.isBlank())throw SchoolAccounts.error(503,"人机验证尚未配置，请稍后再试");
  if(token==null||token.isBlank()||token.length()>2048)throw SchoolAccounts.error(400,"请完成人机验证");
  JsonNode result;
  try{
   String form="secret="+URLEncoder.encode(secret,StandardCharsets.UTF_8)+"&response="+URLEncoder.encode(token,StandardCharsets.UTF_8);
   var req=HttpRequest.newBuilder(URI.create("https://challenges.cloudflare.com/turnstile/v0/siteverify")).timeout(Duration.ofSeconds(10)).header("Content-Type","application/x-www-form-urlencoded").POST(HttpRequest.BodyPublishers.ofString(form)).build();
   var response=client.send(req,HttpResponse.BodyHandlers.ofString());
   if(response.statusCode()!=200)throw new java.io.IOException("Verification service unavailable");
   result=mapper.readTree(response.body());
  }catch(InterruptedException e){Thread.currentThread().interrupt();throw SchoolAccounts.error(503,"验证服务暂不可用，请重试");}
   catch(java.io.IOException e){throw SchoolAccounts.error(503,"验证服务暂不可用，请重试");}
  validate(result,action);
 }
 // Siteverify rejects expired and reused tokens. Bind successful tokens to this site and form.
 void validate(JsonNode result){validate(result,"suggestion");}
 void validate(JsonNode result,String action){
  if(result==null||!result.path("success").asBoolean(false)||!hostnames.contains(result.path("hostname").asText().toLowerCase(Locale.ROOT))||!action.equals(result.path("action").asText()))
   throw SchoolAccounts.error(400,"验证未通过或已过期，请重新验证");
 }
}

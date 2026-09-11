package com.qpwflshclub.formal_club.service.Suggestion;
import com.fasterxml.jackson.databind.ObjectMapper;import org.junit.jupiter.api.Test;import static org.assertj.core.api.Assertions.*;
class TurnstileServiceTest{
 ObjectMapper json=new ObjectMapper();TurnstileService service=new TurnstileService(json,"site","private-secret","localhost,qpwflhsclub.com");
 @Test void verifiesSuccessSiteAndAction()throws Exception{
  service.validate(json.readTree("{\"success\":true,\"hostname\":\"qpwflhsclub.com\",\"action\":\"suggestion\"}"));
  for(String invalid:new String[]{"{}","{\"success\":false,\"error-codes\":[\"timeout-or-duplicate\"]}","{\"success\":true,\"hostname\":\"evil.com\",\"action\":\"suggestion\"}","{\"success\":true,\"hostname\":\"localhost\",\"action\":\"login\"}"})assertThatThrownBy(()->service.validate(json.readTree(invalid))).hasMessageContaining("400");
 }
 @Test void noTokenOrConfigurationFailsClosed(){assertThatThrownBy(()->service.verify("")).hasMessageContaining("400");assertThatThrownBy(()->service.verify("x".repeat(2049))).hasMessageContaining("400");assertThat(service.configuration().toString()).doesNotContain("private-secret");assertThatThrownBy(()->new TurnstileService(json,"","","localhost").verify("token")).hasMessageContaining("503");}
 @org.junit.jupiter.api.Test void registrationHasSeparateAction()throws Exception{var mapper=new com.fasterxml.jackson.databind.ObjectMapper();var service=new TurnstileService(mapper,"site","secret","localhost");var result=mapper.readTree("{\"success\":true,\"hostname\":\"localhost\",\"action\":\"suggestion\"}");org.assertj.core.api.Assertions.assertThatThrownBy(()->service.validate(result,"register")).hasMessageContaining("400");service.validate(mapper.readTree("{\"success\":true,\"hostname\":\"localhost\",\"action\":\"register\"}"),"register");}
}

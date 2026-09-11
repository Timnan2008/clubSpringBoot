package com.qpwflshclub.formal_club.social;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.Path;
import java.security.*;
import java.security.spec.*;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import static org.assertj.core.api.Assertions.*;
class MessageKeysTest {
 @TempDir Path dir;
 String publicKey()throws Exception{var g=KeyPairGenerator.getInstance("EC");g.initialize(new ECGenParameterSpec("secp256r1"));return Base64.getEncoder().encodeToString(g.generateKeyPair().getPublic().getEncoded());}
 @Test void publicKeysAreImmutableAndPersistWithoutPrivateMaterial()throws Exception{var k=new MessageKeys(new ObjectMapper(),dir.toString());String id="a".repeat(64),pub=publicKey();var a=k.register(id,pub);assertThat(k.register(id,pub)).isEqualTo(a);assertThatThrownBy(()->k.register(id,publicKey())).hasMessageContaining("409");assertThat(new MessageKeys(new ObjectMapper(),dir.toString()).get(id)).isEqualTo(a);assertThat(java.nio.file.Files.readString(dir.resolve("keys/"+id+".json"))).doesNotContain("private");}
 @Test void malformedOrMismatchedEnvelopesAreRejected()throws Exception{var mapper=new ObjectMapper();var k=new MessageKeys(mapper,dir.toString());String a="a".repeat(64),b="b".repeat(64);var ka=k.register(a,publicKey());var kb=k.register(b,publicKey());var envelope=new LinkedHashMap<String,Object>(Map.of("v",1,"senderKey",ka.fingerprint(),"recipientKey",kb.fingerprint(),"iv",Base64.getEncoder().encodeToString(new byte[12]),"ciphertext",Base64.getEncoder().encodeToString(new byte[32])));k.validateMessage(a,b,"e2ee:v1:"+mapper.writeValueAsString(envelope));assertThatThrownBy(()->k.validateMessage(a,b,"plain")).hasMessageContaining("400");envelope.put("recipientKey",ka.fingerprint());assertThatThrownBy(()->k.validateMessage(a,b,"e2ee:v1:"+mapper.writeValueAsString(envelope))).hasMessageContaining("400");}
}

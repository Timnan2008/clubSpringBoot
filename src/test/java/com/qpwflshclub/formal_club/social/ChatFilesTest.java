package com.qpwflshclub.formal_club.social;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
class ChatFilesTest {
 @TempDir Path root;
 SocialStore store;String file;byte[] encrypted;
 @BeforeEach void setup(){store=new SocialStore(new ObjectMapper(),root.toString());file=UUID.randomUUID().toString();encrypted=new byte[128];new java.security.SecureRandom().nextBytes(encrypted);}
 @Test void participantsCanDownloadAfterRestartButOtherAccountsAndConversationsCannot()throws Exception{
  var m=store.message("alice","bob","e2ee:v1:opaque",Map.of(file,encrypted));
  assertThat(store.messageFile("alice","bob",m.id(),file)).isEqualTo(encrypted);
  var restarted=new SocialStore(new ObjectMapper(),root.toString());assertThat(restarted.messageFile("bob","alice",m.id(),file)).isEqualTo(encrypted);
  assertThatThrownBy(()->store.messageFile("charlie","bob",m.id(),file)).hasMessageContaining("404");assertThatThrownBy(()->store.messageFile("alice","charlie",m.id(),file)).hasMessageContaining("404");
  assertThatThrownBy(()->store.messageFile("alice","bob",m.id(),"../social.json")).hasMessageContaining("404");
 }
 @Test void recallRemovesBytesAndRevokesBothDownloadDirections()throws Exception{
  var m=store.message("alice","bob","e2ee:v1:opaque",Map.of(file,encrypted));
  assertThatThrownBy(()->store.recall(m.id(),"bob","alice")).hasMessageContaining("403");
  store.recall(m.id(),"alice","bob");assertThat(root.resolve("message-files").resolve(m.id())).doesNotExist();
  assertThatThrownBy(()->store.messageFile("bob","alice",m.id(),file)).hasMessageContaining("404");
 }
 @Test void accountDeletionRemovesIncomingAndOutgoingFilesAndPreservesOthers()throws Exception{
  var incoming=store.message("bob","alice","e2ee:v1:one",Map.of(file,encrypted));var outgoing=store.message("alice","bob","e2ee:v1:two",Map.of(file,encrypted));var other=store.message("bob","charlie","e2ee:v1:three",Map.of(file,encrypted));
  store.removeAccount("alice");assertThat(root.resolve("message-files").resolve(incoming.id())).doesNotExist();assertThat(root.resolve("message-files").resolve(outgoing.id())).doesNotExist();assertThat(store.messageFile("bob","charlie",other.id(),file)).isEqualTo(encrypted);
 }
 @Test void rejectsTraversalOversizeAndTooManyFilesBeforeCreatingMessage()throws Exception{
  assertThatThrownBy(()->store.message("a","b","encrypted",Map.of("../escape",encrypted))).hasMessageContaining("400");
  assertThatThrownBy(()->store.message("a","b","encrypted",Map.of(file,new byte[20*1024*1024+17]))).hasMessageContaining("400");
  Map<String,byte[]> many=new HashMap<>();for(int i=0;i<5;i++)many.put(UUID.randomUUID().toString(),encrypted);
  assertThatThrownBy(()->store.message("a","b","encrypted",many)).hasMessageContaining("400");assertThat(store.snapshot().messages()).isEmpty();
 }
 @Test void duplicateCiphertextCannotCreateDuplicateFileRecords()throws Exception{
  store.message("a","b","e2ee:v1:same",Map.of(file,encrypted));assertThatThrownBy(()->store.message("a","b","e2ee:v1:same",Map.of(file,encrypted))).hasMessageContaining("409");
  assertThat(store.snapshot().messages()).hasSize(1);try(var paths=Files.list(root.resolve("message-files"))){assertThat(paths.count()).isEqualTo(1);}
 }
}

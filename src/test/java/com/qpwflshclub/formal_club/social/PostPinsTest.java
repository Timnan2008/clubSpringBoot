package com.qpwflshclub.formal_club.social;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.Path;
import java.util.List;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
class PostPinsTest {
 @TempDir Path dir;
 @Test void ownershipScopeReplacementPersistenceAndOrdering()throws Exception{
  var json=new ObjectMapper();var store=new SocialStore(json,dir.toString());var pins=new PostPins(json,dir.toString());
  var old=store.post("a","old");var fresh=store.post("a","fresh");var other=store.post("b","other");var anonymous=store.post("a","anonymous","general",true);
  assertEquals(403,assertThrows(ResponseStatusException.class,()->pins.update(old,"b",false,"profile",true)).getStatusCode().value());
  assertThrows(ResponseStatusException.class,()->pins.update(old,"a",false,"wall",true));
  assertThrows(ResponseStatusException.class,()->pins.update(anonymous,"a",false,"profile",true));
  pins.update(old,"a",false,"profile",true);assertTrue(pins.profile(old));assertFalse(pins.wall(old));
  assertEquals(old.id(),pins.ordered(store.snapshot().posts(),true).getFirst().id());
  pins.update(fresh,"a",false,"profile",true);assertFalse(pins.profile(old));assertTrue(pins.profile(fresh));
  pins.update(old,"a",false,"profile",false);assertTrue(pins.profile(fresh));
  pins.update(other,"admin",true,"wall",true);assertTrue(pins.wall(other));assertEquals(other.id(),pins.ordered(store.snapshot().posts(),false).getFirst().id());
  var reloaded=new PostPins(json,dir.toString());assertTrue(reloaded.profile(fresh));assertTrue(reloaded.wall(other));
  reloaded.remove(fresh.id());assertFalse(reloaded.profile(fresh));assertTrue(reloaded.wall(other));
  reloaded.update(other,"admin",true,"wall",false);assertFalse(reloaded.wall(other));
 }
}

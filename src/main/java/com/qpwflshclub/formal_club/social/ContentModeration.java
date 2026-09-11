package com.qpwflshclub.formal_club.social;
import java.text.Normalizer;
import java.util.*;
import java.util.regex.Pattern;
/** Shared server-side filter. Extend using CLUB_BLOCKED_WORDS (comma separated). */
public final class ContentModeration {
 private ContentModeration(){}
 public static String normalize(String text){return Normalizer.normalize(Objects.toString(text,""),Normalizer.Form.NFKC).replaceAll("[\\p{Cf}\\p{M}]", "").toLowerCase(Locale.ROOT);}
 public static void check(String text){
  String normalized=normalize(text),compact=normalized.replaceAll("[\\s\\p{P}]+", "");
  String words="傻逼,操你妈,草你妈,去死,杀你全家,废物东西,fuck,shit,bitch,"+Objects.toString(System.getenv("CLUB_BLOCKED_WORDS"),"");
  for(String word:words.split(",")){word=normalize(word.trim());if(word.isBlank())continue;
   boolean match=word.matches("[a-z]+")?Pattern.compile("(?<![a-z])"+Pattern.quote(word)+"(?![a-z])").matcher(normalized).find():compact.contains(word);
   if(match)throw SchoolAccounts.error(400,"内容包含不适当用语，请修改后提交。 / Please remove inappropriate language.");
  }
 }
}

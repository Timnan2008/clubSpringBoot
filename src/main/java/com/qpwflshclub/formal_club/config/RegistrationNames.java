package com.qpwflshclub.formal_club.config;
import com.qpwflshclub.formal_club.social.SchoolAccounts;
public final class RegistrationNames {
 private RegistrationNames(){}
 public static void validate(String chinese,String english){if((chinese==null||chinese.isBlank())&&(english==null||english.isBlank()))throw SchoolAccounts.error(400,"中文名和英文名至少填写一项 / Enter at least one name");for(String value:new String[]{chinese,english})if(value!=null&&(value.strip().length()>100||value.codePoints().anyMatch(Character::isISOControl)))throw SchoolAccounts.error(400,"姓名每项不超过 100 字 / Each name can contain up to 100 characters");}
}

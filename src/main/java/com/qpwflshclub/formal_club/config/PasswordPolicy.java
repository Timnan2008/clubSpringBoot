package com.qpwflshclub.formal_club.config;
import com.qpwflshclub.formal_club.social.SchoolAccounts;
public final class PasswordPolicy {
 private PasswordPolicy(){}
 public static boolean valid(String p){return p!=null&&p.length()>=12&&p.length()<=128&&p.matches("(?s).*[A-Z].*")&&p.matches("(?s).*[a-z].*")&&p.matches("(?s).*[0-9].*")&&p.codePoints().anyMatch(c->!Character.isLetterOrDigit(c)&&!Character.isWhitespace(c));}
 public static void require(String p){if(!valid(p))throw SchoolAccounts.error(400,"密码需为 12–128 位，含大小写字母、数字和特殊符号 / Use 12–128 characters with uppercase, lowercase, a number and a symbol");}
}

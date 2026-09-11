package com.qpwflshclub.formal_club.config;
import jakarta.servlet.http.HttpServletRequest;import com.qpwflshclub.formal_club.social.SchoolAccounts;
public final class RegistrationProof {
 private static final String KEY="registrationEmailProof";
 public record Proof(String email,long expires){}
 public static void verified(HttpServletRequest request,String email){request.getSession().setAttribute(KEY,new Proof(LoginEmails.normalize(email),System.currentTimeMillis()+300000));}
 public static boolean valid(HttpServletRequest request,String email){var session=request.getSession(false);Object p=session==null?null:session.getAttribute(KEY);return p instanceof Proof proof&&proof.expires()>=System.currentTimeMillis()&&proof.email().equals(LoginEmails.normalize(email));}
 public static void require(HttpServletRequest request,String email){if(!valid(request,email))throw SchoolAccounts.error(400,"请先验证这个邮箱 / Verify this email first");}
 public static void consume(HttpServletRequest request){request.getSession().removeAttribute(KEY);}
}

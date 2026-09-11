package com.qpwflshclub.formal_club.config;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.stereotype.Component;
import org.springframework.core.annotation.Order;
import java.io.IOException;
@Component @Order(0)
public class RememberMeFilter implements Filter {
 @org.springframework.beans.factory.annotation.Autowired private SessionRevocations revocations;
 private final RememberMeService remember;
 public RememberMeFilter(RememberMeService remember){this.remember=remember;}
 public void doFilter(ServletRequest req,ServletResponse res,FilterChain chain)throws IOException,ServletException{var request=(HttpServletRequest)req; var response=(HttpServletResponse)res;
 var old=request.getSession(false);if(old!=null&&old.getAttribute("authenticatedEmail") instanceof String email&&revocations!=null&&revocations.revoked(email,old.getCreationTime()))old.invalidate();
 if(!request.getRequestURI().startsWith("/javascript/")&&!request.getRequestURI().startsWith("/css/")&&!request.getRequestURI().startsWith("/other%20photo/")) remember.restore(request,response);
 boolean media=(request.getMethod().equals("GET")||request.getMethod().equals("HEAD"))&&request.getRequestURI().matches("/api/campus-social/(avatars/[a-f0-9]{64}|appearance/files/[a-f0-9-]{36}(-small)?\\.(png|jpg|webp)|posts/[a-f0-9-]{36}/files/[a-f0-9-]{36})");
 if(!media&&(request.getRequestURI().equals("/") || request.getRequestURI().startsWith("/page/") || request.getRequestURI().startsWith("/api/") || request.getRequestURI().startsWith("/booking/"))) response.setHeader("Cache-Control","no-store");
 var session=request.getSession(false); if(session!=null && session.getAttribute("authenticatedEmail") instanceof String email) request.setAttribute("verifiedEmail",email);
 chain.doFilter(req,res);if(media&&response.getStatus()>=400)response.setHeader("Cache-Control","no-store");}
}

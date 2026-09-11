package com.qpwflshclub.formal_club.config;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
class MediaCacheFilterTest {
 @Test void privateMediaCanCacheButAccountDataAndFailuresCannot()throws Exception{
 var filter=new RememberMeFilter(mock(RememberMeService.class));
 for(String path:new String[]{"/api/campus-social/avatars/"+"a".repeat(64),"/api/campus-social/appearance/files/12345678-1234-1234-1234-123456789abc-small.png"}){
 var request=new MockHttpServletRequest("GET",path);var response=new MockHttpServletResponse();filter.doFilter(request,response,(q,r)->((jakarta.servlet.http.HttpServletResponse)r).addHeader("Cache-Control","private, max-age=86400"));assertThat(response.getHeaders("Cache-Control")).containsExactly("private, max-age=86400");
 var denied=new MockHttpServletResponse();filter.doFilter(request,denied,(q,r)->((jakarta.servlet.http.HttpServletResponse)r).setStatus(401));assertThat(denied.getHeader("Cache-Control")).isEqualTo("no-store");
 }
 for(String path:new String[]{"/api/campus-social/me","/api/campus-social/conversations","/page/user/profile"}){var response=new MockHttpServletResponse();filter.doFilter(new MockHttpServletRequest("GET",path),response,(q,r)->{});assertThat(response.getHeader("Cache-Control")).isEqualTo("no-store");}
 }
}

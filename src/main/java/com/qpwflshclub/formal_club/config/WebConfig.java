package com.qpwflshclub.formal_club.config;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.servlet.config.annotation.*;
import java.nio.file.Path;
@Configuration public class WebConfig implements WebMvcConfigurer {
 @Value("${club.media-directory:/opt/club-app/media}") private String directory;
 @Override public void addResourceHandlers(ResourceHandlerRegistry registry){registry.addResourceHandler("/images/teacher-day-2026-*.webp").addResourceLocations("classpath:/static/images/").setCacheControl(org.springframework.http.CacheControl.maxAge(java.time.Duration.ofDays(365)).cachePublic().immutable());registry.addResourceHandler("/media/**").addResourceLocations(Path.of(directory).toAbsolutePath().toUri().toString()+"/").setCachePeriod(3600);}
}

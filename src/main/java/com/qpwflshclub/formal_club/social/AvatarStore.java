package com.qpwflshclub.formal_club.social;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.multipart.MultipartFile;
import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.*;
import java.util.Locale;
@Service public class AvatarStore {
 private final Path root;
 public AvatarStore(@Value("${club.avatar-dir:./data/avatars}")String directory){root=Path.of(directory).toAbsolutePath().normalize();}
 private Path path(String id){if(id==null||!id.matches("[a-f0-9]{64}"))throw SchoolAccounts.error(404,"头像不存在");return root.resolve(id+".png");}
 public String url(String id){Path p=Files.isRegularFile(optimized(id))?optimized(id):path(id);try{return Files.isRegularFile(p)?"/api/campus-social/avatars/"+id+"?v="+Files.getLastModifiedTime(p).toMillis():"";}catch(IOException e){return "";}}
 private Path optimized(String id){path(id);return root.resolve(id+".jpg");}
 public synchronized byte[] read(String id)throws IOException{Path jpeg=optimized(id);if(Files.isRegularFile(jpeg))return Files.readAllBytes(jpeg);Path old=path(id);if(!Files.isRegularFile(old))throw SchoolAccounts.error(404,"头像不存在");byte[] bytes=MediaCompression.image(Files.readAllBytes(old),256,true);writeJpeg(jpeg,bytes);return bytes;}
 private void writeJpeg(Path target,byte[] bytes)throws IOException{Files.createDirectories(root);Path temp=Files.createTempFile(root,"avatar-",".jpg");try{Files.write(temp,bytes);Files.move(temp,target,StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);}finally{Files.deleteIfExists(temp);}}
 public synchronized String save(String id,MultipartFile file)throws IOException{if(file==null||file.isEmpty()||file.getSize()>5*1024*1024)throw SchoolAccounts.error(400,"头像不能超过 5 MB / Avatar must be under 5 MB");writeJpeg(optimized(id),MediaCompression.image(file.getBytes(),256,true));Files.deleteIfExists(path(id));return url(id);}
 public synchronized void remove(String id)throws IOException{Files.deleteIfExists(path(id));Files.deleteIfExists(optimized(id));}
}

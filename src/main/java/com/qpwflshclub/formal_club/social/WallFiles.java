package com.qpwflshclub.formal_club.social;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.multipart.MultipartFile;
import java.nio.file.*;
import java.io.*;
import java.util.*;
import javax.imageio.ImageIO;
@Service public class WallFiles {
 private final Path root;
 public WallFiles(@Value("${club.social-dir:./data/campus-social}")String root){this.root=Path.of(root).resolve("attachments").toAbsolutePath().normalize();}
 public SocialStore.Attachment save(MultipartFile file,boolean anonymous)throws IOException{
  if(file.isEmpty()||file.getSize()>40*1024*1024)throw SchoolAccounts.error(400,"每个文件需小于 40 MB / Each file must be under 40 MB");
  String original=Objects.toString(file.getOriginalFilename(),"file").replaceAll("[\\p{Cntrl}/\\\\]","_");
  if(original.length()>120)original=original.substring(original.length()-120);
  ContentModeration.check(original);
  byte[] bytes=file.getBytes();String type,ext;String lower=original.toLowerCase(Locale.ROOT);
  if(lower.endsWith(".png")||lower.endsWith(".jpg")||lower.endsWith(".jpeg")){
   bytes=MediaCompression.image(bytes,1600,false);type="image/jpeg";ext="jpg";original=original.replaceFirst("(?i)\\.(png|jpe?g)$",".jpg");
  }else if(lower.endsWith(".mp4")||lower.endsWith(".mov")){Path input=Files.createTempFile("wall-input-",".mp4"),output=Files.createTempFile("wall-output-",".mp4");try{Files.write(input,bytes);MediaCompression.video(input,output);bytes=Files.readAllBytes(output);}finally{Files.deleteIfExists(input);Files.deleteIfExists(output);}type="video/mp4";ext="mp4";original=original.replaceFirst("(?i)\\.(mov|mp4)$",".mp4");
  }else if(lower.endsWith(".pdf")&&new String(bytes,0,Math.min(5,bytes.length),java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF-")){type="application/pdf";ext="pdf";}
  else if(lower.endsWith(".txt")){try{java.nio.charset.StandardCharsets.UTF_8.newDecoder().decode(java.nio.ByteBuffer.wrap(bytes));}catch(java.nio.charset.CharacterCodingException e){throw SchoolAccounts.error(400,"文本必须使用 UTF-8 / Text must use UTF-8");}if(new String(bytes,java.nio.charset.StandardCharsets.UTF_8).indexOf(0)>=0)throw SchoolAccounts.error(400,"无效文本 / Invalid text");ContentModeration.check(new String(bytes,java.nio.charset.StandardCharsets.UTF_8));type="text/plain";ext="txt";}
  else throw SchoolAccounts.error(400,"支持 JPG、PNG、MP4、MOV、PDF、TXT / Use JPG, PNG, MP4, MOV, PDF or TXT");
  if(bytes.length>40*1024*1024)throw SchoolAccounts.error(400,"文件过大 / File is too large");
  Files.createDirectories(root);String id=UUID.randomUUID().toString();Path destination=root.resolve(id);Files.write(destination,bytes,StandardOpenOption.CREATE_NEW);try{Files.setPosixFilePermissions(destination,java.nio.file.attribute.PosixFilePermissions.fromString("rw-------"));}catch(UnsupportedOperationException ignored){}
  return new SocialStore.Attachment(id,anonymous?"attachment."+ext:original,type,bytes.length);
 }
 public SocialStore.Attachment resolved(SocialStore.Attachment a){
  if(a.type()!=null&&(a.type().startsWith("image/")||a.type().startsWith("video/")))return a;
  try(var input=Files.newInputStream(file(a.id()))){byte[] b=input.readNBytes(16);String type=null;
   if(b.length>=8&&b[0]==(byte)137&&b[1]==80&&b[2]==78&&b[3]==71&&b[4]==13&&b[5]==10&&b[6]==26&&b[7]==10)type="image/png";
   else if(b.length>=3&&b[0]==(byte)255&&b[1]==(byte)216&&b[2]==(byte)255)type="image/jpeg";
   else if(b.length>=12&&new String(b,4,4,java.nio.charset.StandardCharsets.US_ASCII).equals("ftyp")){String brand=new String(b,8,4,java.nio.charset.StandardCharsets.US_ASCII);if(Set.of("isom","iso2","mp41","mp42","avc1","M4V ","qt  ").contains(brand))type=brand.equals("qt  ")?"video/quicktime":"video/mp4";}
   return type==null?a:new SocialStore.Attachment(a.id(),a.name(),type,a.size());
  }catch(IOException e){return a;}
 }
 public Path file(String id){if(!id.matches("[0-9a-f-]{36}"))throw SchoolAccounts.error(404,"File not found");return root.resolve(id);}
 public byte[] read(String id)throws IOException{if(!id.matches("[0-9a-f-]{36}"))throw SchoolAccounts.error(404,"File not found");return Files.readAllBytes(root.resolve(id));}
 public void remove(String id)throws IOException{if(id.matches("[0-9a-f-]{36}"))Files.deleteIfExists(root.resolve(id));}
}

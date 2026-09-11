package com.qpwflshclub.formal_club.social;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import javax.imageio.ImageIO;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.*;
import java.util.*;

@Service public class ProfileAppearance {
 public record Frame(String id,String name,String url,double scale,double x,double y) {public Frame{if(scale==0)scale=1;}public Frame(String id,String name,String url){this(id,name,url,1,0,0);}}
 public record Settings(String frame,boolean holidayBadge,double scale,double x,double y,List<String> tags,String customFrame,String banner,List<Frame> frames,double avatarScale,double avatarX,double avatarY){
  public Settings {tags=tags==null?null:List.copyOf(tags);frames=frames==null?List.of():List.copyOf(frames);if(avatarScale==0)avatarScale=1;}
  public Settings(String frame,boolean badge,double scale,double x,double y,List<String> tags,String custom,String banner){this(frame,badge,scale,x,y,tags,custom,banner,List.of(),1,0,0);}
 }
 private final Path root,file;private final ObjectMapper json;private Map<String,Settings> data;
 public ProfileAppearance(ObjectMapper json,@Value("${club.accounts-dir:./data/accounts}")String dir)throws IOException{this.json=json;root=Path.of(dir).resolve("appearance");file=root.resolve("settings.json");data=Files.exists(file)?json.readValue(file.toFile(),new TypeReference<LinkedHashMap<String,Settings>>(){}):new LinkedHashMap<>();}
 public synchronized Settings get(String id){var s=data.getOrDefault(id,new Settings("auto",true,1,0,0,null,"",""));if(s.frames().isEmpty()&&!s.customFrame().isBlank()){String name=Path.of(s.customFrame()).getFileName().toString();return new Settings(s.frame(),s.holidayBadge(),s.scale(),s.x(),s.y(),s.tags(),s.customFrame(),s.banner(),List.of(new Frame(name.replace(".png",""),"我的头像框 / My frame",s.customFrame(),s.scale(),s.x(),s.y())),s.avatarScale(),s.avatarX(),s.avatarY());}return s;}
 public synchronized List<Map<String,Object>> library(String id){return get(id).frames().stream().map(f->Map.<String,Object>of("id",f.id(),"name",f.name(),"url",f.url(),"thumbnail",smallFrame(f.url()),"preview",displayFrame(f.url()),"scale",f.scale(),"x",f.x(),"y",f.y())).toList();}
 private void save(String id,Settings value)throws IOException{var next=new LinkedHashMap<>(data);next.put(id,value);Files.createDirectories(root);Path tmp=Files.createTempFile(root,"settings-",".json");try{json.writeValue(tmp.toFile(),next);Files.move(tmp,file,StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);data=next;}finally{Files.deleteIfExists(tmp);}}
 public synchronized Settings update(String id,Settings input,boolean gifted,List<String> availableTags)throws IOException{
  var old=get(id);String custom=Objects.toString(input.customFrame(),"");if(custom.isBlank())custom=old.customFrame();final String selected=custom;boolean owned=old.frames().stream().anyMatch(f->f.url().equals(selected));String frame=Objects.toString(input.frame(),"none");if(!Set.of("auto","none","teacher-day-2026","custom").contains(frame)||frame.equals("teacher-day-2026")&&!gifted||frame.equals("custom")&&!owned)throw SchoolAccounts.error(400,"请选择已拥有的头像框 / Choose an available frame");
  if(!Double.isFinite(input.scale())||!Double.isFinite(input.x())||!Double.isFinite(input.y())||input.scale()<.5||input.scale()>1.8||Math.abs(input.x())>.5||Math.abs(input.y())>.5)throw SchoolAccounts.error(400,"头像框位置无效 / Invalid frame position");
  if(!Double.isFinite(input.avatarScale())||!Double.isFinite(input.avatarX())||!Double.isFinite(input.avatarY())||input.avatarScale()<1||input.avatarScale()>2.5||Math.abs(input.avatarX())>.5||Math.abs(input.avatarY())>.5)throw SchoolAccounts.error(400,"头像位置无效 / Invalid avatar position");
  var tags=input.tags()==null?null:input.tags().stream().filter(availableTags::contains).distinct().toList();
  var next=new Settings(frame,input.holidayBadge(),input.scale(),input.x(),input.y(),tags,owned?selected:old.customFrame(),old.banner(),old.frames().stream().map(f->frame.equals("custom")&&f.url().equals(selected)?new Frame(f.id(),f.name(),f.url(),input.scale(),input.x(),input.y()):f).toList(),input.avatarScale(),input.avatarX(),input.avatarY());save(id,next);return next;
 }
 public Map<String,Object> publicView(String id,boolean gifted){var s=get(id);String selected=s.frame().equals("auto")?(gifted?"teacher-day-2026":"none"):s.frame();String url=selected.equals("teacher-day-2026")&&gifted?"/images/teacher-day-2026-320.webp":selected.equals("custom")?smallFrame(s.customFrame()):"";return Map.of("frame",url.isEmpty()?"none":selected,"frameUrl",url,"scale",s.scale(),"x",s.x(),"y",s.y(),"banner",s.banner(),"avatarScale",s.avatarScale(),"avatarX",s.avatarX(),"avatarY",s.avatarY());}
 public synchronized Settings upload(String id,String kind,MultipartFile upload)throws IOException{
  if(!Set.of("frame","banner").contains(kind)||upload==null||upload.isEmpty()||upload.getSize()>8*1024*1024)throw SchoolAccounts.error(400,"请选择 8 MB 以内的图片 / Choose an image under 8 MB");
  byte[] bytes;String extension;
  if(kind.equals("banner")){bytes=MediaCompression.image(upload.getBytes(),1600,false);extension="jpg";}
  else {try(var stream=ImageIO.createImageInputStream(upload.getInputStream())){var readers=ImageIO.getImageReaders(stream);if(!readers.hasNext())throw SchoolAccounts.error(400,"头像框需为透明 PNG / Frame must be a transparent PNG");var reader=readers.next();try{reader.setInput(stream);if(!reader.getFormatName().equalsIgnoreCase("png")||(long)reader.getWidth(0)*reader.getHeight(0)>24000000)throw SchoolAccounts.error(400,"头像框需为有效 PNG / Invalid PNG frame");var source=reader.read(0);double ratio=Math.min(1,640.0/Math.max(source.getWidth(),source.getHeight()));var out=new BufferedImage(Math.max(1,(int)(source.getWidth()*ratio)),Math.max(1,(int)(source.getHeight()*ratio)),BufferedImage.TYPE_INT_ARGB);var g=out.createGraphics();g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,RenderingHints.VALUE_INTERPOLATION_BICUBIC);g.drawImage(source,0,0,out.getWidth(),out.getHeight(),null);g.dispose();var buffer=new ByteArrayOutputStream();ImageIO.write(out,"png",buffer);bytes=buffer.toByteArray();extension="png";}finally{reader.dispose();}}}
  Files.createDirectories(root);String name=UUID.randomUUID()+"."+extension;Path destination=root.resolve(name);Files.write(destination,bytes);if(kind.equals("frame")){var source=ImageIO.read(new ByteArrayInputStream(bytes));double ratio=Math.min(1,256.0/Math.max(source.getWidth(),source.getHeight()));var small=new BufferedImage(Math.max(1,(int)(source.getWidth()*ratio)),Math.max(1,(int)(source.getHeight()*ratio)),BufferedImage.TYPE_INT_ARGB);var g=small.createGraphics();g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,RenderingHints.VALUE_INTERPOLATION_BICUBIC);g.drawImage(source,0,0,small.getWidth(),small.getHeight(),null);g.dispose();ImageIO.write(small,"png",root.resolve(name.replace(".png","-small.png")).toFile());}if(kind.equals("frame")){webp(destination);webp(root.resolve(name.replace(".png","-small.png")));}var old=get(id);String url="/api/campus-social/appearance/files/"+name;var frames=new ArrayList<>(old.frames());if(kind.equals("frame")){String label=Objects.toString(upload.getOriginalFilename(),"头像框").replaceAll(".*[/\\\\]","");if(label.length()>80)label=label.substring(0,80);frames.add(new Frame(name.replace(".png",""),label,url));}var next=new Settings(kind.equals("frame")?"custom":old.frame(),old.holidayBadge(),kind.equals("frame")?1:old.scale(),kind.equals("frame")?0:old.x(),kind.equals("frame")?0:old.y(),old.tags(),kind.equals("frame")?url:old.customFrame(),kind.equals("banner")?url:old.banner(),frames,old.avatarScale(),old.avatarX(),old.avatarY());try{save(id,next);}catch(IOException e){Files.deleteIfExists(destination);throw e;}return next;
 }
 public synchronized Settings removeFrame(String id)throws IOException{var s=get(id);if(s.customFrame().isBlank())return s;return removeFrame(id,Path.of(s.customFrame()).getFileName().toString().replace(".png",""));}
 public synchronized Settings removeFrame(String id,String frameId)throws IOException{
  var old=get(id);var owned=old.frames().stream().filter(f->f.id().equals(frameId)).findFirst().orElseThrow(()->SchoolAccounts.error(404,"头像框不存在 / Frame not found"));
  String name=Path.of(owned.url()).getFileName().toString();
  if(!name.matches("[a-f0-9-]{36}\\.png"))throw SchoolAccounts.error(400,"Invalid frame");
  Path trash=root.resolve("deleted");Files.createDirectories(trash);var moved=new ArrayList<Path>();
  boolean selected=old.customFrame().equals(owned.url());boolean equipped=selected&&old.frame().equals("custom");var next=new Settings(equipped?"none":old.frame(),old.holidayBadge(),equipped?1:old.scale(),equipped?0:old.x(),equipped?0:old.y(),old.tags(),selected?"":old.customFrame(),old.banner(),old.frames().stream().filter(f->!f.id().equals(frameId)).toList(),old.avatarScale(),old.avatarX(),old.avatarY());
  try{for(String f:List.of(name,name.replace(".png","-small.png"),name.replace(".png",".webp"),name.replace(".png","-small.webp"))){Path source=root.resolve(f);if(Files.exists(source)){Files.move(source,trash.resolve(f),StandardCopyOption.ATOMIC_MOVE);moved.add(source);}}save(id,next);return next;}
  catch(IOException e){for(Path source:moved)try{Files.move(trash.resolve(source.getFileName()),source,StandardCopyOption.ATOMIC_MOVE);}catch(IOException rollback){e.addSuppressed(rollback);}throw e;}
 }
 private String displayFrame(String url){String name=Path.of(url).getFileName().toString().replace(".png",".webp");return Files.isRegularFile(root.resolve(name))?"/api/campus-social/appearance/files/"+name:url;}
 private String smallFrame(String url){if(url.isBlank())return url;String name=url.substring(url.lastIndexOf('/')+1).replace(".png","-small.png");String webp=name.replace(".png",".webp");if(Files.isRegularFile(root.resolve(webp)))return "/api/campus-social/appearance/files/"+webp;return Files.isRegularFile(root.resolve(name))?"/api/campus-social/appearance/files/"+name:url;}
 // Generate compact transparent display variants; preserve the editable PNG and fall back if unavailable.
 private void webp(Path input){
  Path output=input.resolveSibling(input.getFileName().toString().replace(".png",".webp")),temp=output.resolveSibling(output.getFileName()+".tmp.webp");
  var commands=List.of(List.of("ffmpeg","-nostdin","-y","-v","error","-i",input.toString(),"-frames:v","1","-c:v","libwebp","-quality","82","-compression_level","4",temp.toString()),List.of("cwebp","-quiet","-q","82","-m","4",input.toString(),"-o",temp.toString()));
  for(var command:commands){Process process=null;boolean encoded=false;
   try{process=new ProcessBuilder(command).redirectError(ProcessBuilder.Redirect.DISCARD).redirectOutput(ProcessBuilder.Redirect.DISCARD).start();encoded=process.waitFor(5,java.util.concurrent.TimeUnit.SECONDS)&&process.exitValue()==0&&Files.size(temp)>0;
    if(encoded&&Files.size(temp)<Files.size(input))Files.move(temp,output,StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);
   }catch(Exception ignored){}finally{if(process!=null&&process.isAlive()){process.destroyForcibly();try{process.waitFor();}catch(InterruptedException e){Thread.currentThread().interrupt();}}try{Files.deleteIfExists(temp);}catch(IOException ignored){}}
   if(encoded)return;
  }
 }

 public Path file(String name){if(!name.matches("[a-f0-9-]{36}(-small)?\\.(png|jpg|webp)"))throw SchoolAccounts.error(404,"Image not found");var p=root.resolve(name);if(!Files.isRegularFile(p))throw SchoolAccounts.error(404,"Image not found");return p;}
 public synchronized void removeAccount(String id)throws IOException{var own=get(id);var urls=new HashSet<String>();urls.add(own.banner());urls.add(own.customFrame());own.frames().forEach(f->urls.add(f.url()));for(String url:urls){if(url==null||url.isBlank())continue;String name=Path.of(url).getFileName().toString();if(!name.matches("[a-f0-9-]{36}\\.(png|jpg|webp)"))continue;for(String f:List.of(name,name.replace(".png","-small.png"),name.replace(".png",".webp"),name.replace(".png","-small.webp"))){Files.deleteIfExists(root.resolve(f));Files.deleteIfExists(root.resolve("deleted").resolve(f));}}var next=new LinkedHashMap<>(data);next.remove(id);Files.createDirectories(root);Path tmp=Files.createTempFile(root,"settings-",".tmp");try{json.writeValue(tmp.toFile(),next);Files.move(tmp,file,StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);data=next;}finally{Files.deleteIfExists(tmp);}}
}

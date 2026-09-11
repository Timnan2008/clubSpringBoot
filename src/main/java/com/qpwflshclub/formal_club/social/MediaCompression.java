package com.qpwflshclub.formal_club.social;
import java.awt.*;import java.awt.image.BufferedImage;import java.io.*;import java.nio.file.*;import java.util.*;import java.util.concurrent.*;import javax.imageio.*;import javax.imageio.stream.*;
public final class MediaCompression {
 private MediaCompression(){} private static final Semaphore videos=new Semaphore(1);
 public static byte[] image(byte[] input,int max,boolean square)throws IOException{
  BufferedImage source;try(var in=ImageIO.createImageInputStream(new ByteArrayInputStream(input))){var readers=ImageIO.getImageReaders(in);if(!readers.hasNext())throw SchoolAccounts.error(400,"无法读取图片 / Invalid image");var reader=readers.next();try{reader.setInput(in);String format=reader.getFormatName().toLowerCase(java.util.Locale.ROOT);if(!format.equals("png")&&!format.equals("jpeg"))throw SchoolAccounts.error(400,"仅支持 JPG 和 PNG 图片 / Only JPG and PNG images");int w=reader.getWidth(0),h=reader.getHeight(0);if(w<1||h<1||(long)w*h>24000000)throw SchoolAccounts.error(400,"图片尺寸过大 / Image dimensions too large");source=reader.read(0);}finally{reader.dispose();}}
  int sw=source.getWidth(),sh=source.getHeight(),sx=0,sy=0;if(square){int side=Math.min(sw,sh);sx=(sw-side)/2;sy=(sh-side)/2;sw=sh=side;}
  double scale=Math.min(1,(double)max/Math.max(sw,sh));int w=Math.max(1,(int)(sw*scale)),h=Math.max(1,(int)(sh*scale));BufferedImage out=new BufferedImage(w,h,BufferedImage.TYPE_INT_RGB);Graphics2D g=out.createGraphics();try{g.setColor(Color.WHITE);g.fillRect(0,0,w,h);g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,RenderingHints.VALUE_INTERPOLATION_BICUBIC);g.drawImage(source,0,0,w,h,sx,sy,sx+sw,sy+sh,null);}finally{g.dispose();}
  ByteArrayOutputStream bytes=new ByteArrayOutputStream();var writer=ImageIO.getImageWritersByFormatName("jpeg").next();try(var output=ImageIO.createImageOutputStream(bytes)){writer.setOutput(output);var params=writer.getDefaultWriteParam();params.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);params.setCompressionQuality(square?.8f:.82f);writer.write(null,new IIOImage(out,null,null),params);}finally{writer.dispose();}return bytes.toByteArray();
 }
 public static void video(Path input,Path output)throws IOException{
  if(!videos.tryAcquire())throw SchoolAccounts.error(503,"视频处理中，请稍后再上传 / Video processing busy, try again shortly");
  Path log=Files.createTempFile("video-compression-",".log");Process process=null;boolean complete=false;
  try{process=new ProcessBuilder("ffmpeg","-nostdin","-y","-v","error","-protocol_whitelist","file,pipe","-f","mov","-i",input.toAbsolutePath().toString(),"-map","0:v:0","-map","0:a:0?","-vf","scale=w='min(1280,iw)':h='min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2","-c:v","libx264","-preset","veryfast","-crf","27","-pix_fmt","yuv420p","-threads","2","-c:a","aac","-b:a","96k","-map_metadata","-1","-movflags","+faststart",output.toAbsolutePath().toString()).redirectErrorStream(true).redirectOutput(log.toFile()).start();
   if(!process.waitFor(90,TimeUnit.SECONDS)){process.destroyForcibly();throw SchoolAccounts.error(400,"视频处理超时，请上传更短的视频 / Video processing timed out");}if(process.exitValue()!=0||!Files.isRegularFile(output)||Files.size(output)==0)throw SchoolAccounts.error(400,"无法读取视频 / Invalid video");complete=true;
  }catch(InterruptedException e){Thread.currentThread().interrupt();throw new IOException(e);}finally{if(process!=null&&process.isAlive())process.destroyForcibly();Files.deleteIfExists(log);if(!complete)Files.deleteIfExists(output);videos.release();}
 }
}

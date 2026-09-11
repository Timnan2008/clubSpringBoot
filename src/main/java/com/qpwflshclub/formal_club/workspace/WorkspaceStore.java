package com.qpwflshclub.formal_club.workspace;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;

/** Single application instance, atomic per-club snapshots, outside public/static files. */
@Service
public class WorkspaceStore {
    public record Document(String id, String name, long size, String note, String submittedBy, String createdAt) {}
    public record Activity(String id, String title, String start, String end, String location, String description,
                           int participants, String kind, String status, String submittedBy, String createdAt,
                           String reviewNote, String reviewedBy) {}
    public record Data(List<Document> documents, List<Activity> activities) {}
    private final Path root;
    private final ObjectMapper mapper;
    public WorkspaceStore(ObjectMapper mapper, @Value("${club.workspace-dir:./data/club-workspace}") String root) {
        this.mapper = mapper;
        this.root = Path.of(root).toAbsolutePath().normalize();
    }
    private Path directory(int club) { if (club <= 0) throw new IllegalArgumentException(); return root.resolve(String.valueOf(club)); }
    public synchronized Data read(int club) throws IOException {
        Path path = directory(club).resolve("records.json");
        return Files.exists(path) ? mapper.readValue(path.toFile(), Data.class) : new Data(new ArrayList<>(), new ArrayList<>());
    }
    private void write(int club, Data data) throws IOException {
        Path dir = directory(club); Files.createDirectories(dir);
        Path temp = Files.createTempFile(dir, "records-", ".tmp");
        try {
            mapper.writeValue(temp.toFile(), data);
            Files.move(temp, dir.resolve("records.json"), StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } finally { Files.deleteIfExists(temp); }
    }
    public synchronized Document upload(int club, MultipartFile file, String note, String author) throws IOException {
        if (file.isEmpty() || file.getSize() > 20 * 1024 * 1024) throw bad("文件不能为空，且不能超过 20 MB");
        String name = Optional.ofNullable(file.getOriginalFilename()).orElse("file").replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}]", "");
        if (name.length() > 180 || !name.toLowerCase(Locale.ROOT).matches(".+\\.(pdf|docx?|xlsx?|pptx?|txt|csv|png|jpe?g|zip)"))
            throw bad("支持 PDF、Office 文档、TXT、CSV、图片及 ZIP 文件");
        if (note.length() > 500) throw bad("文件说明最多 500 字");
        String id = UUID.randomUUID().toString();
        byte[] compressed = name.toLowerCase(Locale.ROOT).matches(".+\\.(png|jpe?g)") ? com.qpwflshclub.formal_club.social.MediaCompression.image(file.getBytes(),1600,false) : null;
        if(compressed!=null)name=name.replaceFirst("(?i)\\.(png|jpe?g)$",".jpg");
        Document document = new Document(id, name, compressed==null?file.getSize():compressed.length, note.trim(), author, LocalDateTime.now(java.time.ZoneId.of("Asia/Shanghai")).toString());
        Path dir = directory(club); Files.createDirectories(dir);
        Path target = dir.resolve(id);
        Data data = read(club);
        if(compressed==null)file.transferTo(target);else Files.write(target,compressed);
        try { data.documents().add(0, document); write(club, data); }
        catch (IOException e) { Files.deleteIfExists(target); throw e; }
        return document;
    }
    public synchronized Document document(int club, String id) throws IOException {
        return read(club).documents().stream().filter(d -> d.id().equals(id)).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "文件不存在"));
    }
    public Path file(int club, Document document) { return directory(club).resolve(UUID.fromString(document.id()).toString()); }
    public synchronized Activity add(int club, Activity activity) throws IOException {
        Data data = read(club); data.activities().add(0, activity); write(club, data); return activity;
    }
    public synchronized Activity review(int club, String id, String decision, String note, String reviewer) throws IOException {
        if (!Set.of("approved", "rejected").contains(decision)) throw bad("审核结果无效");
        if (note == null || note.length() > 1000 || (decision.equals("rejected") && note.isBlank())) throw bad("驳回时请填写原因，最多 1000 字");
        Data data = read(club);
        for (int i = 0; i < data.activities().size(); i++) {
            Activity old = data.activities().get(i);
            if (!old.id().equals(id)) continue;
            if (!old.kind().equals("application") || !old.status().equals("pending")) throw bad("该申请已处理，请刷新列表");
            Activity updated = new Activity(old.id(), old.title(), old.start(), old.end(), old.location(), old.description(), old.participants(), old.kind(), decision, old.submittedBy(), old.createdAt(), note.trim(), reviewer);
            data.activities().set(i, updated); write(club, data); return updated;
        }
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "申请不存在");
    }
    public synchronized void removeEvent(int club, String id) throws IOException {
        Data data = read(club);
        boolean removed = data.activities().removeIf(a -> a.id().equals(id) && a.kind().equals("event"));
        if (!removed) throw bad("只能删除普通社团活动，不能删除校园活动申请");
        write(club, data);
    }
    static ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
 public synchronized void removeAccount(int club,String email)throws IOException{Data d=read(club);for(var doc:new ArrayList<>(d.documents()))if(email.equalsIgnoreCase(doc.submittedBy())){Files.deleteIfExists(file(club,doc));d.documents().remove(doc);}d.activities().removeIf(v->email.equalsIgnoreCase(v.submittedBy()));d.activities().replaceAll(v->email.equalsIgnoreCase(v.reviewedBy())?new Activity(v.id(),v.title(),v.start(),v.end(),v.location(),v.description(),v.participants(),v.kind(),v.status(),v.submittedBy(),v.createdAt(),"",""):v);write(club,d);}
}

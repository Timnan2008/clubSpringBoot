package com.qpwflshclub.formal_club.workspace.controller;

import com.qpwflshclub.formal_club.Clubs.pojo.Club;
import com.qpwflshclub.formal_club.Clubs.repository.ClubLikeDeviceRepository;
import com.qpwflshclub.formal_club.Clubs.repository.ClubRepository;
import com.qpwflshclub.formal_club.workspace.service.WorkspaceAccess;
import com.qpwflshclub.formal_club.workspace.service.WorkspaceStore;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.function.UnaryOperator;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/club-workspace/{club}/profile")
@Transactional
public class ClubProfileController {

    private final WorkspaceAccess access;
    private final ClubRepository clubs;
    /** 社团资料（名称 / 标语 / 简介）也要过违禁词闸门 —— 这里是全校可见的文字。 */
    private final com.qpwflshclub.formal_club.social.service.ModerationGate moderation;

    public ClubProfileController(
        WorkspaceAccess access,
        ClubRepository clubs,
        com.qpwflshclub.formal_club.social.service.ModerationGate moderation
    ) {
        this.access = access;
        this.clubs = clubs;
        this.moderation = moderation;
    }

    @org.springframework.beans.factory.annotation.Autowired
    private ClubLikeDeviceRepository likes;

    @PersistenceContext
    private EntityManager entityManager;

    public record Profile(
        String name,
        String slogan,
        String description,
        String president,
        String vicePresident,
        String nameEn,
        String sloganEn,
        String descriptionEn,
        String presidentEn,
        String vicePresidentEn,
        String logo,
        String video,
        int likes
    ) {
        public Profile(
            String name,
            String slogan,
            String description,
            String president,
            String vicePresident
        ) {
            this(
                name,
                slogan,
                description,
                president,
                vicePresident,
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                0
            );
        }
    }

    private Club require(int id, HttpServletRequest r, boolean write) {
        var u = access.current(r);
        var c = access.require(u, id);
        if (write) access.mutation(r);
        return c;
    }

    private String safe(String s) {
        return Objects.toString(s, "");
    }

    private Profile view(Club c) {
        return new Profile(
            safe(c.getClubName()),
            safe(c.getSortDescription()),
            safe(c.getClubDescription()),
            safe(c.getPresident()),
            safe(c.getVicePresident()),
            safe(c.getClubNameEn()),
            safe(c.getSortDescriptionEn()),
            safe(c.getClubDescriptionEn()),
            safe(c.getPresidentEn()),
            safe(c.getVicePresidentEn()),
            safe(c.getClubItem()),
            safe(c.getVideo()),
            c.getVideoLike() == null ? 0 : c.getVideoLike()
        );
    }

    @GetMapping
    public Profile get(@PathVariable int club, HttpServletRequest r) {
        return view(require(club, r, false));
    }

    /** Fresh profile for an assistant read, even when this request already loaded the club. */
    public Profile freshForAgent(int club, HttpServletRequest r) {
        require(club, r, false);
        Club current = clubs.findById(club).orElseThrow(() -> WorkspaceStore.bad("社团不存在"));
        entityManager.refresh(current);
        return view(current);
    }

    public static String revision(Profile profile) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            for (String value : List.of(
                Objects.toString(profile.name(), ""),
                Objects.toString(profile.slogan(), ""),
                Objects.toString(profile.description(), ""),
                Objects.toString(profile.nameEn(), ""),
                Objects.toString(profile.sloganEn(), ""),
                Objects.toString(profile.descriptionEn(), "")
            )) {
                byte[] bytes = value.getBytes(StandardCharsets.UTF_8);
                digest.update(ByteBuffer.allocate(4).putInt(bytes.length).array());
                digest.update(bytes);
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (java.security.NoSuchAlgorithmException error) {
            throw new IllegalStateException(error);
        }
    }

    public record AgentUpdate(Profile before, Profile after) {}

    /** Lock and refresh the shared club row before comparing the assistant's read version. */
    public AgentUpdate updateIfRevision(
        int club,
        String expectedRevision,
        UnaryOperator<Profile> edit,
        HttpServletRequest r
    ) {
        require(club, r, true);
        Club current = clubs.findById(club).orElseThrow(() -> WorkspaceStore.bad("社团不存在"));
        entityManager.refresh(current, LockModeType.PESSIMISTIC_WRITE);
        Profile before = view(current);
        if (expectedRevision == null || !revision(before).equals(expectedRevision)) {
            throw new ResponseStatusException(
                org.springframework.http.HttpStatus.CONFLICT,
                "社团资料已变化，请重新读取并重新确认；这次没有完成 / Club profile changed. Read it again and confirm the new version; this action did not finish."
            );
        }
        return new AgentUpdate(before, apply(current, edit.apply(before), r));
    }

    @PutMapping
    public Profile update(@PathVariable int club, @RequestBody Profile body, HttpServletRequest r) {
        Club c = require(club, r, true);
        return apply(c, body, r);
    }

    private Profile apply(Club c, Profile body, HttpServletRequest r) {
        guardProfileText(r, body);
        String nameEn = text(body.nameEn(), 100, true);
        var existing = clubs.findByClubNameEn(nameEn);
        if (
            existing.isPresent() && !Objects.equals(existing.get().getId(), c.getId())
        ) throw WorkspaceStore.bad("该英文社团名已使用 / English club name already exists");
        if (!Objects.equals(c.getClubNameEn(), nameEn) && likes != null) likes.renameClub(
            c.getClubNameEn(),
            nameEn
        );
        c.setClubName(text(body.name(), 100, true));
        c.setClubNameEn(nameEn);
        c.setSortDescription(text(body.slogan(), 200, true));
        c.setSortDescriptionEn(text(body.sloganEn(), 200, true));
        c.setClubDescription(text(body.description(), 1000, true));
        c.setClubDescriptionEn(text(body.descriptionEn(), 1000, true));
        clubs.save(c);
        return view(c);
    }

    /**
     * 社团资料里的文字过违禁词：名称、标语、简介、负责人（中英各一份）。
     * 命中时抛 400，错误信息里带「第几次提醒 / 封几天」，与帖子、个人资料页完全一致。
     */
    private void guardProfileText(HttpServletRequest r, Profile body) {
        if (moderation == null || body == null) {
            return;
        }
        var editor = access.current(r);
        String email = editor == null ? null : editor.getEmail();
        moderation.inspect(
            email == null || email.isBlank()
                ? null
                : com.qpwflshclub.formal_club.social.service.SchoolAccounts.key(email),
            com.qpwflshclub.formal_club.social.service.ModerationGate.CLUB,
            body.name(),
            body.nameEn(),
            body.slogan(),
            body.sloganEn(),
            body.description(),
            body.descriptionEn(),
            body.president(),
            body.presidentEn(),
            body.vicePresident(),
            body.vicePresidentEn()
        );
    }

    private String text(String s, int max, boolean required) {
        if (s == null || (required && s.isBlank()) || s.length() > max) throw WorkspaceStore.bad(
            "请完整填写资料，并遵守字数限制"
        );
        String trimmed = s.trim();
        com.qpwflshclub.formal_club.social.ContentModeration.check(trimmed);
        return trimmed;
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<?> error(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(
            Map.of("message", Objects.toString(e.getReason(), "请求失败"))
        );
    }
}

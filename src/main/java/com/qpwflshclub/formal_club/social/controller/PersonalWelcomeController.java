package com.qpwflshclub.formal_club.social.controller;

import com.qpwflshclub.formal_club.social.service.PersonalWelcomeStore;
import com.qpwflshclub.formal_club.social.service.SchoolAccounts;
import com.qpwflshclub.formal_club.workspace.service.WorkspaceAccess;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.Map;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/campus-social/personal-welcome")
public class PersonalWelcomeController {

    private final SchoolAccounts accounts;
    private final WorkspaceAccess access;
    private final PersonalWelcomeStore store;

    public PersonalWelcomeController(
        SchoolAccounts accounts,
        WorkspaceAccess access,
        PersonalWelcomeStore store
    ) {
        this.accounts = accounts;
        this.access = access;
        this.store = store;
    }

    private String own(HttpServletRequest r) {
        return SchoolAccounts.key(accounts.current(r).getEmail());
    }

    @GetMapping
    public ResponseEntity<?> get(HttpServletRequest r) throws IOException {
        String account = own(r);
        var welcome = store.find(account);
        boolean show = welcome != null && !store.seen(account, welcome.id());
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .body(
                show
                    ? Map.of(
                          "show",
                          true,
                          "welcome",
                          welcome,
                          "imageUrl",
                          "/api/campus-social/personal-welcome/image",
                          "token",
                          access.token(r)
                      )
                    : Map.of("show", false)
            );
    }

    @GetMapping("/image")
    public ResponseEntity<byte[]> image(HttpServletRequest r) throws IOException {
        return ResponseEntity.ok()
            .contentType(MediaType.IMAGE_JPEG)
            .cacheControl(CacheControl.noStore())
            .header("X-Content-Type-Options", "nosniff")
            .body(store.image(own(r)));
    }

    @PostMapping("/open")
    public ResponseEntity<?> open(HttpServletRequest r) throws IOException {
        String account = own(r);
        access.mutation(r);
        var welcome = store.find(account);
        boolean show = welcome != null && store.claim(account, welcome);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of("show", show));
    }
}

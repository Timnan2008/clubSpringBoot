# Website security hardening — 2026-09-20

## Application changes

- `RequestSecurityFilter` validates the exact browser origin (scheme, hostname, port) before session restoration or upload parsing. Cross-site and sibling-site writes are rejected, including the legacy logout GET. Missing provenance fails closed; same-origin Fetch Metadata or Referer supports browsers that omit Origin. Existing workspace and booking tokens remain required.
- Basic CSP (`frame-ancestors`, `object-src`, `base-uri`), nosniff, framing and referrer headers protect HTML responses without disabling the site's current inline scripts, Turnstile, animation or embedded video. This is not a complete script allowlist CSP.
- Legacy logo/video upload endpoints now enforce content signatures and 10 MB / 200 MB limits. Validation does not constitute malware scanning; newer upload flows already decode/transcode content.
- Removed embedded database and old SMTP-test credentials. Runtime secrets must come from the environment / private config. Credentials in old Git commits must be rotated, not merely removed from the current tree.
- Spring Boot updated from 3.5.6 to 3.5.16. SMTP certificate hostname verification is enabled.
- Cookie-only sessions use HttpOnly and SameSite=Lax; production enables Secure. The application defaults to loopback. Only the loopback reverse proxy is trusted to provide forwarding headers.

## Production configuration

The release preserves `spring.jpa.hibernate.ddl-auto=none` and does not apply schema migrations.

- The application binds its 8088 listener to loopback; Nginx remains the HTTPS entry point.
- Database listener, accounts, passwords and permissions are intentionally unchanged at the user's request. Keep the existing SSH-based database access arrangement. Removing a credential from the repository does not invalidate it in Git history: the existing database password still requires a separately coordinated rotation.
- systemd runs as `club-app` with no capabilities, NoNewPrivileges, private temporary files, a read-only filesystem and write access only to the application's data/media directories. Private metadata and release backups are not readable by other unprivileged users. Nginx retains read access to public media.
- Nginx replaces client-provided forwarding chains, adds HSTS for this hostname, and serves legacy uploaded media with nosniff and a sandbox CSP.

Keep using the existing SSH access arrangement for database administration. This release neither creates remote database accounts nor changes MySQL network configuration.

## Verification and limits

Automated checks cover forged and missing origins, proxy-header spoofing, logout, legitimate browser requests, upload type spoofing and size limits, alongside the existing authorization, business and MySQL integration tests. Production verification also checks HTTPS, login, Secure cookies, service identity, unchanged database settings and application listener scope. The npm runtime audit is separate from the Maven/runtime security review.

This is a targeted hardening pass, not a claim that the entire application has passed an independent penetration test. Historical credentials remain in Git history. Database credential rotation is deferred to preserve the user-requested configuration; the current SMTP secret differs from the removed historical test credential. Signature checks are not antivirus; stronger script CSP and periodic authenticated endpoint review remain useful follow-up work.

References: [OWASP CSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), [OWASP upload security](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).

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

- MySQL and the application's 8088 listener bind to loopback. Nginx remains the HTTPS entry point.
- The application uses `club_app@localhost`, restricted to SELECT/INSERT/UPDATE/DELETE on `club_demo`. It does not use the database administrator account.
- Exposed database administrator credentials are replaced; the wildcard root account is locked. Current administrator credentials are stored only in `/root/.config/club-app/mysql-admin.cnf` (0600).
- systemd runs as `club-app` with no capabilities, NoNewPrivileges, private temporary files, a read-only filesystem and write access only to the application's data/media directories. Private metadata and release backups are not readable by other unprivileged users. Nginx retains read access to public media.
- Nginx replaces client-provided forwarding chains, adds HSTS for this hostname, and serves legacy uploaded media with nosniff and a sandbox CSP.

Use an SSH tunnel for remote database access, for example:

```sh
ssh -N -L 13308:127.0.0.1:3306 root@123.57.189.22
```

Then connect the database client to `127.0.0.1:13308` using an explicitly provisioned database account. Do not restore the former public database listener or commit credentials.

For a server-side database backup, use the root-only option file rather than expanding a password on the command line:

```sh
mysqldump --defaults-extra-file=/root/.config/club-app/mysql-admin.cnf --single-transaction --no-tablespaces club_demo > /root/club_demo.sql
chmod 600 /root/club_demo.sql
```

## Verification and limits

Automated checks cover forged and missing origins, proxy-header spoofing, logout, legitimate browser requests, upload type spoofing and size limits, alongside the existing authorization, business and MySQL integration tests. Production verification also checks HTTPS, login, Secure cookies, service identity, database privileges and listener scope. The npm runtime audit is separate from the Maven/runtime security review.

This is a targeted hardening pass, not a claim that the entire application has passed an independent penetration test. Historical credentials remain in Git history but must no longer authenticate. Signature checks are not antivirus; stronger script CSP and periodic authenticated endpoint review remain useful follow-up work.

References: [OWASP CSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), [OWASP upload security](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).

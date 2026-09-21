# Website security hardening — 2026-09-20

## Application changes

- `RequestSecurityFilter` validates the exact browser origin (scheme, hostname, port) before session restoration or upload parsing. Cross-site and sibling-site writes are rejected, including the legacy logout GET. Missing provenance fails closed; same-origin Fetch Metadata or Referer supports browsers that omit Origin. Existing workspace and booking tokens remain required.
- Basic CSP (`frame-ancestors`, `object-src`, `base-uri`), nosniff, framing and referrer headers protect HTML responses without disabling the site's current inline scripts, Turnstile, animation or embedded video. This is not a complete script allowlist CSP.
- Legacy logo/video upload endpoints now enforce content signatures and 10 MB / 200 MB limits. Validation does not constitute malware scanning; newer upload flows already decode/transcode content.
- Removed embedded database and old SMTP-test credentials. Runtime secrets must come from the environment / private config. Credentials in old Git commits must be rotated, not merely removed from the current tree.
- Spring Boot updated from 3.5.6 to 3.5.16. SMTP certificate hostname verification is enabled.
- Cookie-only sessions use HttpOnly and SameSite=Lax; production enables Secure. Only the loopback reverse proxy is trusted to provide forwarding headers.

## Deployment scope

This is an application-only release. MySQL settings, database accounts and passwords, SSH access, Nginx configuration, systemd identity/permissions and the server's existing listening interfaces remain unchanged at the user's request. No infrastructure-hardening script was executed. Keep using the existing SSH arrangement for database administration.

The release preserves `spring.jpa.hibernate.ddl-auto=none` and does not apply schema migrations. Removing a credential from the current repository does not invalidate copies in Git history; database password rotation is deferred to preserve the requested configuration.

## Verification and limits

Automated checks cover forged and missing origins, proxy-header spoofing, logout, legitimate browser requests, upload type spoofing and size limits, alongside the existing authorization, business and MySQL integration tests. Production verification also checks HTTPS, login, Secure cookies, unchanged server/database configuration. The npm runtime audit is separate from the Maven/runtime security review.

This is a targeted hardening pass, not a claim that the entire application has passed an independent penetration test. Historical credentials remain in Git history. Database credential rotation is deferred to preserve the user-requested configuration; the current SMTP secret differs from the removed historical test credential. Signature checks are not antivirus; stronger script CSP and periodic authenticated endpoint review remain useful follow-up work.

References: [OWASP CSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), [OWASP upload security](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).

# Homepage DarkVeil background

React island mounted in the existing Spring Boot / Thymeleaf homepage.
Source: https://github.com/DavidHDev/react-bits/tree/main/src/content/Backgrounds/DarkVeil
See REACT-BITS-LICENSE.md for upstream licensing. Shader and lightMode match the supplied component; lifecycle and physical-pixel resolution are adapted for this homepage.

From the project root: `npm ci && npm run build:home`, then `./mvnw package`.
The generated JS and CSS are committed deliverables under static/javascript/darkveil; Java deployment needs no Node runtime or external CDN.

Edit props in home.jsx. The background observes its container, caps DPR at 2, pauses when hidden, renders a still frame for reduced motion, and keeps an animated purple CSS fallback when WebGL is unavailable, shaders fail, or the context is lost. The fallback is server-rendered outside the React root and works even if JavaScript is disabled. It pauses only after a successful WebGL frame; reduced-motion preferences keep both renderers still. The CSS flow approximates the purple visual style rather than reproducing the neural shader pixel for pixel.

## Authentication and navigation

`npm run build` compiles all React islands. `auth.jsx` uses the supplied React Bits Stepper (adapted for async validation, server-confirmed completion, accessible indicators and content resizing). `StaggeredMenu.jsx` adapts the supplied React Bits GSAP layered reveal to a portal, with focus trapping, Escape/click-away closing, inert background and reduced motion. Existing role-specific links come from Thymeleaf. `Search.jsx` uses the existing search API with debouncing, cancellation and keyboard selection.

Registration preserves the existing student/teacher payloads and email verification endpoints. It does not change backend authorization or email verification enforcement. UI flow tests intercept account/mail writes; they do not create production accounts or send email.

## Dark registration and ColorBends

The reference now uses four steps: profile, role, password, email verification. Student and teacher registration retains the existing API payloads. Club president is selectable, but explicitly routes to administrator-provisioning guidance and the login tab; it never sends a public president creation request. The backend administrator restriction is unchanged.

ColorBends is copied from the user-provided React Bits source, with Three.js installed locally. The illustration uses the requested pink/purple/teal palette and pointer response, respects reduced motion, pauses when hidden, cleans up renderer resources, and shows animated CSS color bands when WebGL initialization, shader compilation, or the context fails.

The search submit arrow uses a fixed SVG centered with zero button padding. Login/register panels use AnimatePresence for bidirectional exit/entrance transitions. The menu links to `/page/booking`; login now returns to the homepage after success, as requested; protected links still send unauthenticated visitors to login.

Booking uses an opaque servlet session created after password verification, separate from the legacy email cookie. `/booking/account` exposes only the verified account name/email/role; logout invalidates access. Configure `club.booking.url` for the booking frontend (local default `http://localhost:8765/`). The MRBS folder uses `CLUB_ACCOUNT_API` to validate `JSESSIONID` and `CLUB_LOGIN_URL` for login redirects. Both local apps use the same `localhost` hostname so their cookies are shared. Existing email-cookie-only logins need one fresh sign-in for booking.

## Club workspace

`/page/club/workspace` is a dedicated manager interface, linked once from the account menu for presidents, assigned teachers and administrators. The workspace includes club profile editing, plus calendar events, typed member membership changes, private file submissions/downloads and campus event applications. Administrators can approve/reject pending applications; only approved applications appear in the calendar. A president cannot remove the appointed president/vice-president or manage another club. User and president IDs are kept distinct during membership changes.

API: `/api/club-workspace`. Authentication uses the server-side session from password login, and writes require the per-session `X-Workspace-Token` returned by bootstrap. Existing email-cookie-only sessions need to sign in again. Files download only through authorized attachment responses; uploaded content is not served as public static files.

Storage: memberships use the existing school database. Documents, ordinary activity events and application status use private, atomic per-club JSON snapshots under `CLUB_WORKSPACE_DIR` (default `./data/club-workspace`, relative to the app working directory). Back up this directory along with the existing database. This store supports one running application instance; move metadata to a shared database before scaling to multiple instances. The current local run keeps data in the repository's `data/club-workspace`; rebuilding the JAR does not remove it. No school database schema migration is required. Each uploaded file is limited to 20 MB. All activity timestamps are Beijing local time.

The original school crest is retained inside `WFL-crest.svg` with a transparent, silhouette-shaped SVG clip; internal white lettering and artwork are preserved.


## Campus wall, messages and appointments

`/page/wall` is the signed-in campus feed. Students and club presidents can publish text posts and replies; signed-in accounts can like posts. Authors may delete their own posts and administrators may moderate by deleting posts. The feed loads 20 posts per page. `/page/messages` provides real-name/English-name search, private conversations, unread counts and read status; active conversations refresh every five seconds. Search results include a short account identifier to distinguish people with the same name, without exposing their email or password.

All `/api/campus-social` reads use the verified servlet session; writes also require `X-Workspace-Token`. Messages and invitations are returned only to their participants. Club profiles are edited through `/api/club-workspace/{club}/profile` with the existing club authorization checks. Display-name edits never grant an account a role. Primary presidents, assigned teachers and administrators can invite a registered student/president to become a president or vice-president of their club. The target must accept in private messages before receiving permission; authorization is checked again at acceptance. Invitations add an officer, without automatically removing existing officers. Public president registration remains disabled. Registration now explicitly requests real names; these are self-reported, not verified identity credentials.

Social content is saved in private atomic JSON snapshots under `CLUB_SOCIAL_DIR` (default `./data/campus-social`). Back up it and `CLUB_WORKSPACE_DIR` with the school database. This is designed for a single application instance. Account appointments use the existing database tables; invitation status is persisted after the appointment transaction. An interrupted response can be retried without creating another president account for the same email. Move social data into shared transactional storage before multi-instance deployment.

The authentication page has a Motion entrance animation, in addition to the login/register panel transition; reduced-motion preferences are respected. Backend regression tests cover session/token checks, conversation privacy, invitations, role grants, profile access and pagination. Browser UI checks use isolated fixture data and do not send real messages, invitations or posts.


Campus wall, messages, account pages and the club workspace share a light neutral / deep-violet CardNav header. Classification uses the React Bits OptionWheel in a keyboard-accessible picker, with explicit confirmation and reduced-motion support. No demonstration posts are shipped with the application.


## Community update: privacy, membership and account pages

The campus wall combines the school violet palette with compact social navigation, rounded editorial cards and recruitment/help/team/category filters. Anonymous posts and replies by their original author omit real identity from API responses. The server retains ownership for abuse handling; this is anonymity from other users, not from administrators or the server. Approved campus activity applications are published through `/api/campus-social/events`; pending/rejected applications, submitter details and review notes are excluded. Profile and joined-club pages use the account React island. Only actual memberships and officer appointments appear under My Clubs. Public signup and self profile edits cannot choose memberships, and the old self-join endpoint rejects attempts. Protected legacy APIs now authenticate the password-established server session instead of trusting the email cookie.

### Encrypted private messages

New message requests require a versioned encrypted envelope. Each account generates a P-256 ECDH key pair on-device. Only the public SPKI and its SHA-256 fingerprint are registered; server public keys are immutable through this API. Browser private CryptoKeys live in IndexedDB. A cross-tab Web Lock serializes first registration where supported. Peer keys are pinned on first use and key changes stop sending. Both users can compare a shared safety code outside the app to authenticate their initial key exchange.

For each message, Web Crypto derives a 256-bit AES-GCM key using ECDH then HKDF-SHA256 with a random 96-bit salt/IV and version/participant/key fingerprints as context and authenticated data. The backend stores ciphertext and routing/read/timing metadata, not newly sent message plaintext. Inbox previews display a generic encrypted-message label. This implementation uses static identity keys and does not provide forward secrecy or post-compromise recovery; it is not the Signal protocol. It relies on the browser/device and delivered application code being trustworthy. Public deployment requires HTTPS. APIs and private stores are single-instance as documented above.

Encrypted backups use a separate user-held passphrase (at least 12 characters), PBKDF2-SHA256 with 600,000 iterations, a random salt and AES-GCM. Backup export/import happens locally. Import verifies account, public/private key consistency and the registered fingerprint. Server-assisted recovery now stores the original key pair encrypted at rest independently of the login password (MessageRecovery), allowing email password recovery to restore chat access when that recovery copy exists. Without any device or recovery backup, lost historical keys cannot be restored. The server can recover these keys; this is not a server-blind end-to-end encryption model. The server does not accept silently generated replacement keys. Source primitives: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey

Existing plaintext messages remain explicitly labelled until their sender opens that conversation with both keys ready; the sender's browser then encrypts their own loaded history and replaces the server copy. Older pages migrate when loaded. Messages sent by an offline user cannot be retroactively encrypted without that sender/recipient key setup. Stored backups of historical plaintext are not retroactively encrypted. System appointment invitations retain structured readable data for role processing and are labelled as system notices; they are not private message ciphertext.

Verification: Node tests exercise both-party decryption, wrong keys, tampering, fresh nonces, encrypted backup/restore, wrong passphrases, different accounts and changed peer pins. Java tests cover anonymous API identity handling, filtering, public event exclusions, key registration/envelope enforcement and membership/profile access. UI mutation checks use fixtures, not real posts or appointments.


## Avatars and semester operations

`AvatarEditor` uploads JPG/PNG (up to 5 MB) with a local preview. `AvatarStore` checks the decoded format and pixel dimensions, center-crops and re-encodes to a 512 px PNG, discarding supplied filenames and metadata. Images live outside static resources at `club.avatar-dir` / `CLUB_AVATAR_DIR` (default `./data/avatars`) and are served only to authenticated accounts. The user's own session and mutation token determine whose avatar changes. Anonymous wall identities never carry avatar URLs. Include this directory in backups.

`ClubOperations` adds semester setup, initial proposals, end-of-term reviews, per-activity feedback, attendance and recruitment to the workspace. Online reports support drafts, resubmission and attachments referencing the existing authorized document store. Feedback is associated with an activity in the chosen semester and can only be submitted after the activity ends. The UI recommends submitting before the next scheduled/approved activity, or semester end for the last activity; these are reminders, not hard locks on late submissions. Semester dates are configured by the club manager, without generating assumed school dates.

Attendance starts unrecorded and accepts only present/leave/absent for current or previously recorded members. It opens at activity start. Historical recorded members are retained if later removed; activities with reports or attendance cannot be deleted. Rosters deduplicate the same account's student/officer identities. Recruitment candidates are stored separately and become actual members only after manager confirmation. The existing membership transaction completes before the confirmation record is saved; interrupted confirmation can safely be retried. Students cannot self-enroll.

Records are atomic, per-club `operations.json` files under the existing `club.workspace-dir`. They use the same club and session/token authorization as the rest of the workspace. No database schema migration is required. `ClubOperationsTest` and `AvatarTest` cover access boundaries, persistence, invalid inputs, report timing, attached-file ownership, attendance state/history, recruitment decisions and image validation. Browser mutation checks use an isolated fixture server.


## Shared language and sign-in persistence

`language.js` and `translations.json` localize the campus wall, messages, profile, club operations and CardNav. The `club_language` cookie is shared with Thymeleaf's CookieLocaleResolver and the booking site. Language buttons are available directly on CardNav and the booking header. User-created content and personal names are preserved. Qingyuan Ideas and its history page use `suggestion.jsx`, with the existing suggestion API and local pending-history cache.

The optional “Remember me for 30 days” checkbox sends `rememberMe` only on login. `RememberMeService` generates a random 256-bit credential in an HttpOnly, SameSite=Lax cookie (Secure on HTTPS). It stores only the credential hash, an account/password-version binding and absolute expiry in the private `club.remember-dir` (default `./data/remember`). Logout revokes the current device token. Password changes invalidate old tokens when restored. Unchecked sign-in revokes the current remembered token. Browser sessions are rebuilt from valid tokens after a restart. Do not put this private directory under static hosting.

Booking links show the court-use warning immediately, before loading the booking form. Each fresh booking requires reading it again; the server still rejects submissions missing `school_rules_ack`. The header offers a persistent rules button and back arrow. The legacy hidden MRBS banner is deliberately excluded when mounting these controls. The calendar and dialogs use the shared light paper/ink/violet palette and respect reduced motion.

Verification includes RememberMeTest (opaque cookie, service restart, logout, expiry, password change), the existing 47 backend tests, suggestion review-role tests and the three encryption tests. Browser checks use isolated fixtures for suggestions and sign-in; booking checks stop before creating reservations. Desktop and 390 px layouts, category selection, language persistence and profile key controls were checked.


Club directory refresh (2026-09-09): /page/clubs/{id} is the shared detail route; search and categories use the catalog bundle. Legacy name links redirect by the existing club identity. Header state uses authenticated server sessions and private pages are not cached. Only presidents and vice presidents can use the workspace, scoped to mainClub; administrator application review remains a separate endpoint. Registration checks Chinese/English scripts on both client and server. Generated officer credentials use salted PBKDF2 hashes; legacy passwords remain compatible. Local preview uses the existing published media URLs for server-hosted club photos/videos.

# KathaStream Security Specification

## 1. Data Invariants
1. **PII Isolation**: Email addresses, coin balances, parental PINs, and transaction ledgers live strictly under `/users_private/{userId}` and are readable/writable only by `request.auth.uid == userId` or verified admin.
2. **No Self-Assigned Privilege**: Users creating `/users_public/{userId}` may only assign `role: 'listener'` or `'creator'`, never `'admin'`. Admin status is verified solely via `/admins/{uid}` or verified admin email (`n.manikanta212@gmail.com` with `email_verified == true`).
3. **Series Ownership & Terminal/Moderation Integrity**: Only the series creator (`creatorId == request.auth.uid`) can create/edit their draft or submit it to `under_review`. Only an admin can transition a series or episode to `published` or `rejected` (with `rejectionReason`)—Wait: creators cannot self-approve a `rejected` series directly into `published`; they can only edit a `draft` or `rejected` series back to `draft` or `under_review` (or publish directly if pre-authorized creator, wait—let's enforce that `status` on create is `'draft'` or `'under_review'` and transitions to `'published'`/`'rejected'` require admin OR valid moderation rule). Even better: let's require admin for `'published'`/`'rejected'` transitions on existing series, while creators can create `'draft'` / `'under_review'` and update content fields!
4. **Master Gate for Subcollections**: Creating or deleting episodes under `/series/{seriesId}/episodes/{episodeId}` verifies via `get()` that `/series/{seriesId}` exists and `creatorId == request.auth.uid` (or `isAdmin()`).
5. **Immutable Ownership & Server Timestamps**: `createdAt == request.time`, `updatedAt == request.time`, and `creatorId` / `userId` / `seriesId` are immutable after creation.
6. **ID Poisoning & Size Limits**: Every document ID path variable is validated with `isValidId(id)` (`<= 128` chars, `^[a-zA-Z0-9_\-]+$`), and every string/list enforces strict `.size()` bounds.

## 2. The "Dirty Dozen" Attack Payloads (All Must Fail with PERMISSION_DENIED)
1. **Self-Privilege Escalation**: User writes `{ role: 'admin' }` to `/users_public/{uid}`.
2. **Shadow Field Injection**: User writes `{ uid, displayName, role: 'listener', isVerified: true, createdAt, updatedAt }` to `/users_public/{uid}`.
3. **PII Cross-Read**: User A calls `get()` on `/users_private/{userB}`.
4. **Unverified Admin Email Spoof**: Request with `email: 'n.manikanta212@gmail.com'` and `email_verified: false` tries to approve a series.
5. **Creator Identity Spoof**: User A creates a series in `/series/s1` with `creatorId: 'userB'`.
6. **Self-Publish Bypass**: Non-admin creator tries to update `/series/s1` `status` from `'under_review'` to `'published'`.
7. **Orphan Episode Injection**: User creates `/series/nonexistent/episodes/ep1`.
8. **Foreign Episode Hijack**: User B tries to add an episode to User A's series `/series/s1/episodes/ep2`.
9. **Timestamp Forgery**: Client sends `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time`.
10. **ID Poisoning**: Client writes to `/series/` with a 300-character ID or invalid characters like `../../admin`.
11. **Oversized Script Bomb**: Client sends a 500KB `description` string on a review or series.
12. **Blanket Report Scrape**: Non-admin user calls `list` on `/reports`.

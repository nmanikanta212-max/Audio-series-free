/**
 * Adversarial "Dirty Dozen" Firestore Security Rules Verification Specification.
 * Run against Firebase Emulator Suite (@firebase/rules-unit-testing) in CI.
 */
export const dirtyDozenPayloads = [
  { name: '1. Self-privilege escalation to admin role', path: 'users_public/attacker', payload: { uid: 'attacker', displayName: 'Mallory', role: 'admin' } },
  { name: '2. Shadow field injection on public profile', path: 'users_public/attacker', payload: { uid: 'attacker', displayName: 'Mallory', role: 'listener', isVerified: true } },
  { name: '3. Cross-user PII read on users_private', path: 'users_private/victim', operation: 'get' },
  { name: '4. Unverified admin email spoofing', path: 'series/s1', auth: { email: 'n.manikanta212@gmail.com', email_verified: false }, payload: { status: 'published' } },
  { name: '5. Creator ID spoofing on series create', path: 'series/s2', auth: { uid: 'userA' }, payload: { seriesId: 's2', creatorId: 'userB', status: 'draft' } },
  { name: '6. Self-publish bypass on existing series', path: 'series/s1', auth: { uid: 'userA' }, payload: { status: 'published' } },
  { name: '7. Orphan episode creation without parent series', path: 'series/nonexistent/episodes/ep1', payload: { episodeId: 'ep1', seriesId: 'nonexistent' } },
  { name: '8. Foreign episode hijack on another creator series', path: 'series/s1/episodes/ep2', auth: { uid: 'attacker' }, payload: { episodeId: 'ep2', seriesId: 's1', creatorId: 'attacker' } },
  { name: '9. Client timestamp forgery', path: 'series/s3', payload: { createdAt: '2020-01-01T00:00:00Z' } },
  { name: '10. ID poisoning with path traversal', path: 'series/.._admin', payload: { seriesId: '.._admin' } },
  { name: '11. Oversized description bomb (>2000 chars)', path: 'series/s4', payload: { description: 'x'.repeat(5000) } },
  { name: '12. Unauthorized blanket list on reports', path: 'reports', auth: { uid: 'userA' }, operation: 'list' }
];

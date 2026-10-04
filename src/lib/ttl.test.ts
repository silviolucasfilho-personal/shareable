import { describe, expect, it } from 'vitest';
import { calculateExpiresAt, isDocumentExpired, formatExpiresIn } from './utils';
import { createDocument, getDocumentById, getDocuments, purgeExpiredDocuments, updateDocument, canUserCreateDocument } from './storage';

describe('TTL Utilities', () => {
  describe('calculateExpiresAt', () => {
    it('returns null for empty, never, or zero values', () => {
      expect(calculateExpiresAt()).toBeNull();
      expect(calculateExpiresAt(null)).toBeNull();
      expect(calculateExpiresAt('')).toBeNull();
      expect(calculateExpiresAt('never')).toBeNull();
      expect(calculateExpiresAt('None')).toBeNull();
      expect(calculateExpiresAt('0')).toBeNull();
      expect(calculateExpiresAt('forever')).toBeNull();
    });

    it('correctly calculates 1h preset', () => {
      const now = Date.now();
      const expires = calculateExpiresAt('1h');
      expect(expires).not.toBeNull();
      const expTime = new Date(expires!).getTime();
      const diffMinutes = Math.round((expTime - now) / (60 * 1000));
      expect(diffMinutes).toBe(60);
    });

    it('correctly calculates 24h / 1d preset', () => {
      const now = Date.now();
      const expires24h = calculateExpiresAt('24h');
      const expires1d = calculateExpiresAt('1d');
      expect(expires24h).not.toBeNull();
      expect(expires1d).not.toBeNull();

      const diffHours24 = Math.round((new Date(expires24h!).getTime() - now) / (60 * 60 * 1000));
      const diffHours1d = Math.round((new Date(expires1d!).getTime() - now) / (60 * 60 * 1000));
      expect(diffHours24).toBe(24);
      expect(diffHours1d).toBe(24);
    });

    it('correctly calculates 7d and 30d presets', () => {
      const now = Date.now();
      const exp7d = calculateExpiresAt('7d');
      const exp30d = calculateExpiresAt('30d');

      const diffDays7 = Math.round((new Date(exp7d!).getTime() - now) / (24 * 60 * 60 * 1000));
      const diffDays30 = Math.round((new Date(exp30d!).getTime() - now) / (24 * 60 * 60 * 1000));

      expect(diffDays7).toBe(7);
      expect(diffDays30).toBe(30);
    });

    it('supports numeric seconds', () => {
      const now = Date.now();
      const exp3600 = calculateExpiresAt('3600');
      expect(exp3600).not.toBeNull();
      const diffHours = Math.round((new Date(exp3600!).getTime() - now) / (60 * 60 * 1000));
      expect(diffHours).toBe(1);
    });

    it('preserves valid ISO timestamps', () => {
      const future = new Date(Date.now() + 86400000).toISOString();
      expect(calculateExpiresAt(future)).toBe(future);
    });
  });

  describe('isDocumentExpired', () => {
    it('returns false for null or undefined', () => {
      expect(isDocumentExpired(null)).toBe(false);
      expect(isDocumentExpired(undefined)).toBe(false);
      expect(isDocumentExpired('')).toBe(false);
    });

    it('returns false for future dates', () => {
      const future = new Date(Date.now() + 100000).toISOString();
      expect(isDocumentExpired(future)).toBe(false);
    });

    it('returns true for past dates', () => {
      const past = new Date(Date.now() - 100000).toISOString();
      expect(isDocumentExpired(past)).toBe(true);
    });
  });

  describe('formatExpiresIn', () => {
    it('returns null when no expiration', () => {
      expect(formatExpiresIn(null)).toBeNull();
      expect(formatExpiresIn(undefined)).toBeNull();
    });

    it('returns Expired for past dates', () => {
      const past = new Date(Date.now() - 5000).toISOString();
      expect(formatExpiresIn(past)).toBe('Expired');
    });

    it('formats minutes, hours, and days remaining', () => {
      const in30Mins = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      expect(formatExpiresIn(in30Mins)).toBe('30m');

      const in5Hours = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString();
      expect(formatExpiresIn(in5Hours)).toBe('5h');

      const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatExpiresIn(in3Days)).toBe('3d');
    });
  });

  describe('Storage TTL Integration', () => {
    it('stores expiresAt when document is created with ttl', async () => {
      const doc = await createDocument({
        title: 'TTL Test Doc',
        content: '# Test',
        ttl: '1h',
        ownerEmail: 'silviolucasfilho@gmail.com',
      });

      expect(doc.expiresAt).toBeDefined();
      expect(isDocumentExpired(doc.expiresAt)).toBe(false);

      const fetched = await getDocumentById(doc.id);
      expect(fetched?.expiresAt).toBe(doc.expiresAt);
    });

    it('automatically purges expired documents upon fetch', async () => {
      const pastDate = new Date(Date.now() - 5000).toISOString();
      const expiredDoc = await createDocument({
        title: 'Already Expired Doc',
        content: '# Expired content',
        expiresAt: pastDate,
        ownerEmail: 'silviolucasfilho@gmail.com',
      });

      expect(expiredDoc.id).toBeDefined();

      // Fetching by ID directly should purge it and return null
      const fetched = await getDocumentById(expiredDoc.id);
      expect(fetched).toBeNull();

      // Calling getDocuments should not include the expired document
      const allDocs = await getDocuments();
      expect(allDocs.some((d) => d.id === expiredDoc.id)).toBe(false);
    });

    it('allows updating or clearing TTL on an existing document', async () => {
      const doc = await createDocument({
        title: 'Update TTL Test',
        content: '# Content',
        ttl: '1h',
        ownerEmail: 'silviolucasfilho@gmail.com',
      });
      expect(doc.expiresAt).not.toBeNull();

      // Clear TTL by setting ttl: 'never'
      const updated = await updateDocument(doc.id, {
        ttl: 'never',
      });
      expect(updated?.expiresAt).toBeNull();

      // Set new TTL
      const updated2 = await updateDocument(doc.id, {
        ttl: '7d',
      });
      expect(updated2?.expiresAt).not.toBeNull();
    });

    it('releases user quota when an expired document is purged', async () => {
      const testEmail = `quota-ttl-${Date.now()}@example.com`;
      const testId = `user-${Date.now()}`;

      // Create 2 normal documents
      await createDocument({
        title: 'Doc 1',
        content: 'Content 1',
        ownerEmail: testEmail,
        ownerId: testId,
      });
      await createDocument({
        title: 'Doc 2',
        content: 'Content 2',
        ownerEmail: testEmail,
        ownerId: testId,
      });

      // Create 1 expired document
      const expiredDoc = await createDocument({
        title: 'Doc 3 (Expired)',
        content: 'Content 3',
        ownerEmail: testEmail,
        ownerId: testId,
        expiresAt: new Date(Date.now() - 10000).toISOString(),
      });

      // Purge should remove the expired doc and leave only 2 active documents
      const purgedCount = await purgeExpiredDocuments();
      expect(purgedCount).toBeGreaterThanOrEqual(1);

      // Quota check: user should still be allowed to add 1 more document (since limit is 3 and they currently have 2)
      const quotaCheck = await canUserCreateDocument(testEmail, testId, 0);
      expect(quotaCheck.allowed).toBe(true);
      expect(quotaCheck.currentCount).toBe(2);
      expect(quotaCheck.remaining).toBe(1);

      const canAddOne = await canUserCreateDocument(testEmail, testId, 1);
      expect(canAddOne.allowed).toBe(true);
      expect(canAddOne.remaining).toBe(0);
    });
  });
});

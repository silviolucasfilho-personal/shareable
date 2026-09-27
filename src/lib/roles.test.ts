import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ADMIN_EMAIL,
  FREE_USER_DOC_LIMIT,
  isUserAdmin,
  getUserRole,
  calculateUserQuota,
} from './roles';

describe('User Roles & Quota Logic', () => {
  it('identifies silviolucasfilho@gmail.com as ADMIN', () => {
    expect(DEFAULT_ADMIN_EMAIL).toBe('silviolucasfilho@gmail.com');
    expect(isUserAdmin('silviolucasfilho@gmail.com')).toBe(true);
    expect(isUserAdmin('SILVIOLUCASFILHO@GMAIL.COM')).toBe(true);
    expect(isUserAdmin('  silviolucasfilho@gmail.com  ')).toBe(true);
    expect(getUserRole('silviolucasfilho@gmail.com')).toBe('ADMIN');
  });

  it('identifies any other email as FREE_USER', () => {
    expect(isUserAdmin('bob@gmail.com')).toBe(false);
    expect(isUserAdmin('alice@company.org')).toBe(false);
    expect(isUserAdmin('')).toBe(false);
    expect(isUserAdmin(null)).toBe(false);
    expect(getUserRole('bob@gmail.com')).toBe('FREE_USER');
    expect(getUserRole('newuser@domain.com')).toBe('FREE_USER');
    expect(getUserRole(null)).toBe('FREE_USER');
  });

  it('calculates unlimited quota for ADMIN', () => {
    const quota = calculateUserQuota(100, 'silviolucasfilho@gmail.com');
    expect(quota.role).toBe('ADMIN');
    expect(quota.maxDocuments).toBeNull();
    expect(quota.canCreate).toBe(true);
    expect(quota.remaining).toBeNull();
  });

  it('calculates 3-document limit quota for FREE_USER', () => {
    expect(FREE_USER_DOC_LIMIT).toBe(3);

    const quota0 = calculateUserQuota(0, 'user@test.com');
    expect(quota0.role).toBe('FREE_USER');
    expect(quota0.maxDocuments).toBe(3);
    expect(quota0.currentCount).toBe(0);
    expect(quota0.canCreate).toBe(true);
    expect(quota0.remaining).toBe(3);

    const quota2 = calculateUserQuota(2, 'user@test.com');
    expect(quota2.canCreate).toBe(true);
    expect(quota2.remaining).toBe(1);

    const quota3 = calculateUserQuota(3, 'user@test.com');
    expect(quota3.canCreate).toBe(false);
    expect(quota3.remaining).toBe(0);

    const quota4 = calculateUserQuota(4, 'user@test.com');
    expect(quota4.canCreate).toBe(false);
    expect(quota4.remaining).toBe(0);
  });
});

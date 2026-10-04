import { describe, expect, it } from 'vitest';
import { canUserCreateDocument, createDocument } from './storage';

describe('Storage Quota Enforcement', () => {
  it('strictly rejects document creation without an explicit owner', async () => {
    // @ts-expect-error testing missing ownerEmail at runtime
    await expect(createDocument({ title: 'No Owner', content: 'Test' })).rejects.toThrow(
      'An explicit document owner (ownerEmail) is required'
    );

    await expect(
      createDocument({ title: 'Empty Owner', content: 'Test', ownerEmail: '   ' })
    ).rejects.toThrow('An explicit document owner (ownerEmail) is required');
  });

  it('allows ADMIN to create unlimited documents', async () => {
    const adminCheck = await canUserCreateDocument('silviolucasfilho@gmail.com', 'admin-id', 1);
    expect(adminCheck.allowed).toBe(true);
    expect(adminCheck.role).toBe('ADMIN');
    expect(adminCheck.maxDocuments).toBeNull();
    expect(adminCheck.remaining).toBeNull();

    // Adding 100 documents at once is also allowed for admin
    const bulkCheck = await canUserCreateDocument('silviolucasfilho@gmail.com', 'admin-id', 100);
    expect(bulkCheck.allowed).toBe(true);
  });

  it('restricts FREE_USER to a maximum of 3 documents', async () => {
    // Brand new user with 0 documents
    const newEmail = `user-${Date.now()}@example.com`;
    const check1 = await canUserCreateDocument(newEmail, undefined, 1);
    expect(check1.allowed).toBe(true);
    expect(check1.role).toBe('FREE_USER');
    expect(check1.maxDocuments).toBe(3);
    expect(check1.currentCount).toBe(0);

    // If new user tries to add 4 documents at once, it is blocked
    const bulkFreeCheck = await canUserCreateDocument(newEmail, undefined, 4);
    expect(bulkFreeCheck.allowed).toBe(false);
    expect(bulkFreeCheck.role).toBe('FREE_USER');
    expect(bulkFreeCheck.error).toContain('Free users can keep up to 3 documents');
  });
});

import { describe, it, expect } from 'vitest';
import {
  isDocumentOwner,
  isDocumentCollaborator,
  canUserViewDocument,
  canUserEditDocument,
  isListedForUser,
  MinimalDocAuth,
} from './permissions';

describe('permissions utility', () => {
  const publicDoc: MinimalDocAuth = {
    isPublic: true,
    ownerEmail: 'alice@example.com',
    ownerId: 'user-alice',
  };

  const privateDoc: MinimalDocAuth = {
    isPublic: false,
    ownerEmail: 'alice@example.com',
    ownerId: 'user-alice',
    collaborators: [
      { email: 'bob@example.com', role: 'editor' },
      { email: 'charlie@example.com', role: 'viewer' },
    ],
  };

  describe('canUserViewDocument', () => {
    it('allows anyone to view public documents', () => {
      expect(canUserViewDocument(publicDoc, null, null)).toBe(true);
      expect(canUserViewDocument(publicDoc, 'stranger@example.com', 'user-stranger')).toBe(true);
    });

    it('denies unauthenticated or stranger users from viewing private documents', () => {
      expect(canUserViewDocument(privateDoc, null, null)).toBe(false);
      expect(canUserViewDocument(privateDoc, 'stranger@example.com', 'user-stranger')).toBe(false);
    });

    it('allows owner to view private documents', () => {
      expect(canUserViewDocument(privateDoc, 'alice@example.com', 'user-alice')).toBe(true);
      expect(canUserViewDocument(privateDoc, 'ALICE@example.com', null)).toBe(true);
      expect(canUserViewDocument(privateDoc, null, 'user-alice')).toBe(true);
    });

    it('allows invited collaborators to view private documents', () => {
      expect(canUserViewDocument(privateDoc, 'bob@example.com', 'user-bob')).toBe(true);
      expect(canUserViewDocument(privateDoc, 'charlie@example.com', 'user-charlie')).toBe(true);
    });

    it('allows Admin user to view private documents', () => {
      expect(canUserViewDocument(privateDoc, 'silviolucasfilho@gmail.com', 'admin-id')).toBe(true);
    });
  });

  describe('isListedForUser (Option B Personal Dashboard)', () => {
    it('lists document for owner', () => {
      expect(isListedForUser(publicDoc, 'alice@example.com', 'user-alice')).toBe(true);
      expect(isListedForUser(privateDoc, 'alice@example.com', 'user-alice')).toBe(true);
    });

    it('lists document for invited collaborators', () => {
      expect(isListedForUser(privateDoc, 'bob@example.com', 'user-bob')).toBe(true);
      expect(isListedForUser(privateDoc, 'charlie@example.com', 'user-charlie')).toBe(true);
    });

    it('does NOT list other users documents on someone elses dashboard even if public', () => {
      expect(isListedForUser(publicDoc, 'stranger@example.com', 'user-stranger')).toBe(false);
      expect(isListedForUser(publicDoc, 'silviolucasfilho2@gmail.com', 'user-2')).toBe(false);
    });

    it('does not list for unauthenticated callers', () => {
      expect(isListedForUser(publicDoc, null, null)).toBe(false);
      expect(isListedForUser(privateDoc, null, null)).toBe(false);
    });
  });

  describe('canUserEditDocument', () => {
    it('allows owner and admin to edit', () => {
      expect(canUserEditDocument(privateDoc, 'alice@example.com', 'user-alice')).toBe(true);
      expect(canUserEditDocument(privateDoc, 'silviolucasfilho@gmail.com', 'admin-id')).toBe(true);
    });

    it('allows collaborator with editor role to edit', () => {
      expect(canUserEditDocument(privateDoc, 'bob@example.com', 'user-bob')).toBe(true);
    });

    it('denies collaborator with viewer role from editing', () => {
      expect(canUserEditDocument(privateDoc, 'charlie@example.com', 'user-charlie')).toBe(false);
    });

    it('denies strangers and unauthenticated from editing', () => {
      expect(canUserEditDocument(privateDoc, 'stranger@example.com', 'user-stranger')).toBe(false);
      expect(canUserEditDocument(privateDoc, null, null)).toBe(false);
    });
  });
});

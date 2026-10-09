/**
 * Regression tests for the real onUserExchanges() in
 * src/services/firestoreService.ts.
 *
 * The bug: the function merged two Firestore listeners (senderId == uid and
 * receiverId == uid) with a single seen-ids set, so when one query's
 * snapshot fired with results missing from the other query, exchanges were
 * wrongly removed (e.g. a received exchange vanished when the sent-query
 * snapshot fired empty).
 *
 * These tests drive the actual implementation with a mocked firebase/firestore.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

type SnapDoc = { id: string; data: () => Record<string, unknown> };
type SnapCallback = (snap: { forEach: (cb: (d: SnapDoc) => void) => void }) => void;

const listeners: SnapCallback[] = [];

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    onSnapshot: vi.fn((_q: unknown, cb: SnapCallback) => {
      listeners.push(cb);
      return () => {};
    }),
  };
});

import { onUserExchanges } from '../../services/firestoreService';
import type { Exchange } from '../../types';

function makeSnap(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  return {
    forEach: (cb: (d: SnapDoc) => void) => {
      for (const d of docs) cb({ id: d.id, data: () => d.data });
    },
  };
}

function fireListener(index: 0 | 1, docs: Array<{ id: string; data: Record<string, unknown> }>) {
  listeners[index](makeSnap(docs));
}

const baseExchange = {
  bookId: 'b1',
  bookTitle: 'Dune',
  bookAuthor: 'Frank Herbert',
  status: 'pending',
  requestedAt: new Date(),
};

describe('onUserExchanges (real implementation)', () => {
  beforeEach(() => {
    listeners.length = 0;
    vi.clearAllMocks();
  });

  it('keeps a received exchange when the sent-query snapshot fires empty (the original bug)', () => {
    const seen: Exchange[][] = [];
    onUserExchanges('userB', (exs) => seen.push(exs));
    expect(listeners).toHaveLength(2); // q1 (sender), q2 (receiver)

    // q1 (senderId == userB) fires empty
    fireListener(0, []);
    // q2 (receiverId == userB) fires with the exchange
    fireListener(1, [
      { id: 'ex1', data: { ...baseExchange, senderId: 'userA', receiverId: 'userB' } },
    ]);

    let latest = seen[seen.length - 1];
    expect(latest.map((e) => e.id)).toEqual(['ex1']);

    // q1 fires empty AGAIN (e.g. metadata-only change) — the exchange must survive
    fireListener(0, []);
    latest = seen[seen.length - 1];
    expect(latest.map((e) => e.id)).toEqual(['ex1']);
  });

  it('keeps a sent exchange when the received-query snapshot fires empty', () => {
    const seen: Exchange[][] = [];
    onUserExchanges('userA', (exs) => seen.push(exs));

    fireListener(1, []); // q2 empty first
    fireListener(0, [
      { id: 'ex2', data: { ...baseExchange, senderId: 'userA', receiverId: 'userB' } },
    ]);
    fireListener(1, []); // q2 fires empty again

    const latest = seen[seen.length - 1];
    expect(latest.map((e) => e.id).sort()).toEqual(['ex2']);
  });

  it('removes an exchange only when it leaves BOTH queries', () => {
    const seen: Exchange[][] = [];
    onUserExchanges('userA', (exs) => seen.push(exs));

    fireListener(0, [
      { id: 'ex3', data: { ...baseExchange, senderId: 'userA', receiverId: 'userB' } },
    ]);
    expect(seen[seen.length - 1]).toHaveLength(1);

    // Leaves q1 but the exchange object still exists in q2's results
    // (e.g. data change) — must NOT disappear
    fireListener(0, []);
    fireListener(1, [
      { id: 'ex3', data: { ...baseExchange, senderId: 'userA', receiverId: 'userB' } },
    ]);
    expect(seen[seen.length - 1].map((e) => e.id)).toEqual(['ex3']);

    // Now it leaves q2 as well — gone for good
    fireListener(1, []);
    expect(seen[seen.length - 1]).toHaveLength(0);
  });

  it('propagates status updates to already-tracked exchanges', () => {
    const seen: Exchange[][] = [];
    onUserExchanges('userB', (exs) => seen.push(exs));

    fireListener(1, [
      { id: 'ex4', data: { ...baseExchange, senderId: 'userA', receiverId: 'userB', status: 'pending' } },
    ]);
    expect(seen[seen.length - 1][0].status).toBe('pending');

    // Receiver accepts — same id, new status in the snapshot
    fireListener(1, [
      { id: 'ex4', data: { ...baseExchange, senderId: 'userA', receiverId: 'userB', status: 'accepted' } },
    ]);
    const latest = seen[seen.length - 1];
    expect(latest).toHaveLength(1);
    expect(latest[0].status).toBe('accepted');
  });

  it('returns an unsubscribe function that detaches both listeners', () => {
    const unsub = onUserExchanges('userA', () => {});
    expect(typeof unsub).toBe('function');
    expect(() => unsub()).not.toThrow();
  });
});

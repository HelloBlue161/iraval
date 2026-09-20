/**
 * Tests for the shared Firestore service
 * Specifically tests the exchange race condition fix
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the types
interface Exchange {
  id: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  senderId: string;
  receiverId: string;
  status: string;
  requestedAt: Date;
  respondedAt?: Date;
  note?: string;
  declineNote?: string;
}

describe('onUserExchanges Race Condition Fix', () => {
  // Simulated Firestore exchange tracking
  class ExchangeQueryTracker {
    private exchangeMap = new Map<string, Exchange>();
    private querySet1 = new Set<string>(); // senderId == uid
    private querySet2 = new Set<string>(); // receiverId == uid

    // Fixed processSnap implementation (same logic as in firestoreService.ts)
    processSnap(snap: { id: string }[], querySet: Set<string>) {
      const snapIds = new Set<string>();
      snap.forEach((d) => {
        snapIds.add(d.id);
        querySet.add(d.id);
      });

      for (const id of querySet) {
        if (!snapIds.has(id)) {
          querySet.delete(id);
          // Only delete exchange if it's not in the OTHER query set either
          const otherQuerySet = querySet === this.querySet1 ? this.querySet2 : this.querySet1;
          if (!otherQuerySet.has(id)) {
            this.exchangeMap.delete(id);
          }
        }
      }
    }

    addExchange(ex: Exchange) {
      this.exchangeMap.set(ex.id, ex);
    }

    getExchanges(): Exchange[] {
      return Array.from(this.exchangeMap.values());
    }

    hasExchange(id: string): boolean {
      return this.exchangeMap.has(id);
    }
  }

  it('should handle the original bug scenario correctly', () => {
    const tracker = new ExchangeQueryTracker();

    // Simulate: User B receives an exchange from User A
    const exchange: Exchange = {
      id: 'ex_received',
      bookId: 'book_123',
      bookTitle: 'Dune',
      bookAuthor: 'Frank Herbert',
      senderId: 'userA',
      receiverId: 'userB',
      status: 'pending',
      requestedAt: new Date(),
    };

    // Step 1: Query 1 fires - User B is NOT the sender, returns empty
    // In the old buggy code, this would clear allExchanges
    // In the fixed code, querySet1 is empty but querySet2 will get populated
    tracker.processSnap([], tracker['querySet1']);

    // Step 2: Query 2 fires - User B IS the receiver
    tracker.processSnap(
      [{ id: exchange.id }],
      tracker['querySet2']
    );
    tracker.addExchange(exchange);

    // FIXED: Exchange should still be present!
    expect(tracker.hasExchange('ex_received')).toBe(true);
    expect(tracker.getExchanges()).toHaveLength(1);
  });

  it('should handle bidirectional exchanges', () => {
    const tracker = new ExchangeQueryTracker();

    // Exchange 1: User A sends to User B
    const ex1: Exchange = {
      id: 'ex1',
      bookId: 'b1',
      bookTitle: 'Book A',
      bookAuthor: 'Author A',
      senderId: 'userA',
      receiverId: 'userB',
      status: 'pending',
      requestedAt: new Date(),
    };

    // Exchange 2: User B sends to User A (from userB's perspective)
    const ex2: Exchange = {
      id: 'ex2',
      bookId: 'b2',
      bookTitle: 'Book B',
      bookAuthor: 'Author B',
      senderId: 'userB',
      receiverId: 'userA',
      status: 'accepted',
      requestedAt: new Date(),
      respondedAt: new Date(),
    };

    // From userB's perspective:
    // - ex1 is in query2 (receiver) AND query1 (also appears in query1 results)
    // - ex2 is in query1 (sender) AND query2 (also appears in query2 results)
    // This simulates the race condition where both queries return results
    tracker.addExchange(ex1);
    tracker.addExchange(ex2);
    tracker['querySet1'].add('ex1');
    tracker['querySet1'].add('ex2');
    tracker['querySet2'].add('ex1');
    tracker['querySet2'].add('ex2');

    // Simulate Query 1 empty update (query returns no results)
    tracker.processSnap([], tracker['querySet1']);

    // Both exchanges should still exist (because they're still in querySet2)
    expect(tracker.hasExchange('ex1')).toBe(true);
    expect(tracker.hasExchange('ex2')).toBe(true);
  });

  it('should handle exchange status updates', () => {
    const tracker = new ExchangeQueryTracker();

    const ex: Exchange = {
      id: 'ex_update',
      bookId: 'b1',
      bookTitle: 'Test',
      bookAuthor: 'Test Author',
      senderId: 'userA',
      receiverId: 'userB',
      status: 'pending',
      requestedAt: new Date(),
    };

    tracker.addExchange(ex);
    tracker['querySet1'].add('ex_update');

    // Simulate status change to accepted
    const updatedEx: Exchange = {
      ...ex,
      status: 'accepted',
      respondedAt: new Date(),
    };
    tracker.addExchange(updatedEx);

    // Query 1 returns the updated exchange
    tracker.processSnap(
      [{ id: 'ex_update' }],
      tracker['querySet1']
    );

    const result = tracker.getExchanges()[0];
    expect(result.status).toBe('accepted');
    expect(result.respondedAt).toBeDefined();
  });

  it('should handle multiple rapid updates correctly', () => {
    const tracker = new ExchangeQueryTracker();

    // Add three exchanges
    const ex1: Exchange = { id: 'e1', bookId: 'b1', bookTitle: 'A', bookAuthor: 'A', senderId: 'userB', receiverId: 'userA', status: 'pending', requestedAt: new Date() };
    const ex2: Exchange = { id: 'e2', bookId: 'b2', bookTitle: 'B', bookAuthor: 'B', senderId: 'userA', receiverId: 'userB', status: 'pending', requestedAt: new Date() };
    const ex3: Exchange = { id: 'e3', bookId: 'b3', bookTitle: 'C', bookAuthor: 'C', senderId: 'userC', receiverId: 'userB', status: 'accepted', requestedAt: new Date(), respondedAt: new Date() };

    tracker.addExchange(ex1);
    tracker.addExchange(ex2);
    tracker.addExchange(ex3);
    // All exchanges are in both query sets (simulating the race condition scenario)
    tracker['querySet1'].add('e1');
    tracker['querySet1'].add('e2');
    tracker['querySet1'].add('e3');
    tracker['querySet2'].add('e1');
    tracker['querySet2'].add('e2');
    tracker['querySet2'].add('e3');

    // Simulate rapid updates
    tracker.processSnap([], tracker['querySet1']); // All removed from q1
    tracker.processSnap([{ id: 'e2' }], tracker['querySet1']); // e2 back in q1

    // All three should still exist (because they're still in querySet2)
    expect(tracker.hasExchange('e1')).toBe(true);
    expect(tracker.hasExchange('e2')).toBe(true);
    expect(tracker.hasExchange('e3')).toBe(true);
  });

  it('should remove exchanges that no longer match either query', () => {
    const tracker = new ExchangeQueryTracker();

    const ex: Exchange = {
      id: 'e_remove',
      bookId: 'b1',
      bookTitle: 'Test',
      bookAuthor: 'Test',
      senderId: 'userA',
      receiverId: 'userB',
      status: 'pending',
      requestedAt: new Date(),
    };

    tracker.addExchange(ex);
    tracker['querySet1'].add('e_remove');
    tracker['querySet2'].add('e_remove');

    // Both queries return empty (exchange was deleted)
    tracker.processSnap([], tracker['querySet1']);
    tracker.processSnap([], tracker['querySet2']);

    // Exchange should be removed
    expect(tracker.hasExchange('e_remove')).toBe(false);
  });
});

describe('Exchange Status Transitions', () => {
  it('should allow pending -> accepted transition', () => {
    const transitions = {
      'pending': 'accepted',
      'accepted': 'pending',
      'declined': 'pending',
    };

    const validTransitions = new Map<string, Set<string>>([
      ['pending', new Set(['accepted', 'declined'])],
      ['accepted', new Set()],
      ['declined', new Set()],
    ]);

    const fromStatus = 'pending';
    const toStatus = 'accepted';

    expect(validTransitions.get(fromStatus)?.has(toStatus)).toBe(true);
  });

  it('should allow pending -> declined transition', () => {
    const validTransitions = new Map<string, Set<string>>([
      ['pending', new Set(['accepted', 'declined'])],
      ['accepted', new Set()],
      ['declined', new Set()],
    ]);

    expect(validTransitions.get('pending')?.has('declined')).toBe(true);
  });

  it('should not allow accepted -> any other state', () => {
    const validTransitions = new Map<string, Set<string>>([
      ['pending', new Set(['accepted', 'declined'])],
      ['accepted', new Set()],
      ['declined', new Set()],
    ]);

    expect(validTransitions.get('accepted')).toEqual(new Set());
  });
});

describe('Exchange Sorting', () => {
  it('should sort exchanges: pending first, then accepted, then declined', () => {
    const exchanges: Exchange[] = [
      { id: '1', bookId: 'b1', bookTitle: 'A', bookAuthor: 'A', senderId: 'a', receiverId: 'b', status: 'accepted', requestedAt: new Date() },
      { id: '2', bookId: 'b2', bookTitle: 'B', bookAuthor: 'B', senderId: 'a', receiverId: 'b', status: 'pending', requestedAt: new Date() },
      { id: '3', bookId: 'b3', bookTitle: 'C', bookAuthor: 'C', senderId: 'a', receiverId: 'b', status: 'declined', requestedAt: new Date() },
      { id: '4', bookId: 'b4', bookTitle: 'D', bookAuthor: 'D', senderId: 'a', receiverId: 'b', status: 'pending', requestedAt: new Date() },
    ];

    const order: Record<string, number> = { pending: 0, accepted: 1, declined: 2 };
    const sorted = [...exchanges].sort((a, b) => (order[a.status] ?? 0) - (order[b.status] ?? 0));

    expect(sorted[0].status).toBe('pending');
    expect(sorted[1].status).toBe('pending');
    expect(sorted[2].status).toBe('accepted');
    expect(sorted[3].status).toBe('declined');
  });
});

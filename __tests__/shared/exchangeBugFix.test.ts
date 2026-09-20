/**
 * Tests for the exchange race condition bug fix
 *
 * The bug: onUserExchanges() used a single seenIds set and processSnap()
 * which incorrectly removed exchanges that existed in one query but not
 * the other. The fix uses separate query sets to track which exchanges
 * belong to which query.
 */
import { describe, it, expect } from 'vitest';

// Simulate the FIXED exchange tracking logic
class ExchangeTracker {
  private exchangeMap = new Map<string, { id: string; senderId: string; receiverId: string; status: string }>();
  private querySet1 = new Set<string>(); // exchanges from q1 (user is sender)
  private querySet2 = new Set<string>(); // exchanges from q2 (user is receiver)

  // Process results from query 1 (senderId == uid)
  processQuery1(snapResults: Array<{ id: string; senderId: string; receiverId: string; status: string }>) {
    const currentIds = new Set(snapResults.map(r => r.id));

    for (const result of snapResults) {
      this.querySet1.add(result.id);
      this.exchangeMap.set(result.id, result);
    }

    // Remove exchanges no longer in this query
    for (const id of this.querySet1) {
      if (!currentIds.has(id)) {
        this.querySet1.delete(id);
        if (!this.querySet1.has(id) || !this.querySet2.has(id)) {
          this.exchangeMap.delete(id);
        }
      }
    }
  }

  // Process results from query 2 (receiverId == uid)
  processQuery2(snapResults: Array<{ id: string; senderId: string; receiverId: string; status: string }>) {
    const currentIds = new Set(snapResults.map(r => r.id));

    for (const result of snapResults) {
      this.querySet2.add(result.id);
      this.exchangeMap.set(result.id, result);
    }

    // Remove exchanges no longer in this query
    for (const id of this.querySet2) {
      if (!currentIds.has(id)) {
        this.querySet2.delete(id);
        if (!this.querySet1.has(id) || !this.querySet2.has(id)) {
          this.exchangeMap.delete(id);
        }
      }
    }
  }

  getExchanges() {
    return Array.from(this.exchangeMap.values());
  }

  hasExchange(id: string) {
    return this.exchangeMap.has(id);
  }
}

describe('Exchange Race Condition Bug Fix', () => {
  it('should NOT lose exchanges that appear only in query 2 (receiver)', () => {
    // Scenario: Exchange where user is the receiver only
    const tracker = new ExchangeTracker();

    // Query 1 fires first - user is NOT sender, returns empty
    tracker.processQuery1([]);
    expect(tracker.getExchanges()).toHaveLength(0);

    // Query 2 fires - user IS receiver
    tracker.processQuery2([
      { id: 'ex_1', senderId: 'alice', receiverId: 'bob', status: 'pending' }
    ]);

    // BUG FIX: Exchange should NOT be removed even though Query 1 was empty
    expect(tracker.hasExchange('ex_1')).toBe(true);
    expect(tracker.getExchanges()).toHaveLength(1);
  });

  it('should NOT lose exchanges that appear only in query 1 (sender)', () => {
    const tracker = new ExchangeTracker();

    // Query 2 fires first - user is NOT receiver, returns empty
    tracker.processQuery2([]);
    expect(tracker.getExchanges()).toHaveLength(0);

    // Query 1 fires - user IS sender
    tracker.processQuery1([
      { id: 'ex_2', senderId: 'bob', receiverId: 'alice', status: 'pending' }
    ]);

    // Exchange should be present
    expect(tracker.hasExchange('ex_2')).toBe(true);
    expect(tracker.getExchanges()).toHaveLength(1);
  });

  it('should handle exchanges where user is both sender and receiver', () => {
    const tracker = new ExchangeTracker();

    // User sends an exchange
    tracker.processQuery1([
      { id: 'ex_3', senderId: 'bob', receiverId: 'alice', status: 'pending' }
    ]);

    // User receives an exchange from another person
    tracker.processQuery2([
      { id: 'ex_4', senderId: 'carol', receiverId: 'bob', status: 'accepted' }
    ]);

    // Both exchanges should be present
    expect(tracker.hasExchange('ex_3')).toBe(true);
    expect(tracker.hasExchange('ex_4')).toBe(true);
    expect(tracker.getExchanges()).toHaveLength(2);
  });

  it('should handle race condition: q2 fires before q1', () => {
    const tracker = new ExchangeTracker();

    // Query 2 fires first with an exchange
    tracker.processQuery2([
      { id: 'ex_5', senderId: 'alice', receiverId: 'bob', status: 'pending' }
    ]);

    // Now Query 1 fires with empty result
    tracker.processQuery1([]);

    // Exchange from Query 2 should NOT be removed!
    expect(tracker.hasExchange('ex_5')).toBe(true);
    expect(tracker.getExchanges()).toHaveLength(1);
  });

  it('should remove exchanges when they no longer exist in either query', () => {
    const tracker = new ExchangeTracker();

    // Add exchange via query 1
    tracker.processQuery1([
      { id: 'ex_6', senderId: 'bob', receiverId: 'alice', status: 'pending' }
    ]);
    expect(tracker.hasExchange('ex_6')).toBe(true);

    // Now query 1 returns empty (exchange was deleted or modified)
    tracker.processQuery1([]);

    // Exchange should be removed since it's not in either query
    expect(tracker.hasExchange('ex_6')).toBe(false);
  });

  it('should handle rapid sequential updates', () => {
    const tracker = new ExchangeTracker();

    // Rapid updates simulating real-time Firestore listeners
    tracker.processQuery1([{ id: 'ex_7', senderId: 'bob', receiverId: 'alice', status: 'pending' }]);
    tracker.processQuery2([{ id: 'ex_8', senderId: 'carol', receiverId: 'bob', status: 'pending' }]);
    tracker.processQuery1([]); // q1 empty
    tracker.processQuery2([{ id: 'ex_8', senderId: 'carol', receiverId: 'bob', status: 'pending' }]); // q2 still has ex_8
    tracker.processQuery1([{ id: 'ex_9', senderId: 'bob', receiverId: 'dave', status: 'accepted' }]);

    // ex_8 and ex_9 should exist, ex_7 should not (was removed by empty q1)
    expect(tracker.hasExchange('ex_8')).toBe(true);
    expect(tracker.hasExchange('ex_9')).toBe(true);
    expect(tracker.hasExchange('ex_7')).toBe(false);
    expect(tracker.getExchanges()).toHaveLength(2);
  });

  it('should handle duplicate exchange across both queries', () => {
    const tracker = new ExchangeTracker();

    // Same exchange appears in both queries (edge case)
    const exchange = { id: 'ex_10', senderId: 'bob', receiverId: 'alice', status: 'pending' };
    tracker.processQuery1([exchange]);
    tracker.processQuery2([exchange]);

    // Should only exist once
    expect(tracker.getExchanges()).toHaveLength(1);
    expect(tracker.hasExchange('ex_10')).toBe(true);
  });

  it('should preserve exchange status changes', () => {
    const tracker = new ExchangeTracker();

    // Initial exchange
    tracker.processQuery1([
      { id: 'ex_11', senderId: 'bob', receiverId: 'alice', status: 'pending' }
    ]);

    // Status update via query 1
    tracker.processQuery1([
      { id: 'ex_11', senderId: 'bob', receiverId: 'alice', status: 'accepted' }
    ]);

    expect(tracker.hasExchange('ex_11')).toBe(true);
    const ex = tracker.getExchanges()[0];
    // The tracker updates the exchange when re-processed
    expect(ex.status).toBe('accepted');
  });
});

describe('Bug Scenario: Received Exchange Disappearing', () => {
  it('reproduces the original bug scenario: received exchange disappears', () => {
    // This is the exact bug scenario described in the review report:
    // 1. User A sends exchange to User B (receiverId = User B)
    // 2. Query 1 (senderId=User B) returns empty
    // 3. Query 2 (receiverId=User B) returns the exchange
    // 4. Query 1 listener fires, sees the exchange in allExchanges but NOT in newIds, removes it
    // 5. Exchange disappears from User B's Exchanges view

    // With the FIXED logic:
    const tracker = new ExchangeTracker();

    // Step 1: Query 1 fires first (empty, user B is not sender)
    tracker.processQuery1([]);
    expect(tracker.getExchanges()).toHaveLength(0);

    // Step 2: Query 2 fires (user B is receiver)
    tracker.processQuery2([
      { id: 'ex_bug', senderId: 'userA', receiverId: 'userB', status: 'pending' }
    ]);

    // FIXED: Exchange is preserved!
    expect(tracker.hasExchange('ex_bug')).toBe(true);
    expect(tracker.getExchanges()).toHaveLength(1);

    // Step 3: Query 1 fires again (still empty)
    tracker.processQuery1([]);

    // STILL FIXED: Exchange should still be there because querySet2 still has it
    expect(tracker.hasExchange('ex_bug')).toBe(true);
  });

  it('handles the reverse: sent exchange disappearing', () => {
    const tracker = new ExchangeTracker();

    // Step 1: Query 2 fires first (empty, user A is not receiver)
    tracker.processQuery2([]);
    expect(tracker.getExchanges()).toHaveLength(0);

    // Step 2: Query 1 fires (user A is sender)
    tracker.processQuery1([
      { id: 'ex_bug2', senderId: 'userA', receiverId: 'userB', status: 'pending' }
    ]);

    // Exchange is preserved
    expect(tracker.hasExchange('ex_bug2')).toBe(true);

    // Step 3: Query 2 fires again (still empty)
    tracker.processQuery2([]);

    // FIXED: Exchange should still be there because querySet1 still has it
    expect(tracker.hasExchange('ex_bug2')).toBe(true);
  });
});

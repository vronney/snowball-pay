import { describe, expect, it } from 'vitest';
import { plaidFallbackMatchKey } from '@/lib/plaid';

/**
 * Regression cover for the 2026-09-09 duplicate-debt bug: re-linking a bank
 * created a second debt row beside the original because neither
 * persistent_account_id (absent in production) nor account_id (rotated by
 * Plaid on every new Item) could match the existing row.
 */
describe('plaidFallbackMatchKey', () => {
  it('builds a stable key from institution, mask and category', () => {
    expect(plaidFallbackMatchKey('ins_7', '4021', 'Credit Card')).toBe(
      'ins_7|4021|credit card'
    );
  });

  it('matches the same account across a re-link, where account_id has rotated', () => {
    // Same physical card, two different Plaid Items.
    const onFirstLink = plaidFallbackMatchKey('ins_7', '4021', 'Credit Card');
    const onRelink = plaidFallbackMatchKey('ins_7', '4021', 'Credit Card');
    expect(onRelink).toBe(onFirstLink);
    expect(onRelink).not.toBeNull();
  });

  it('is case-insensitive so casing drift cannot split one account in two', () => {
    expect(plaidFallbackMatchKey('INS_7', '4021', 'Credit Card')).toBe(
      plaidFallbackMatchKey('ins_7', '4021', 'credit card')
    );
  });

  it('separates two different accounts at the same institution', () => {
    expect(plaidFallbackMatchKey('ins_7', '4021', 'Credit Card')).not.toBe(
      plaidFallbackMatchKey('ins_7', '9987', 'Credit Card')
    );
  });

  it('separates the same mask at two different institutions', () => {
    // A USAA card and an Amex card can both end in 4021.
    expect(plaidFallbackMatchKey('ins_7', '4021', 'Credit Card')).not.toBe(
      plaidFallbackMatchKey('ins_10', '4021', 'Credit Card')
    );
  });

  it('separates a card from a loan sharing a mask at one institution', () => {
    expect(plaidFallbackMatchKey('ins_7', '4021', 'Credit Card')).not.toBe(
      plaidFallbackMatchKey('ins_7', '4021', 'Auto Loan')
    );
  });

  it.each([
    ['institution missing', null, '4021', 'Credit Card'],
    ['mask missing', 'ins_7', null, 'Credit Card'],
    ['category missing', 'ins_7', '4021', null],
    ['institution empty', '', '4021', 'Credit Card'],
    ['mask empty', 'ins_7', '', 'Credit Card'],
    ['all missing', null, null, null],
  ])(
    'returns null when %s, so callers cannot match on an incomplete key',
    (_label, institution, mask, category) => {
      expect(
        plaidFallbackMatchKey(
          institution as string | null,
          mask as string | null,
          category as string | null
        )
      ).toBeNull();
    }
  );

  it('produces an IDENTICAL key for two cards that share bank, mask and category', () => {
    // This is the ambiguous case CodeRabbit flagged: the key cannot tell these
    // apart, so exchange-token must refuse to match on it rather than pick one.
    // The helper's job is only to be honest that they collide.
    const cardA = plaidFallbackMatchKey('ins_7', '4021', 'Credit Card');
    const cardB = plaidFallbackMatchKey('ins_7', '4021', 'Credit Card');
    expect(cardA).toBe(cardB);
    expect(cardA).not.toBeNull();
  });

  it('never collapses two incomplete keys into a false match', () => {
    // Both null: a Set/Map keyed on these must not treat them as equal, which
    // is why callers filter nulls out rather than storing them.
    const a = plaidFallbackMatchKey(null, '4021', 'Credit Card');
    const b = plaidFallbackMatchKey(null, '9987', 'Auto Loan');
    expect(a).toBeNull();
    expect(b).toBeNull();
  });
});

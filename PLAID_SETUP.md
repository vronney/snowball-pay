# Plaid Integration Setup

## Installation

### 1. Install Dependencies

```bash
npm install react-plaid-link plaid
```

### 2. Environment Variables

Add these to `.env.local`:

```env
# Plaid API credentials (get from https://dashboard.plaid.com/team/keys)
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_secret
PLAID_ENV=sandbox  # or production

# PRODUCTION ONLY — leave UNSET for sandbox.
# Sandbox test banks (user_good/pass_good) do not use OAuth redirects, so Link
# opens as a modal and returns the public token directly. Set this when you
# move to production and need real bank OAuth (Chase, BofA, Capital One, etc.).
#
# The client-side return page already exists at /plaid/oauth-return
# (src/app/plaid/oauth-return/page.tsx) — it re-opens Plaid Link with
# `receivedRedirectUri` to finish the handshake. To enable OAuth:
#  1. Set this var to the return page URL (below).
#  2. Register this EXACT URI in the Plaid Dashboard → Team Settings → API →
#     "Allowed redirect URIs". Plaid rejects any redirect URI not pre-registered.
# PLAID_REDIRECT_URI=https://getsnowballpay.com/plaid/oauth-return
```

### 3. Database Schema

Plaid-linked fields on `Debt`, plus a separate `PlaidItem` model that holds the
encrypted access token once per institution login (see `prisma/schema.prisma`
for the actual current schema — this is a summary, not a snippet to copy):

```prisma
model Debt {
  // ... existing fields ...

  // Plaid integration — access token lives on PlaidItem, NOT here.
  isLinked                 Boolean?   @default(false)
  plaidAccountId           String?
  plaidPersistentAccountId String?
  plaidItemId              String?
  plaidItem                PlaidItem? @relation(fields: [plaidItemId], references: [id], onDelete: SetNull)
  lastSyncedAt              DateTime?
}

model PlaidItem {
  id              String   @id @default(cuid())
  userId          String
  itemId          String   @unique // Plaid item_id
  accessToken     String   @db.Text // encrypted at rest — see plaidCrypto.ts
  institutionName String?
  needsReauth     Boolean  @default(false)
  lastSyncedAt    DateTime?
  debts           Debt[]
}
```

Then run:

```bash
npx prisma db push
```

### 4. Update DebtCard Component

When displaying debts, add the [LINKED] badge:

```tsx
{debt.isLinked && (
  <span
    className="ml-2 inline-block rounded-sm bg-[#10b981] px-2 py-1 text-xs font-bold uppercase tracking-wide text-white"
    aria-label="Linked via Plaid"
  >
    [LINKED]
  </span>
)}

{debt.lastSyncedAt && (
  <p className="mt-1 text-xs text-[#94a3b8]">
    Last synced {formatDistanceToNow(new Date(debt.lastSyncedAt))} ago
  </p>
)}
```

### 5. Add PlaidLink Component to Dashboard

In `src/components/dashboard/DashboardHeader.tsx` or appropriate location:

```tsx
import { PlaidLink } from '@/components/plaid/PlaidLink';

export function DashboardHeader() {
  return (
    <div className="flex items-center gap-4">
      {/* ... existing header content ... */}
      <PlaidLink />
    </div>
  );
}
```

## Component Files Created

- `src/components/plaid/PlaidLink.tsx` — Main button + modal integration
- `src/components/plaid/PlaidLinkModal.tsx` — Modal backdrop
- `src/components/plaid/PlaidSuccess.tsx` — Success banner with tutorial
- `src/components/plaid/PlaidError.tsx` — Error states
- `src/lib/hooks/usePlaidLink.ts` — State management hook
- `src/app/api/plaid/create-link-token/route.ts` — Create Plaid Link token
- `src/app/api/plaid/exchange-token/route.ts` — Exchange public token for access token

## Styling Details (from DESIGN_SPEC.md)

### Button (Link Bank Account)
- Background: `#2563eb`
- Hover: `#1d4ed8`
- Padding: `12px 24px`
- Border-radius: `8px`
- Transition: `200ms`
- Font: DM Sans 14px medium
- Focus ring: `#93c5fd`, 2px, 4px offset

### [LINKED] Badge
- Background: `#10b981` (success green)
- Text: white, DM Sans 11px, all-caps
- Padding: `4px 8px`
- Border-radius: `6px`

### Success Banner
- Entry: 300ms slide-in, `cubic-bezier(0,0,0.2,1)` (ease-out)
- Icon pulse: 400ms spring easing `cubic-bezier(0.22,1,0.36,1)`
- Auto-dismiss: 6 seconds
- Background: light green, border green

### Error Banner
- Entry: 300ms slide-down
- Auto-dismiss: 8 seconds
- Color variants: error (red), warning (amber), info (blue)

## Testing

### In Sandbox Mode

Use these test credentials:

1. **Chase** (OAuth)
   - Email: user_good@example.com
   - Password: pass_good
   - Code: 000000

2. **Bank of America** (OAuth)
   - Email: user_good@example.com
   - Password: pass_good
   - Code: 000000

3. **Manual Account Entry**
   - Username: user_good
   - Password: pass_good
   - Code: 000000

### Testing States

**Success Flow:**
1. Click "Link Bank Account"
2. Select Chase (or other institution)
3. Use test credentials above
4. See success banner + tutorial (first time only)
5. Verify debts appear in list with [LINKED] badge

**Error States:**
1. **User Cancels:** Click [X] on modal → banner dismisses
2. **Institution Down:** Select an institution while in "down" maintenance window → error banner shows
3. **OAuth Denied:** Deny permission during OAuth → error banner with [Retry] button

## Security Notes

⚠️ **IMPORTANT FOR PRODUCTION:**

1. **Access Token Storage:** ✅ Implemented
   - Access tokens are stored on `PlaidItem.accessToken`, encrypted at rest with
     AES-256-GCM (`src/lib/plaidCrypto.ts`), keyed off `PLAID_TOKEN_ENCRYPTION_KEY`.
   - Encrypt on write (`exchange-token`), decrypt on read (`refresh-debt`,
     `disconnect`, `user/data` deletion). Decryption fails closed: a stored
     value not in the `enc:v1:` format is rejected, never used as-is.
   - `PLAID_TOKEN_ENCRYPTION_KEY` must be set in every environment (a 64-hex-char
     key) — set it in Vercel **before** flipping `PLAID_ENV=production`.

2. **Rate Limiting:** ✅ Implemented
   - Per-user limits in `src/lib/rateLimit.ts` (`limits.plaidLinkToken`,
     `plaidExchange`, `plaidSync`, `plaidDisconnect`) cap how often each user
     can hit Plaid-billed endpoints.

3. **Webhook Handling:** ✅ Implemented
   - `/api/plaid/webhooks` (`src/app/api/plaid/webhooks/route.ts`) verifies the
     `Plaid-Verification` JWT (ES256, body-hash bound, 5-min freshness — see
     `src/lib/plaidCrypto.ts` sibling `src/lib/plaidWebhook.ts`) before acting.
   - Flags `PlaidItem.needsReauth = true` on `ITEM_LOGIN_REQUIRED`,
     `PENDING_EXPIRATION`, and permission/account revocation. Cleared on re-link.
   - To receive webhooks: set `PLAID_WEBHOOK_URL=https://getsnowballpay.com/api/plaid/webhooks`
     (passed as `webhook` at link-token creation). Plaid can't reach localhost,
     so webhooks only fire in deployed environments.
   - `TRANSACTIONS_REMOVED` / `DEFAULT_UPDATE` are acknowledged (200) but not yet
     acted on — wire balance auto-refresh here later if desired.

4. **Data Refresh:**
   - Sync schedule: daily or weekly (via cron)
   - Update `lastSyncedAt` on each sync
   - Cache results to minimize API calls

## Cost Estimation

Plaid doesn't publish a stable public price list — always check the
Contracts & Rates page in the Plaid Dashboard for current per-product rates
before changing rollout scope. Rough shape of the cost model:

- Liabilities is billed per successful `liabilities/get` style retrieval /
  connected account, so link volume and sync frequency both matter.
- Ballpark used for planning: well under $1 per linked login one-time, cents
  per account per month ongoing — verify against your dashboard before launch.

## Next Steps

1. ✅ Install dependencies
2. ✅ Add environment variables
3. ✅ Update database schema
4. ✅ Add PlaidLink component to dashboard
5. ✅ Implement webhook handler for re-auth flows (`/api/plaid/webhooks`)
6. ✅ Implement disconnect flow (`/api/plaid/disconnect`)
7. ✅ Add re-linking UI (`PlaidReauthBanner` + `/api/plaid/update-link-token`)
8. ✅ Add manual refresh button on linked debt cards (`/api/plaid/refresh-debt`)
9. 🔄 Add sync schedule (cron) for balance updates
10. 🔄 Act on `DEFAULT_UPDATE` / balance webhooks (currently acknowledged only)

## Troubleshooting

### "linkToken is undefined"
- Plaid Link token creation failed
- Check: `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV` are set
- Check: User is authenticated (session exists)

### "Exchange failed: invalid public_token"
- Public token expired (valid for 30 minutes)
- User may have closed modal without completing auth
- Try linking again

### "Failed to create debt from liability"
- Account structure may not match expected format
- Check: Plaid API response includes `accounts` and `liabilities`
- Log full response for debugging

## Documentation References

- [Plaid API Docs](https://plaid.com/docs/api/)
- [Plaid Link Docs](https://plaid.com/docs/link/)
- [react-plaid-link](https://github.com/plaid/react-plaid-link)
- [SnowballPay Design System](./DESIGN.md)
- [Plaid Integration Design Spec](./.gstack/projects/vronney-snowball-pay/designs/plaid-integration-20260607/DESIGN_SPEC.md)

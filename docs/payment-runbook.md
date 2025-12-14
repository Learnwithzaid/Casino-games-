# Payment Runbook (JazzCash / Easypaisa / SadaPay)

This service implements a **deposit** flow:

1. Client calls `POST /api/payment/deposit` to create a pending `PaymentTransaction`.
2. Server returns a gateway redirect URL.
3. Provider calls `POST /api/payment/webhook`.
4. Server verifies **IP allowlist** + **HMAC-SHA256 signature**, updates the transaction, and atomically credits the user wallet.

## Environment variables

See `apps/server/.env.example`.

Required:

- `DATABASE_URL`
- `PAYMENTS_HMAC_SECRET_JAZZCASH`
- `PAYMENTS_HMAC_SECRET_EASYPAISA` (or legacy `PAYMENTS_HMAC_SECRET_EASYPaisa`)
- `PAYMENTS_HMAC_SECRET_SADAPAY`

Recommended:

- `PAYMENTS_WEBHOOK_IP_ALLOWLIST_*` – comma-separated list of provider webhook IPs.
- `*_BASE_URL` – used to construct redirect URLs returned from `/deposit`.
- Retry settings:
  - `PAYMENTS_MAX_RETRIES`
  - `PAYMENTS_RETRY_BASE_DELAY_MS`
  - `PAYMENTS_RETRY_MAX_DELAY_MS`

## Signature verification

Webhooks are verified using **HMAC-SHA256** over a canonicalized payload:

- `transactionId`
- `providerTransactionId` (or empty string)
- `status`
- `amount` (string with 2 decimals)
- `currency`

The service computes `hex(hmac_sha256(canonicalString, secret))` and compares it using a constant-time check.

## Credential rotation

To rotate secrets:

1. Generate a new secret for each provider.
2. Deploy with both old and new secrets (if your provider supports dual validation). This reference implementation supports **one active secret per provider**; add multi-secret support if you need a grace period.
3. Update provider webhook configuration.
4. Deploy with only the new secret.

## Webhook setup checklist

- Configure provider to send callbacks to: `POST /api/payment/webhook`.
- Populate allowlists: `PAYMENTS_WEBHOOK_IP_ALLOWLIST_*`.
- Ensure the provider sends:
  - `provider`
  - `transactionId`
  - `status` (`PENDING | CONFIRMED | FAILED | EXPIRED`)
  - `amount` (2 decimals)
  - `currency`
  - `signature` (HMAC hex)

## Monitoring hooks

Audit logs are written to the `AuditLog` table for:

- creation (`PAYMENT_CREATED`)
- state changes (`PAYMENT_STATUS_CHANGED`)
- wallet credits (`WALLET_CREDITED`, `PAYMENT_CREDITED`)
- retries (`PAYMENT_CREDIT_RETRY_SCHEDULED`)
- reconciliation (`PAYMENT_RECONCILED`)

Additionally, structured logs are emitted via Pino.

## Manual reconciliation

Admins can trigger reconciliation:

- `POST /api/payment/reconcile/:transactionId`

This calls the provider adapter `fetchRemoteStatus` and updates the transaction. In this reference implementation, adapters return `PENDING` and the service marks payments older than 30 minutes as `EXPIRED`.

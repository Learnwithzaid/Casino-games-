# Payments Platform (Server)

This repository contains a backend service implementing wallet deposits via **JazzCash**, **Easypaisa**, and **SadaPay**.

- Server: `apps/server`
- Payment runbook: [`docs/payment-runbook.md`](./docs/payment-runbook.md)

## Quick start

```bash
cd apps/server
npm install
npm run prisma:generate
npm run dev
```

## Endpoints

- `POST /api/payment/deposit`
- `POST /api/payment/webhook`
- `GET /api/payment/status/:transactionId`
- `GET /api/user/deposits`
- `POST /api/payment/reconcile/:transactionId` (admin only)

Authentication in this reference implementation is header-based:

- `x-user-id: <string>`
- `x-user-role: user | admin`

In production, replace this with your auth/session layer.

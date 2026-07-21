# POS Login Architecture (Next Phase)

## Goals
- Support package-based activation before login.
- One `store_code` per owner/tenant, multiple branches under same code.
- Staff login by `store_code` + `staff_code` (or seller code).
- Enforce menu-level permissions by role.
- Work for web app and desktop runtime (online/hybrid/offline modes).

## QR Verification Status
QR/mobile login was decommissioned from the active runtime on 2026-05-29 and remains historical/future-only.
This document must not be read as approval to reintroduce `MOBILE_*`, `POS_QR_*`, `/scan`, `/qr-scan`, `/login/qr-*`, or `/api/auth/qr/*` implementation work.
Any future QR verification design must be approved as a new architecture and documented before schema, environment variable, API, or UI changes are added.

## Proposed Login Flow
1. `Store Access`
- Input: `store_code`
- Validate active package contract and contract status.
- Resolve tenant and available branches.

2. `Branch Selection`
- If tenant has single branch, auto-select branch.
- If multi-branch, show branch list from tenant scope.
- Optional filtering by assigned branch for staff.

3. `Staff Authentication`
- Input: `staff_code` + PIN/password.
- Resolve user profile + branch role.
- Check user active status and branch assignment.

4. `Shift Context`
- Enter with or without open shift (policy-based).
- Attach user to current shift if open.
- If no shift open: allow limited mode or prompt open-shift flow.

5. `Role-based Menu Access`
- Build effective permissions from role + feature flags + package entitlements.
- Render POS modules by permission matrix.

## Core Data Model (Additive)
- `tenant_access_codes`
  - `tenant_id`, `store_code`, `is_active`, `rotated_at`
- `staff_login_codes`
  - `user_id`, `tenant_id`, `branch_id`, `staff_code`, `pin_hash`, `is_active`
- `branch_login_policies`
  - `tenant_id`, `branch_id`, `allow_no_shift_login`, `allow_cross_branch`
- `login_sessions`
  - `tenant_id`, `branch_id`, `user_id`, `device_id`, `auth_mode`, `started_at`, `ended_at`

## API Contract (Draft)
- `POST /api/auth/store/resolve`
  - input: `store_code`
  - output: tenant + branches + package status
- `POST /api/auth/staff/login`
  - input: `store_code`, `branch_id`, `staff_code`, `pin`
  - output: auth token + role + permissions
- `GET /api/auth/permissions`
  - output: effective menu/actions for current user

## Permission Matrix (Draft)
- `owner`
  - all branch features, sensitive overrides, close shift override
- `manager`
  - sales/void/refund/stock adjust/table move based on policy
- `staff`
  - sales operations only, restricted admin actions

## Desktop Runtime Notes
- Device registration table for trusted terminals.
- Offline token cache with short expiry and signed claims.
- On reconnect, sync login/session events.

## Rollout Strategy
1. Add schemas and APIs (no UI impact).
2. Add compatibility layer: if no store-code policy, keep current login behavior.
3. Pilot on 1-2 tenants.
4. Gradually enforce store-code + branch selection policy per tenant.

## Vercel and Domain Notes
- Current hosting: Vercel web app.
- Keep auth APIs region-aware and low-latency.
- Final public domain can switch to company-owned domain after full system hardening.

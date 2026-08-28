# Harrix ERP — Project Context

**Read this file before touching code.** It exists so a fresh AI session (or you, months from now) can make a correct, scoped change without re-reading the whole repository. It reflects the state of the code as of **2026-08-27**. If something here disagrees with the code, trust the code and fix this file.

> Renamed from "Chelma ERP" to "Harrix ERP" on 2026-08-27 (new logo at `apps/dashboard/public/logo.png`, used as favicon and sidebar mark). The on-disk folder is still named `chelma-erp` — only app-facing branding (titles, sidebar, backend service name, launcher script, localStorage key prefixes) was renamed. Filenames below that still say `chelma-erp-*` are historical pointers to companion docs that were never actually added to this repo.

Companion documents:
- `chelma-erp-project-intuition.md` — the original brief from the factory owner (the "why").
- `chelma-erp-build-plan.md` — the 11-phase build order, in plain language, with checkboxes.

This file is the "how it's actually built right now" reference. The build plan is the roadmap; this is the map of the terrain as it exists today.

---

## 1. What exists right now, in one paragraph

A monorepo with a NestJS + Prisma + SQLite backend (`backend/`) and a React + Vite frontend (`apps/dashboard/`). The backend fully implements three domains — **Settings** (inventory types as data), **Suppliers** (full CRUD), and **Stock** (the four inventories, movement-ledger quantities, FIFO batches, expiry tracking) — and the frontend's Stock and Fournisseurs tabs are genuine thin clients against that API, exactly per the build plan's architecture. Stock items support the same edit/archive pattern as Suppliers (`PATCH /stock/items/:id`, `PATCH /stock/items/:id/archive|unarchive`) — there is no hard delete for an item, because deleting one would orphan its movement ledger; archiving is the "delete" for anything with history. Three more tabs — **Production**, **Commandes & clients**, **Ressources humaines** — exist in the frontend with real UI and real workflows, but their own records (a production run, an order, an employee) are kept in the browser's `localStorage`, not the database, because those backend modules don't exist yet. Critically, **Production and Orders still call the real Stock API** for the parts that touch real inventory (materials consumed, finished goods produced, goods shipped) — so stock numbers are never fake, only the surrounding paperwork is.

**Authentication is live (Phase 2).** Every endpoint except `/health` and `/auth/login` requires a bearer token; every one that touches real data also requires a named permission. The frontend renders nothing until there is a session, and hides tabs the user's role doesn't grant — but that hiding is a convenience, never the boundary: the backend re-checks on every request.

---

## 2. Repository layout

```
chelma-erp/
├── PROJECT_CONTEXT.md          ← this file
├── backend/                    NestJS API — the source of truth for Settings, Suppliers, Stock
│   ├── prisma/
│   │   ├── schema.prisma       Data model (see §5)
│   │   ├── seed.ts             Demo data — npm run prisma:seed
│   │   └── migrations/         SQLite migration history
│   ├── prisma.config.ts        Prisma 7 CLI config (datasource URL lives here, not schema.prisma)
│   ├── generated/prisma/       Generated Prisma client (gitignored, regenerate with `npx prisma generate`)
│   └── src/
│       ├── main.ts             Bootstrap: global prefix "/api", ValidationPipe, CORS
│       ├── app.module.ts       Wires ConfigModule + PrismaModule + feature modules
│       ├── prisma/             PrismaService — see §6 "Moving to PostgreSQL"
│       ├── settings/           GET /api/settings/inventory-types
│       ├── suppliers/          Full CRUD + archive/unarchive
│       └── stock/              Items, batches, movements, receive/usage, dashboard summary
└── apps/
    └── dashboard/               The gérant-facing central app (React + Vite + TS)
        └── src/
            ├── App.tsx          Tab routing (plain useState, no router yet)
            ├── App.css          All styles — plain CSS classes, no CSS-in-JS, no Tailwind
            ├── lib/             Framework-free utilities + API clients (see §7)
            ├── state/           InventoryTypesContext + AuthContext (the session)
            ├── components/      Shared UI atoms (Button, Modal, Pill, StatCard, Field, Banner…)
            └── modules/         One folder per tab: dashboard, stock, production, orders, hr, suppliers
```

There is no `packages/` shared-code folder yet. Frontend and backend each have their own copy of the stock arithmetic (see §5.3) — this was a deliberate call, not an oversight (see §8.1).

---

## 3. How to run everything

**Backend** (from `backend/`):
```
npm install
npm run prisma:migrate    # only needed after schema.prisma changes
npm run prisma:generate   # only needed after schema.prisma changes
npm run prisma:seed       # wipes and reloads DEMO STOCK data — stop running this once real counts are entered
npm run seed:auth         # creates the 4 roles + the first gérant account; safe to re-run, never deletes
npm run start:dev         # http://localhost:3000/api
```

**Frontend** (from `apps/dashboard/`):
```
npm install
npm run dev                # http://localhost:5173, expects backend at localhost:3000/api
```
Override the API location with `VITE_API_URL` (see `.env.example`).

**`JWT_SECRET` must be set in `backend/.env`** or the backend refuses to authenticate anyone. `.env` is gitignored; `.env.example` carries a placeholder and the command to generate a real one. Changing the secret invalidates every existing session — which is also how you force everyone to log in again.

**First login:** `gerant` / `harrix2026`, created by `npm run seed:auth`. Change it immediately — it's written in plain text in `prisma/seed-auth.ts`.

**Tests**: `npm test` in either folder. Backend also has `npm run test:e2e` (boots the real Nest app, hits `/health`).

**Useful backend extras**: `npm run prisma:studio` opens a GUI for the SQLite database at `backend/dev.db`.

---

## 4. Architecture decisions and why (read this before "fixing" something)

| Decision | Why |
|---|---|
| SQLite for local dev, not PostgreSQL | No Docker/PostgreSQL was available in the dev sandbox that built this. The build plan's actual target is PostgreSQL on the factory PC. Nothing in `schema.prisma` uses a SQLite-only feature. See §6 for the exact switch steps. **Don't design around SQLite quirks — design for Postgres, verify on SQLite.** |
| Prisma 7, driver-adapter pattern | Prisma 7 removed `datasource.url` from `schema.prisma` — the CLI reads it from `prisma.config.ts`, and `PrismaClient` requires an explicit driver adapter at runtime (`src/prisma/prisma.service.ts`). This is not a mistake to "fix" — it's how Prisma 7 works. If you see `new PrismaClient()` with no adapter anywhere, that's the bug. |
| Stock quantity is never a stored column | It's always `SUM(IN) − SUM(OUT)` over `Movement` rows, computed on read (`stock-math.ts` → `getItemQuantity`). This is the single most important rule in the whole system — it's the actual mechanism that answers "where did the missing units go." Never add a `quantity` column to `Item` and start writing to it directly. |
| Movement `direction` is a plain string, not a Prisma enum | Keeps `schema.prisma` portable between SQLite and PostgreSQL without a provider-specific enum type. Validated at the DTO layer instead (`class-validator`). |
| Stock math is pure, framework-free functions | `backend/src/stock/stock-math.ts` and (historically) `apps/dashboard/src/lib/stockEngine.ts` (now deleted — see §8.1) take plain data in, plain data out. No Prisma, no HTTP. This is what makes them unit-testable without a database — see `stock-math.spec.ts`. |
| No global frontend state library | Only `InventoryTypesContext` exists (fetched once, rarely changes). Every page fetches its own data and refetches after its own mutations. This matches the "thin client" philosophy in the project intuition doc — don't add Redux/Zustand/React Query unless a real problem (stale data across tabs, request waterfalls) actually shows up. |
| No shared `packages/` folder yet | The plan's long-term architecture calls for shared code across the backend and multiple frontend apps. Right now there's one frontend app and the stock math is small enough to duplicate once. If a second frontend app or a second place needing FIFO/expiry logic appears, **that's** the trigger to extract a shared package — not before. |

---

## 5. Data model (backend/prisma/schema.prisma)

Five tables, no more:

### `InventoryType`
The four inventories, as **data**, not a hardcoded enum — a future factory with 3 or 6 inventories needs new rows, not a schema change. Fields: `key` (stable machine id like `"chemicals"`), `label`, `singular`, `description`, `hasBatches`, `hasExpiry`, `isProductionInput`, `defaultUnit`, `sortOrder`.

Current rows (from `prisma/seed.ts`): `chemicals` (hasBatches, hasExpiry, isProductionInput), `tige` (isProductionInput only), `spare-parts` (none of the flags), `finished-goods` (none — it's an output, not an input).

### `Item`
One row per tracked article. `reference` is globally unique. Belongs to one `InventoryType`. Has `reorderThreshold` (for the low-stock flag) but **no quantity column** — see §4.

### `Batch`
Only meaningful for items whose `InventoryType.hasBatches` is true (chemicals). Has `receivedDate` and `expiryDate`. A batch's remaining quantity, like an item's, is computed from its movements — never stored.

### `Movement`
The ledger. Every stock change, ever, is a row here: `itemId`, optional `batchId`, `direction` ("IN"/"OUT"), `quantity`, `date`, optional `supplierId`, optional `reason` (only meaningful on OUT). This table is append-only in spirit — nothing in the app updates or deletes a movement.

### `Supplier`
Plain contact record with `archived` (soft-delete — archiving, not deleting, keeps historical movements' supplier links intact).

### `Role`
A job title, as **data**. `key` (stable, e.g. `"gerant"`), `label`, `description`, `permissions` (comma-separated string — SQLite has no array type; only `auth/permissions.ts` knows that format), `isProtected`, `sortOrder`.

Seeded roles: `gerant` (all 13 permissions, protected), `stock` / Magasinier, `production` / Chef de production, `rh`. A gérant can create more from the UI.

`isProtected` marks the role that guarantees a way back into administration — its permissions can't be edited and it can't be deleted, so the factory can never lock itself out.

### `User`
`login` (unique, lowercased on write so "Karim" and "karim" can't become two accounts), `fullName`, `passwordHash` (bcrypt, cost 12 — the plain password is never stored, logged or returned), `roleId`, `active`, `lastLoginAt`.

**Deactivated, never deleted** — same reasoning as items and suppliers: workers leave, but their audit trail must stay attributable.

### `AuditEntry`
`userId` (null for a failed login), `userLogin` (denormalised so the log reads correctly regardless), `action` (`CREATE`/`UPDATE`/`DELETE`/`LOGIN`/`LOGIN_FAILED`), `entity`, `entityId`, `changes` (JSON, passwords stripped at every depth), `method`, `path`.

Append-only in spirit, like `Movement`.

### 5.3 The math (`backend/src/stock/stock-math.ts`)
Pure functions, unit tested in `stock-math.spec.ts`:
- `getItemQuantity(movements, itemId)` — the sum.
- `getBatchQuantity`, `getBatchesWithRemaining` (FIFO order, oldest `receivedDate` first), `getFifoBatch` (first with remaining > 0).
- `getExpiryStatus(expiryDate, today, warnDays=30)` → `"expired" | "warning" | "ok" | "none"`.
- `isLowStock(quantity, threshold)` → `quantity <= threshold`.

If you need this logic anywhere else (a report, a new endpoint), import from this file. Don't re-derive it.

---

### 5.5 The permission vocabulary (`backend/src/auth/permissions.ts`)
Pure data and pure functions, unit tested in `permissions.spec.ts` (13 tests). Thirteen permissions, named `<domain>:<action>` where read < write < manage:

`stock:read|write|manage`, `production:read|write`, `suppliers:read|write`, `orders:read|write`, `hr:read|write`, `users:manage`, `audit:read`.

Note `write` does **not** imply `manage` — a magasinier records receptions and usage but cannot create or delete articles. `parsePermissions`/`serializePermissions` are the only code that knows the comma-separated storage format, and both drop unknown strings rather than trusting the database. `PERMISSION_GROUPS` is what the UI renders, so the frontend doesn't hardcode the list.

---

## 6. Backend API reference

All routes are prefixed `/api`. All bodies are JSON, validated with `class-validator` (`whitelist: true, forbidNonWhitelisted: true` — unknown fields are rejected, not silently dropped).

**Every route requires an `Authorization: Bearer <token>` header except the two marked *public*.** Routes also list the permission they need; without it the backend answers 403 regardless of what the UI showed. `connecté` = any logged-in user.

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/health` | *public* | Liveness check |
| POST | `/auth/login` | *public* | `LoginDto` → `{accessToken, user}`. Returns the same "Identifiants incorrects." for a wrong password and an unknown login, so nobody can discover which logins exist |
| GET | `/auth/me` | `connecté` | Turns a stored token back into a profile. Called on every page load |
| POST | `/auth/change-password` | `connecté` | Requires the current password |
| GET | `/users` `?includeInactive=` | `users:manage` | List users. Never returns `passwordHash` |
| POST | `/users` | `users:manage` | Create — 409 on a duplicate login |
| PATCH | `/users/:id` | `users:manage` | Name, login, role. **Refuses changing your own role** — you could strip your own access |
| PATCH | `/users/:id/deactivate` / `/activate` | `users:manage` | Refuses deactivating yourself, and refuses the last account that can still manage users |
| PATCH | `/users/:id/password` | `users:manage` | Gérant resetting a forgotten password |
| GET | `/users/roles` | `users:manage` | Roles with their permissions and user counts |
| POST | `/users/roles` | `users:manage` | Invent a new role at runtime |
| PATCH | `/users/roles/:id` | `users:manage` | Edit label/description/permissions. Refuses editing the protected role's permissions; rejects unknown permission strings |
| DELETE | `/users/roles/:id` | `users:manage` | Refuses if protected, or if anyone still has the role |
| GET | `/users/permissions` | `users:manage` | The permission vocabulary, grouped, so the UI doesn't hardcode it |
| GET | `/audit` `?userId=&entity=&action=&from=&to=&limit=` | `audit:read` | Newest first, capped at 500 |
| GET | `/audit/filter-options` | `audit:read` | Distinct entities and actions actually present |
| GET | `/settings/inventory-types` | `connecté` | The 4 inventory types, sorted |
| GET | `/suppliers?includeArchived=` | `suppliers:read` | List suppliers |
| GET | `/suppliers/:id` | `suppliers:read` | One supplier |
| POST | `/suppliers` | `suppliers:write` | Create (`CreateSupplierDto`) |
| PATCH | `/suppliers/:id` | `suppliers:write` | Partial update |
| PATCH | `/suppliers/:id/archive` / `/unarchive` | `suppliers:write` | Toggle archived |
| GET | `/stock/summary` | `stock:read` | Dashboard payload: `totalItems`, `lowStockCount`, `lowStockItems[]`, `watchBatchCount` |
| GET | `/stock/items?inventoryTypeId=&includeArchived=` | `stock:read` | Items **with computed `quantity`, `low`, `fifoBatch`** and the full `inventoryType` embedded |
| GET | `/stock/items/:id` | `stock:read` | One item, same computed shape |
| POST | `/stock/items` | `stock:manage` | Create (`CreateItemDto`) — 409 if `reference` already exists |
| PATCH | `/stock/items/:id` | `stock:manage` | Partial update of `name`/`reference`/`unit`/`reorderThreshold` (`UpdateItemDto`) — 409 if the new `reference` collides. Does not accept `inventoryTypeId`: moving an item between inventories isn't supported (would invalidate its `hasBatches`/`hasExpiry` history) |
| DELETE | `/stock/items/:id` | `stock:manage` | Hard delete — **only** for an item with no movements and no production references (409 otherwise, telling you to archive). Deletes the item's empty batches with it. The `deletable` boolean on every item response says up front whether this will work |
| PATCH | `/stock/items/:id/archive` / `/unarchive` | `stock:manage` | Toggle `archived` — the delete equivalent for items (soft-delete, same pattern as Suppliers). An archived item is hidden from `GET /stock/items` unless `includeArchived=true`, and its Réception/Sortie actions are disabled in the UI, but its movement history is never touched |
| GET | `/stock/items/:id/batches` | `stock:read` | FIFO-ordered batches with `remaining` and `status` |
| GET | `/stock/items/:id/movements` | `stock:read` | Full history, newest first, with `batch`/`supplier` joined |
| POST | `/stock/items/:id/receive` | `stock:write` | `ReceiveStockDto` — creates a `Batch` (if `batchNumber` given) + an IN movement |
| POST | `/stock/items/:id/usage` | `stock:write` | `LogUsageDto` — creates an OUT movement; **400 if quantity exceeds what's actually available** (item total, or the named batch's remaining) |

Every mutation is server-validated independently of whatever the frontend already checked — see the build plan's "enforce on the backend, not just the UI" rule (Phase 2), applied early here even without auth yet.

---

## 7. Frontend structure

### `src/lib/` — no React, just data and network
- `api.ts` — the one `fetch` wrapper (`api.get/post/patch/del`), throws `ApiError` with a French message extracted from the backend's response. **Attaches the bearer token to every request** and calls back into AuthContext on a 401, so "you were logged out" is handled in one place instead of on every screen. `configureAuth()` is the seam that keeps this file free of React and of `authApi.ts` — otherwise the two would import each other in a circle.
- `authApi.ts` — typed calls for `/auth`, `/users` and `/audit`, plus the `Permission` union and the only code that reads/writes the token in `localStorage`.
- `stockApi.ts` — typed calls for every `/stock` and `/settings` endpoint, plus the `ApiItem`/`ApiBatch`/`ApiMovement` response shapes.
- `suppliersApi.ts` — typed calls for `/suppliers`.
- `useLocalCollection.ts` — generic `localStorage`-backed CRUD list (`{items, add, update, remove}`), used by every module that doesn't have a backend yet (Production runs, Customers, Orders, Employees, TimeEntries, Absences). **When a module gets a real backend, its page stops using this and switches to fetch/mutate like Stock did** — see §8.2 for the exact pattern to copy.
- `format.ts` — `formatDate` (accepts both a plain date and a full ISO datetime — the backend returns full timestamps), `formatNumber`, `formatQuantity`, `formatCurrency` (DZD).
- `date.ts`, `id.ts`, `storage.ts` — trivial helpers.
- `types.ts` — only `InventoryTypeConfig`/`InventoryTypeId` now (the old `Item`/`Batch`/`Movement` shapes were deleted when Stock moved onto the API — those shapes now live in `stockApi.ts` as `ApiItem` etc.).

### `src/state/AuthContext.tsx`
Holds the session. On startup a stored token is exchanged for a real profile via `/auth/me`, so a token belonging to a since-deactivated account never produces a usable session. Exposes `{user, loading, login, logout, can, canAny, sessionEndedMessage}`.

`can(permission)` is what every screen uses to decide what to render. `App.tsx` renders `<LoginPage>` until there is a session, so a logged-out browser never fires a request that would just 401, and keys the whole tree on `user.id` so switching accounts remounts everything rather than leaving data fetched under the previous person's permissions.

### `src/state/InventoryTypesContext.tsx`
Fetches `/settings/inventory-types` once at app root, exposes `{types, getType(id), loading, error}`. Everything that needs to know "does this inventory have batches / what's it called" reads from here — nothing hardcodes the four type names anymore.

### `src/modules/<name>/`
One folder per tab. Inside, a `<Name>Page.tsx` composes the page; forms are separate `*Modal.tsx` files; anything module-specific (types, one-off components) lives alongside. This structure is consistent across all six modules — copy the pattern of whichever module is closest to what you're building.

---

## 8. What's backend-wired vs. local-only, and how to move something from one to the other

### 8.1 The current split

| Module | Data lives in | Notes |
|---|---|---|
| **Auth / Users / Audit** | Backend | Fully wired. Every other module's access is enforced through it. |
| **Stock** | Backend (SQLite/Postgres) | Fully wired. Reference implementation for how a module should look. |
| **Suppliers** | Backend | Fully wired. Simplest reference implementation (no computed fields, no FIFO). |
| **Production** | Browser (`harrix.production-runs.v1`) | The run record itself (worker, machine, shift, 1er/2ème/rebut, gap reason) is local. **But** logging a run makes real `POST /stock/items/:id/usage` calls for every material consumed and a real `POST /stock/items/:id/receive` call for the finished goods produced (1er + 2ème choix only — rebut is recorded but never added to sellable stock). See `modules/production/ProductionForm.tsx`. |
| **Commandes & clients** | Browser (`harrix.customers.v1`, `harrix.orders.v1`) | Same pattern: order/customer records are local, but marking an order "Expédié" makes a real `POST /stock/items/:id/usage` call per line (reason `"Vente"`) against the real finished-goods stock. See `modules/orders/OrderInvoiceModal.tsx` → `markShipped`. |
| **Ressources humaines** | Browser (`harrix.employees.v1`, `harrix.time-entries.v1`, `harrix.absences.v1`) | Fully local — no dependency on Stock, no backend module. |

### 8.2 The pattern to copy when giving a module a real backend

This is exactly what happened to Stock this session — copy it:

1. Add the Prisma models to `schema.prisma`, run `prisma migrate dev --name <name>`.
2. Add `backend/src/<module>/` with `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/*.ts` — copy `suppliers/` as the simplest template, `stock/` if the module needs computed fields.
3. Register the module in `app.module.ts`.
4. In the frontend, add `lib/<module>Api.ts` (copy `suppliersApi.ts`).
5. In the page component, replace `useLocalCollection` with `useState` + a `load()` function that calls the new API, called from `useEffect` and after every mutation (copy `SuppliersPage.tsx` or `StockPage.tsx`).
6. Delete the module's `useLocalCollection` usage and its localStorage key once cut over — don't leave both paths alive.

### 8.3 Known limitation: no cross-call atomicity

Production and Orders make **multiple separate API calls** for one logical action (e.g., decrement 3 materials + credit 1 finished good). If a call fails partway through, earlier calls already happened — there's no rollback. Both `ProductionForm.tsx` and `OrderInvoiceModal.tsx` catch this, report exactly which steps completed before the failure, and refuse to save the local run/order record on partial failure (so the local record and reality can't silently disagree) — but the stock movements that did go through **stay applied**. The real fix is a dedicated backend endpoint (`POST /production/runs`) that does everything in one Prisma `$transaction`, the way `stock.service.ts`'s `receive()` already does for batch+movement. That endpoint doesn't exist yet — building it is the natural next step once Production needs its own backend module (§8.2).

---

## 9. Deliberate simplifications (not bugs)

- **Movements and batches don't record who did them.** `Movement` and `ProductionBatch` still have no `userId` column — the audit log records that a person hit `POST /stock/items/:id/receive`, but the movement row itself is anonymous. Joining the two by timestamp works but is fragile. **This is the first thing to fix before building the satellite apps**, since "who took this out?" is the question they exist to answer. `ProductionBatch.supervisor`/`operator` are still free text, not real accounts, so two people typing "Yacine" and "Yacine M." are two different people to the system.
- **The audit log records what was submitted, not what it replaced.** The interceptor sees the request body and the response, not the prior row — so an UPDATE entry shows the new values, not the old ones. For the tables where this matters most it doesn't bite: `Movement` and `AuditEntry` are append-only, so nothing is ever silently overwritten.
- **No rate limiting on login.** Failed attempts are logged, but nothing slows down or locks out someone trying passwords repeatedly. Fine on a factory LAN, not fine the day this is exposed to the internet.
- **The token can't be revoked before it expires, except by deactivating the account.** There's no token blocklist; `logout` just discards it client-side. Deactivation *does* take effect immediately because the guard re-reads the user every request.
- **JWT lives in `localStorage`**, which means a cross-site-scripting bug would expose it. Chosen deliberately over an httpOnly cookie: it's simpler, avoids CSRF handling, and is what the phone apps will need. Revisit if this is ever exposed beyond the factory network.
- **"Product" in Production = a finished-goods `Item`.** There's no separate product catalogue yet (Phase 5 — photo, color/size/gender variants, cost-plus pricing). A finished-goods item created in the Stock tab is what Production's dropdown offers as "product." When Phase 5 gets built, decide whether it replaces these items or adds metadata on top of them.
- **RH's "heures prévues" is `8 × days in month`**, not a real per-employee schedule, weekends aren't excluded. See `EXPECTED_HOURS_PER_DAY` in `modules/hr/types.ts`. Good enough to see the shape of the report; not a real payroll calculation.
- **Order pricing is manual per line**, no cost-plus suggestion (that's Phase 5 too).
- **DZD formatting** uses `Intl.NumberFormat` with `currency: "DZD"` — it'll render as "1 234,00 DZA" or similar depending on the runtime's locale data, not a proper "DA" symbol, because DZD has no universal symbol. Cosmetic, not a bug.

---

## 10. Build-plan phase status (cross-reference)

| Phase | Status |
|---|---|
| 0 — Decisions | Done (answered by the factory owner; baked into this doc and the build plan) |
| 1 — Workshop setup | Backend scaffolded; **deviation**: SQLite not PostgreSQL, no Docker Compose yet (needs Docker, unavailable in the environment that built this) |
| 2 — Auth/roles | **Done.** Users table with bcrypt hashes, roles-as-data with permission strings, French login screen, backend enforcement on every endpoint, gérant screen to create/deactivate users, and an audit log. Acceptance test verified: a magasinier account gets 403 on `/users` and `/audit` even calling the API directly. Remaining gaps in §9 (no `userId` on movements, no login rate limiting). |
| 3 — App shell | Done — sidebar (now filtered by permission), topbar with user menu and logout. Only the desktop shell exists so far (no phone-first PWA shell yet) |
| 4 — Stock system | Backend + frontend done, including suppliers. Real starting counts have **not** been loaded — it's still demo data (`prisma:seed`) |
| 5 — Product catalogue & pricing | Not started — see §9's "finished-goods item stands in for product" |
| 6 — Production | Frontend + real stock integration done; **backend module not built** (§8.3) |
| 7 — Orders & customers | Frontend + real stock integration (on ship) done; backend module not built |
| 8 — HR | Frontend done, fully local, no backend module |
| 9 — Dashboard | Stock-derived KPIs are real and live; everything else (sales, margin, best-sellers, reconciliation) is a labeled placeholder waiting on Orders/Production backends |
| 10 — Deployment | Not started |
| 11 — Multi-factory reuse | Not started, but the inventory-types-as-data design already supports it for Stock |

---

## 11. Quick "where do I look" index

- Stock quantity looks wrong → `backend/src/stock/stock-math.ts` (logic) or `backend/prisma/seed.ts` (demo data).
- Add a field to an item/supplier → `schema.prisma`, migrate, update the DTO, update the service, update the frontend type in `stockApi.ts`/`suppliersApi.ts`, update the form component.
- Edit or archive a stock item → `backend/src/stock/dto/update-item.dto.ts`, `stock.service.ts`'s `updateItem`/`setItemArchived`, `StockPage.tsx`'s "Modifier"/"Archiver" row actions (`AddItemModal.tsx` doubles as the edit form when passed an `item`).
- Change what counts as "low stock" or "expiring soon" → `stock-math.ts` (`isLowStock`, `getExpiryStatus`'s `warnDays`).
- Add a new tab → copy `modules/suppliers/` (simplest) or `modules/hr/` (local-only, sub-tabbed) as a template; register it in `components/layout/Sidebar.tsx` and `App.tsx`.
- Give Production/Orders/HR a real backend → §8.2.
- Something about French wording, DZD formatting, dates → `lib/format.ts`.
- CORS / API URL / port issues → `backend/.env` (`CORS_ORIGIN`, `PORT`), `apps/dashboard/.env` (`VITE_API_URL`).

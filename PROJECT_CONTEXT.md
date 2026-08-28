# Harrix ERP — Project Context

**Read this file before touching code.** It exists so a fresh AI session (or you, months from now) can make a correct, scoped change without re-reading the whole repository. It reflects the state of the code as of **2026-08-28**. If something here disagrees with the code, trust the code and fix this file.

> Renamed from "Chelma ERP" to "Harrix ERP" on 2026-08-27 (new logo at `apps/dashboard/public/logo.png`, used as favicon and sidebar mark). The on-disk folder is still named `chelma-erp` — only app-facing branding (titles, sidebar, backend service name, launcher script, localStorage key prefixes) was renamed. Filenames below that still say `chelma-erp-*` are historical pointers to companion docs that were never actually added to this repo.

Companion documents:
- `chelma-erp-project-intuition.md` — the original brief from the factory owner (the "why").
- `chelma-erp-build-plan.md` — the 11-phase build order, in plain language, with checkboxes.

This file is the "how it's actually built right now" reference. The build plan is the roadmap; this is the map of the terrain as it exists today.

---

## 1. What exists right now, in one paragraph

A monorepo with a NestJS + Prisma + SQLite backend (`backend/`) and a React + Vite frontend (`apps/dashboard/`). The backend fully implements three domains — **Settings** (inventory types as data), **Suppliers** (full CRUD), and **Stock** (the four inventories, movement-ledger quantities, FEFO batches, expiry tracking) — and the frontend's Stock and Fournisseurs tabs are genuine thin clients against that API, exactly per the build plan's architecture. Stock items support the same edit/archive pattern as Suppliers (`PATCH /stock/items/:id`, `PATCH /stock/items/:id/archive|unarchive`) — there is no hard delete for an item, because deleting one would orphan its movement ledger; archiving is the "delete" for anything with history. Three more tabs — **Production**, **Commandes & clients**, **Ressources humaines** — exist in the frontend with real UI and real workflows, but their own records (a production run, an order, an employee) are kept in the browser's `localStorage`, not the database, because those backend modules don't exist yet. Critically, **Production and Orders still call the real Stock API** for the parts that touch real inventory (materials consumed, finished goods produced, goods shipped) — so stock numbers are never fake, only the surrounding paperwork is.

**Authentication is live (Phase 2).** Every endpoint except `/health` and `/auth/login` requires a bearer token; every one that touches real data also requires a named permission. The frontend renders nothing until there is a session, and hides tabs the user's role doesn't grant — but that hiding is a convenience, never the boundary: the backend re-checks on every request.

On 2026-08-28 the Stock tab gained the rest of the **"Produits chimiques" spec** (the chemical brief): consumption priority is now **FEFO — First Expired, First Out — with FIFO as fallback** (the batch with the earliest expiry is the one recommended to consume next; lots without an expiry sort among themselves by received date and behind any expiring lot). Items expose **`purchased` / `used` / `remaining`** figures, a three-tier **stock condition — `good` / `mid` / `low`** (Good/Bien, Mid/Moyen, Low/Faible, where `mid` is anything above the reorder threshold but below twice it, and `low` = at/below the threshold = "reorder required"), an optional **`photoUrl`** (URL or inline `data:` image — there is no file-upload infra yet), a **`recommendedBatch`** (first non-expired lot with stock; falls back to the raw FEFO next-lot when everything left is expired), and a full **detail modal** on row click: photo, condition tiers, reorder info, per-lot table (number, supplier from the receiving movement, received/expiry dates, remaining, expiry status), the recommended next lot, and the complete movement ledger. The old "Historique" modal (`ItemHistoryModal`) was replaced by `ItemDetailModal`.

Also on 2026-08-28, the Stock tab gained the rest of the **"Tige des chaussures" spec** — still inside the existing Stock tab, with the same four-inventory data-driven approach, following the same "receive/usage/detail" pattern as chemicals but without batches or expiry. Items now have optional variant attributes — **`color` and `size`** (e.g. tige "Noir" / "40".."42") — surfaced through per-inventory **`hasColor` / `hasSize` flags** on `InventoryType`, so the columns and the create/edit form show Colour/Size fields only for inventories that declare them (tige yes, chemicals no). Every item also exposes the **`supplier`** of its most recent receive (`getLatestSupplier` in `stock-math.ts`), shown as a Fournisseur column in the table, in the detail modal, and — together with the colour/size variants and an **"Activité production liée"** section (OUT movements with reason "Production") — in the row-click detail modal. Stock entry via **supplier orders** (the third entry path in the spec) got a real backend module: `SupplierOrder` + `SupplierOrderLine`, with **`GET/POST /api/supplier-orders`** and **`POST /api/supplier-orders/:id/receive`**. Receiving an order creates the IN movements (and per-line batch records for batch-tracked items like chemicals, captured at receive time) and moves the order to `received`; orders are managed in a dedicated "Commandes fournisseurs" modal with create + receive forms. Receiving is deliberately **total only** — partial deliveries aren't supported.

Also on 2026-08-28, the Stock tab gained the rest of the **"Pièces détachées" spec** (maintenance continuity, not production consumption). Spare parts are gated by two new type-level flags — **`hasDescription`** (a free-text Description on the item) and **`hasMachineInfo`** (maintenance-oriented metadata: `machine`, `compatibility`, `manufacturer`, `location`, `criticality`) — both true on the `spare-parts` inventory, so the table gets Description/Machine/Fabricant/Localisation/Criticité columns only there. **Usage recording** (the "Sortie" modal) gains these maintenance-only fields — `machine` (pre-filled from the item), **maintenance reference, employee/intervenant, notes** — stored directly on the `Movement` row for any inventory that declares `hasMachineInfo`. The detail modal shows the description, a **"Machine & compatibilité"** facts bank (machine, compatibility, manufacturer, location, criticality as a colour-coded pill: Haute → red, Moyenne → amber, Basse → green), and the movement ledger now annotates each OUT row with its maintenance context. Criticality is a free string, not an enum — seed uses Haute/Moyenne/Basse.

Also on 2026-08-28, the Stock tab gained the rest of the **"Produits finis" spec** — the finished-goods inventory now carries the attributes that make a product sellable — **`gender` ("M"/"F")** and **`price` (DZD)** — gated by new `hasGender`/`hasPrice` flags, and finishes the **production-quality classification** the spec's categories demand. Quality is stored **per movement** (`Movement.quality`: `"1er"`, `"2ème"` or `"rebut"`), gated by a `hasQuality` flag on the type, and every finished-product view exposes a **`qualityBreakdown`** (`1er`/`2ème`/`rebut` per class, IN−OUT) plus an **`unaccounted`** figure — the net of movements left untagged, i.e. **units on the books that no production record explains**. This is the owner's core problem made measurable: the table shows a compact "1er/2e/rebut" summary with a danger pill when `unaccounted` ≠ 0, and the detail modal renders four **classification cards** (1er choix · 2ème choix · Unités rebutées · Inconnues/non justifiées). The receive & sortie modals let finished goods be tagged with a class (whitelisted server-side; a quality on a non-quality inventory → 400). The finished-goods seed demonstrates all four: three products with quality-tagged production + sales, one of which (FG-001) has "mystery" stock (25 pairs in stock with no production origin) so the reconciliation shows a real, non-zero `unaccounted`.

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
│       ├── supplier-orders/    SupplierOrder/Line — create + full-receive (see §5)
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
| Batch consumption priority is FEFO, not FIFO | The chemicals spec says "the lot with the earliest valid expiration should normally be used first, FIFO as fallback." `getBatchesWithRemaining` therefore sorts by `expiryDate` ascending (missing expiry = `Infinity`, so never-expiring lots sort behind expiring ones), then by `receivedDate` for ties/no-expiry. `getFifoBatch` (the name is historical) is "first with remaining left" in that order; `getRecommendedBatch` skips already-expired lots for the "recommended next" feature. Don't "fix" the sort back to `receivedDate`-only — that was pre-spec FIFO behaviour. |
| Stock condition is three-tier, `good`/`mid`/`low` | `getStockStatus(quantity, threshold, midFactor = 2)`: `low` = `quantity <= threshold` (== `isLowStock`, i.e. "reorder required"), `mid` = above threshold but `<= threshold * midFactor`, else `good`. The `low` boolean is kept alongside for legacy callers (dashboard summary, banners). |
| Movement `direction` is a plain string, not a Prisma enum | Keeps `schema.prisma` portable between SQLite and PostgreSQL without a provider-specific enum type. Validated at the DTO layer instead (`class-validator`). |
| Stock math is pure, framework-free functions | `backend/src/stock/stock-math.ts` and (historically) `apps/dashboard/src/lib/stockEngine.ts` (now deleted — see §8.1) take plain data in, plain data out. No Prisma, no HTTP. This is what makes them unit-testable without a database — see `stock-math.spec.ts`. |
| No global frontend state library | Only `InventoryTypesContext` exists (fetched once, rarely changes). Every page fetches its own data and refetches after its own mutations. This matches the "thin client" philosophy in the project intuition doc — don't add Redux/Zustand/React Query unless a real problem (stale data across tabs, request waterfalls) actually shows up. |
| No shared `packages/` folder yet | The plan's long-term architecture calls for shared code across the backend and multiple frontend apps. Right now there's one frontend app and the stock math is small enough to duplicate once. If a second frontend app or a second place needing FIFO/expiry logic appears, **that's** the trigger to extract a shared package — not before. |
| Variant attributes (`color` / `size`) are data-driven, not hardcoded | `hasColor` / `hasSize` live on `InventoryType`, not the tige type's identity. The frontend renders Couleur/Taille columns (and form fields) only when the active type declares them, so a future inventory with its own variants needs seed data, not new components. "Where relevant" in the spec is expressed as type data. |
| A supplier order changes stock only when **received** | `POST /supplier-orders` records the purchase; until `POST /supplier-orders/:id/receive` runs, no movement exists. Receiving is the actual stock entry — it creates the IN movements (one per line) and, for batch-tracked items, one `Batch` per line with the batch number/expiry captured at receive time. Orders are **full-receive only** (no partial deliveries) — a deliberate simplification, so a line's quantity + receive batch are 1:1. |
| The item's "supplier" is derived, never stored on the item | `getLatestSupplier` (stock-math) picks the supplier of the most recent IN movement for the item's computed view. It's not a column on `Item` — it always matches the ledger. |
| Spare-part metadata is driven by `hasDescription` / `hasMachineInfo`, not by the type key | Like `hasColor`/`hasSize` for tige, the spare-parts spec's extra fields (Description; Machine/Compatibility/Manufacturer/Location/Criticality) are boolean flags on `InventoryType`. The UI renders the columns, form fields, facts section and maintenance fields in the usage modal **only when the flag is on** — a future maintenance-oriented inventory gets them via seed data, and no component checks `key === "spare-parts"` anywhere. |
| Maintenance context lives on the `Movement` row, one field each | A spare-part usage records part, quantity, date, reason, `machine`, `maintenanceRef`, `employee`, `notes` straight onto the OUT Movement. No separate maintenance/repair table that could drift from the stock ledger — the ledger *is* the maintenance log, same as the "stock quantity is SUM(IN)−SUM(OUT)" rule but for who/what/when. |
| Finished-product gender/price are `hasGender` / `hasPrice` flags too | Same data-driven play as colours/sizes: `gender` and `price` are optional `Item` columns rendered **only** when the type declares the flag. `price` is a plain `Float` in DZD, formatting-only on the frontend (`formatCurrency`). |
| Production quality is a **movement tag**, and the untagged residual is the "unknown units" problem | `Movement.quality` holds `"1er"`/`"2ème"`/`"rebut"` (server-whitelisted). Each finished product's `qualityBreakdown` = IN−OUT per class; **`unaccounted` = computed quantity − Σ(classes)**, which algebraically equals the net of movements with *no* quality tag. That number *is* the owner's core problem — stock physically present but not attributable to any production record. Fully-attributed products show 0; the seed's FG-001 intentionally has an untagged IN (25 pairs "appeared") so a real, non-zero figure demonstrates it. A quality value on a non-`hasQuality` inventory → 400. |

---

## 5. Data model (backend/prisma/schema.prisma)

Seven tables, no more:

### `InventoryType`
The four inventories, as **data**, not a hardcoded enum — a future factory with 3 or 6 inventories needs new rows, not a schema change. Fields: `key` (stable machine id like `"chemicals"`), `label`, `singular`, `description`, `hasBatches`, `hasExpiry`, `isProductionInput`, `hasColor`, `hasSize`, `hasDescription`, `hasMachineInfo`, `hasGender`, `hasPrice`, `hasQuality`, `defaultUnit`, `sortOrder`.

Current rows (from `prisma/seed.ts`): `chemicals` (hasBatches, hasExpiry, isProductionInput), `tige` (isProductionInput, **hasColor, hasSize** — the tige variant inventory), `spare-parts` (none of the production/batch flags, but **hasDescription + hasMachineInfo** — the maintenance inventory), `finished-goods` (**hasColor, hasSize, hasGender, hasPrice, hasQuality** — the sellable output inventory, with per-movement production-quality classes).

### `Item`
One row per tracked article. `reference` is globally unique. Belongs to one `InventoryType`. Has `reorderThreshold` (for the low-stock flag), an optional `photoUrl` (a URL or inline `data:` image — no upload endpoint yet), optional **`color`** and **`size`** variant strings (only meaningful when the type declares `hasColor`/`hasSize`), an optional **`description`** (free text, only when `hasDescription`), optional maintenance attribute strings — **`machine`, `compatibility`, `manufacturer`, `location`, `criticality`** (only when `hasMachineInfo`; `criticality` is a free string seeded as "Haute"/"Moyenne"/"Basse"), an optional **`gender`** ("M"/"F", only when `hasGender`) and an optional **`price`** in DZD (only when `hasPrice`) — but **no quantity column and no supplier column** — quantity is `SUM(IN)−SUM(OUT)` (§4) and the displayed supplier is derived from the ledger (§4).

### `Batch`
Only meaningful for items whose `InventoryType.hasBatches` is true (chemicals). Has `receivedDate` and `expiryDate`. A batch's remaining quantity, like an item's, is computed from its movements — never stored.

### `Movement`
The ledger. Every stock change, ever, is a row here: `itemId`, optional `batchId`, `direction` ("IN"/"OUT"), `quantity`, `date`, optional `supplierId`, optional `reason` (only meaningful on OUT), the maintenance context column set — **`machine`, `maintenanceRef`, `employee`, `notes`** — filled in on spare-part usages (when the type declares `hasMachineInfo`), and **`quality`** (`"1er"`/`"2ème"`/`"rebut"`, or null) for finished-goods production classes. Movements left with a null quality are exactly what the reconciliation reports as `unaccounted` — see §4. This table is append-only in spirit — nothing in the app updates or deletes a movement.

### `Supplier`
Plain contact record with `archived` (soft-delete — archiving, not deleting, keeps historical movements' supplier links intact). Linked from movements and from `SupplierOrder`.

### `SupplierOrder` + `SupplierOrderLine`
A purchase order placed with a supplier. `SupplierOrder` has `supplierId`, `orderDate`, plain-string `status` (`"open"`/`"received"`, validated at the DTO), `receivedDate` (set on receive), optional `notes`. `SupplierOrderLine` has `itemId`, `quantityOrdered`, and optional `batchNumber`/`expiryDate` filled in **at receive time** for batch-tracked items. See §4 for why an order is inert until received.

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

### `PurchaseOrder` / `PurchaseOrderLine`
§14. `code` is unique and generated per year (`"BC-2026-0007"`). Lines hold `quantity` and `unitCost`; **no `received` column** — that is summed from `ReceiptLine`. Order-level `shipping`/`discount`/`tax` are stored, every total is computed.

Status is one of `DRAFT`, `SUBMITTED`, `APPROVED`, `PARTIALLY_RECEIVED`, `RECEIVED`, `CANCELLED`. The last two are set by the service, never the caller (§4).

### `Receipt` / `ReceiptLine`
One delivery against a PO (`"BR-2026-0007"`). Posting a receipt is the only purchasing action that moves stock: it writes the IN `Movement`s and, for chemicals, the `Batch` carrying lot number and expiry (§14's "receiving should also record the relevant lot and expiration information"). `ReceiptLine.movementId` and `.batchId` are plain ids, not relations, so nothing can cascade into the append-only ledger.

### `Customer`
§18. `code` unique (`"CLI-2026-0001"`), plus the structured address §17 needs: `address`, `city`, `province`, `country`, `postalCode`. Archived rather than deleted once they have orders; a customer with none can be deleted outright.

### `Order` / `OrderLine`
§15–17. `code` unique (`"CMD-2026-0007"`). `shipmentStatus` is `PENDING`/`SHIPPED`/`CANCELLED`; `paymentStatus` is `PENDING`/`PAID`/`CANCELLED`. Lines hold `quantity`, `unitPrice` and a per-line `discount`; totals are computed. `shipTo*` is the address snapshot (§4). `shippedAt` and `OrderLine.movementId` are set when the order ships — creating an order writes no movements at all.

### 5.3 The math (`backend/src/stock/stock-math.ts`)
Pure functions, unit tested in `stock-math.spec.ts`:
- `getItemQuantity(movements, itemId)` — the sum.
- `getBatchQuantity`, `getBatchesWithRemaining` (**FEFO order — earliest expiry first, FIFO by received date as fallback**, batches without expiry last), `getFifoBatch` (first with remaining > 0, historically named), `getRecommendedBatch` (first with remaining > 0 that isn't expired — what the UI shows as "prochain lot à consommer").
- `getExpiryStatus(expiryDate, today, warnDays=30)` → `"expired" | "warning" | "ok" | "none"`.
- `isLowStock(quantity, threshold)` → `quantity <= threshold`; `getStockStatus(quantity, threshold)` → `"good" | "mid" | "low"` (three-tier condition — see §4).
- `MovementDetail` (movement + `date` + joined `supplier`) and `getLatestSupplier(movements, itemId)` → the supplier of the most recent IN movement for the item, or `null` if it was never received from anyone.
- `getQualityCounts(movements, itemId)` → per-`quality` IN−OUT counts for an item (every class seen plus `"1er"`, `"2ème"`, `"rebut"`, and `unclassified`), and `getUnaccounted(counts)` → the `unclassified` bucket (see §4 — the "unknown units" number).

If you need this logic anywhere else (a report, a new endpoint), import from this file. Don't re-derive it.

---

### 5.5 The permission vocabulary (`backend/src/auth/permissions.ts`)
Pure data and pure functions, unit tested in `permissions.spec.ts` (13 tests). Thirteen permissions, named `<domain>:<action>` where read < write < manage:

`stock:read|write|manage`, `production:read|write`, `suppliers:read|write`, `orders:read|write`, `hr:read|write`, `users:manage`, `audit:read`.

Note `write` does **not** imply `manage` — a magasinier records receptions and usage but cannot create or delete articles. `parsePermissions`/`serializePermissions` are the only code that knows the comma-separated storage format, and both drop unknown strings rather than trusting the database. `PERMISSION_GROUPS` is what the UI renders, so the frontend doesn't hardcode the list.

### 5.6 The purchasing math (`backend/src/purchasing/purchasing-math.ts`)
Pure functions, 14 tests in `purchasing-math.spec.ts`:
- `receivedForLine` / `outstandingForLine` — summed from receipts; outstanding never goes negative on an over-delivery.
- `poTotals` — subtotal from lines, then + shipping + tax − discount.
- `statusAfterReceipt` — `RECEIVED` only when *every* line is complete, `PARTIALLY_RECEIVED` when any is, and `CANCELLED` stays `CANCELLED`.
- `outstandingCommitment` — §13's figure: the value of everything ordered but not delivered, on POs that are neither received nor cancelled.

### 5.7 The sales math (`backend/src/sales/sales-math.ts`)
Pure functions, 13 tests in `sales-math.spec.ts`:
- `lineTotal` — quantity × price − line discount, clamped at zero.
- `orderTotals` — §16's calculation. The order total is also clamped at zero, so an over-large discount can't produce a negative invoice.
- `canShip` / `canEdit` / `canCancel` — the lifecycle rules. A shipped order can't be edited, re-shipped, cancelled or deleted, because its lines already moved real stock. These three are returned on every order payload so the UI never offers a button the server will refuse.
- `summarizeCustomer` — §19's three figures. `outstandingBalance` is whole-order (payment `PENDING`), not partial: there is no payments ledger, by decision.

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
| GET | `/purchasing/orders` `?supplierId=&status=&from=&to=` | `purchasing:read` | Purchase orders, each with computed `totals` and per-line `received`/`outstanding` |
| GET | `/purchasing/orders/:id` | `purchasing:read` | One PO, same computed shape, with its receipts |
| POST | `/purchasing/orders` | `purchasing:write` | `CreatePurchaseOrderDto`. Creates the PO — **does not touch stock** |
| PATCH | `/purchasing/orders/:id` | `purchasing:write` | Edit. Lines may only be replaced while `DRAFT` or `SUBMITTED` |
| PATCH | `/purchasing/orders/:id/status` | `purchasing:approve` | `DRAFT`/`SUBMITTED`/`APPROVED`/`CANCELLED` only. 400 on `RECEIVED`/`PARTIALLY_RECEIVED`; 409 cancelling a PO that already has receipts |
| POST | `/purchasing/orders/:id/receive` | `purchasing:write` | **The transactional one.** Writes the receipt, its lines, the IN movements and (for chemicals) the `Batch` with lot + expiry, then recomputes the PO status. 409 unless the PO is `APPROVED`/`PARTIALLY_RECEIVED`; 400 on a missing lot, missing expiry, or over-delivery without `allowOverDelivery` |
| DELETE | `/purchasing/orders/:id` | `purchasing:write` | Only an untouched `DRAFT`; anything else must be cancelled |
| GET | `/purchasing/suppliers/:id` | `purchasing:read` | §13's supplier detail: info, supplied items, POs, receipts, full IN-movement history, and the summary (total purchased, outstanding commitment, last purchase) |
| GET | `/sales/customers` `?includeArchived=` | `orders:read` | Customers with §19's `orderCount`/`totalPurchased`/`outstandingBalance` |
| GET | `/sales/customers/:id` | `orders:read` | §19's detail: profile, order history, summaries |
| POST | `/sales/customers` | `orders:write` | Create (`CreateCustomerDto`) — email validated only if supplied |
| PATCH | `/sales/customers/:id` | `orders:write` | Partial update |
| PATCH | `/sales/customers/:id/archive` / `/unarchive` | `orders:write` | Toggle archived |
| DELETE | `/sales/customers/:id` | `orders:write` | Only for a customer with **no** orders; 409 otherwise |
| GET | `/sales/orders` `?customerId=&shipmentStatus=&paymentStatus=&from=&to=&search=` | `orders:read` | §15's list. `search` matches order code, customer name and customer email |
| GET | `/sales/orders/:id` | `orders:read` | §17's invoice payload, with `totals` and the `canEdit`/`canShip`/`canCancel` flags |
| GET | `/sales/orders/summary` `?<same filters>` | `orders:read` | Counts, revenue, outstanding |
| POST | `/sales/orders` | `orders:write` | `CreateOrderDto`. **Does not touch stock.** Snapshots the customer's address. Accepts no total — §16 |
| PATCH | `/sales/orders/:id` | `orders:write` | Edit. 409 once shipped or cancelled |
| PATCH | `/sales/orders/:id/status` | `orders:write` | Payment status, or cancel. 400 on `shipmentStatus: SHIPPED` — that must go through the ship endpoint |
| POST | `/sales/orders/:id/ship` | `orders:write` | **The transactional one.** One OUT movement per line + the status change, in one transaction. 400 naming the product if stock is short; 409 if already shipped |
| DELETE | `/sales/orders/:id` | `orders:write` | 409 once shipped — it has a stock trail |
| GET | `/settings/inventory-types` | `connecté` | The 4 inventory types, sorted |
| GET | `/suppliers?includeArchived=` | `suppliers:read` | List suppliers |
| GET | `/suppliers/:id` | `suppliers:read` | One supplier |
| POST | `/suppliers` | `suppliers:write` | Create (`CreateSupplierDto`) |
| PATCH | `/suppliers/:id` | `suppliers:write` | Partial update |
| PATCH | `/suppliers/:id/archive` / `/unarchive` | `suppliers:write` | Toggle archived |
| GET | `/stock/summary` | `stock:read` | Dashboard payload: `totalItems`, `lowStockCount`, `lowStockItems[]`, `watchBatchCount` |
| GET | `/stock/items?inventoryTypeId=&includeArchived=` | `stock:read` | Items with computed `quantity`, `purchased`, `used`, `supplier` (last receive's supplier or null), `low`, `stockStatus` (`good`/`mid`/`low`), `photoUrl`, `color`, `size`, `description`, `machine`, `compatibility`, `manufacturer`, `location`, `criticality`, `gender`, `price`, `fifoBatch`, `recommendedBatch`, plus finished-goods `qualityBreakdown` + `unaccounted` (see §4); full `inventoryType` embedded |
| GET | `/stock/items/:id` | `stock:read` | One item, same computed shape |
| POST | `/stock/items` | `stock:manage` | Create (`CreateItemDto`) — 409 if `reference` already exists |
| PATCH | `/stock/items/:id` | `stock:manage` | Partial update of `name`/`reference`/`unit`/`reorderThreshold` (`UpdateItemDto`) — 409 if the new `reference` collides. Does not accept `inventoryTypeId`: moving an item between inventories isn't supported (would invalidate its `hasBatches`/`hasExpiry` history) |
| DELETE | `/stock/items/:id` | `stock:manage` | Hard delete — **only** for an item with no movements and no production references (409 otherwise, telling you to archive). Deletes the item's empty batches with it. The `deletable` boolean on every item response says up front whether this will work |
| PATCH | `/stock/items/:id/archive` / `/unarchive` | `stock:manage` | Toggle `archived` (soft-delete). Archived items are hidden from `GET /stock/items` unless `includeArchived=true` |
| GET | `/stock/items/:id/batches` | `stock:read` | FIFO-ordered batches with `remaining` and `status` |
| GET | `/stock/items/:id/movements` | `stock:read` | Full history, newest first, with `batch`/`supplier` joined |
| POST | `/stock/items/:id/receive` | `stock:write` | `ReceiveStockDto` — creates a `Batch` (if `batchNumber` given) + an IN movement. Accepts optional `quality` (`"1er"`/`"2ème"`/`"rebut"`) for finished goods — **400 if the type doesn't declare `hasQuality`** or the value isn't whitelisted |
| POST | `/stock/items/:id/usage` | `stock:write` | `LogUsageDto` — creates an OUT movement; **400 if quantity exceeds what's actually available** (item total, or the named batch's remaining). Accepts maintenance context (`machine`, `maintenanceRef`, `employee`, `notes`) and, for finished goods, the `quality` class |
| GET | `/supplier-orders` | `suppliers:read` | All orders, newest first, with `supplier` and lines (each line embeds its `item` + `inventoryType`) |
| POST | `/supplier-orders` | `suppliers:write` | Create (`CreateSupplierOrderDto`) — 400 if the supplier or an item is unknown |
| POST | `/supplier-orders/:id/receive` | `suppliers:write` | `ReceiveSupplierOrderDto` (optional `lines[]` mapping `lineId` → `batchNumber`/`expiryDate`). Creates the IN movements + batches inside a `$transaction`, marks the order `received`. **400 if already received** or if a batch-tracked line is missing its batch number / expiry in `lines[]` |

Every mutation is server-validated independently of whatever the frontend already checked — see the build plan's "enforce on the backend, not just the UI" rule (Phase 2), applied early here even without auth yet.


Every mutation is server-validated independently of whatever the frontend already checked — see the build plan's "enforce on the backend, not just the UI" rule (Phase 2), applied early here even without auth yet.

---

## 7. Frontend structure

### `src/lib/` — no React, just data and network
### `src/lib/` — no React, just data and network

- `api.ts` — the one `fetch` wrapper (`api.get/post/patch/del`), throws `ApiError` with a French message extracted from the backend's response. Attaches the bearer token to every request and calls back into AuthContext on a 401; `configureAuth()` is the seam that keeps this file free of React.
- `authApi.ts` — typed calls for `/auth`, `/users` and `/audit`, plus the `Permission` union and the only code that reads/writes the token in `localStorage`.
- `stockApi.ts` — typed calls for every `/stock` and `/settings` endpoint, plus the `ApiItem`/`ApiBatch`/`ApiMovement` response shapes (`ApiItem` carries `photoUrl`, `color`, `size`, `description`, `machine`, `compatibility`, `manufacturer`, `location`, `criticality`, `gender`, `price`, `purchased`, `used`, `supplier`, `stockStatus`, `recommendedBatch`, and the finished-goods `qualityBreakdown`/`unaccounted`; `ApiMovement` carries the maintenance columns and `quality`).
- `supplierOrdersApi.ts` — typed calls for `/supplier-orders`.
- `useLocalCollection.ts` — generic `localStorage`-backed CRUD list (`{items, add, update, remove}`), used by several modules that are still local-first. When a module gets a real backend, its page switches to fetch/mutate like Stock did.
- `format.ts` — `formatDate`/`formatNumber`/`formatQuantity`/`formatCurrency`.
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
| Module | Data lives in | Notes |
|---|---|---|
| **Auth / Users / Audit** | Backend | Fully wired. Every other module's access is enforced through it. |
| **Stock** | Backend (SQLite/Postgres) | Fully wired. Reference implementation for how a module should look. Includes FEFO next-lot / recommended-lot, `good`/`mid`/`low` condition, purchased/used/remaining columns, optional photos, and the row-click detail modal. Create/edit item form has a "Photo (URL)" field. Also includes colour/size driven by inventory type, supplier column, supplier orders (receive creates stock), maintenance-aware "Sortie" modal, and finished-goods features: Sexe / Prix, Qualité column (1er/2e/rebut), `qualityBreakdown` and `unaccounted` indicators. |
| **Suppliers** | Backend | Fully wired. Simplest reference implementation (no computed fields, no FIFO). |
| **Production** | Browser (`harrix.production-runs.v1`) | Run records are local; logging a run posts real `POST /stock/items/:id/usage` (materials) and `POST /stock/items/:id/receive` (finished goods 1er/2ème only). |
| **Commandes & clients** | Browser (`harrix.customers.v1`, `harrix.orders.v1`) | Local order/customer records; marking an order shipped triggers real stock usage calls (reason: "Vente"). |
| **Suppliers** | Backend | Fully wired. Simplest reference implementation (no computed fields, no FIFO). |
| **Production** | Browser (`harrix.production-runs.v1`) | The run record itself (worker, machine, shift, 1er/2ème/rebut, gap reason) is local. **But** logging a run makes real `POST /stock/items/:id/usage` calls for every material consumed and a real `POST /stock/items/:id/receive` call for the finished goods produced (1er + 2ème choix only — rebut is recorded but never added to sellable stock). See `modules/production/ProductionForm.tsx`. |
| **Achats** | Backend | Fully wired. Purchase orders, receipts, supplier activity. Receiving is one transaction. |
| **Ventes & clients** | Backend | Fully wired as of 2026-08-28. `modules/orders/` is deleted; `harrix.customers.v1` and `harrix.orders.v1` are dead keys and are not migrated. Shipping is one transaction. |
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
| 5 — Product catalogue & pricing | Not started — and now the largest remaining gap: it is what §17's image/colour/size and any real pricing depend on — see §9's "finished-goods item stands in for product" |
| 6 — Production | Frontend + real stock integration done; **backend module not built** (§8.3) |
| 7 — Orders & customers | Frontend + real stock integration (on ship) done; backend module not built |
| 8 — HR | Frontend done, fully local, no backend module |
| 9 — Dashboard | Stock-derived KPIs are real and live; everything else (sales, margin, best-sellers, reconciliation) is a labeled placeholder waiting on Orders/Production backends |
| 10 — Deployment | Not started |
| 11 — Multi-factory reuse | Not started, but the inventory-types-as-data design already supports it for Stock |

---

## 11. Quick "where do I look" index

- Stock quantity looks wrong → `backend/src/stock/stock-math.ts` (logic) or `backend/prisma/seed.ts` (demo data).
- Add a field to an item/supplier → `schema.prisma`, migrate, update the DTO, update the service, update the frontend type in `stockApi.ts`/`suppliersApi.ts`, update the form component (**and `ItemDetailModal.tsx` if the field should show there**).
- Add a colour/size variant to an inventory → set `hasColor`/`hasSize` on the `InventoryType` row (seed) and add the values on the item (`color`/`size`); the table columns, form fields and detail modal read the flags, so no component changes are needed for an existing inventory.
- Add spare-part maintenance metadata or usage context → same flag pattern: `hasDescription` (+ `description` on Item) and `hasMachineInfo` (+ `machine`/`compatibility`/`manufacturer`/`location`/`criticality` on Item, `machine`/`maintenanceRef`/`employee`/`notes` on OUT usages). Update `stockApi.ts`'s `ApiItem`/`ApiMovement` if you add a column.
- Add finished-product sellable attributes → `hasGender` (+ `gender` on Item), `hasPrice` (+ `price` in DZD) on the `InventoryType` row and seed items — the Sexe/Prix columns, form fields and detail modal read the flags.
- Understand or extend the "units we can't explain" number → quality classes are stored per movement (`Movement.quality`: `"1er"`/`"2ème"`/`"rebut"`); per-product `qualityBreakdown` + `unaccounted` are computed in `stock-math.ts` (`getQualityCounts`/`getUnaccounted`), surfaced in `stock.service.ts`'s `buildItemView`, whitelist/gate in `validateQuality`, and shown in the `Qualité` column (`StockPage.tsx`'s `QualityCell`) and the detail modal's classification cards.
- Supplier orders (place / receive a delivery) → `backend/src/supplier-orders/` (service, `dto/`), seeded demo orders in `prisma/seed.ts`, frontend `lib/supplierOrdersApi.ts` + the three `modules/stock/Supplier*Order*Modal.tsx` files. Remember: an order only moves stock when `POST /supplier-orders/:id/receive` runs, and batch-tracked lines need `batchNumber`/`expiryDate` in the receive body.
- Edit or archive a stock item → `backend/src/stock/dto/update-item.dto.ts`, `stock.service.ts`'s `updateItem`/`setItemArchived`, `StockPage.tsx`'s "Modifier"/"Archiver" row actions (`AddItemModal.tsx` doubles as the edit form when passed an `item`).
- Change what counts as "low stock", "mid", "good", or "expiring soon" → `stock-math.ts` (`getStockStatus`'s `midFactor`, `isLowStock`, `getExpiryStatus`'s `warnDays`); change which lot is "next"/ "recommended" → `getBatchesWithRemaining` (FEFO sort) + `getFifoBatch`/`getRecommendedBatch`.
- Add a new tab → copy `modules/suppliers/` (simplest) or `modules/hr/` (local-only, sub-tabbed) as a template; register it in `components/layout/Sidebar.tsx` and `App.tsx`.
- Give Production/Orders/HR a real backend → §8.2.
- Something about French wording, DZD formatting, dates → `lib/format.ts`.
- CORS / API URL / port issues → `backend/.env` (`CORS_ORIGIN`, `PORT`), `apps/dashboard/.env` (`VITE_API_URL`).

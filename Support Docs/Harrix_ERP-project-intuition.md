# Harrix ERP Factory ERP — Project Intuition & Architecture Plan

This is a living specification: what the system needs to do, and how to build it so it stays maintainable, reusable for future factory clients, and doesn't collapse under its own complexity.

## 1. Context and Problem

**Harrix ERP** is a shoe factory in Algeria currently run entirely manually. The owner (gérant) has no reliable visibility into where materials and finished products actually go — raw materials, work-in-progress, and finished goods are all tracked informally, on paper or by memory.

Core problem: the owner **cannot reconcile finished-product quantities**. Example given: the machine produces 120 units, but a physical count turns up only 110. He wants to know where the missing units went — waste? unrecorded rejects? theft?

A consulting pass on the factory identified **4 separate inventories**:

1. **Produits chimiques** (chemical products) — raw material, feeds directly into production, has a shelf life
2. **La tige des chaussures** (shoe last/rod — a shoe-component raw material) — raw material, feeds directly into production, no shelf life
3. **Pièces détachées des machines** (machine spare parts) — maintenance stock, not a production input, no shelf life
4. **Produits finis** (finished products) — the output, broken into quality/loss categories

## 2. The Real Shape of This Project

This is not "one ERP app with tabs." It is a **small distributed system**: one central app (the source of truth + the gérant's dashboard) plus several lightweight satellite apps, one per department, used by the people who actually do that work on the floor. Each satellite app talks to the central system through an API — it does not have its own separate database of record.

**Why this shape, not a monolith:** the people entering data are not the gérant. A stock worker needs a stripped-down screen to log "used X units of produit chimique Y today" — not the full admin app with every module visible. A production worker needs a screen to log a batch (units made, units rejected, materials consumed) — not access to HR or customer orders. Separating these means:
- Each worker only sees what's relevant to their job — less confusion, less training needed, smaller surface for mistakes
- Each department's screen can be built, tested, and changed independently without risking breaking the others
- The central app stays focused on being the aggregator/dashboard, not a kitchen-sink UI

**How they connect:** every satellite app is a thin client against a central REST (or GraphQL) API. When the stock worker logs usage, that's an API call that writes to the central database and the change is immediately visible to the gérant's dashboard — no manual sync, no batch import.

## 3. System Components

### 3.1 Central App (gérant-facing)
The main dashboard and full administrative view. This is what the factory owner uses to see the macro picture:
- Current stock of every item, across all 4 inventories
- Headcount and HR overview
- Sales performance
- Full drill-down into any department's data

Dashboard should show:
- **Sales statistics** — daily/weekly/monthly, as a graph
- **Best sellers** — top 5 products with prices
- **Taux de marge brut / CA** (gross margin rate over revenue)
- Aggregated stock health across all 4 inventories (e.g. how many items are low/needing reorder)
- Production reconciliation snapshot (produced vs. accounted-for units)

### 3.2 Stock App (satellite, stock worker–facing)
A minimal interface for the person responsible for stock. Lets them:
- View current quantities of items in their inventory
- Log usage (e.g. "used N units of produit chimique X for today's batch")
- Log new stock received (manual entry, or ideally triggered by a supplier order being marked received)
- See reorder alerts for items running low

Each of the 4 inventories is logically separate (separate data models, separate reorder rules) but can share the same stock-worker app if one person manages more than one — or be split by role if the factory divides that work.

### 3.3 Production App (satellite, production floor–facing)
This is the piece that actually solves the owner's core problem. A worker logs each production run/batch with:
- Materials consumed (which chemical batch via FIFO, how much tige des chaussures used) — this decrements the raw material inventories automatically
- Units produced, broken down at the point of production into: 1er choix, 2ème choix, wasted/rejected
- This is what lets the system compute real cost-per-shoe (materials consumed ÷ units produced) and catch the "120 made, 110 found" gap at the source — because every unit is logged as it's produced, not reconciled after the fact from a count

This module is the connective tissue between the two raw-material inventories and the finished-goods inventory. It's arguably the most important piece to get right, since it's the direct answer to why this project exists.

### 3.4 HR App (satellite, RH-responsible–facing)
Lets the HR-responsible person manage:
- Employee records: full name, phone, address, position, starting date, salary (DZD)
- Absences, vacation, sick leave
- Expected hours vs. worked hours vs. leave hours

**Planned future addition:** a time-clock/finger-punch device integration, so punch-in/punch-out events feed worked-hours automatically instead of being entered by hand. Worth designing the HR data model now so this slots in later without a rework — e.g. a generic "time entries" table that manual entry writes to today, and that a punch device could write to later, rather than a single hand-typed "hours worked" field.

### 3.5 Orders & Customers (part of the central app, or a light satellite if a salesperson needs it)
- **Orders list**: Order Number, Date, Customer Email, Shipment Status (Shipped/Pending/Cancelled), Payment Status (Paid/Pending/Cancelled), Total
- **Order detail** (invoice-style): line items with price/quantity, Subtotal, Shipping, Discount, Tax, Total, customer info (email, phone, shipping address)
- **Customers list**: Full name, Email, Date of creation
- **Customer detail**: full order history for that customer

### 3.6 Finished Product Pricing (logic living in the central app / production app)
When a finished product is registered:
- Fields: Name, Quantity, Ref, Color, Size, Gender (M/F), Photo
- **Price (DZD) is auto-suggested**: the user enters fixed + variable costs, sets a desired margin, and the system computes the sale price. This gives the owner a real-time view of his margin position per product.

## 4. Design Constraints Carried From the Brief

- The 4 inventories must **never be merged into one generic screen** — each stays its own module/view, even though they may share a common underlying data shape.
- Chemical products use **FIFO** — the system must surface which batch to use next based on entry date, because of expiry risk.
- The other two raw-material/maintenance inventories (tige des chaussures, pièces détachées) have no expiry — simpler stock tracking, no FIFO ordering needed.
- Currency throughout is DZD.
- UI language: French for factory-floor-facing screens (stock, production, HR) makes sense given the domain vocabulary already in French (produits chimiques, tige des chaussures, 1er/2ème choix). The central dashboard can be French too, or bilingual if useful later.

## 5. Recommended Approach: Build Small, Don't Adopt a Big Base

You explicitly don't want "a super sophisticated ERP" — you want something solid, easy to understand, and easy to extend to future factory clients. Given that, here's the honest assessment:

**Don't build this on top of an existing full ERP platform (Odoo, ERPNext, Tryton, Dolibarr, etc.), and here's why, even the ones with good French support:**

- **Odoo** and **ERPNext** are large, opinionated frameworks with their own ORMs, module systems, and steep learning curves. You'd spend more time fighting their conventions and data model than building your actual features. They're built for "configure a huge generic system," not "small custom app with 4 satellite apps talking to one API."
- **Dolibarr** is the most genuinely lightweight and French-native option of the bunch (built by a French team, ships French as a first-class language, PHP/MySQL, module toggle system) — but it's still architected as **one monolithic web app with server-rendered pages**, not as a central API serving multiple thin clients. Retrofitting your multi-app/API vision onto it means fighting its architecture from day one.
- All of these are GPL-licensed, which has implications if you ever want to package and resell a customized version to other factories without disclosing your source.
- The custom logic this project actually needs — FIFO on one inventory only, the finished-goods 1er/2ème/wasted/stolen breakdown, cost-plus pricing suggestion, and the production-batch reconciliation flow — **doesn't exist in any of these platforms out of the box**. You'd be building all of it as custom modules anyway. The "time saved" from adopting a big base turns out to be smaller than it looks, and the complexity cost is much higher.

**What a senior dev would actually do here: build a small, deliberately boring custom stack.**

- **One backend, one database, one API** — this is your source of truth. Doesn't need to be fancy: a straightforward REST API (or GraphQL if your agent-driven workflow prefers it) backed by a relational database (PostgreSQL is a safe, boring, well-supported choice). Structure it by domain: a `stock` module, a `production` module, an `hr` module, a `sales` module — each with its own tables/endpoints, but all living in the same backend codebase and database, at least initially. This gets you separation of concerns without the operational overhead of running four separate backend services.
- **Multiple frontends, one per audience** — the gérant dashboard, the stock app, the production app, the HR app — each a separate small frontend (could even be separate simple web apps, or separate "views" within one app gated by role/login if that's simpler to deploy and maintain). Each only calls the API endpoints it needs.
- **Auth/roles from day one** — even simply, a login system where a "stock worker" role only gets access to stock endpoints, "production worker" only to production endpoints, etc. This is what actually enforces the separation you want, not just UI hiding.
- **Keep each domain module genuinely independent internally** — the stock module shouldn't reach directly into HR's data, and vice versa. If the dashboard needs data from multiple modules, it calls multiple endpoints (or one aggregating endpoint you build specifically for the dashboard) rather than modules querying each other's tables directly. This is what will let you swap out, extend, or reuse a single module for the next factory client without dragging the whole system along.
- **Design the data model to be factory-agnostic where reasonable** — e.g. don't hardcode "4 inventories" as a fixed enum if you can help it; model it as "inventory types" as data, so a future client with 3 or 6 inventories doesn't need a schema rewrite. Same idea for production steps, product categories, etc. This is the actual mechanism that makes this "easily customizable for future projects and factories," not picking a bigger platform.

**In short:** the right base for this project isn't an existing ERP — it's a clean, modular custom backend + a handful of purpose-built small frontends, wired together over a well-defined internal API. That's what actually matches everything you described: separated departments, worker-specific input apps, one gérant view, and easy reuse for the next factory.

## 6. Open Questions / Gaps Still Worth Resolving

- **Roles/permissions**: who exactly gets access to what? (stock worker, production worker, RH-responsible, gérant — any others, e.g. a sales/order person?)
- **Suppliers**: referenced as triggering automatic stock entries but not yet defined as their own entity/module — worth deciding if suppliers need their own list/detail views.
- **Finger-punch device**: no specific hardware chosen yet — worth flagging early since it affects how the HR time-entry data model should be shaped now.
- **Deployment**: where will this actually run — on factory premises, cloud-hosted, accessed via local network only? This affects how "web app" the satellite apps need to be vs. whether a local network setup is acceptable.
- **Number of concurrent factory clients expected soon**: matters for how much effort to put into the "factory-agnostic" data modeling now vs. later.

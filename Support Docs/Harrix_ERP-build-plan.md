# Harrix ERP ERP — Build Plan

A build order in plain language. Each phase produces something you can open, click, and show to the gérant — and no phase is finished until a real person at the factory can use it.

**11 phases · Central app + 4 satellites · Currency: DZD · UI: Français**

---

## How to read this

The phases are in **dependency order, not importance order**. Each one only needs things the phases above it already built. That matters: if you build the dashboard before the stock system, the dashboard has nothing to show.

Every phase ends with a **"Done when"** line. That is the test. If you cannot do the thing described in that line, the phase is not finished, no matter how much code exists.

> **The one thing this system exists for:** the machine makes 120 pairs and only 110 are found. **Phase 6** is where that gets solved. Everything before it is groundwork for that moment, and everything after it builds on the numbers it produces. If you have to cut scope, cut from the end, never from Phase 6.

---

## Phase 0 — Decisions to make before any code

These five answers change how everything else gets built. Guessing wrong here means rework later, so settle them with the gérant first.

1. **Where does it run?** A computer inside the factory (works without internet, but only reachable on-site) or a server on the internet (reachable from home and from phones, but the factory needs reliable internet). This decides everything about setup and backups.
2. **Who logs in, and what can each person touch?** Confirmed so far: gérant, stock worker, production worker, RH. Is there also a salesperson for orders and customers? Anyone else?
3. **Phones or computers on the floor?** A production worker logging a batch on a phone needs big buttons and few fields. On a desktop you can show more at once. Pick one as the main target.
4. **Do suppliers need their own list?** Right now they are mentioned only as "stock arrived from someone." If you want purchase orders and supplier history, say so now — it adds a small module in Phase 4.
5. **How many factories, how soon?** If Harrix ERP is the only client for the next year, build for Harrix ERP and generalise later. If a second factory is already interested, the data model needs to be flexible from Phase 4 onward.

---

## Phase 1 — Set up the workshop

*Nothing visible yet. This is getting the tools on the bench so every later phase is fast instead of painful.*

- [ ] **Pick the stack and write it down** — Backend + database + frontend framework. Boring and popular beats clever; you want answers when you search for a problem.
- [ ] **Create the project folders: one backend, one shared design kit, one folder per app** — Central app, stock app, production app, HR app. Separate from day one is easy; separating them later is a rewrite.
- [ ] **Put everything in version control (Git)** — This is your undo button for the whole project. Without it, one bad afternoon can cost a week.
- [ ] **Get the database running on your machine** — Empty is fine. You just need to prove it starts and the backend can talk to it.
- [ ] **Make one test endpoint and call it from a browser** — The "hello" moment. It proves the wiring works before you build anything real on top of it.
- [ ] **Set up automatic database backups now, not later** — A factory's stock history is not something you can reconstruct from memory.

**Done when:** you can start the whole thing with one command and see a page that says the backend is alive.

---

## Phase 2 — Who is allowed in

*Login, roles, and permissions. Built second because every screen after this has to ask "who is this person?"*

- [x] **Build the users table: name, login, password, role** — Passwords stored scrambled (hashed), never as plain text. Non-negotiable.
- [x] **Define the roles: gérant, stock, production, RH (+ sales if Phase 0 said yes)** — Store roles as data in a table, not written into the code; the next factory will have different job titles.
- [x] **Build the login screen in French** — Connexion, mot de passe, "identifiants incorrects". One screen, shared by all four apps.
- [x] **Enforce permissions on the backend, not just by hiding buttons** — Hiding a button stops an honest mistake. Only the backend stops someone who is curious.
- [x] **Give the gérant a screen to create and deactivate users** — Workers leave. He needs to cut access himself without calling you.
- [x] **Log who did what, and when** — One table recording every change. When the numbers disagree, this is the only thing that settles it.

**Done when:** a stock worker logs in and physically cannot reach HR data, even if they type the address by hand.

> **Done 2026-08-28.** Verified by calling the API directly with a magasinier token: `GET /users`, `GET /audit`, `POST /stock/items` all return 403; `GET /stock/items` returns 200. Deactivating an account kills its existing session on the next request. See PROJECT_CONTEXT.md §5 (Role/User/AuditEntry), §6 (permission column) and §9 (what is still missing).

---

## Phase 3 — The window (the app shell)

*The frame every screen lives inside: menu, header, page layout, the look. Build it once, reuse it four times.*

- [ ] **Design the shell: sidebar menu, top bar with the logged-in name, main content area** — The menu shows only what this person's role allows.
- [ ] **Build a small shared kit of parts: buttons, forms, tables, search boxes, date pickers** — The single biggest time-saver in the project. Build the table once and every module gets it free.
- [ ] **Decide and lock the French wording for common actions** — Ajouter, Modifier, Supprimer, Enregistrer, Annuler, Rechercher. Consistency here is what makes it feel professional.
- [ ] **Make DZD amounts and dates format the same way everywhere** — One shared formatter. Otherwise you will end up with four different date styles in four modules.
- [ ] **Build the standard loading, empty, and error states** — "Aucun résultat" and a clear error message beat a blank white screen that makes workers think it is broken.
- [ ] **Check it on the actual device the workers will use** — Borrow the real phone or sit at the real factory PC. Screen sizes surprise people.

**Done when:** you can log in as each of the four roles and see a proper-looking app with the right menu — even though the pages inside are still empty.

---

## Phase 4 — The stock system

*Four inventories, four separate screens, one shared engine underneath. The first phase that delivers real value to the factory.*

- [ ] **Model "inventory types" as rows in a table, not as four fixed things in the code** — Harrix ERP has 4. The next factory might have 3 or 6. This one decision is what makes the system resellable.
- [ ] **Build the item record: name, reference, unit (kg, litre, pièce), current quantity, reorder threshold** — Shared shape across all four inventories, with extra fields only where a specific inventory needs them.
- [ ] **Build the movements table — every in and out, and never edit a quantity directly** — Quantity is always calculated from the movements. This is the rule that lets you answer "how did we get to this number?"
- [ ] **Screen 1 — Produits chimiques, with batches and expiry dates** — Each delivery is its own batch with its own date. The screen shows which batch to use next (FIFO — oldest first) and flags anything expiring soon.
- [ ] **Screen 2 — Tige des chaussures** — Simpler: no batches, no expiry. Just quantity in, quantity out.
- [ ] **Screen 3 — Pièces détachées des machines** — Maintenance stock, not a production input. Never touched automatically by production.
- [ ] **Screen 4 — Produits finis (the shell only; filled in Phase 5)** — Set it up here so the production module has somewhere to put finished pairs.
- [ ] **Build "log a reception" — new stock arriving** — Item, quantity, date, supplier, and for chemicals: batch number and expiry.
- [ ] **Build "log a usage" — stock going out by hand** — For anything used outside a production run. Production runs will do this automatically in Phase 6.
- [ ] **Build low-stock alerts** — Each item has a threshold; when it drops below, it appears in an alerts list for the stock worker and on the gérant's dashboard.
- [ ] **Build the item history view** — Every movement for one item, newest first, with who recorded it. This is the screen that settles arguments.
- [ ] **Load real starting quantities with the stock worker sitting next to you** — Do a real physical count on day one. If the starting numbers are wrong, every number after them is wrong too.

**Done when:** the stock worker uses it for a full week without paper, and the quantities on screen still match a surprise physical count.

---

## Phase 5 — The product catalogue and price calculator

*Defining what a shoe model is, so production has something to produce into and orders have something to sell.*

- [ ] **Build the product record: nom, référence, couleur, taille, genre (H/F), photo** — Decide now whether one row means one model or one model-colour-size combination. It changes how stock counting works; model + colour + size is usually right for a shoe factory.
- [ ] **Build the photo picker** — Choose from device or take a photo, preview before saving, shrink the file automatically. Workers will upload 4 MB phone photos otherwise.
- [ ] **Build the quality categories as data: 1er choix, 2ème choix, rebut** — Stored as rows, not fixed in code; a future factory may grade differently.
- [ ] **Build the cost inputs per product: fixed costs and variable costs in DZD** — Materials, labour, overhead. Keep it simple; the gérant can refine the categories once he sees it working.
- [ ] **Build the price suggestion: enter a target margin, get a suggested sale price** — Show the arithmetic on screen. He must be able to see why it suggested that number, or he will not trust it.
- [ ] **Let him override the suggested price, and keep both** — Real prices bend to the market. Storing suggested and actual side by side is what shows his true margin.
- [ ] **Build the catalogue list with photos, search, and filters by colour, size, gender** — This is also what the orders module will use to pick line items.

**Done when:** the gérant adds a real shoe model with a photo, types his costs and a target margin, and the price it suggests matches what he would have worked out on paper.

---

## Phase 6 — Production (the reason this project exists)

*Logging each production run so raw materials go down, finished pairs go up, and missing units are caught as they happen rather than discovered at the count.*

- [ ] **Sit on the production floor and watch a real run before writing anything** — The screen has to match what actually happens, in the order it happens. Everything else in this phase depends on getting this right.
- [ ] **Build the production run record: date, product, worker, machine or line, shift** — One run = one batch of one model. This is the unit everything else is measured against.
- [ ] **Build the materials-consumed section of the run form** — Which chemicals and how much, which tige and how much. The chemicals list is pre-sorted oldest batch first, so FIFO happens by default.
- [ ] **Make saving a run automatically decrease the raw material stock** — The stock worker no longer logs production usage by hand. One action, both books updated, no chance to forget.
- [ ] **Build the output section: 1er choix / 2ème choix / rebut, counted at the machine** — Three separate number fields. The worker counts as pairs come off the line, not at the end of the day from memory.
- [ ] **Show the reconciliation live, while the worker is still on the form** — "Machine made 120. You entered 100 + 8 + 5 = 113. 7 unaccounted." Right there on screen, before saving.
- [ ] **Require a reason for any gap before the run can be saved** — Casse, vol suspecté, erreur de comptage, autre. This field is the actual answer to "where did the 10 pairs go" — it turns a mystery into a monthly report.
- [ ] **Make saving a run automatically increase finished-goods stock** — 1er and 2ème choix become sellable stock. Rebut is recorded but never sellable.
- [ ] **Compute the real cost per pair for each run** — Materials actually consumed ÷ pairs actually produced. Compare it against the estimated cost from Phase 5; the gap between them is where the money leaks.
- [ ] **Build the runs history: filter by date, product, worker, machine** — Also the screen that shows whether losses cluster around one shift, one machine, or one person.
- [ ] **Make the whole form usable with dirty hands in under a minute** — Big touch targets, number pads, sensible defaults, minimum typing. If it is slow, workers stop using it and the whole system dies here.

**Done when:** a worker logs a real run in under a minute, the two raw material stocks drop by the right amounts on their own, finished stock rises, and any gap is on record with a stated reason.

---

## Phase 7 — Customers and orders

*The selling side. It draws stock down out of finished goods and feeds the revenue figures on the dashboard.*

- [x] **Build the customer record: nom complet, email, téléphone, adresse, date de création** — Plus a customer detail page showing their full order history.
- [x] **Build the order record: numéro, date, client, statut d'expédition, statut de paiement, total** — Shipment: expédié / en attente / annulé. Payment: payé / en attente / annulé. Two separate statuses — an order can be paid but not yet shipped.
- [x] **Build the order lines: product, quantity, unit price, line total** — Prices are copied onto the order at the moment it is created, not looked up live; otherwise last year's invoices change when you update a price.
- [x] **Build the invoice view: sous-total, livraison, remise, taxe, total, customer details** — Make it print cleanly to A4. He will want paper copies.
- [x] **Make marking an order shipped reduce finished-goods stock** — The other half of Phase 6's increase. Now finished stock has a full in-and-out story.
- [x] **Build the orders list with search and status filters** — Sorted newest first, with the two statuses as coloured labels so the pending ones stand out.
- [x] **Warn when an order exceeds available stock** — A warning, not a block; factories take orders they will produce next week. But he should know.

**Done when:** a real order goes in, prints as a proper invoice, and marking it shipped drops finished stock by exactly the right amount.

---

> **Done 2026-08-28.** Backend module + §15–19 frontend. Shipping is one transaction. Stock shortage is a *warning* on the order (`stockWarnings` on every pending order) and a hard error only at ship time, per the bullet above. **Purchasing (§13–14) was built alongside it** — supplier detail, purchase orders, and receiving that records lot + expiry for chemicals — though the build plan never had a phase for it. Not done: product catalogue fields on order lines (image/colour/size), payments ledger, returns/credit notes — see PROJECT_CONTEXT.md §9.

---

## Phase 8 — HR

*Employees, absences, and hours. Deliberately built to accept a fingerprint clock later without any rework.*

- [ ] **Build the employee record: nom complet, téléphone, adresse, poste, date d'embauche, salaire (DZD)** — Keep it locked to the RH role and the gérant. Salaries are the most sensitive data in the system.
- [ ] **Build one generic "time entries" table — not a hand-typed hours field** — The most important decision in this phase. Every entry records employee, start, end, and where it came from (typed by hand, or from a device). When you buy the fingerprint clock, it writes into the same table and nothing else changes.
- [ ] **Build manual hour entry for RH, writing into that same table** — What gets used until the clock exists.
- [ ] **Build absences: congé, maladie, absence injustifiée, with dates and a reason** — Stored as date ranges, so a five-day leave is one entry and not five.
- [ ] **Build the hours summary: heures prévues vs. travaillées vs. congé** — Per employee, per month. The screen RH actually opens every day.
- [ ] **Build the monthly attendance sheet, exportable** — What payroll gets calculated from, whether or not payroll itself lives in this system.
- [ ] **Write down the fingerprint-clock plan even without buying one yet** — Note what the device would need to send and how it would reach the system. Ten minutes now, a saved week later.

**Done when:** RH runs a full month in the system and the hours summary matches their paper records.

---

## Phase 9 — The gérant's dashboard

*Built almost last on purpose — a dashboard is only as good as the data underneath it, and now that data exists.*

- [ ] **Build one backend endpoint that assembles the whole dashboard** — One request, not fifteen. Keeps the page fast and keeps the modules from reaching into each other's data.
- [ ] **Sales chart: daily, weekly, monthly** — Revenue over time with a period switcher. The first thing he will look at.
- [ ] **Top 5 best sellers with their prices** — Ranked by units or by revenue; ask him which he means, they give different answers.
- [ ] **Taux de marge brut and chiffre d'affaires** — Computed from the real costs recorded in Phase 6, not from the estimates in Phase 5. That difference is the whole point.
- [ ] **Stock health across all four inventories** — How many items are low, how many chemical batches expire this month. Each number clicks through to the list behind it.
- [ ] **The reconciliation panel: produced vs. accounted for, this month** — Total pairs made, total accounted for, the gap, and the gap broken down by stated reason. The single most valuable box on the screen.
- [ ] **Headcount and attendance summary** — Employees, present today, on leave. Small block, top corner.
- [ ] **Make every number clickable through to its detail** — A dashboard that raises questions it cannot answer is worse than no dashboard.
- [ ] **Sit with the gérant and cut whatever he does not look at** — Half of what you built will not matter to him. Removing it makes the rest readable.

**Done when:** the gérant opens one screen in the morning and knows what happened yesterday without asking anyone.

---

## Phase 10 — Putting it into the factory

*Where most custom systems quietly die. Plan real time for this phase — it is not an afternoon.*

- [ ] **Install it wherever Phase 0 decided, with real accounts for real people** — No shared logins. "Everyone uses the admin account" destroys the audit trail you built in Phase 2.
- [ ] **Verify backups by actually restoring one** — An untested backup is not a backup. Do the restore before you need it.
- [ ] **Load real opening data: stock counts, employees, products, existing customers** — A day of data entry that everything afterwards depends on. Do it carefully.
- [ ] **Train each worker on their own screen only, 15 minutes each** — Never show the stock worker the whole system. Show them their three buttons.
- [ ] **Run paper and system in parallel for two weeks** — The safety net. Where they disagree, you find the bugs and the misunderstandings.
- [ ] **Watch people use it and fix what slows them down** — Every extra tap on the production form is a reason to go back to paper.
- [ ] **Write a one-page cheat sheet per role and pin it near the screen** — In French. What to click for the three things that person does every day.
- [ ] **Agree what happens when it breaks** — Who to call, and what workers do meanwhile — usually: write it on paper and enter it later.

**Done when:** paper is put away and nobody asks to bring it back.

---

## Phase 11 — Making it sellable to the next factory

*Only after Harrix ERP is running well. Generalising before you have one happy client means guessing at needs you have never seen.*

- [ ] **Go find everything still hardcoded as "Harrix ERP"** — Factory name, logo, the four inventory names, the quality grades, DZD. Move each one into settings.
- [ ] **Build a setup screen for a new factory** — Name, currency, inventory types, quality grades, roles. Turns a two-week custom job into an afternoon.
- [ ] **Decide: a separate installation per client, or one system serving many** — Separate is far simpler and safer to start with. One system serving many is a real architectural project — only worth it past several clients.
- [ ] **Write the installation guide for yourself** — You will forget. Six months from now you will thank yourself for this page.
- [ ] **Package the Harrix ERP data as a demo you can show live** — Realistic numbers, no real customer names. Far more convincing than slides.

**Done when:** you can stand up a working system for a new factory in a day, using only the setup screen.

---

## Words you will hear, in plain language

| Term | What it actually means |
| --- | --- |
| **Backend** | The part nobody sees. It holds the rules and talks to the database. All four apps share this one. |
| **Frontend** | The screens people click. You have four of them: gérant, stock, production, HR. |
| **Database** | The filing cabinet. Everything the factory records lives here, permanently. |
| **API** | The counter between the screens and the backend. The screen asks, the backend answers. Nothing skips the counter. |
| **Endpoint** | One specific request the backend can answer — "give me the chemicals list", "save this run". |
| **FIFO** | First in, first out. Use the oldest batch of chemicals first, so nothing expires on the shelf. |
| **Data model** | The shape of your filing cabinet — what a product is, what a run is, what connects to what. Expensive to change later, which is why Phases 4–6 spend so much care on it. |
| **Movement** | One line saying stock went in or out. Quantities are always added up from movements, never typed in directly. |
| **Role** | A job title that decides what someone can see and do. Enforced by the backend, not just by hiding menu items. |
| **Audit log** | The record of who changed what and when. Your only real defence when two numbers disagree. |

---

## Four calls that are cheap today and expensive later

If you remember nothing else from this page, remember these.

1. **Stock quantity is always calculated from movements**, never edited directly. It is the only way to ever answer "how did we get to this number?"
2. **The gap-reason field in Phase 6 is not optional.** Without it you know units are missing but never why, and the system answers the gérant's question with a shrug.
3. **HR hours go into a generic time-entries table from day one.** A hand-typed "hours worked" field means rebuilding HR when the fingerprint clock arrives.
4. **The four inventories are rows in a table, not four things written into the code.** This single choice is the difference between a Harrix ERP app and a product you can sell.

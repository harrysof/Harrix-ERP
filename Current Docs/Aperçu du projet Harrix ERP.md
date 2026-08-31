# Harrix ERP — FACTORY MANAGEMENT SYSTEM
## Complete Business & Product Vision

## 1. What is Harrix ERP?

Harrix ERP is a complete digital management system designed for a manufacturing factory that currently relies heavily on traditional, manual processes.

The purpose of Harrix ERP is to give the factory owner and managers a clear view of what is happening inside the factory:

- What materials are available?
- Where did materials go?
- What entered production?
- What was consumed?
- What was produced?
- What was sold?
- What was wasted?
- What is missing?
- What should be reordered?
- How profitable is each product?
- What is happening with employees?
- What is happening with customers and suppliers?

Harrix ERP should connect these activities into one coherent system so that information does not remain fragmented between notebooks, spreadsheets, invoices, conversations, and manual calculations.

The central idea is:

> **Harrix ERP should make every important factory activity visible, understandable, and traceable.**

---

# 2. THE FACTORY'S FOUR INVENTORIES

The factory has four different inventories.

They should remain separate because each one has a different purpose and different management rules.

## 2.1 Chemical Products

Chemical products are raw materials that directly enter the production process.

They are special because some chemicals have a limited lifetime and can expire.

Harrix ERP should therefore help the factory know:

- how much chemical stock exists
- which chemical lots are available
- which lot should be used first
- which chemicals are close to expiration
- which chemicals are expired
- how much has been purchased
- how much has been consumed
- how much remains
- when new stock should be ordered

The system should prioritize **FEFO — First Expired, First Out** for chemicals with expiration dates.

This means the chemical lot with the earliest valid expiration should normally be used first.

FIFO can be used as a fallback when expiration information is not applicable.

### Chemical inventory information

Each chemical item should have:

- Item ID
- Photo
- Type
- Name
- Lot number
- Supplier
- Quantity purchased
- Quantity used
- Quantity remaining
- Received date
- Expiration date
- Status
- Reorder level
- Reorder required

### Chemical statuses

Harrix ERP should make stock condition easy to understand:

- Good
- Mid
- Low

It should also clearly communicate expiration conditions:

- Safe
- Expiring Soon
- Expired

### Chemical detail

Clicking a chemical should show:

- full information
- photo
- stock
- lots
- supplier
- received dates
- expiration dates
- current quantity
- quantity used
- quantity remaining
- reorder information
- consumption history
- stock movement history
- recommended next lot to consume

---

# 3. SHOE UPPERS

The second inventory is the shoe-upper inventory.

These materials are raw materials used directly in production but normally do not have a lifetime/expiration issue.

Harrix ERP should therefore manage them as regular inventory.

### Shoe-upper information

- Item ID
- Photo
- Type
- Name
- Reference/model
- Color where relevant
- Size where relevant
- Supplier
- Quantity purchased
- Quantity used
- Quantity remaining
- Status
- Reorder level
- Reorder required

Stock can enter the inventory through:

- manual addition
- supplier orders
- supplier delivery/receiving

### Shoe-upper detail

Clicking an item should show:

- all item information
- image
- current stock
- supplier
- reorder information
- stock movement history
- usage/consumption history
- related production activity

---

# 4. MACHINE SPARE PARTS

The third inventory is machine spare parts.

These parts are kept so that when a machine fails, the factory can replace the damaged component quickly instead of waiting for a new purchase.

The purpose is not production consumption in the normal sense. It is maintenance continuity.

### Spare-part information

- Item ID
- Photo
- Type
- Name
- Part number
- Description
- Supplier
- Quantity purchased
- Quantity used
- Quantity remaining
- Status
- Reorder level
- Reorder required

Useful additional information:

- Machine
- Machine name
- Compatibility
- Manufacturer
- Location
- Criticality

### Spare-part usage

When a spare part is used, Harrix ERP should record:

- part
- quantity
- date
- machine
- reason
- maintenance reference
- employee/user
- notes

### Spare-part detail

Clicking a part should show:

- complete information
- image
- stock
- reorder status
- machine compatibility
- supplier
- usage history
- movement history

---

# 5. FINISHED PRODUCTS

The fourth inventory contains what the factory actually produces.

Finished products are different from raw materials because they become products that can eventually be sold.

Each finished product should contain:

- Reference
- Name
- Photo
- Color
- Size
- Gender (M/F)
- Quantity
- Price in DZD

The finished-product inventory must also classify production quality.

## Finished-product categories

### 1st Choice

Normal products that meet the factory's primary quality standard.

### 2nd Choice

Products that do not meet the primary standard but can potentially be sold as lower-grade products.

### Wasted Units

Products that cannot be sold and are classified as waste.

### Unknown / Unaccounted Units

Units that were expected to exist but cannot be explained.

Unknown units are extremely important because they are directly related to the owner's main problem: not being able to explain where all produced units went.

---

# 6. THE MAIN FACTORY PROBLEM — PRODUCTION TRACEABILITY

Harrix ERP's most important operational purpose is to make production traceable.

Example:

A machine produces:

**120 units**

The factory later finds:

- 95 first-choice units
- 8 second-choice units
- 7 wasted units

That accounts for:

**110 units**

There are:

**10 unknown units**

Harrix ERP must automatically calculate this.

### Formula

**Unknown Units = Expected Output - First Choice - Second Choice - Waste**

In this example:

120 - 95 - 8 - 7 = 10 unknown units

The system should clearly display the variance and require attention/investigation.

The objective is not to automatically accuse anyone of theft.

Harrix ERP should use neutral operational language such as:

- Unknown
- Unaccounted
- Production Variance
- Investigation Required

---

# 7. PRODUCTION BATCHES

Production should be organized around production batches.

Each production batch represents a specific production activity.

A batch should contain information such as:

- Batch ID
- Date
- Product
- Machine
- Expected quantity
- Supervisor
- Operator
- Shift
- Start time
- End time
- Notes
- Status

A production batch connects raw materials to finished products.

## Production flow

Raw Materials

↓

Chemical consumption

+

Shoe-upper consumption

↓

Production Batch

↓

Finished Output

↓

1st Choice

+

2nd Choice

+

Waste

+

Unknown

This relationship is central to Harrix ERP.

---

# 8. PRODUCTION MATERIAL CONSUMPTION

Harrix ERP should show what raw materials were consumed for each production batch.

For chemicals:

- chemical
- lot
- quantity consumed

For shoe uppers:

- material
- quantity consumed

This allows the factory to understand exactly which materials went into which production activity.

Chemical consumption should respect the recommended FEFO order whenever possible.

---

# 9. PRODUCTION MONITORING

Harrix ERP should provide a production monitoring area showing:

- production batches
- product being produced
- machine
- expected output
- actual accounted output
- first choice
- second choice
- waste
- unknown
- batch status

Useful filters include:

- date
- product
- machine
- supervisor
- batch status

---

# 10. WASTE AND LOSS MANAGEMENT

Harrix ERP should make production losses visible instead of hiding them inside a final quantity.

Important measurements include:

- total wasted units
- waste rate
- second-choice rate
- unknown rate
- yield rate
- losses by product
- losses by machine
- losses by period
- losses by production batch

This gives management a way to identify recurring production problems.

---

# 11. INVENTORY MANAGEMENT

Each inventory should provide:

- item list
- search
- filtering
- sorting
- item details
- add
- edit
- delete/archive
- stock movements
- current stock
- reorder information

The system should make stock levels easy to understand.

### Reorder logic

Every managed inventory item should have a reorder level.

Harrix ERP should determine:

**Reorder Required: Yes / No**

based on the actual remaining quantity and the item's reorder rule.

---

# 12. STOCK MOVEMENTS

Harrix ERP should maintain a history of stock changes.

Examples:

- stock received
- stock purchased
- stock consumed
- stock produced
- stock sold
- stock returned
- stock adjusted
- stock wasted
- spare part used for maintenance
- correction

Every important movement should be traceable.

A movement should communicate:

- what item changed
- how much changed
- when it changed
- why it changed
- who recorded it
- which related activity caused it

The objective is that a manager can ask:

> "Why is the stock now 240?"

and follow the history to understand how it reached that number.

---

# 13. SUPPLIERS

Harrix ERP should maintain a complete supplier section.

Supplier information can include:

- Supplier ID
- Company name
- Contact person
- Email
- Phone
- Address
- Status
- Registration information where needed
- Notes

The supplier should be connected to the items they provide.

A supplier detail page should show:

- supplier information
- supplied materials
- purchase history
- purchase orders
- deliveries/receipts
- total purchasing activity
- outstanding commitments

---

# 14. PURCHASE ORDERS

The supplier process should follow the logical relationship:

**Supplier → Purchase Order → Delivery/Receiving → Inventory**

Purchase orders should contain:

- Purchase Order Number
- Supplier
- Date
- Expected delivery
- Items
- Quantity
- Unit cost
- Total
- Status

Possible statuses:

- Draft
- Submitted
- Approved
- Partially Received
- Received
- Cancelled

When materials are received, inventory should increase.

For chemicals, receiving should also record the relevant lot and expiration information.

---

# 15. SALES AND CUSTOMER ORDERS

Harrix ERP should contain a complete order section.

An order list should show:

- Order Number
- Date
- Customer Email
- Shipment Status
- Payment Status
- Total

Shipment status:

- Pending
- Shipped
- Cancelled

Payment status:

- Paid
- Pending
- Cancelled

---

# 16. ADD ORDER

There must be a clear way to create a new order.

An order should allow the user to select:

- customer
- products
- quantities
- unit prices
- discount
- shipping
- tax
- payment status
- shipment status
- notes

The system should calculate:

- Subtotal
- Shipping
- Discount
- Tax
- Total

The user should not have to manually calculate these totals.

---

# 17. ORDER DETAILS

Clicking an order should open a complete order/invoice-style view.

The page should show:

## Items

- product
- image
- reference
- color
- size
- quantity
- price
- line total

## Totals

- subtotal
- shipping
- discount
- tax
- total

## Customer information

- full name
- email
- phone

## Shipping information

- address
- city
- state/province
- country
- postal code

## Status

- payment status
- shipment status

The page should also provide appropriate actions such as:

- edit
- print
- update status
- cancel when allowed
- archive/delete when appropriate

---

# 18. CUSTOMERS

Harrix ERP should maintain a customer database.

Customer list should show:

- Full Name
- Email
- Phone
- Status
- Created At

There must be an:

**Add Customer**

action.

Customer creation should allow:

- full name
- email
- phone
- status
- address
- notes

---

# 19. CUSTOMER DETAILS

Clicking a customer should show:

## Profile

- full name
- email
- phone
- status
- creation date
- address

## Order History

Show:

- order number
- date
- status
- total

Useful customer summaries:

- total number of orders
- total purchased
- outstanding balance where relevant

---

# 20. EMPLOYEES / HR

Harrix ERP should have a dedicated people/HR section.

Employee list should show:

- Employee ID
- Full Name
- Phone Number
- Position
- Starting Date
- Salary in DZD
- Employment Status

There should be an:

**Add Employee**

action.

---

# 21. EMPLOYEE DETAILS

Clicking an employee should show a complete employee profile.

## Personal information

- full name
- photo if desired
- phone
- email if useful
- address
- position
- starting date
- employment status

## Compensation

- salary in DZD
- salary history where useful

## Attendance

- expected hours
- worked hours
- absent hours
- leave hours

## Leave

- vacation
- sick leave
- other approved leave

## Activity

- recent attendance
- recent leave
- important HR changes

---

# 22. ATTENDANCE

Attendance management should track:

- employee
- date
- expected hours
- worked hours
- absence
- leave
- overtime where applicable
- notes

Harrix ERP should be able to summarize employee attendance by period.

---

# 23. LEAVE AND VACATION

Leave management should support:

- Vacation
- Sick Leave
- Personal Leave
- Other Approved Leave

Each leave record should include:

- employee
- type
- start date
- end date
- duration
- status
- approval information
- notes

Statuses may include:

- Pending
- Approved
- Rejected
- Cancelled

---

# 24. COST MANAGEMENT

Harrix ERP should track factory costs because inventory and production information is not enough to understand profitability.

Costs should be grouped into logical categories.

## Raw-material costs

- chemicals
- shoe uppers
- other production inputs

## Direct labor

Production-related labor costs.

## Variable production costs

Examples:

- consumables
- utilities related to production
- packaging
- other variable production expenses

## Fixed costs

Examples:

- rent
- fixed salaries
- insurance
- equipment depreciation
- administration

Each cost record should contain:

- Cost ID
- Category
- Description
- Amount in DZD
- Date
- Period
- Supplier/payee where applicable
- Product or production allocation where applicable
- Notes

---

# 25. PRODUCT COSTING

Costing must be related to a specific finished product.

The user should first select:

**Product**

Then enter or review the costs associated with producing that product.

Possible inputs:

- raw material cost
- labor cost
- variable production cost
- fixed cost allocation
- other costs
- production quantity

Harrix ERP should calculate:

**Total Cost**

and:

**Unit Cost = Total Cost / Quantity**

Example:

Total cost = 132,000 DZD

Quantity = 120

Unit cost = 1,100 DZD

---

# 26. SUGGESTED SELLING PRICE

Harrix ERP should help the owner determine an appropriate selling price.

The user selects a product.

The system calculates the unit cost.

The user defines a desired gross margin.

Then:

**Suggested Selling Price = Unit Cost / (1 - Gross Margin)**

Example:

Unit Cost = 1,100 DZD

Desired Margin = 30%

Suggested Selling Price = 1,571.43 DZD

The owner should be able to see:

- Unit Cost
- Desired Margin
- Suggested Price
- Current Price
- Difference

The suggested price should help the owner understand his position, but the final selling price can be manually adjusted by an authorized user.

---

# 27. GROSS MARGIN

Harrix ERP should make profitability understandable.

Core figures:

**Revenue**

**Cost of Sales**

**Gross Profit**

**Gross Margin %**

Formula:

**Gross Profit = Revenue - Cost of Sales**

**Gross Margin % = Gross Profit / Revenue × 100**

The system should be able to show this overall and, where possible, by product.

---

# 28. MAIN DASHBOARD

The dashboard is the owner's main overview.

It should summarize the entire factory.

## Sales Statistics

A graph with:

- Daily
- Weekly
- Monthly

It should show real sales/revenue activity.

## Best Sellers

Top five products with:

- product
- image
- price
- quantity sold
- revenue if useful

## Financial overview

Show:

- Revenue
- Gross Profit
- Gross Margin / Revenue

## Production overview

Show:

- production output
- waste
- unknown units
- production variance
- yield

## Inventory overview

Show:

- low-stock items
- reorder required
- expiring chemicals
- expired chemicals

Important alerts should be immediately visible.

---

# 29. DASHBOARD SHOULD REFLECT THE ENTIRE SYSTEM

The dashboard is not a separate data source.

It summarizes the other sections.

For example:

### When an order is completed

It should affect:

- sales
- customer history
- finished-product stock
- best sellers
- revenue
- margin
- reports

### When production is recorded

It should affect:

- raw-material usage
- chemical lots
- shoe-upper stock
- finished-product inventory
- waste
- unknown units
- product cost
- production reports
- dashboard

### When a supplier delivery is received

It should affect:

- supplier history
- inventory
- stock quantities
- chemical lots
- reorder status
- dashboard alerts

### When a cost is recorded

It should affect:

- product costing where allocated
- profitability
- gross margin
- suggested price
- financial reports
- dashboard

This interconnected behavior is essential.

---

# 30. REPORTS

Harrix ERP should provide reports that help management make decisions.

## Inventory reports

- current inventory
- low stock
- reorder required
- stock valuation
- chemical expiration
- chemical consumption
- stock movement history

## Production reports

- production by date
- production by product
- production by machine
- first-choice rate
- second-choice rate
- waste rate
- unknown rate
- yield
- reconciliation

## Sales reports

- revenue
- orders
- units sold
- best sellers
- customer sales
- sales by period
- payment status

## Finance reports

- revenue
- costs
- gross profit
- gross margin
- product profitability

## HR reports

- employee count
- worked hours
- absence
- leave
- salary totals

---

# 31. SETTINGS

Harrix ERP should have a central settings area.

## General Settings

- factory name
- logo
- address
- phone
- email
- language
- currency
- timezone
- date format

Baseline:

- English
- DZD
- Algeria / Algiers time

## Inventory Settings

- reorder rules
- stock-status thresholds
- default units
- expiration warning period

## Chemical Settings

- FEFO behavior
- FIFO fallback
- expiration warning
- expired-stock rules

## Production Settings

- production statuses
- shifts
- machines
- variance rules
- approval rules for important adjustments

## Pricing Settings

- default gross margin
- rounding
- costing rules
- price override permissions

## Notifications

Alerts for:

- low stock
- reorder required
- chemical expiring
- chemical expired
- production variance
- unknown units
- unpaid orders
- pending purchase orders
- HR approvals

## Users / Access

- users
- roles
- permissions
- module access

## Audit

Important activity should be traceable:

- who created something
- who changed it
- who deleted/archived it
- when it happened
- what changed where practical

---

# 32. SEARCH AND ORGANIZATION

Major sections should be easy to search and filter.

Lists should support:

- search
- filters
- sorting
- pagination

Dates, statuses, suppliers, products, machines, and other relevant fields should be filterable.

---

# 33. EDIT AND DELETE

Major records should have clear:

- Edit
- Delete

actions.

Where historical records are important, use archive/soft-delete rather than destroying history.

Deletion should always require confirmation.

Examples include:

- inventory items
- suppliers
- customers
- employees
- production batches
- orders
- costs

Critical historical records should remain traceable.

---

# 34. DETAIL PAGES

Every important entity should have a useful detail page.

A detail page should not merely repeat the list.

It should provide:

- complete information
- photo
- related records
- history
- status
- actions
- useful summaries

The owner should be able to click an item and understand its history and current position.

---

# 35. BUSINESS ALERTS

Harrix ERP should actively highlight situations requiring attention.

Examples:

**Inventory**
- Item below reorder level
- Item critically low

**Chemicals**
- Expiring soon
- Expired
- FEFO recommendation

**Production**
- Unknown units
- High waste
- Production variance

**Sales**
- Unpaid orders
- Cancelled orders

**Purchasing**
- Pending deliveries
- Supplier issues

**HR**
- Pending leave approval
- Attendance problems

---

# 36. TRACEABILITY RULE

Every major number should have an explanation.

For inventory:

> Where did this stock come from?

For production:

> Where did these units go?

For revenue:

> Which orders created this revenue?

For costs:

> Which costs created this product cost?

For margin:

> How was this margin calculated?

For employee hours:

> Which attendance/leave records created this total?

For supplier stock:

> Which delivery increased the inventory?

Harrix ERP should make these answers accessible.

---

# 37. DATA RELATIONSHIPS — BUSINESS VIEW

The main business relationships are:

## Suppliers

Supplier

→ Purchase Order

→ Delivery / Receiving

→ Inventory

## Raw Materials

Chemical / Shoe Upper

→ Production Consumption

→ Production Batch

## Production

Production Batch

→ First Choice

→ Second Choice

→ Waste

→ Unknown

→ Finished Product Inventory

## Finished Products

Finished Product

→ Inventory

→ Sales Order

→ Customer

→ Revenue

## Finance

Costs

+

Sales

→ Product Profitability

→ Gross Profit

→ Gross Margin

## HR

Employees

→ Attendance

→ Leave

→ Working Hours

→ Workforce information

---

# 38. COMPLETE FACTORY FLOW

A simplified view of the entire Harrix ERP system:

Supplier

↓

Purchase

↓

Receiving

↓

Raw Material Inventory

↓

Production

↓

Material Consumption

↓

Production Batch

↓

Finished Products

↓

Quality Classification

↓

1st Choice / 2nd Choice / Waste / Unknown

↓

Finished Product Inventory

↓

Customer Order

↓

Sale

↓

Revenue

↓

Cost + Revenue

↓

Profitability

↓

Dashboard + Reports

At the same time:

Employees

↓

Attendance / Leave

↓

Workforce information

and:

Machines

↓

Spare Parts

↓

Maintenance Activity

These activities all contribute to the factory's overall visibility.

---

# 39. WHAT MAKES Harrix ERP DIFFERENT

Harrix ERP is not only a place to store data.

Its main value is connecting the data.

The owner should be able to move from:

**Dashboard → Alert → Item → History → Cause**

instead of manually searching through different records.

Example:

Dashboard says:

**10 Unknown Units**

↓

Open Production Variance

↓

See Batch PB-001

↓

Expected 120

↓

95 First Choice

8 Second Choice

7 Waste

10 Unknown

↓

See raw materials consumed

↓

See machine / shift / operator information

↓

Investigate the discrepancy

This is the kind of visibility Harrix ERP is designed to provide.

---

# 40. FUTURE INTELLIGENCE

The system should eventually support intelligent features such as:

- demand forecasting
- inventory forecasting
- chemical consumption prediction
- automatic reorder recommendations
- anomaly detection
- production-loss detection
- margin optimization
- sales forecasting
- supplier performance analysis
- automatic notifications
- natural-language factory assistant

The foundation must first be reliable and connected before advanced intelligence is added.

---

# 41. FINAL PRODUCT GOAL

Harrix ERP should become the factory's central management system.

The owner should no longer have to ask:

> "Where did the stock go?"

> "What happened to the production?"

> "Why are 10 units missing?"

> "Which chemical should we use first?"

> "What should we reorder?"

> "How much does this product really cost?"

> "What should we sell it for?"

> "How much are we making?"

> "Which products are selling?"

> "Who bought from us?"

> "Which supplier supplied this material?"

> "How are our employees performing in terms of attendance and working hours?"

The system should answer these questions with connected, understandable information.

---

# 42. THE CORE PROMISE OF Harrix ERP

> **Know what entered the factory.**
>
> **Know where it went.**
>
> **Know what was produced.**
>
> **Know what was sold.**
>
> **Know what was lost.**
>
> **Know what remains.**
>
> **Know what it costs.**
>
> **Know where the factory stands.**

Harrix ERP should transform the factory from a manually managed operation into a transparent, traceable, data-driven organization.

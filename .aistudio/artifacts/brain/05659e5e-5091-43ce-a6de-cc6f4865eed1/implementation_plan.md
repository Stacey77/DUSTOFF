# Commercial BRRRR & "Buy, Borrow, Die" Generational Wealth Engine

Add a dedicated **Wealth & Capital Strategies** suite to CivicStack, introducing institutional-grade modeling for:
1. **The Commercial & Federal Affordable BRRRR Method** tailored to 10, 15, and 20-unit developments (Buy via municipal option/grant, Build/Rehab with 100% federal capital, Rent with HUD Section 8 PBV vouchers, Refinance with HUD 223(f) non-recourse permanent debt to pull out tax-free capital, and Repeat).
2. **The Buy, Borrow, Die Generational Wealth Strategy** (Asset appreciation through energy-efficient multi-family assets, tax-free borrowing via equity lines and cash-out refinances without triggering capital gains taxes, and generational transfer into dynasty trusts with an IRC §1014 stepped-up basis).

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The user confirmed the following core architectural choices:
> - **Navigation Placement**: Dedicated top-level **"Wealth Strategies"** tab in the main navigation.
> - **BRRRR Scale**: Engineered specifically for **10, 15, and 20-unit affordable housing** multi-family assets funded with federal grants.
> - **Buy, Borrow, Die Capabilities**: All three major pillars will be implemented:
>   1. Tax-free cash-out refinance and equity liquidity modeler.
>   2. 30-year generational equity accumulation and estate trust legal roadmap.
>   3. Portfolio line of credit (LOC) borrowing capacity calculator with IRC §1014 stepped-up basis tax savings audit.

---

## 1. Overview & Core Concept

### What It Does
- **Commercial & Federal BRRRR Simulator**:
  - **B (Buy / Acquire)**: Acquire site via $0 municipal option, land bank transfer, or acquisition grant.
  - **R (Rehab / Build)**: 100% funded with HUD HOME, HTF, FHLB AHP, and IRA Clean Energy credits; developer collects 12% cash Developer Fee.
  - **R (Rent)**: 100% leased to voucher recipients with 20-year HUD Section 8 Project-Based Vouchers (PBVs), establishing high, government-backed Net Operating Income (NOI).
  - **R (Refinance)**: At Year 2 to 3 stabilization, execute a supplemental or non-recourse HUD 223(f) cash-out refinance at 75%–80% LTV against the new capitalized value, extracting hundreds of thousands in **tax-free cash distributions**.
  - **R (Repeat)**: Roll 100% of the untaxed cash proceeds into the next 10, 15, or 20-unit project.
- **The "Buy, Borrow, Die" Master Engine**:
  - **Buy / Build**: Accumulate multi-family assets with $0 personal cash down using federal grant stacking.
  - **Borrow**: Instead of selling and paying 20% federal capital gains, 3.8% Net Investment Income Tax (NIIT), and 25% depreciation recapture, the developer borrows against the portfolio using portfolio lines of credit or supplemental cash-out debt. Loan proceeds are **100% non-taxable cash**.
  - **Die**: At generational transfer, assets transition into an Irrevocable Grantor Trust or Family LLC. Heirs receive a **full fair-market stepped-up tax basis under IRC §1014**, permanently wiping out all accumulated capital gains and depreciation recapture liabilities.

### Target Audience & Persona
- Real estate developers, syndicators, and community housing entrepreneurs looking to scale beyond single-family flips into multi-million dollar multi-family assets that build permanent generational family wealth.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Workflow Selection**: User switches between the **Federal BRRRR Lifecycle** and the **Buy, Borrow, Die Wealth Engine**.
2. **BRRRR Multi-Stage Lifecycle**:
   - Interactive 5-step stepper tracking Initial Basis -> 100% Grant Build -> PBV Lease-up -> Post-Stabilization Cap Rate Valuation -> Cash-Out Refinance Equity Pulled.
   - Live comparison card showing: *Initial Equity Invested ($0)* vs *Developer Fee Profit ($294k-$624k)* vs *Tax-Free Refinance Cash Extracted ($400k-$1.2M)* vs *Total Return on Equity (Infinite)*.
3. **Buy, Borrow, Die Simulation**:
   - Interactive sliders for Portfolio Horizon (10, 20, 30 years), Annual Asset Appreciation (3%–6%), Debt-to-Equity Borrowing Ratio (50%–70%), and Local Tax Bracket.
   - Side-by-side comparative ledger:
     - **Sell & Liquidate**: Gross Sales Price - Capital Gains Tax (23.8%) - Depreciation Recapture (25%) - Broker Commissions (5%) = Net Eroded Capital.
     - **Buy, Borrow, Die**: Tax-Free Borrowed Liquidity + Stepped-Up Basis to Heirs = **$0 Tax Paid**.
4. **Interactive Line of Credit (LOC) & Trust Structure Tool**:
   - Real-time borrowing borrowing capacity calculator for working capital loans against stabilized multi-family equity.
   - Visual Trust & Entity Ownership diagram (HoldCo -> Operating LLC -> Irrevocable Dynasty Trust).

### Visual Identity & Theme
- **Surface & Hierarchy**: Clean institutional slate surfaces (`bg-slate-50`, `bg-white`, `border-slate-200`) with emerald and gold/amber luxury financial accents.
- **Typography & Data Display**: Outfit for hero headers, Public Sans for clean dense prose, and JetBrains Mono with `tabular-nums` for all financial cash-out and tax comparisons.
- **Strict Anti-Slop Compliance**: No decorative pulsing dots, no pill badges on static metadata, and no fake status tickers.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Commercial/Multifamily Federal BRRRR vs. Single-Family BRRRR**:
  - *Chosen Approach*: Focus on 10, 15, and 20-unit multi-family developments capitalized through federal subsidies and stabilized with Section 8 vouchers.
  - *Why*: Aligns with the core mission of the platform (missing-middle affordable housing developments) and demonstrates how developers pull out massive tax-free equity without standard bank hard-money loans.
- **Decision 2: Three-Pillar "Buy, Borrow, Die" Architecture**:
  - *Chosen Approach*: Combine the cash-out refinance tax modeler, the 30-year generational equity tracker, and the portfolio line of credit calculator into one unified cockpit with tabbed drill-downs.
  - *Why*: Directly satisfies the user's explicit request for "1, 2 AND 3" capabilities without fragmenting the UI.

---

## 4. Technical Architecture & Data Strategy

### System Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            CIVICSTACK PLATFORM                               │
├──────────────────────────────────────────────────────────────────────────────┤
│ TOP NAVIGATION                                                               │
│ [CivicStack] ── [Pipeline] · [Stacker] · [Strategy] · [Unit Mix] · [Wealth] │
├──────────────────────────────────────────────────────────────────────────────┤
│ WEALTH STRATEGIES COCKPIT (New Module: WealthStrategies.tsx)                 │
│                                                                              │
│ ┌───────────────────────────┐      ┌───────────────────────────────────────┐ │
│ │  COMMERCIAL BRRRR ENGINE  │      │     BUY, BORROW, DIE MASTER ENGINE    │ │
│ │  - 10, 15, 20-Unit Models │      │  - 30-Year Wealth & Equity Projection │ │
│ │  - HUD 223(f) Refinance   │      │  - Tax-Free Cash vs Sell Tax Penalty  │ │
│ │  - Developer Fee + Cashout│      │  - Portfolio LOC Borrowing Capacity   │ │
│ │  - Infinite ROE Tracker   │      │  - IRC §1014 Stepped-Up Basis Roadmap │ │
│ └─────────────┬─────────────┘      └───────────────────┬───────────────────┘ │
│               │                                        │                     │
│               └───────────────────┬────────────────────┘                     │
│                                   ▼                                          │
│                      SHARED PRO-FORMA & VALUATION                            │
│           (Stabilized NOI · Cap Rate · Loan-to-Value Refi Proceeds)          │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Component Structure
1. `src/data/wealthStrategies.ts`:
   - Data structures, formulas, and presets for 10, 15, and 20-unit Commercial BRRRR cycles.
   - Mathematical model for Buy, Borrow, Die tax calculations (Depreciation recapture, Federal LTCG, Net Investment Income Tax, Stepped-up basis elimination).
2. `src/components/WealthStrategies.tsx`:
   - Comprehensive interactive component featuring the Commercial BRRRR cycle simulator, the Buy/Borrow/Die wealth ledger, the portfolio LOC tool, and estate trust structural guidance.
3. `src/components/Navbar.tsx` & `src/App.tsx`:
   - Add `wealth` tab to navigation and render `WealthStrategies.tsx`.

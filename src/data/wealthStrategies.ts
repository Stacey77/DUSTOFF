import { CommercialBrrrrPreset, BuyBorrowDieProjection } from '../types';

export const commercialBrrrrPresets: Record<10 | 15 | 20, CommercialBrrrrPreset> = {
  10: {
    units: 10,
    name: 'Elmwood 10-Unit Missing-Middle BRRRR',
    initialAcquisition: 160000,
    totalDevelopmentCost: 2450000,
    federalGrantsCovered: 2450000, // 100% covered
    developerFeeProfit: 294000, // 12% cash fee
    grossAnnualRent: 174000,
    netOperatingIncome: 118500,
    defaultCapRate: 6.25,
    defaultRefiLtv: 70,
    appraisedStabilizedValue: 3150000, // $118,500 / 0.0625 + premium for zero-debt risk
    cashOutLoanAmount: 2205000,
    netTaxFreeCashExtracted: 550000, // Supplemental debt pull against grant equity
  },
  15: {
    units: 15,
    name: 'Oakwood 15-Unit Sustainable BRRRR',
    initialAcquisition: 250000,
    totalDevelopmentCost: 3750000,
    federalGrantsCovered: 3750000,
    developerFeeProfit: 450000,
    grossAnnualRent: 261660,
    netOperatingIncome: 178000,
    defaultCapRate: 6.0,
    defaultRefiLtv: 70,
    appraisedStabilizedValue: 4850000,
    cashOutLoanAmount: 3395000,
    netTaxFreeCashExtracted: 850000,
  },
  20: {
    units: 20,
    name: 'Skandia 20-Unit Civic Commons BRRRR',
    initialAcquisition: 340000,
    totalDevelopmentCost: 5200000,
    federalGrantsCovered: 5200000,
    developerFeeProfit: 624000,
    grossAnnualRent: 362400,
    netOperatingIncome: 245000,
    defaultCapRate: 5.85,
    defaultRefiLtv: 70,
    appraisedStabilizedValue: 6800000,
    cashOutLoanAmount: 4760000,
    netTaxFreeCashExtracted: 1250000,
  },
};

export interface BuyBorrowDieDetailedProjection extends BuyBorrowDieProjection {
  adjustedBasis: number;
  depreciationRecaptureTax: number;
  longTermCapitalGainsTax: number;
  niitTax: number;
  stateCapitalGainsTax: number;
  brokerClosingCosts: number;
  steppedUpBasisJump: number; // Fair Market Value - Adjusted Basis
  effectiveTaxDestructionRate: number; // total taxes / gross sales
}

export function generateBuyBorrowDieProjections(
  initialValue: number,
  annualAppreciationPct: number = 4.0,
  refiLtvPct: number = 65,
  stateTaxRatePct: number = 5.0,
  holdingYears: number = 30
): BuyBorrowDieDetailedProjection[] {
  const projections: BuyBorrowDieDetailedProjection[] = [];
  const appreciationRate = annualAppreciationPct / 100;
  const ltv = refiLtvPct / 100;
  const stateRate = stateTaxRatePct / 100;

  // Key benchmark milestones
  const milestoneYears = [1, 5, 10, 15, 20, 25, 30];

  for (const yr of milestoneYears) {
    const assetValue = Math.round(initialValue * Math.pow(1 + appreciationRate, yr));

    // Residential straight-line depreciation over 27.5 years (capped at 100% of building basis ~80% of initial)
    const depreciableBasis = initialValue * 0.8;
    const annualDepreciation = depreciableBasis / 27.5;
    const accumulatedDepreciation = Math.round(Math.min(depreciableBasis, annualDepreciation * yr));

    // If sold:
    // Adjusted basis = initialValue - accumulatedDepreciation
    const adjustedBasis = Math.max(0, Math.round(initialValue - accumulatedDepreciation));
    const grossSalesProceeds = assetValue;
    const brokerClosingCosts = Math.round(grossSalesProceeds * 0.05);
    const netSalesProceeds = grossSalesProceeds - brokerClosingCosts;
    const totalTaxableGain = Math.max(0, netSalesProceeds - adjustedBasis);

    // Taxes if sold:
    // 25% federal depreciation recapture tax on accumulated depreciation
    const depreciationRecaptureTax = Math.round(Math.min(totalTaxableGain, accumulatedDepreciation) * 0.25);
    // 20% federal LTCG + 3.8% Net Investment Income Tax (NIIT) on remaining economic capital gain
    const remainingGain = Math.max(0, totalTaxableGain - accumulatedDepreciation);
    const longTermCapitalGainsTax = Math.round(remainingGain * 0.20);
    const niitTax = Math.round(remainingGain * 0.038);
    const stateCapitalGainsTax = Math.round(totalTaxableGain * stateRate);

    const totalTaxesIfSold = depreciationRecaptureTax + longTermCapitalGainsTax + niitTax + stateCapitalGainsTax;
    const effectiveTaxDestructionRate = Math.round((totalTaxesIfSold / grossSalesProceeds) * 100);

    // Buy, Borrow, Die Strategy:
    // Borrow tax-free at LTV
    const taxFreeBorrowingCapacity = Math.round(assetValue * ltv);
    // Conservative annual cash draw / living allowance supported by debt service & Section 8 cashflow
    const annualTaxFreeLivingDraw = Math.round(taxFreeBorrowingCapacity * 0.045);

    // Stepped-Up Basis Benefit at Death (IRC §1014):
    // Heirs step up basis from adjustedBasis to fair market value on date of death, erasing ALL accumulated taxes!
    const steppedUpBasisJump = assetValue - adjustedBasis;
    const heirSteppedUpBasisBenefit = totalTaxesIfSold;

    projections.push({
      year: yr,
      portfolioAssetValue: assetValue,
      accumulatedDepreciation,
      adjustedBasis,
      taxableCapitalGainIfSold: totalTaxableGain,
      depreciationRecaptureTax,
      longTermCapitalGainsTax,
      niitTax,
      stateCapitalGainsTax,
      brokerClosingCosts,
      totalTaxesIfSold,
      taxFreeBorrowingCapacity,
      annualTaxFreeLivingDraw,
      steppedUpBasisJump,
      heirSteppedUpBasisBenefit,
      effectiveTaxDestructionRate,
    });
  }

  return projections;
}

export const estateTrustRoadmap = [
  {
    step: 'Step 1: Single-Asset Operating LLCs',
    title: 'Ring-Fence Project Liabilities',
    description: 'Each 10, 15, or 20-unit development is held in a dedicated Single-Purpose Entity (SPE) LLC (e.g., "Oakwood Flats 15 LLC"). Lenders and HUD require SPEs to prevent cross-collateralization and isolate slip-and-fall or tenant disputes.',
  },
  {
    step: 'Step 2: Developer Parent HoldCo',
    title: 'Centralize Management Fees & Cashflow',
    description: 'Your Master Holding Company (e.g., "CivicPeak Development LLC") owns 100% of the Single-Asset LLCs. It collects all upfront Developer Fees (12%), ongoing Asset Management distributions, and refinancing cash proceeds under pass-through partnership tax treatment.',
  },
  {
    step: 'Step 3: Equity Lines of Credit (ELOC)',
    title: 'Borrow Tax-Free Against Stabilized Equity',
    description: 'Rather than selling stabilized assets, the HoldCo pledges equity to obtain low-cost commercial portfolio lines of credit. Under IRS Code, loan proceeds are NOT gross income. You draw living expenses and equity for your next development 100% tax-free.',
  },
  {
    step: 'Step 4: Irrevocable Dynasty Trust & IRC §1014',
    title: 'Permanent Stepped-Up Basis to Heirs',
    description: 'Transfer non-voting shares of your HoldCo to an Irrevocable Grantor or Dynasty Trust. Upon death, IRC §1014 steps up the tax basis to the current Fair Market Value. Decades of accumulated depreciation recapture and capital gains taxes are permanently eliminated for your children.',
  },
];

export function generate10YearBrrrrProjections(
  units: 10 | 15 | 20,
  appreciationRatePct: number = 4.0,
  capRatePct: number = 6.25,
  refiLtvPct: number = 70,
  refiYear: number = 3
) {
  const preset = commercialBrrrrPresets[units];
  const initialAppraised = Math.round(preset.netOperatingIncome / (capRatePct / 100));
  const appreciation = appreciationRatePct / 100;
  const rentGrowth = 0.025; // 2.5% annual Section 8 FMR rent increase

  const projections = [];
  let cumulativeLiquid = 0;
  let currentDebt = 0;
  let annualDebtService = 0;

  for (let yr = 1; yr <= 10; yr++) {
    const propertyValue = Math.round(initialAppraised * Math.pow(1 + appreciation, yr - 1));
    const grownNoi = Math.round(preset.netOperatingIncome * Math.pow(1 + rentGrowth, yr - 1));

    let refiProceeds = 0;
    let devFee = 0;
    let netCashFlow = 0;

    if (yr === 1) {
      devFee = preset.developerFeeProfit;
      netCashFlow = grownNoi; // 0 debt
      currentDebt = 0;
    } else if (yr < refiYear) {
      netCashFlow = grownNoi; // 0 debt
      currentDebt = 0;
    } else if (yr === refiYear) {
      // Refinance event
      const grossLoan = Math.round(propertyValue * (refiLtvPct / 100));
      // In HUD/public stacked financing, net cashout is extracted via supplemental debt or soft debt subordination
      refiProceeds = Math.round(grossLoan * 0.28);
      currentDebt = Math.round(grossLoan * 0.65);
      // 35-yr amortization at 5.5% interest -> debt constant ~6.48%
      annualDebtService = Math.round(currentDebt * 0.0648);
      netCashFlow = Math.max(0, grownNoi - annualDebtService);
    } else {
      // Post-refi years: debt amortizes down by ~2% per year
      currentDebt = Math.max(0, Math.round(currentDebt * 0.978));
      netCashFlow = Math.max(0, grownNoi - annualDebtService);
    }

    const totalAnnualLiquid = devFee + refiProceeds + netCashFlow;
    cumulativeLiquid += totalAnnualLiquid;
    const propertyEquity = Math.max(0, propertyValue - currentDebt);
    const totalNetWealth = propertyEquity + cumulativeLiquid;

    // Cash on cash return evaluated on nominal $5,000 option earnest money
    const nominalEarnest = 5000;
    const cashOnCashPct = Math.round((totalAnnualLiquid / nominalEarnest) * 100);

    projections.push({
      yearNumber: yr,
      yearLabel: `Year ${yr}`,
      propertyAppraisedValue: propertyValue,
      outstandingDebt: currentDebt,
      propertyEquity,
      netAnnualCashFlow: netCashFlow,
      refiProceedsExtracted: refiProceeds,
      developerFeeCash: devFee,
      totalAnnualLiquidCash: totalAnnualLiquid,
      cumulativeLiquidCash: cumulativeLiquid,
      totalNetWealth,
      cashOnCashPercent: cashOnCashPct,
    });
  }

  return projections;
}


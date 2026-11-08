import { UnitMixStrategyItem, UnitMixSummary } from '../types';

export const defaultUnitMixes: Record<10 | 15 | 20, UnitMixStrategyItem[]> = {
  10: [
    {
      id: 'mix-10-studio-30',
      bedroomType: 'Studio',
      count: 2,
      sqFt: 480,
      targetAmi: 30,
      amiCategory: 'Extremely Low (≤30%)',
      hudGrossRent: 1250,
      utilityAllowance: 65,
      tenantRentPortion: 420, // 30% of 30% AMI income
      pbvSubsidyPortion: 765, // HUD electronic PBV payment
      totalMonthlyRevenue: 2370,
      totalAnnualRevenue: 28440,
    },
    {
      id: 'mix-10-1br-50',
      bedroomType: '1-Bedroom',
      count: 4,
      sqFt: 620,
      targetAmi: 50,
      amiCategory: 'Very Low (31-50%)',
      hudGrossRent: 1420,
      utilityAllowance: 80,
      tenantRentPortion: 780, // 30% of 50% AMI income
      pbvSubsidyPortion: 560,
      totalMonthlyRevenue: 5360,
      totalAnnualRevenue: 64320,
    },
    {
      id: 'mix-10-2br-60',
      bedroomType: '2-Bedroom',
      count: 3,
      sqFt: 860,
      targetAmi: 60,
      amiCategory: 'Low (51-60%)',
      hudGrossRent: 1680,
      utilityAllowance: 95,
      tenantRentPortion: 1120, // 30% of 60% AMI income
      pbvSubsidyPortion: 465,
      totalMonthlyRevenue: 4755,
      totalAnnualRevenue: 57060,
    },
    {
      id: 'mix-10-3br-60',
      bedroomType: '3-Bedroom',
      count: 1,
      sqFt: 1080,
      targetAmi: 60,
      amiCategory: 'Low (51-60%)',
      hudGrossRent: 2050,
      utilityAllowance: 115,
      tenantRentPortion: 1380,
      pbvSubsidyPortion: 555,
      totalMonthlyRevenue: 1935,
      totalAnnualRevenue: 23220,
    },
  ],
  15: [
    {
      id: 'mix-15-studio-30',
      bedroomType: 'Studio',
      count: 3,
      sqFt: 480,
      targetAmi: 30,
      amiCategory: 'Extremely Low (≤30%)',
      hudGrossRent: 1250,
      utilityAllowance: 65,
      tenantRentPortion: 420,
      pbvSubsidyPortion: 765,
      totalMonthlyRevenue: 3555,
      totalAnnualRevenue: 42660,
    },
    {
      id: 'mix-15-1br-50',
      bedroomType: '1-Bedroom',
      count: 6,
      sqFt: 640,
      targetAmi: 50,
      amiCategory: 'Very Low (31-50%)',
      hudGrossRent: 1420,
      utilityAllowance: 80,
      tenantRentPortion: 780,
      pbvSubsidyPortion: 560,
      totalMonthlyRevenue: 8040,
      totalAnnualRevenue: 96480,
    },
    {
      id: 'mix-15-2br-60',
      bedroomType: '2-Bedroom',
      count: 4,
      sqFt: 880,
      targetAmi: 60,
      amiCategory: 'Low (51-60%)',
      hudGrossRent: 1680,
      utilityAllowance: 95,
      tenantRentPortion: 1120,
      pbvSubsidyPortion: 465,
      totalMonthlyRevenue: 6340,
      totalAnnualRevenue: 76080,
    },
    {
      id: 'mix-15-3br-80',
      bedroomType: '3-Bedroom',
      count: 2,
      sqFt: 1120,
      targetAmi: 80,
      amiCategory: 'Moderate / Workforce (61-80%)',
      hudGrossRent: 2050,
      utilityAllowance: 115,
      tenantRentPortion: 1840,
      pbvSubsidyPortion: 95,
      totalMonthlyRevenue: 3870,
      totalAnnualRevenue: 46440,
    },
  ],
  20: [
    {
      id: 'mix-20-studio-30',
      bedroomType: 'Studio',
      count: 4,
      sqFt: 490,
      targetAmi: 30,
      amiCategory: 'Extremely Low (≤30%)',
      hudGrossRent: 1250,
      utilityAllowance: 65,
      tenantRentPortion: 420,
      pbvSubsidyPortion: 765,
      totalMonthlyRevenue: 4740,
      totalAnnualRevenue: 56880,
    },
    {
      id: 'mix-20-1br-50',
      bedroomType: '1-Bedroom',
      count: 8,
      sqFt: 650,
      targetAmi: 50,
      amiCategory: 'Very Low (31-50%)',
      hudGrossRent: 1420,
      utilityAllowance: 80,
      tenantRentPortion: 780,
      pbvSubsidyPortion: 560,
      totalMonthlyRevenue: 10720,
      totalAnnualRevenue: 128640,
    },
    {
      id: 'mix-20-2br-60',
      bedroomType: '2-Bedroom',
      count: 6,
      sqFt: 900,
      targetAmi: 60,
      amiCategory: 'Low (51-60%)',
      hudGrossRent: 1680,
      utilityAllowance: 95,
      tenantRentPortion: 1120,
      pbvSubsidyPortion: 465,
      totalMonthlyRevenue: 9510,
      totalAnnualRevenue: 114120,
    },
    {
      id: 'mix-20-3br-60',
      bedroomType: '3-Bedroom',
      count: 2,
      sqFt: 1140,
      targetAmi: 60,
      amiCategory: 'Low (51-60%)',
      hudGrossRent: 2050,
      utilityAllowance: 115,
      tenantRentPortion: 1380,
      pbvSubsidyPortion: 555,
      totalMonthlyRevenue: 3870,
      totalAnnualRevenue: 46440,
    },
  ],
};

export function calculateUnitMixSummary(items: UnitMixStrategyItem[]): UnitMixSummary {
  const unitsCount = items.reduce((sum, item) => sum + item.count, 0);
  const grossResidentialSqFt = items.reduce((sum, item) => sum + item.count * item.sqFt, 0);

  const totalMonthlyGrossRent = items.reduce((sum, item) => sum + item.totalMonthlyRevenue, 0);
  const totalAnnualGrossRent = totalMonthlyGrossRent * 12;

  const totalTenantPaidRent = items.reduce(
    (sum, item) => sum + item.count * item.tenantRentPortion * 12,
    0
  );
  const totalFederalVoucherHapSubsidy = items.reduce(
    (sum, item) => sum + item.count * item.pbvSubsidyPortion * 12,
    0
  );

  const ami30Count = items
    .filter((i) => i.targetAmi === 30)
    .reduce((sum, i) => sum + i.count, 0);
  const ami50Count = items
    .filter((i) => i.targetAmi === 50)
    .reduce((sum, i) => sum + i.count, 0);
  const ami60Count = items
    .filter((i) => i.targetAmi === 60)
    .reduce((sum, i) => sum + i.count, 0);
  const ami80Count = items
    .filter((i) => i.targetAmi === 80)
    .reduce((sum, i) => sum + i.count, 0);

  const studios = items.filter((i) => i.bedroomType === 'Studio').reduce((s, i) => s + i.count, 0);
  const oneBed = items.filter((i) => i.bedroomType === '1-Bedroom').reduce((s, i) => s + i.count, 0);
  const twoBed = items.filter((i) => i.bedroomType === '2-Bedroom').reduce((s, i) => s + i.count, 0);
  const threeBed = items.filter((i) => i.bedroomType === '3-Bedroom').reduce((s, i) => s + i.count, 0);

  const pct50OrLess = unitsCount > 0 ? ((ami30Count + ami50Count) / unitsCount) * 100 : 0;

  return {
    unitsCount,
    grossResidentialSqFt,
    totalMonthlyGrossRent,
    totalAnnualGrossRent,
    totalTenantPaidRent,
    totalFederalVoucherHapSubsidy,
    amiDistribution: {
      ami30Count,
      ami30Pct: unitsCount > 0 ? (ami30Count / unitsCount) * 100 : 0,
      ami50Count,
      ami50Pct: unitsCount > 0 ? (ami50Count / unitsCount) * 100 : 0,
      ami60Count,
      ami60Pct: unitsCount > 0 ? (ami60Count / unitsCount) * 100 : 0,
      ami80Count,
      ami80Pct: unitsCount > 0 ? (ami80Count / unitsCount) * 100 : 0,
    },
    bedroomDistribution: {
      studios,
      oneBed,
      twoBed,
      threeBed,
    },
    hudCompliance: {
      meetsHome20PctAt50Rule: pct50OrLess >= 20, // HUD HOME 24 CFR 92.252(b) requires at least 20% of units at <= 50% AMI
      meetsHtf30PctRule: ami30Count >= 1, // National HTF requires <= 30% AMI targeting
      pbvEligible: true,
    },
  };
}

import { HudComplianceRule, ComplianceValidationResult } from '../types';

export function validateHudCompliance(items: UnitMixStrategyItem[]): ComplianceValidationResult {
  const summary = calculateUnitMixSummary(items);
  const rules: HudComplianceRule[] = [];
  const totalUnits = summary.unitsCount;

  // 1. HOME 20% Rule (24 CFR 92.252(b)) - In projects of 5 or more HOME units, at least 20% must be occupied by families with incomes <= 50% AMI
  const pct50OrLess = totalUnits > 0 ? ((summary.amiDistribution.ami30Count + summary.amiDistribution.ami50Count) / totalUnits) * 100 : 0;
  if (totalUnits >= 5) {
    if (pct50OrLess >= 20) {
      rules.push({
        id: 'rule-home-20-50',
        code: 'HOME-01',
        cfrCitation: '24 CFR § 92.252(b)',
        title: 'HOME High/Low Income Targeting (20% at ≤50% AMI)',
        category: 'Income Targeting',
        status: 'passed',
        severity: 'blocking',
        summary: `Passed: ${pct50OrLess.toFixed(1)}% of units targeted at ≤50% AMI (exceeds statutory 20% minimum).`,
        detail: `Under 24 CFR § 92.252(b), rental housing with 5 or more HOME-assisted units must have at least 20% occupied by very low-income families whose annual incomes do not exceed 50% of area median income (AMI). Your mix provides ${summary.amiDistribution.ami30Count + summary.amiDistribution.ami50Count} of ${totalUnits} units at ≤50% AMI.`,
        recommendedAction: 'Compliant with HUD HOME low-rent unit statutory standards.',
      });
    } else {
      rules.push({
        id: 'rule-home-20-50',
        code: 'HOME-01',
        cfrCitation: '24 CFR § 92.252(b)',
        title: 'HOME High/Low Income Targeting (20% at ≤50% AMI)',
        category: 'Income Targeting',
        status: 'failed',
        severity: 'blocking',
        summary: `Discrepancy: Only ${pct50OrLess.toFixed(1)}% of units targeted at ≤50% AMI (requires at least 20.0%).`,
        detail: `Under 24 CFR § 92.252(b), at least 20% of HOME-assisted rental units must be targeted to households at or below 50% AMI. For ${totalUnits} total units, you require at least ${Math.ceil(totalUnits * 0.2)} units at ≤50% AMI, but currently have only ${summary.amiDistribution.ami30Count + summary.amiDistribution.ami50Count}.`,
        recommendedAction: `Increase units at 30% or 50% AMI by at least ${Math.ceil(totalUnits * 0.2) - (summary.amiDistribution.ami30Count + summary.amiDistribution.ami50Count)} unit(s) to secure HOME grant funding.`,
      });
    }
  }

  // 2. National Housing Trust Fund (HTF) 100% ELI Rule (24 CFR § 93.250 & § 93.302)
  if (summary.amiDistribution.ami30Count > 0) {
    const htfPct = (summary.amiDistribution.ami30Count / totalUnits) * 100;
    rules.push({
      id: 'rule-htf-eli',
      code: 'HTF-01',
      cfrCitation: '24 CFR § 93.250(a)',
      title: 'National HTF Extremely Low-Income (≤30% AMI) Mandate',
      category: 'Income Targeting',
      status: 'passed',
      severity: 'blocking',
      summary: `Passed: ${summary.amiDistribution.ami30Count} unit(s) (${htfPct.toFixed(1)}%) designated for Extremely Low-Income (≤30% AMI).`,
      detail: `24 CFR § 93.250 mandates that 100% of National Housing Trust Fund (HTF) funds must be used for units for extremely low-income (ELI) households (at or below 30% AMI or federal poverty level). This allows stacking full HTF forgivable capital grants.`,
      recommendedAction: 'Meets State Participating Jurisdiction HTF allocation threshold.',
    });
  } else {
    rules.push({
      id: 'rule-htf-eli',
      code: 'HTF-01',
      cfrCitation: '24 CFR § 93.250(a)',
      title: 'National HTF Extremely Low-Income (≤30% AMI) Mandate',
      category: 'Income Targeting',
      status: 'warning',
      severity: 'critical',
      summary: 'Zero units allocated to ≤30% AMI (Disqualifies project from National HTF capital grants).',
      detail: 'Federal HTF regulations (24 CFR § 93.250) strictly limit grant disbursements to units restricted at or below 30% AMI. Without 30% AMI units, your capital stack cannot utilize federal HTF funding ($500k–$1.5M).',
      recommendedAction: 'Reassign at least 1 to 3 units to the 30% AMI tier to unlock non-repayable National HTF grants.',
    });
  }

  // 3. HOME 80% AMI Ceiling Rule (24 CFR § 92.216)
  const nonHomeEligibleUnits = summary.amiDistribution.ami80Count;
  const pct80 = totalUnits > 0 ? (nonHomeEligibleUnits / totalUnits) * 100 : 0;
  if (pct80 > 40) {
    rules.push({
      id: 'rule-home-80-ceiling',
      code: 'HOME-02',
      cfrCitation: '24 CFR § 92.216',
      title: 'Workforce Housing (80% AMI) Cross-Subsidization Ratio',
      category: 'Income Targeting',
      status: 'warning',
      severity: 'critical',
      summary: `High Workforce Concentration: ${pct80.toFixed(1)}% of units at 80% AMI.`,
      detail: 'While 24 CFR § 92.216 permits units up to 80% AMI, State Housing Finance Agencies (HFAs) heavily penalize applications where more than 25%–30% of units are at 80% AMI in competitive QAP scoring.',
      recommendedAction: 'Shift surplus 80% units into 50% or 60% AMI tiers to maximize your competitive HOME/QAP application score.',
    });
  } else {
    rules.push({
      id: 'rule-home-80-ceiling',
      code: 'HOME-02',
      cfrCitation: '24 CFR § 92.216',
      title: 'Workforce Housing (80% AMI) Cross-Subsidization Ratio',
      category: 'Income Targeting',
      status: 'passed',
      severity: 'advisory',
      summary: `Balanced: ${pct80.toFixed(1)}% of units at 80% AMI fits standard federal cross-subsidization models.`,
      detail: '80% AMI units help subsidize operating expenses while maintaining deep affordability on remaining units.',
      recommendedAction: 'Maintains optimal blend of voucher cross-subsidization and rent roll solvency.',
    });
  }

  // 4. Davis-Bacon 12-Unit Statutory Exemption (24 CFR § 92.354)
  if (totalUnits < 12) {
    rules.push({
      id: 'rule-davis-bacon-exempt',
      code: 'HUD-DB01',
      cfrCitation: '24 CFR § 92.354(a)(2)',
      title: 'Davis-Bacon Prevailing Wage Exemption (< 12 Units)',
      category: 'Statutory Threshold',
      status: 'passed',
      severity: 'blocking',
      summary: `Statutorily Exempt: Project scale (${totalUnits} units) is under the 12-assisted unit threshold.`,
      detail: 'Under 24 CFR § 92.354, Davis-Bacon prevailing wage requirements apply ONLY to affordable housing contracts containing 12 or more HOME-assisted units. Because this development has fewer than 12 units, open-shop subcontracting is permitted, yielding 14%–18% construction cost savings.',
      recommendedAction: 'Ensure no single HOME contract aggregates neighboring sites above 11 units to preserve open-shop labor rates.',
    });
  } else {
    rules.push({
      id: 'rule-davis-bacon-threshold',
      code: 'HUD-DB02',
      cfrCitation: '24 CFR § 92.354(a)(1)',
      title: 'Davis-Bacon Prevailing Wage Mandate (≥ 12 Units)',
      category: 'Statutory Threshold',
      status: 'warning',
      severity: 'advisory',
      summary: `Prevailing Wage Triggered: ${totalUnits} units meets/exceeds the 12-unit Davis-Bacon threshold.`,
      detail: 'Under 24 CFR § 92.354, projects with 12 or more HOME-assisted units must pay federally determined Davis-Bacon prevailing wage rates (Wage Determination schedule) and submit certified weekly payrolls (WH-347). Hard construction costs increase by ~15%.',
      recommendedAction: 'Verify that your General Contractor has active SAM.gov clearance and certified payroll accounting software in place.',
    });
  }

  // 5. Family Sizing & Bedroom Distribution Balance (HUD Fair Housing & PHA PBV Match)
  const studios = summary.bedroomDistribution.studios;
  const threeBed = summary.bedroomDistribution.threeBed;
  const familyUnits = summary.bedroomDistribution.twoBed + summary.bedroomDistribution.threeBed;
  const familyPct = totalUnits > 0 ? (familyUnits / totalUnits) * 100 : 0;

  if (totalUnits > 0 && familyUnits === 0) {
    rules.push({
      id: 'rule-family-units',
      code: 'QAP-FAM01',
      cfrCitation: '24 CFR § 100.70 & State QAP Family Standards',
      title: 'Family Housing Bedroom Allocation (2-BR & 3-BR)',
      category: 'Bedroom Configuration',
      status: 'failed',
      severity: 'critical',
      summary: 'Missing Family Units: 0% 2-Bedroom or 3-Bedroom units in mix.',
      detail: 'Federal funding awards and local PHA voucher commitments prioritize multi-bedroom family housing. Most state Qualified Allocation Plans (QAPs) penalize single-bedroom-only developments unless specifically designated as elderly or supportive housing.',
      recommendedAction: 'Include at least 25%–40% 2-bedroom or 3-bedroom units to satisfy regional family housing waitlists.',
    });
  } else if (familyPct < 25) {
    rules.push({
      id: 'rule-family-units',
      code: 'QAP-FAM01',
      cfrCitation: '24 CFR § 100.70 & State QAP Family Standards',
      title: 'Family Housing Bedroom Allocation (2-BR & 3-BR)',
      category: 'Bedroom Configuration',
      status: 'warning',
      severity: 'advisory',
      summary: `Low Family Concentration: Only ${familyPct.toFixed(0)}% family units (2-BR/3-BR).`,
      detail: 'Urban family developments typically score highest with 35%–50% 2-bedroom and 3-bedroom configurations.',
      recommendedAction: 'Consider converting 1–2 smaller units into a 2-BR or 3-BR flat if targeting family vouchers.',
    });
  } else {
    rules.push({
      id: 'rule-family-units',
      code: 'QAP-FAM01',
      cfrCitation: '24 CFR § 100.70 & State QAP Family Standards',
      title: 'Family Housing Bedroom Allocation (2-BR & 3-BR)',
      category: 'Bedroom Configuration',
      status: 'passed',
      severity: 'advisory',
      summary: `Optimal Family Balance: ${familyPct.toFixed(0)}% of units configured as 2-BR or 3-BR.`,
      detail: `Your blend (${summary.bedroomDistribution.twoBed} 2-BRs, ${summary.bedroomDistribution.threeBed} 3-BRs) aligns with local housing authority waitlist demographics and maximizes QAP scoring.`,
      recommendedAction: 'Meets HUD family housing priority guidelines.',
    });
  }

  // 6. Section 504 Accessibility Proportion (24 CFR § 8.22)
  // For new construction of 5 or more units, min 5% mobility accessible + 2% sensory accessible
  const minMobilityAccessible = Math.max(1, Math.ceil(totalUnits * 0.05));
  const minSensoryAccessible = Math.max(1, Math.ceil(totalUnits * 0.02));
  rules.push({
    id: 'rule-section-504',
    code: 'HUD-504',
    cfrCitation: '24 CFR § 8.22',
    title: 'Section 504 / ADA Accessibility Unit Standard',
    category: 'Bedroom Configuration',
    status: 'passed',
    severity: 'blocking',
    summary: `Requires at least ${minMobilityAccessible} mobility-accessible unit(s) and ${minSensoryAccessible} sensory-accessible unit(s).`,
    detail: `24 CFR § 8.22 mandates that for new construction federally funded projects, a minimum of 5% of units (or at least 1 unit) must be accessible for individuals with mobility impairments, and an additional 2% (at least 1 unit) must be accessible for hearing/vision impairments.`,
    recommendedAction: `Ensure architectural drawings designate at least ${minMobilityAccessible} ground-floor unit(s) with roll-in showers, 36" clearance doors, and accessible kitchens.`,
  });

  // Calculate score and status
  const failedCount = rules.filter((r) => r.status === 'failed').length;
  const warningCount = rules.filter((r) => r.status === 'warning').length;
  const passedCount = rules.filter((r) => r.status === 'passed').length;

  let score = 100 - (failedCount * 30) - (warningCount * 10);
  score = Math.max(0, Math.min(100, score));

  const overallStatus: ComplianceValidationResult['overallStatus'] =
    failedCount > 0 ? 'non-compliant' : warningCount > 0 ? 'warning' : 'compliant';

  return {
    overallStatus,
    score,
    passedCount,
    warningCount,
    failedCount,
    rules,
  };
}

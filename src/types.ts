export type HousingPreset = 10 | 15 | 20 | 'custom';

export interface UnitMix {
  studio: number;
  oneBed: number;
  twoBed: number;
  threeBed: number;
}

export interface CostBreakdown {
  landAcquisition: number;
  hardConstruction: number;
  siteWorkAndUtilities: number;
  architecturalAndEngineering: number;
  permitsAndImpactFees: number;
  legalAndClosing: number;
  constructionInterestAndFinancing: number;
  contingency: number;
  developerFee: number;
}

export interface FundingSource {
  id: string;
  name: string;
  agency: string;
  type: 'Direct Federal Grant' | 'Forgivable 0% Soft Loan' | 'Tax Credit Equity' | 'Federal Rental Voucher' | 'Local Trust Grant';
  amount: number;
  percentage: number;
  interestRate: number; // e.g. 0% for soft loan
  termYears: number; // e.g. 30 or 40 years
  affordabilityPeriodYears: number;
  targetAmiMax: number; // e.g. 30, 50, 60, 80% AMI
  isFederal: boolean;
  programCode: string;
  description: string;
  eligibilityNotes: string;
  active: boolean;
}

export interface HousingArchetype {
  id: string;
  units: number;
  name: string;
  tagline: string;
  imagePath: string;
  grossSqFt: number;
  costPerSqFt: number;
  unitMix: UnitMix;
  averageRentPerUnit: number; // HUD FMR baseline
  davisBaconApplies: boolean;
  description: string;
  defaultCosts: CostBreakdown;
  defaultFunding: FundingSource[];
  targetResidentProfile: string;
}

export interface FederalProgramInfo {
  code: string;
  name: string;
  federalDepartment: string;
  description: string;
  statutoryBasis: string;
  typicalAwardPerUnit: string;
  maxProjectAllocation: string;
  idealUnitScale: string; // e.g. "10-20 units"
  davisBaconThreshold: string;
  matchingRequirement: string;
  applicationCycle: string;
  keyRequirements: string[];
  howItFundsEntireProject: string;
}

export interface PlaybookPhase {
  phaseNumber: number;
  title: string;
  timeline: string;
  objective: string;
  milestones: {
    title: string;
    description: string;
    actionItems: string[];
    proTip: string;
    completed: boolean;
  }[];
}

export interface DeveloperCompany {
  name: string;
  legalStructure: string;
  samUei: string;
  cageCode: string;
  city: string;
  state: string;
  chdoStatus: boolean;
  targetPipelineUnits: number;
}

/* Pipeline Project Types */
export interface PipelineProject {
  id: string;
  name: string;
  units: 10 | 15 | 20 | number;
  parcelNumber: string;
  address: string;
  city: string;
  state: string;
  siteAcreage: number;
  siteType: 'Urban Infill' | 'Transit Corridor TOD' | 'Surplus Municipal Parcel' | 'Adaptive Reuse' | 'Suburban Neighborhood';
  imagePath: string;
  siteCriteria: {
    transitDistance: string;
    groceryDistance: string;
    schoolDistance: string;
    walkScore: number;
    environmentalRisk: 'Phase I Clean (Low Risk)' | 'Minor REC (Mitigatable)' | 'Phase II Required';
    infrastructureStatus: 'Full Water/Sewer at Curb' | 'Capacity Upgrade Required';
  };
  zoningAnalysis: {
    currentZoning: string;
    allowedDensity: string;
    byRightApproval: boolean;
    parkingRequirement: string;
    heightLimit: string;
    varianceNeeded: string;
  };
  estimatedCost: {
    totalDevelopmentCost: number;
    costPerUnit: number;
    landCost: number;
    hardCost: number;
    softCost: number;
    developerFeeProfit: number;
  };
  marketDemand: {
    localAmi: number;
    costBurdenedRenterPct: number;
    phaVoucherWaitlistMonths: number;
    povertyRate: number;
    targetResidentProfile: string;
  };
  federalFundingAlignment: {
    priorityScore: number; // 0 - 100
    qualifiedCensusTract: boolean;
    difficultDevelopmentArea: boolean;
    opportunityZone: boolean;
    primaryPrograms: string[];
    davisBaconStatus: 'Exempt (< 12 Units)' | 'Prevailing Wage Required (≥ 12 Units)';
    expectedGrantCoveragePct: number;
  };
  status: 'Site Identified' | 'Contingent Option' | 'NEPA Review' | 'NOFA Submitted' | 'Fully Funded';
  hudCompliance?: {
    overallStatus: 'fully-compliant' | 'pending-review' | 'action-required';
    homeIncomeTargeting: {
      status: 'compliant' | 'pending' | 'flagged';
      citation: '24 CFR § 92.252(b)';
      details: string;
    };
    htfIncomeTargeting: {
      status: 'compliant' | 'pending' | 'flagged';
      citation: '24 CFR § 93.250';
      details: string;
    };
    environmentalNepa: {
      status: 'cleared' | 'in-progress' | 'pending';
      citation: '24 CFR Part 58';
      details: string;
    };
    davisBaconWage: {
      status: 'exempt' | 'wage-determination-active' | 'certified-payroll-set';
      citation: '24 CFR § 92.354';
      details: string;
    };
    section504Accessibility: {
      status: 'certified' | 'drawings-pending' | 'flagged';
      citation: '24 CFR § 8.22';
      details: string;
    };
    subsidyLayeringReview: {
      status: 'approved' | 'under-review' | 'submission-ready';
      citation: '24 CFR § 92.250(b)';
      details: string;
    };
    pbvVoucherCommitment: {
      status: 'ahap-executed' | 'loe-issued' | 'rfp-pending';
      details: string;
    };
  };
}

/* Unit Mix Strategy Types */
export interface UnitMixStrategyItem {
  id: string;
  bedroomType: 'Studio' | '1-Bedroom' | '2-Bedroom' | '3-Bedroom';
  count: number;
  sqFt: number;
  targetAmi: 30 | 50 | 60 | 80;
  amiCategory: 'Extremely Low (≤30%)' | 'Very Low (31-50%)' | 'Low (51-60%)' | 'Moderate / Workforce (61-80%)';
  hudGrossRent: number;
  utilityAllowance: number;
  tenantRentPortion: number; // Tenant 30% contribution
  pbvSubsidyPortion: number; // PHA / HUD voucher payment
  totalMonthlyRevenue: number;
  totalAnnualRevenue: number;
}

export interface HudComplianceRule {
  id: string;
  code: string;
  cfrCitation: string;
  title: string;
  category: 'Income Targeting' | 'Bedroom Configuration' | 'Statutory Threshold' | 'Subsidy Layering';
  status: 'passed' | 'failed' | 'warning';
  severity: 'blocking' | 'critical' | 'advisory';
  summary: string;
  detail: string;
  recommendedAction: string;
}

export interface ComplianceValidationResult {
  overallStatus: 'compliant' | 'warning' | 'non-compliant';
  score: number; // 0 - 100
  passedCount: number;
  warningCount: number;
  failedCount: number;
  rules: HudComplianceRule[];
}

export interface UnitMixSummary {
  unitsCount: number;
  grossResidentialSqFt: number;
  totalMonthlyGrossRent: number;
  totalAnnualGrossRent: number;
  totalTenantPaidRent: number;
  totalFederalVoucherHapSubsidy: number;
  amiDistribution: {
    ami30Count: number;
    ami30Pct: number;
    ami50Count: number;
    ami50Pct: number;
    ami60Count: number;
    ami60Pct: number;
    ami80Count: number;
    ami80Pct: number;
  };
  bedroomDistribution: {
    studios: number;
    oneBed: number;
    twoBed: number;
    threeBed: number;
  };
  hudCompliance: {
    meetsHome20PctAt50Rule: boolean;
    meetsHtf30PctRule: boolean;
    pbvEligible: boolean;
  };
}

/* Federal Funding Strategy Types */
export interface FundingTactic {
  id: string;
  title: string;
  category: 'Scoring Optimization' | 'Site Control' | 'Underwriting Compliance' | 'Community Alignment' | 'Clean Energy Equity';
  description: string;
  pointsImpact: string;
  actionSteps: string[];
  statutoryReference?: string;
}

export interface ApplicationStep {
  stepNumber: number;
  title: string;
  entity: string;
  timeline: string;
  deliverables: string[];
  keyAdvice: string;
}

/* Wealth & Capital Strategies Types */
export interface BrrrrStageInfo {
  stage: 'Buy' | 'Rehab / Build' | 'Rent' | 'Refinance' | 'Repeat';
  summary: string;
  financialMetrics: { label: string; value: string; isHighlight?: boolean }[];
  strategicRules: string[];
}

export interface CommercialBrrrrPreset {
  units: 10 | 15 | 20;
  name: string;
  initialAcquisition: number;
  totalDevelopmentCost: number;
  federalGrantsCovered: number;
  developerFeeProfit: number;
  grossAnnualRent: number;
  netOperatingIncome: number;
  defaultCapRate: number;
  defaultRefiLtv: number;
  appraisedStabilizedValue: number;
  cashOutLoanAmount: number;
  netTaxFreeCashExtracted: number;
}

export interface BuyBorrowDieProjection {
  year: number;
  portfolioAssetValue: number;
  accumulatedDepreciation: number;
  taxableCapitalGainIfSold: number;
  totalTaxesIfSold: number;
  taxFreeBorrowingCapacity: number;
  annualTaxFreeLivingDraw: number;
  heirSteppedUpBasisBenefit: number;
}

export interface BrrrrYearProjection {
  yearNumber: number;
  yearLabel: string;
  propertyAppraisedValue: number;
  outstandingDebt: number;
  propertyEquity: number;
  netAnnualCashFlow: number;
  refiProceedsExtracted: number;
  developerFeeCash: number;
  totalAnnualLiquidCash: number;
  cumulativeLiquidCash: number;
  totalNetWealth: number;
  cashOnCashPercent: number;
}



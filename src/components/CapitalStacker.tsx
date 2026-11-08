import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Layers,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  CheckCircle,
  Info,
  Sliders,
  ChevronDown,
  Building,
} from 'lucide-react';
import { HousingArchetype, CostBreakdown, FundingSource } from '../types';
import { housingArchetypes } from '../data/archetypes';

interface CapitalStackerProps {
  selectedUnits: 10 | 15 | 20;
  onSelectUnits: (units: 10 | 15 | 20) => void;
  onNavigateToUnderwriter: () => void;
}

export const CapitalStacker: React.FC<CapitalStackerProps> = ({
  selectedUnits,
  onSelectUnits,
  onNavigateToUnderwriter,
}) => {
  const currentArchetype = housingArchetypes[selectedUnits];

  const [costs, setCosts] = useState<CostBreakdown>({ ...currentArchetype.defaultCosts });
  const [funding, setFunding] = useState<FundingSource[]>(
    currentArchetype.defaultFunding.map((f) => ({ ...f }))
  );
  const [developerFeePercent, setDeveloperFeePercent] = useState<number>(12);
  const [hasLandDonation, setHasLandDonation] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'stack' | 'operating'>('stack');

  // When selected units change from outside, reset to archetype defaults
  useEffect(() => {
    setCosts({ ...currentArchetype.defaultCosts });
    setFunding(currentArchetype.defaultFunding.map((f) => ({ ...f })));
    setDeveloperFeePercent(12);
    setHasLandDonation(false);
  }, [selectedUnits]);

  // Total Development Cost
  const totalCost = Object.values(costs).reduce((sum, val) => sum + val, 0);

  // Total Federal & Public Funding
  const totalFunding = funding.reduce((sum, src) => (src.active ? sum + src.amount : sum), 0);

  // Developer out-of-pocket equity required
  const equityRequired = Math.max(0, totalCost - totalFunding);
  const fundingSurplus = Math.max(0, totalFunding - totalCost);
  const fundingCoveragePercent = totalCost > 0 ? (totalFunding / totalCost) * 100 : 0;
  const isFullyFunded = Math.abs(totalCost - totalFunding) < 1000;

  // Update a specific cost item
  const handleCostChange = (key: keyof CostBreakdown, value: number) => {
    const updated = { ...costs, [key]: Math.max(0, value) };
    // Recalculate developer fee if other costs change, based on fee percent
    if (key !== 'developerFee') {
      const subtotalWithoutFee = Object.entries(updated)
        .filter(([k]) => k !== 'developerFee')
        .reduce((sum, [, val]) => sum + val, 0);
      updated.developerFee = Math.round(subtotalWithoutFee * (developerFeePercent / 100));
    }
    setCosts(updated);
  };

  // Update Developer Fee percent
  const handleDeveloperFeePercentChange = (pct: number) => {
    setDeveloperFeePercent(pct);
    const subtotalWithoutFee = Object.entries(costs)
      .filter(([k]) => k !== 'developerFee')
      .reduce((sum, [, val]) => sum + val, 0);
    setCosts({
      ...costs,
      developerFee: Math.round(subtotalWithoutFee * (pct / 100)),
    });
  };

  // Toggle Land Donation ($0 Municipal Infill Land Bank acquisition)
  const handleToggleLandDonation = (donated: boolean) => {
    setHasLandDonation(donated);
    if (donated) {
      handleCostChange('landAcquisition', 1000); // nominal $1,000 closing
    } else {
      handleCostChange('landAcquisition', currentArchetype.defaultCosts.landAcquisition);
    }
  };

  // Toggle funding source active state
  const handleToggleFunding = (id: string) => {
    setFunding(
      funding.map((f) => (f.id === id ? { ...f, active: !f.active } : f))
    );
  };

  // Adjust funding source amount
  const handleFundingAmountChange = (id: string, amount: number) => {
    setFunding(
      funding.map((f) => (f.id === id ? { ...f, amount: Math.max(0, amount) } : f))
    );
  };

  // Auto-balance: dynamically adjust the primary grant (HOME / HTF / CDBG) so Total Funding = 100% of Total Cost!
  const handleAutoBalance = () => {
    const activeSources = funding.filter((f) => f.active);
    if (activeSources.length === 0) return;

    // We adjust the primary federal grant (usually the first one: HUD HOME)
    const primaryId = activeSources[0].id;
    const otherSourcesTotal = activeSources
      .filter((f) => f.id !== primaryId)
      .reduce((sum, f) => sum + f.amount, 0);

    const neededPrimary = Math.max(0, totalCost - otherSourcesTotal);

    setFunding(
      funding.map((f) => (f.id === primaryId ? { ...f, amount: neededPrimary } : f))
    );
  };

  // Reset to original preset
  const handleResetToPreset = () => {
    setCosts({ ...currentArchetype.defaultCosts });
    setFunding(currentArchetype.defaultFunding.map((f) => ({ ...f })));
    setDeveloperFeePercent(12);
    setHasLandDonation(false);
  };

  // Operating Pro-Forma Calculations
  const unitsCount = currentArchetype.units;
  const annualGrossRent = unitsCount * currentArchetype.averageRentPerUnit * 12;
  const vacancyRate = 0.03; // Extremely low with Section 8 PBV waitlists
  const effectiveGrossIncome = annualGrossRent * (1 - vacancyRate);
  const operatingExpenses = unitsCount * 5200; // ~$5,200/unit/yr for management, insurance, maintenance, reserves
  const netOperatingIncome = effectiveGrossIncome - operatingExpenses;
  // Because the project is 100% funded with grants and 0% soft loans, hard debt service is $0
  const hardDebtService = 0;
  const cashFlowBeforeAssetMgmt = netOperatingIncome - hardDebtService;
  const assetManagementFee = unitsCount * 1800; // $1,800/unit/yr recurring developer fee
  const netCashFlowToDeveloperHoldCo = cashFlowBeforeAssetMgmt;
  const breakEvenOccupancy = (operatingExpenses / annualGrossRent) * 100;

  return (
    <div className="space-y-8">
      {/* Top Header & Unit Archetype Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              <span>Pro-Forma & Subsidy Layering Engine</span>
              <span aria-hidden="true">·</span>
              <span>100% Federal Capital Stack</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 font-display mt-1">
              {currentArchetype.name} ({selectedUnits} Units)
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              {currentArchetype.tagline}
            </p>
          </div>

          {/* Unit Archetype Switcher */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg border border-slate-200 self-start md:self-auto">
            <button
              onClick={() => onSelectUnits(10)}
              className={`px-4 py-2 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                selectedUnits === 10
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              10 Units (Davis-Bacon Exempt)
            </button>
            <button
              onClick={() => onSelectUnits(15)}
              className={`px-4 py-2 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                selectedUnits === 15
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              15 Units (Garden Flats)
            </button>
            <button
              onClick={() => onSelectUnits(20)}
              className={`px-4 py-2 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                selectedUnits === 20
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              20 Units (4% LIHTC Stack)
            </button>
          </div>
        </div>

        {/* 100% CAPITAL STACK COVERAGE MONITOR */}
        <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  isFullyFunded
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {isFullyFunded ? (
                  <ShieldCheck className="w-6 h-6" />
                ) : (
                  <AlertCircle className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold font-mono-numbers">
                    {fundingCoveragePercent.toFixed(1)}% Capitalized
                  </span>
                  {isFullyFunded && (
                    <span className="text-xs bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded border border-emerald-500/30">
                      100% Federal Stacking Achieved
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {isFullyFunded
                    ? 'Developer Out-of-Pocket Equity: $0.00 · Entire project is 100% paid by federal & public grants.'
                    : equityRequired > 0
                    ? `Funding Gap: $${equityRequired.toLocaleString()} needed to reach 100% public funding.`
                    : `Surplus: $${fundingSurplus.toLocaleString()} over budgeted development cost.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!isFullyFunded && (
                <button
                  onClick={handleAutoBalance}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Balance to 100%</span>
                </button>
              )}
              <button
                onClick={handleResetToPreset}
                title="Reset to default archetype"
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer border border-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Progress Bar of Sources vs Costs */}
          <div className="space-y-1.5">
            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
              {funding
                .filter((f) => f.active && f.amount > 0)
                .map((f, idx) => {
                  const widthPct = Math.min(100, (f.amount / totalCost) * 100);
                  const colors = [
                    'bg-emerald-500',
                    'bg-teal-500',
                    'bg-blue-500',
                    'bg-indigo-500',
                    'bg-amber-500',
                    'bg-purple-500',
                  ];
                  return (
                    <div
                      key={f.id}
                      style={{ width: `${widthPct}%` }}
                      className={`h-full ${colors[idx % colors.length]} transition-all`}
                      title={`${f.name}: $${f.amount.toLocaleString()} (${((f.amount / totalCost) * 100).toFixed(1)}%)`}
                    />
                  );
                })}
            </div>
            <div className="flex justify-between text-xs text-slate-400 font-mono-numbers">
              <span>Total Dev Cost: ${totalCost.toLocaleString()}</span>
              <span>Federal Capital: ${totalFunding.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Tab View Switcher */}
        <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('stack')}
            className={`pb-3 cursor-pointer ${
              activeTab === 'stack'
                ? 'text-slate-900 border-b-2 border-slate-900'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Capital Stack & Development Budget
          </button>
          <button
            onClick={() => setActiveTab('operating')}
            className={`pb-3 cursor-pointer ${
              activeTab === 'operating'
                ? 'text-slate-900 border-b-2 border-slate-900'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Section 8 PBV Operating Pro-Forma & Cash Flow
          </button>
        </div>
      </div>

      {activeTab === 'stack' ? (
        /* TWO COLUMN CAPITAL STACK VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* COLUMN 1: USES OF FUNDS (Development Budget) */}
          <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Development Budget (Uses of Funds)
                </h3>
                <p className="text-xs text-slate-500">
                  Total Development Cost: ${totalCost.toLocaleString()} (${Math.round(totalCost / selectedUnits).toLocaleString()}/unit)
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Total TDC</span>
                <span className="text-lg font-bold text-slate-900 font-mono-numbers">
                  ${(totalCost / 1000).toFixed(0)}k
                </span>
              </div>
            </div>

            {/* Municipal Land Bank Option Toggle */}
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-900 block">
                  Municipal Land Bank / $0 Land Donation Option
                </span>
                <span className="text-xs text-slate-500">
                  Acquire city surplus tax parcel for $1,000 to reduce capital requirement
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleLandDonation(!hasLandDonation)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  hasLandDonation ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    hasLandDonation ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Cost Line Items */}
            <div className="space-y-4 text-xs">
              {/* Land Acquisition */}
              <div className="space-y-1">
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Land Acquisition / Site Control</span>
                  <span className="font-mono-numbers text-slate-900 font-semibold">
                    ${costs.landAcquisition.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="600000"
                  step="10000"
                  disabled={hasLandDonation}
                  value={costs.landAcquisition}
                  onChange={(e) => handleCostChange('landAcquisition', Number(e.target.value))}
                  className="w-full accent-slate-900"
                />
              </div>

              {/* Hard Construction */}
              <div className="space-y-1">
                <div className="flex justify-between font-medium text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <span>Hard Construction & Trades</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                      currentArchetype.davisBaconApplies ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {currentArchetype.davisBaconApplies ? 'Davis-Bacon Wage' : 'Open Shop Exempt'}
                    </span>
                  </div>
                  <span className="font-mono-numbers text-slate-900 font-semibold">
                    ${costs.hardConstruction.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min="800000"
                  max="5000000"
                  step="25000"
                  value={costs.hardConstruction}
                  onChange={(e) => handleCostChange('hardConstruction', Number(e.target.value))}
                  className="w-full accent-slate-900"
                />
              </div>

              {/* Site Work & Infrastructure */}
              <div className="space-y-1">
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Site Work, Grading & Utilities</span>
                  <span className="font-mono-numbers text-slate-900 font-semibold">
                    ${costs.siteWorkAndUtilities.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min="50000"
                  max="500000"
                  step="10000"
                  value={costs.siteWorkAndUtilities}
                  onChange={(e) => handleCostChange('siteWorkAndUtilities', Number(e.target.value))}
                  className="w-full accent-slate-900"
                />
              </div>

              {/* A&E (Architectural & Engineering) */}
              <div className="space-y-1">
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Architectural, Civil & Structural Engineering</span>
                  <span className="font-mono-numbers text-slate-900 font-semibold">
                    ${costs.architecturalAndEngineering.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min="50000"
                  max="350000"
                  step="5000"
                  value={costs.architecturalAndEngineering}
                  onChange={(e) => handleCostChange('architecturalAndEngineering', Number(e.target.value))}
                  className="w-full accent-slate-900"
                />
              </div>

              {/* Permits & Environmental */}
              <div className="space-y-1">
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Permits, Impact Fees & NEPA Environmental</span>
                  <span className="font-mono-numbers text-slate-900 font-semibold">
                    ${costs.permitsAndImpactFees.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min="20000"
                  max="150000"
                  step="5000"
                  value={costs.permitsAndImpactFees}
                  onChange={(e) => handleCostChange('permitsAndImpactFees', Number(e.target.value))}
                  className="w-full accent-slate-900"
                />
              </div>

              {/* Construction Contingency (10%) */}
              <div className="space-y-1">
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Construction Contingency</span>
                  <span className="font-mono-numbers text-slate-900 font-semibold">
                    ${costs.contingency.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min="50000"
                  max="400000"
                  step="5000"
                  value={costs.contingency}
                  onChange={(e) => handleCostChange('contingency', Number(e.target.value))}
                  className="w-full accent-slate-900"
                />
              </div>

              {/* DEVELOPER FEE (DIRECT PROFIT REVENUE) */}
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 space-y-2 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-emerald-900 block">
                      Developer Fee (Cash Profit to Your LLC)
                    </span>
                    <span className="text-[11px] text-emerald-700">
                      Paid in 3 cash milestone draws directly out of grant funds
                    </span>
                  </div>
                  <span className="text-base font-bold text-emerald-800 font-mono-numbers">
                    ${costs.developerFee.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-emerald-800 font-mono-numbers w-12">
                    {developerFeePercent}% TDC
                  </span>
                  <input
                    type="range"
                    min="8"
                    max="15"
                    step="1"
                    value={developerFeePercent}
                    onChange={(e) => handleDeveloperFeePercentChange(Number(e.target.value))}
                    className="w-full accent-emerald-600"
                  />
                  <span className="text-[11px] text-emerald-600">HUD QAP Max: 15%</span>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMN 2: SOURCES OF FUNDS (100% Federal Capital Stack) */}
          <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Federal Capital Stack (Sources of Funds)
                </h3>
                <p className="text-xs text-slate-500">
                  Layering non-dilutive federal, state, and bank grants
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Total Grants</span>
                <span className="text-lg font-bold text-emerald-700 font-mono-numbers">
                  ${(totalFunding / 1000).toFixed(0)}k
                </span>
              </div>
            </div>

            {/* List of Layered Sources */}
            <div className="space-y-4">
              {funding.map((source) => {
                const sourceShare = totalFunding > 0 ? (source.amount / totalFunding) * 100 : 0;
                return (
                  <div
                    key={source.id}
                    className={`p-4 rounded-xl border transition-all ${
                      source.active
                        ? 'bg-slate-50/50 border-slate-200'
                        : 'bg-slate-50/20 border-slate-100 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={source.active}
                          onChange={() => handleToggleFunding(source.id)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">
                            {source.name}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {source.agency} · {source.type}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-slate-900 font-mono-numbers block">
                          ${source.amount.toLocaleString()}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono-numbers">
                          {sourceShare.toFixed(1)}% of stack
                        </span>
                      </div>
                    </div>

                    {source.active && (
                      <div className="space-y-2 pt-2 border-t border-slate-200/60 text-xs">
                        <input
                          type="range"
                          min="0"
                          max={source.name.includes('LIHTC') ? 3500000 : 2500000}
                          step="25000"
                          value={source.amount}
                          onChange={(e) => handleFundingAmountChange(source.id, Number(e.target.value))}
                          className="w-full accent-emerald-600"
                        />
                        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
                          <span>Interest: {source.interestRate}% ({source.termYears}-Yr Forgivable)</span>
                          <span>Target: ≤{source.targetAmiMax}% AMI</span>
                          <span>Covenant: {source.affordabilityPeriodYears} Years</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick Underwriting Action */}
            <div className="pt-2">
              <button
                onClick={onNavigateToUnderwriter}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Review Deal with AI Federal Underwriter</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* TAB 2: OPERATING PRO-FORMA & SECTION 8 PBV CASH FLOW */
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-display">
                Section 8 PBV Operating Pro-Forma ({selectedUnits} Units)
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Because 100% of the building was funded with federal grants, hard debt service is $0.00/month.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <CheckCircle className="w-4 h-4" />
              <span>20-Year HUD Housing Assistance Payments (HAP) Backed</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block">Annual Gross Revenue</span>
              <span className="text-xl font-bold text-slate-900 font-mono-numbers block mt-1">
                ${annualGrossRent.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Average rent: ${currentArchetype.averageRentPerUnit}/mo (HUD FMR)
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block">Operating Expenses</span>
              <span className="text-xl font-bold text-slate-700 font-mono-numbers block mt-1">
                ${operatingExpenses.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Management, maintenance & replacement reserves
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block">Senior Debt Service</span>
              <span className="text-xl font-bold text-emerald-600 font-mono-numbers block mt-1">
                $0.00
              </span>
              <span className="text-[11px] text-emerald-700 mt-1 block">
                100% non-debt capital stack
              </span>
            </div>

            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
              <span className="text-xs font-semibold text-emerald-900 block">Net Operating Cash Flow</span>
              <span className="text-xl font-bold text-emerald-800 font-mono-numbers block mt-1">
                ${cashFlowBeforeAssetMgmt.toLocaleString()} / yr
              </span>
              <span className="text-[11px] text-emerald-700 mt-1 block">
                Includes ${assetManagementFee.toLocaleString()}/yr Asset Management Fee
              </span>
            </div>
          </div>

          {/* Operating Breakdown Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3 px-4 text-left">Operating Line Item</th>
                  <th className="py-3 px-4 text-left">Basis / Benchmark</th>
                  <th className="py-3 px-4 text-right">Per Unit / Year</th>
                  <th className="py-3 px-4 text-right">Total Annual Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-4 font-medium text-slate-900">Gross Potential Rental Revenue</td>
                  <td className="py-3 px-4 text-slate-500">HUD Section 8 Fair Market Rent (FMR)</td>
                  <td className="py-3 px-4 text-right font-mono-numbers">${(currentArchetype.averageRentPerUnit * 12).toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-mono-numbers font-semibold text-slate-900">${annualGrossRent.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-700">Less Vacancy Allowance (3.0%)</td>
                  <td className="py-3 px-4 text-slate-500">Direct PHA Voucher Waiting List Placement</td>
                  <td className="py-3 px-4 text-right font-mono-numbers">-${Math.round((annualGrossRent * 0.03) / unitsCount).toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-mono-numbers text-slate-600">-${Math.round(annualGrossRent * 0.03).toLocaleString()}</td>
                </tr>
                <tr className="bg-slate-50/50 font-semibold">
                  <td className="py-3 px-4 text-slate-900">Effective Gross Income (EGI)</td>
                  <td className="py-3 px-4 text-slate-500">Net tenant + PHA electronic HAP deposits</td>
                  <td className="py-3 px-4 text-right font-mono-numbers">${Math.round(effectiveGrossIncome / unitsCount).toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-mono-numbers text-slate-900">${Math.round(effectiveGrossIncome).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-700">Property Management Fee (8.0% of EGI)</td>
                  <td className="py-3 px-4 text-slate-500">Professional third-party affordable housing manager</td>
                  <td className="py-3 px-4 text-right font-mono-numbers">-${Math.round((effectiveGrossIncome * 0.08) / unitsCount).toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-mono-numbers text-slate-600">-${Math.round(effectiveGrossIncome * 0.08).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-700">Repairs, Maintenance & Turnover</td>
                  <td className="py-3 px-4 text-slate-500">$1,400 per unit annual reserve</td>
                  <td className="py-3 px-4 text-right font-mono-numbers">-$1,400</td>
                  <td className="py-3 px-4 text-right font-mono-numbers text-slate-600">-${(unitsCount * 1400).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-700">Hazard Insurance & Flood Risk</td>
                  <td className="py-3 px-4 text-slate-500">$950 per unit commercial policy</td>
                  <td className="py-3 px-4 text-right font-mono-numbers">-$950</td>
                  <td className="py-3 px-4 text-right font-mono-numbers text-slate-600">-${(unitsCount * 950).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-700">Common Utilities & Solar Maintenance</td>
                  <td className="py-3 px-4 text-slate-500">Water/sewer/trash + IRA solar offset</td>
                  <td className="py-3 px-4 text-right font-mono-numbers">-$750</td>
                  <td className="py-3 px-4 text-right font-mono-numbers text-slate-600">-${(unitsCount * 750).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-700">Mandatory Replacement Reserves</td>
                  <td className="py-3 px-4 text-slate-500">Escrow account required by HUD/HFA</td>
                  <td className="py-3 px-4 text-right font-mono-numbers">-$450</td>
                  <td className="py-3 px-4 text-right font-mono-numbers text-slate-600">-${(unitsCount * 450).toLocaleString()}</td>
                </tr>
                <tr className="bg-emerald-50/60 font-bold">
                  <td className="py-3 px-4 text-emerald-900">Net Operating Income (Free Cash Flow)</td>
                  <td className="py-3 px-4 text-emerald-700">Break-even occupancy is only {breakEvenOccupancy.toFixed(1)}%!</td>
                  <td className="py-3 px-4 text-right font-mono-numbers text-emerald-800">${Math.round(netOperatingIncome / unitsCount).toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-mono-numbers text-emerald-800">${Math.round(netOperatingIncome).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

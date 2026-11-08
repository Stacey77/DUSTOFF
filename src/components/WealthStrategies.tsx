import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Building2,
  Sparkles,
  ArrowRight,
  Layers,
  Lock,
  Percent,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Scale,
  Award,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  commercialBrrrrPresets,
  generateBuyBorrowDieProjections,
  generate10YearBrrrrProjections,
  estateTrustRoadmap,
} from '../data/wealthStrategies';

interface WealthStrategiesProps {
  onNavigateToTab: (tab: 'overview' | 'pipeline' | 'stacker' | 'strategy' | 'unitmix' | 'wealth' | 'underwriter') => void;
}

export const WealthStrategies: React.FC<WealthStrategiesProps> = ({ onNavigateToTab }) => {
  const [activeStrategy, setActiveStrategy] = useState<'brrrr' | 'buyborrowdie'>('brrrr');
  const [selectedBrrrrUnits, setSelectedBrrrrUnits] = useState<10 | 15 | 20>(10);

  // BRRRR Interactive Parameters
  const [customCapRate, setCustomCapRate] = useState<number>(6.25);
  const [customRefiLtv, setCustomRefiLtv] = useState<number>(70);

  // Buy, Borrow, Die Interactive Parameters
  const [bbdPortfolioPreset, setBbdPortfolioPreset] = useState<'10' | '15' | '20' | 'bundle' | 'custom'>('15');
  const [initialPortfolioValue, setInitialPortfolioValue] = useState<number>(4850000);
  const [appreciationRate, setAppreciationRate] = useState<number>(4.0);
  const [borrowingLtv, setBorrowingLtv] = useState<number>(65);
  const [stateTaxRate, setStateTaxRate] = useState<number>(5.0);
  const [selectedHorizonYears, setSelectedHorizonYears] = useState<10 | 20 | 30>(20);
  const [bbdViewMode, setBbdViewMode] = useState<'comparison' | 'chart' | 'taxledger'>('comparison');

  const activeBrrrrPreset = commercialBrrrrPresets[selectedBrrrrUnits];

  // Dynamic BRRRR Calculations
  const calculatedAppraisedValue = Math.round(activeBrrrrPreset.netOperatingIncome / (customCapRate / 100));
  const calculatedGrossLoan = Math.round(calculatedAppraisedValue * (customRefiLtv / 100));
  // In federal affordable housing, senior debt cannot displace existing grant affordability covenants,
  // but HUD 223(f) non-recourse perm debt or supplemental subordinate equity pulls allow extracting net cash:
  const calculatedNetCashOut = Math.round(calculatedGrossLoan * 0.28); // Net cashout after soft debt subordination
  const totalCashExtracted = activeBrrrrPreset.developerFeeProfit + calculatedNetCashOut;

  // BRRRR 10-Year Visualization Controls & Data
  const [brrrrChartView, setBrrrrChartView] = useState<'equity' | 'cashflow' | 'table'>('equity');
  const [brrrrAppreciation, setBrrrrAppreciation] = useState<number>(4.0);
  const [brrrrRefiYear, setBrrrrRefiYear] = useState<number>(3);

  const brrrr10YearData = generate10YearBrrrrProjections(
    selectedBrrrrUnits,
    brrrrAppreciation,
    customCapRate,
    customRefiLtv,
    brrrrRefiYear
  );

  const finalYearData = brrrr10YearData[brrrr10YearData.length - 1];

  // Buy Borrow Die Projections
  const projections = generateBuyBorrowDieProjections(
    initialPortfolioValue,
    appreciationRate,
    borrowingLtv,
    stateTaxRate,
    30
  );

  const activeHorizonData = projections.find((p) => p.year === selectedHorizonYears) || projections[2];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              <span>Institutional Wealth Engineering</span>
              <span aria-hidden="true">·</span>
              <span>Commercial BRRRR & Generational Capital</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 font-display mt-1">
              Commercial BRRRR & Buy, Borrow, Die Strategy
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Model multi-family wealth accumulation: recycle federal capital with infinite return on equity, borrow tax-free against rising equity, and permanently eliminate capital gains taxes for heirs under IRC §1014.
            </p>
          </div>

          {/* Strategy View Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs shrink-0 self-start md:self-auto">
            <button
              onClick={() => setActiveStrategy('brrrr')}
              className={`px-3.5 py-1.5 rounded-md font-bold transition-colors cursor-pointer ${
                activeStrategy === 'brrrr'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Commercial BRRRR Method
            </button>
            <button
              onClick={() => setActiveStrategy('buyborrowdie')}
              className={`px-3.5 py-1.5 rounded-md font-bold transition-colors cursor-pointer ${
                activeStrategy === 'buyborrowdie'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Buy, Borrow, Die Engine
            </button>
          </div>
        </div>
      </div>

      {activeStrategy === 'brrrr' ? (
        /* STRATEGY 1: COMMERCIAL FEDERAL BRRRR */
        <div className="space-y-8">
          {/* Preset Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Select Multi-Family Scale:
            </span>
            <div className="flex items-center gap-2">
              {[10, 15, 20].map((units) => (
                <button
                  key={units}
                  onClick={() => {
                    setSelectedBrrrrUnits(units as 10 | 15 | 20);
                    setCustomCapRate(commercialBrrrrPresets[units as 10 | 15 | 20].defaultCapRate);
                    setCustomRefiLtv(commercialBrrrrPresets[units as 10 | 15 | 20].defaultRefiLtv);
                  }}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    selectedBrrrrUnits === units
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {units} Units BRRRR
                </button>
              ))}
            </div>
          </div>

          {/* BRRRR 5-Stage Visual Workflow Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {/* BUY */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded bg-slate-900 text-white font-bold text-xs flex items-center justify-center font-mono-numbers">
                  B
                </span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Stage 01</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 font-display">Buy / Acquire</h3>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Tie up infill parcel via $1 Land Bank option or contingent contract with $0 down.
              </p>
              <div className="pt-2 border-t border-slate-100 text-[11px] font-mono-numbers">
                <span className="text-slate-400 block text-[10px]">Site Outlay:</span>
                <span className="font-bold text-slate-900">$1,000 – $5,000 Earnest</span>
              </div>
            </div>

            {/* REHAB / BUILD */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded bg-emerald-600 text-white font-bold text-xs flex items-center justify-center font-mono-numbers">
                  R
                </span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Stage 02</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 font-display">Rehab / Build</h3>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                100% funded with federal grants (HOME/HTF/AHP). Draw 12% cash Developer Fee.
              </p>
              <div className="pt-2 border-t border-slate-100 text-[11px] font-mono-numbers">
                <span className="text-slate-400 block text-[10px]">Fee Extracted:</span>
                <span className="font-bold text-emerald-700">+${(activeBrrrrPreset.developerFeeProfit / 1000).toFixed(0)}k Cash</span>
              </div>
            </div>

            {/* RENT */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded bg-blue-600 text-white font-bold text-xs flex items-center justify-center font-mono-numbers">
                  R
                </span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Stage 03</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 font-display">Rent & Stabilize</h3>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                100% leased via Section 8 PBV waitlists. Zero private debt drives break-even to 50%.
              </p>
              <div className="pt-2 border-t border-slate-100 text-[11px] font-mono-numbers">
                <span className="text-slate-400 block text-[10px]">Stabilized NOI:</span>
                <span className="font-bold text-slate-900">${(activeBrrrrPreset.netOperatingIncome / 1000).toFixed(0)}k / year</span>
              </div>
            </div>

            {/* REFINANCE */}
            <div className="bg-white p-4 rounded-xl border border-emerald-300 ring-1 ring-emerald-500/20 bg-emerald-50/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded bg-amber-600 text-white font-bold text-xs flex items-center justify-center font-mono-numbers">
                  R
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold uppercase">Stage 04</span>
              </div>
              <h3 className="text-sm font-bold text-emerald-950 font-display">Refinance (Cashout)</h3>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Execute HUD 223(f) non-recourse refinance at 70% LTV against new appraised value.
              </p>
              <div className="pt-2 border-t border-emerald-100 text-[11px] font-mono-numbers">
                <span className="text-emerald-700 block text-[10px]">Tax-Free Cash Out:</span>
                <span className="font-bold text-emerald-800">+${(calculatedNetCashOut / 1000).toFixed(0)}k Non-Taxable</span>
              </div>
            </div>

            {/* REPEAT */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded bg-indigo-600 text-white font-bold text-xs flex items-center justify-center font-mono-numbers">
                  R
                </span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Stage 05</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 font-display">Repeat & Scale</h3>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Deploy accumulated capital into the next 15–20 unit development with infinite ROE.
              </p>
              <div className="pt-2 border-t border-slate-100 text-[11px] font-mono-numbers">
                <span className="text-slate-400 block text-[10px]">Capital Available:</span>
                <span className="font-bold text-indigo-700">${(totalCashExtracted / 1000).toFixed(0)}k Total</span>
              </div>
            </div>
          </div>

          {/* Interactive Refinance Parameters & Returns Cockpit */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-6 space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Post-Stabilization Valuation & Refinance Sliders
                </h3>
                <p className="text-xs text-slate-500">
                  Adjust market exit cap rate and loan-to-value to calculate your tax-free cash extraction
                </p>
              </div>

              <div className="space-y-5 text-xs">
                {/* Cap Rate Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-700">Market Capitalization Rate (Cap Rate)</span>
                    <span className="font-mono-numbers text-slate-900">{customCapRate.toFixed(2)}%</span>
                  </div>
                  <input
                    type="range"
                    min="5.0"
                    max="8.0"
                    step="0.05"
                    value={customCapRate}
                    onChange={(e) => setCustomCapRate(Number(e.target.value))}
                    className="w-full accent-slate-900"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>5.0% (Prime Urban Core)</span>
                    <span>8.0% (Tertiary Market)</span>
                  </div>
                </div>

                {/* Refi LTV Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-700">Refinance Loan-to-Value (LTV)</span>
                    <span className="font-mono-numbers text-slate-900">{customRefiLtv}% LTV</span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="75"
                    step="1"
                    value={customRefiLtv}
                    onChange={(e) => setCustomRefiLtv(Number(e.target.value))}
                    className="w-full accent-slate-900"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>60% (Conservative)</span>
                    <span>75% (HUD 223(f) Maximum)</span>
                  </div>
                </div>

                {/* Resulting Appraised Valuation */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Stabilized NOI</span>
                    <span className="text-sm font-bold text-slate-900 font-mono-numbers">
                      ${activeBrrrrPreset.netOperatingIncome.toLocaleString()} / yr
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">New Appraised Value</span>
                    <span className="text-sm font-bold text-emerald-700 font-mono-numbers">
                      ${calculatedAppraisedValue.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Summary / Infinite ROE Card */}
            <div className="lg:col-span-6 bg-slate-900 text-white rounded-xl border border-slate-800 p-6 space-y-6">
              <div className="border-b border-slate-800 pb-3">
                <span className="text-xs text-emerald-400 uppercase tracking-wider font-semibold block">
                  Federal BRRRR Performance Ledger
                </span>
                <h3 className="text-lg font-bold font-display text-white mt-0.5">
                  The Infinite Return on Equity ($\infty$) Equation
                </h3>
              </div>

              <div className="space-y-3 text-xs font-mono-numbers">
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Personal Cash Equity Invested:</span>
                  <span className="text-white font-bold">$0.00</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Upfront Cash Developer Fee:</span>
                  <span className="text-emerald-400 font-bold">+${activeBrrrrPreset.developerFeeProfit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Tax-Free Refinance Cashout:</span>
                  <span className="text-emerald-400 font-bold">+${calculatedNetCashOut.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-slate-700 text-sm">
                  <span className="text-white font-bold">Total Liquid Cash Generated:</span>
                  <span className="text-emerald-300 font-bold text-base">+${totalCashExtracted.toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-emerald-950/60 p-4 rounded-xl border border-emerald-500/30 text-xs text-emerald-200 space-y-1">
                <span className="font-bold text-emerald-300 block">Why Loan Proceeds Are Non-Taxable:</span>
                <p className="leading-relaxed text-[11px] text-emerald-200/90">
                  Under the Internal Revenue Code, borrowed funds do not constitute taxable income. By pulling cash out via a permanent mortgage refinance rather than selling, you pay <strong>$0 in capital gains taxes</strong> while retaining 100% ownership and monthly Section 8 PBV cashflow.
                </p>
              </div>
            </div>
          </div>

          {/* DATA VISUALIZATION MODULE USING RECHARTS: 10-YEAR BRRRR RETURNS & EQUITY GROWTH */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 lg:p-8 space-y-6">
            {/* Header with Title and Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                  <span>Recharts Data Visualization Engine</span>
                  <span aria-hidden="true">·</span>
                  <span>10-Year Projections</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 font-display mt-0.5">
                  10-Year BRRRR Equity Growth & Cash-on-Cash Return Model
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visualizing asset appreciation, debt paydown, tax-free cash-out liquidity, and net developer wealth for {selectedBrrrrUnits} Units.
                </p>
              </div>

              {/* View Switcher: Equity Chart | Cash Flow Chart | Table */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs self-start sm:self-auto shrink-0">
                <button
                  onClick={() => setBrrrrChartView('equity')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                    brrrrChartView === 'equity'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Equity & Wealth Growth
                </button>
                <button
                  onClick={() => setBrrrrChartView('cashflow')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                    brrrrChartView === 'cashflow'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Annual Cash Flow & Returns
                </button>
                <button
                  onClick={() => setBrrrrChartView('table')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                    brrrrChartView === 'table'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  10-Year Ledger Table
                </button>
              </div>
            </div>

            {/* Quick KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Year 10 Net Developer Wealth</span>
                <span className="text-lg font-bold text-slate-900 font-mono-numbers block mt-0.5">
                  ${(finalYearData.totalNetWealth / 1000000).toFixed(2)}M
                </span>
                <span className="text-[10px] text-slate-500">Property equity + liquid cash</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Cumulative Liquid Cash Pulled</span>
                <span className="text-lg font-bold text-emerald-700 font-mono-numbers block mt-0.5">
                  ${(finalYearData.cumulativeLiquidCash / 1000000).toFixed(2)}M
                </span>
                <span className="text-[10px] text-emerald-600">Tax-free developer fee & refi cash</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Year 10 Ending Property Equity</span>
                <span className="text-lg font-bold text-slate-900 font-mono-numbers block mt-0.5">
                  ${(finalYearData.propertyEquity / 1000000).toFixed(2)}M
                </span>
                <span className="text-[10px] text-slate-500">Value minus debt amortized</span>
              </div>
              <div className="bg-emerald-50 p-3.5 rounded-lg border border-emerald-200">
                <span className="text-emerald-800 block text-[11px] font-semibold">Cash-on-Cash Return</span>
                <span className="text-lg font-bold text-emerald-900 font-mono-numbers block mt-0.5">
                  Infinite (∞)
                </span>
                <span className="text-[10px] text-emerald-700 font-medium">$0 out-of-pocket developer equity</span>
              </div>
            </div>

            {/* Sensitivity Controls (Sliders) */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-700">Annual Appreciation Rate:</span>
                <input
                  type="range"
                  min="2.0"
                  max="6.0"
                  step="0.5"
                  value={brrrrAppreciation}
                  onChange={(e) => setBrrrrAppreciation(Number(e.target.value))}
                  className="w-28 accent-slate-900"
                />
                <span className="font-mono-numbers font-bold text-slate-900 w-12">{brrrrAppreciation}%/yr</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Refinance Event Year:</span>
                {[2, 3, 4].map((yr) => (
                  <button
                    key={yr}
                    onClick={() => setBrrrrRefiYear(yr)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                      brrrrRefiYear === yr
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Year {yr}
                  </button>
                ))}
              </div>
            </div>

            {/* CHARTS CONTAINER */}
            {brrrrChartView === 'equity' && (
              <div className="space-y-2">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={brrrr10YearData}
                      margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="yearLabel"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`}
                      />
                      <Tooltip
                        formatter={(val: any, name: any) => [
                          typeof val === 'number' ? `$${val.toLocaleString()}` : val,
                          name === 'propertyEquity'
                            ? 'Property Equity'
                            : name === 'cumulativeLiquidCash'
                            ? 'Cumulative Liquid Cash'
                            : name === 'totalNetWealth'
                            ? 'Total Net Wealth'
                            : 'Outstanding Debt',
                        ]}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          fontSize: '12px',
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        height={36}
                        formatter={(value) => {
                          if (value === 'propertyEquity') return 'Property Equity';
                          if (value === 'cumulativeLiquidCash') return 'Cumulative Liquid Cash Pulled';
                          if (value === 'totalNetWealth') return 'Total Net Wealth';
                          return 'Outstanding Debt';
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="propertyEquity"
                        stroke="#059669"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#emeraldGrad)"
                        name="propertyEquity"
                      />
                      <Area
                        type="monotone"
                        dataKey="cumulativeLiquidCash"
                        stroke="#2563eb"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#blueGrad)"
                        name="cumulativeLiquidCash"
                      />
                      <Line
                        type="monotone"
                        dataKey="totalNetWealth"
                        stroke="#0f172a"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: '#0f172a' }}
                        name="totalNetWealth"
                      />
                      <Line
                        type="monotone"
                        dataKey="outstandingDebt"
                        stroke="#d97706"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        dot={false}
                        name="outstandingDebt"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Note: Refinance debt placed in Year {brrrrRefiYear} extracts tax-free equity while principal amortizes down annually.</span>
                  <span className="font-mono-numbers font-medium text-slate-700">10-Year Cumulative Wealth: ${(finalYearData.totalNetWealth / 1000000).toFixed(2)}M</span>
                </div>
              </div>
            )}

            {brrrrChartView === 'cashflow' && (
              <div className="space-y-2">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={brrrr10YearData}
                      margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="yearLabel"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => `${(val / 100).toFixed(0)}x`}
                      />
                      <Tooltip
                        formatter={(val: any, name: any) => {
                          if (name === 'cashOnCashPercent') {
                            return [`${val.toLocaleString()}% on nominal earnest ($5k)`, 'Cash-on-Cash Return'];
                          }
                          const labels: Record<string, string> = {
                            developerFeeCash: 'Developer Fee Drawn',
                            refiProceedsExtracted: 'Refinance Cashout',
                            netAnnualCashFlow: 'Net Rental Cashflow',
                          };
                          return [`$${Number(val).toLocaleString()}`, labels[name] || name];
                        }}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '12px',
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        height={36}
                        formatter={(val) => {
                          if (val === 'developerFeeCash') return 'Upfront Developer Fee';
                          if (val === 'refiProceedsExtracted') return 'Refinance Cashout (Tax-Free)';
                          if (val === 'netAnnualCashFlow') return 'Net Rental Cash Flow';
                          return 'Cash-on-Cash Multiple (Right Axis)';
                        }}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="developerFeeCash"
                        stackId="a"
                        fill="#059669"
                        name="developerFeeCash"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="refiProceedsExtracted"
                        stackId="a"
                        fill="#d97706"
                        name="refiProceedsExtracted"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="netAnnualCashFlow"
                        stackId="a"
                        fill="#3b82f6"
                        name="netAnnualCashFlow"
                        radius={[4, 4, 0, 0]}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="cashOnCashPercent"
                        stroke="#0f172a"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="cashOnCashPercent"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Year 1 captures the Developer Fee; Year {brrrrRefiYear} reflects the tax-free cash-out refinance event.</span>
                  <span className="font-mono-numbers font-medium text-emerald-700">All cash proceeds are 100% non-dilutive.</span>
                </div>
              </div>
            )}

            {brrrrChartView === 'table' && (
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Period</th>
                      <th className="py-2.5 px-3 text-right">Appraised Value</th>
                      <th className="py-2.5 px-3 text-right">Mortgage Debt</th>
                      <th className="py-2.5 px-3 text-right">Property Equity</th>
                      <th className="py-2.5 px-3 text-right">Rental Cash Flow</th>
                      <th className="py-2.5 px-3 text-right">Refi / Dev Fee</th>
                      <th className="py-2.5 px-3 text-right">Cumulative Liquid</th>
                      <th className="py-2.5 px-3 text-right font-bold text-slate-900">Total Net Wealth</th>
                      <th className="py-2.5 px-3 text-right text-emerald-700">Cash-on-Cash Return</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono-numbers">
                    {brrrr10YearData.map((row) => (
                      <tr key={row.yearNumber} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-bold text-slate-900">{row.yearLabel}</td>
                        <td className="py-2 px-3 text-right">${row.propertyAppraisedValue.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-slate-500">
                          {row.outstandingDebt > 0 ? `$${row.outstandingDebt.toLocaleString()}` : '$0'}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-800">
                          ${row.propertyEquity.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right text-blue-700">
                          ${row.netAnnualCashFlow.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right text-amber-700 font-semibold">
                          {row.yearNumber === 1
                            ? `+$${row.developerFeeCash.toLocaleString()} (Fee)`
                            : row.yearNumber === brrrrRefiYear
                            ? `+$${row.refiProceedsExtracted.toLocaleString()} (Refi)`
                            : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-emerald-700">
                          ${row.cumulativeLiquidCash.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          ${row.totalNetWealth.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-800">
                          {row.cashOnCashPercent.toLocaleString()}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* STRATEGY 2: BUY, BORROW, DIE GENERATIONAL WEALTH & IRC §1014 SIMULATOR */
        <div className="space-y-8">
          {/* Portfolio Configuration & Benchmark Controls */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                  <span>Generational Estate Simulation</span>
                  <span aria-hidden="true">·</span>
                  <span>IRC §1014 Stepped-Up Basis Engine</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 font-display mt-0.5">
                  10–20 Unit Affordable Housing Generational Wealth Transfer Simulator
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                  Simulate passing your 100% grant-funded, Section 8-backed multi-family portfolio to heirs through an Irrevocable Dynasty Trust, wiping out all accumulated depreciation recapture and capital gains taxes.
                </p>
              </div>

              {/* Portfolio Preset Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider hidden sm:inline">Portfolio:</span>
                {[
                  { key: '10', label: '10 Units ($3.15M)', val: 3150000, units: 10 },
                  { key: '15', label: '15 Units ($4.85M)', val: 4850000, units: 15 },
                  { key: '20', label: '20 Units ($6.80M)', val: 6800000, units: 20 },
                  { key: 'bundle', label: '10+15+20 Bundle ($14.8M)', val: 14800000, units: 45 },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      setBbdPortfolioPreset(item.key as any);
                      setInitialPortfolioValue(item.val);
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      bbdPortfolioPreset === item.key
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Simulation Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-700">Initial Asset Basis / Value:</span>
                  <span className="font-mono-numbers text-slate-900">${(initialPortfolioValue / 1000000).toFixed(2)}M</span>
                </div>
                <input
                  type="range"
                  min="2000000"
                  max="20000000"
                  step="250000"
                  value={initialPortfolioValue}
                  onChange={(e) => {
                    setInitialPortfolioValue(Number(e.target.value));
                    setBbdPortfolioPreset('custom');
                  }}
                  className="w-full accent-slate-900"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>$2.0M (10-Unit)</span>
                  <span>$20.0M (Portfolio)</span>
                </div>
              </div>

              <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-700">Annual Appreciation:</span>
                  <span className="font-mono-numbers text-slate-900">{appreciationRate.toFixed(1)}% / yr</span>
                </div>
                <input
                  type="range"
                  min="2.0"
                  max="6.0"
                  step="0.5"
                  value={appreciationRate}
                  onChange={(e) => setAppreciationRate(Number(e.target.value))}
                  className="w-full accent-slate-900"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>2.0% (Conservative)</span>
                  <span>6.0% (High Growth)</span>
                </div>
              </div>

              <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-700">Refi / ELOC Borrowing LTV:</span>
                  <span className="font-mono-numbers text-slate-900">{borrowingLtv}% LTV</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="75"
                  step="5"
                  value={borrowingLtv}
                  onChange={(e) => setBorrowingLtv(Number(e.target.value))}
                  className="w-full accent-slate-900"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>50% (Ultra-Safe)</span>
                  <span>75% (HUD Max)</span>
                </div>
              </div>

              <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-700">State Income/Capital Gains Tax:</span>
                  <span className="font-mono-numbers text-slate-900">{stateTaxRate.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="13.3"
                  step="0.5"
                  value={stateTaxRate}
                  onChange={(e) => setStateTaxRate(Number(e.target.value))}
                  className="w-full accent-slate-900"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>0% (TX/FL/NV)</span>
                  <span>13.3% (CA Top)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Core Simulation Horizon & Mode Switcher */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">
                  Select Inheritance Horizon:
                </span>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {[10, 20, 30].map((yr) => (
                    <button
                      key={yr}
                      onClick={() => setSelectedHorizonYears(yr as 10 | 20 | 30)}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                        selectedHorizonYears === yr
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {yr}-Year Estate Transfer
                    </button>
                  ))}
                </div>
              </div>

              {/* View toggle */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs self-start sm:self-auto shrink-0">
                <button
                  onClick={() => setBbdViewMode('comparison')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                    bbdViewMode === 'comparison'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sell vs. Step-Up Audit
                </button>
                <button
                  onClick={() => setBbdViewMode('chart')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                    bbdViewMode === 'chart'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  30-Year Stepped-Up Chart
                </button>
                <button
                  onClick={() => setBbdViewMode('taxledger')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                    bbdViewMode === 'taxledger'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  IRS §1014 Savings Ledger
                </button>
              </div>
            </div>

            {/* Quick KPI Cards for Selected Horizon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Fair Market Value (Year {selectedHorizonYears})</span>
                <span className="text-lg font-bold text-slate-900 font-mono-numbers block mt-0.5">
                  ${(activeHorizonData.portfolioAssetValue / 1000000).toFixed(2)}M
                </span>
                <span className="text-[10px] text-slate-500">Appraised portfolio equity</span>
              </div>
              <div className="bg-rose-50 p-3.5 rounded-lg border border-rose-200">
                <span className="text-rose-700 block text-[11px] font-semibold">Taxes Destroyed if Sold</span>
                <span className="text-lg font-bold text-rose-950 font-mono-numbers block mt-0.5">
                  -${(activeHorizonData.totalTaxesIfSold / 1000000).toFixed(2)}M
                </span>
                <span className="text-[10px] text-rose-700 font-mono-numbers">
                  {activeHorizonData.effectiveTaxDestructionRate}% effective tax burden
                </span>
              </div>
              <div className="bg-emerald-50 p-3.5 rounded-lg border border-emerald-200">
                <span className="text-emerald-800 block text-[11px] font-semibold">IRC §1014 Tax Savings</span>
                <span className="text-lg font-bold text-emerald-900 font-mono-numbers block mt-0.5">
                  +${(activeHorizonData.heirSteppedUpBasisBenefit / 1000000).toFixed(2)}M
                </span>
                <span className="text-[10px] text-emerald-700 font-medium">100% wiped out for heirs</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Tax-Free Liquidity Drawn</span>
                <span className="text-lg font-bold text-slate-900 font-mono-numbers block mt-0.5">
                  ${(activeHorizonData.taxFreeBorrowingCapacity / 1000000).toFixed(2)}M
                </span>
                <span className="text-[10px] text-slate-500">Living allowance via ELOC/Refi</span>
              </div>
            </div>

            {/* TAB CONTENT 1: COMPARISON AUDIT */}
            {bbdViewMode === 'comparison' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Traditional Exit: Sell & Liquidate */}
                <div className="bg-rose-50/50 p-5 rounded-xl border border-rose-200 space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-rose-200 pb-2">
                    <div>
                      <span className="font-bold text-rose-950 uppercase tracking-wider text-xs block">
                        Scenario A: Sell & Liquidate (Year {selectedHorizonYears})
                      </span>
                      <span className="text-[11px] text-rose-700">Triggering full taxation & closing friction</span>
                    </div>
                    <span className="px-2 py-0.5 bg-rose-200 text-rose-900 font-bold text-[10px] rounded uppercase font-mono-numbers">
                      -{activeHorizonData.effectiveTaxDestructionRate}% Lost
                    </span>
                  </div>

                  <div className="space-y-2 font-mono-numbers">
                    <div className="flex justify-between text-slate-700">
                      <span>Gross Portfolio Sale Price:</span>
                      <span className="font-bold text-slate-900">${activeHorizonData.portfolioAssetValue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Original Cost Basis (100% Grant Funded):</span>
                      <span>${initialPortfolioValue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Accumulated 27.5-Yr Depreciation:</span>
                      <span>-${activeHorizonData.accumulatedDepreciation.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-700 font-semibold border-b border-rose-200 pb-1">
                      <span>Adjusted Tax Basis:</span>
                      <span>${activeHorizonData.adjustedBasis.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-rose-700">
                      <span>Depreciation Recapture Tax (25% on ${activeHorizonData.accumulatedDepreciation.toLocaleString()}):</span>
                      <span>-${activeHorizonData.depreciationRecaptureTax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-rose-700">
                      <span>Federal Long-Term Capital Gains (20%):</span>
                      <span>-${activeHorizonData.longTermCapitalGainsTax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-rose-700">
                      <span>Net Investment Income Tax (NIIT 3.8%):</span>
                      <span>-${activeHorizonData.niitTax.toLocaleString()}</span>
                    </div>
                    {activeHorizonData.stateCapitalGainsTax > 0 && (
                      <div className="flex justify-between text-rose-700">
                        <span>State Capital Gains Tax ({stateTaxRate}%):</span>
                        <span>-${activeHorizonData.stateCapitalGainsTax.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-rose-700">
                      <span>Commercial Brokerage & Legal (5%):</span>
                      <span>-${activeHorizonData.brokerClosingCosts.toLocaleString()}</span>
                    </div>
                    <div className="pt-2 border-t border-rose-300 flex justify-between font-bold text-rose-950 text-sm">
                      <span>Total Wealth Destroyed:</span>
                      <span>-${(activeHorizonData.totalTaxesIfSold + activeHorizonData.brokerClosingCosts).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 pt-1">
                      <span>Net Cash Inherited by Heirs:</span>
                      <span>${(activeHorizonData.portfolioAssetValue - (activeHorizonData.totalTaxesIfSold + activeHorizonData.brokerClosingCosts)).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Buy, Borrow, Die: Stepped-Up Basis Execution */}
                <div className="bg-emerald-50/60 p-5 rounded-xl border border-emerald-300 space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                    <div>
                      <span className="font-bold text-emerald-950 uppercase tracking-wider text-xs block">
                        Scenario B: Buy, Borrow, Die (IRC §1014)
                      </span>
                      <span className="text-[11px] text-emerald-700">Borrow tax-free during life; transfer via Dynasty Trust</span>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 font-bold text-[10px] rounded uppercase font-mono-numbers">
                      $0 Tax Liability
                    </span>
                  </div>

                  <div className="space-y-2 font-mono-numbers">
                    <div className="flex justify-between text-slate-700">
                      <span>Portfolio Asset Value at Transfer:</span>
                      <span className="font-bold text-slate-900">${activeHorizonData.portfolioAssetValue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-emerald-800">
                      <span>Tax-Free Borrowed Liquidity (During Lifetime):</span>
                      <span className="font-bold">+${activeHorizonData.taxFreeBorrowingCapacity.toLocaleString()} Cash</span>
                    </div>
                    <div className="flex justify-between text-emerald-800">
                      <span>Taxes Paid on Borrowed Refi Proceeds:</span>
                      <span className="font-bold text-emerald-700">$0.00 (Debt is Not Income)</span>
                    </div>
                    <div className="flex justify-between text-emerald-800">
                      <span>Prior Adjusted Basis:</span>
                      <span>${activeHorizonData.adjustedBasis.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-emerald-800 font-semibold border-b border-emerald-200 pb-1">
                      <span>New Basis Stepped-Up Under IRC §1014:</span>
                      <span className="font-bold text-emerald-900">${activeHorizonData.portfolioAssetValue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-emerald-800">
                      <span>Depreciation Recapture Erased:</span>
                      <span className="font-bold text-emerald-700">+$ {activeHorizonData.depreciationRecaptureTax.toLocaleString()} Saved</span>
                    </div>
                    <div className="flex justify-between text-emerald-800">
                      <span>Capital Gains & NIIT Erased:</span>
                      <span className="font-bold text-emerald-700">+${(activeHorizonData.longTermCapitalGainsTax + activeHorizonData.niitTax).toLocaleString()} Saved</span>
                    </div>
                    {activeHorizonData.stateCapitalGainsTax > 0 && (
                      <div className="flex justify-between text-emerald-800">
                        <span>State Capital Gains Erased:</span>
                        <span className="font-bold text-emerald-700">+${activeHorizonData.stateCapitalGainsTax.toLocaleString()} Saved</span>
                      </div>
                    )}
                    <div className="flex justify-between text-emerald-800">
                      <span>Broker Commission Saved (Property Kept):</span>
                      <span className="font-bold text-emerald-700">+${activeHorizonData.brokerClosingCosts.toLocaleString()} Saved</span>
                    </div>
                    <div className="pt-2 border-t border-emerald-300 flex justify-between font-bold text-emerald-950 text-sm">
                      <span>Total Generational Tax Saved:</span>
                      <span className="text-emerald-800">+${activeHorizonData.heirSteppedUpBasisBenefit.toLocaleString()} (100%)</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 pt-1">
                      <span>Family Portfolio Value Preserved:</span>
                      <span className="text-emerald-900 font-bold">${activeHorizonData.portfolioAssetValue.toLocaleString()} Intact</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: 30-YEAR RECHARTS CHART */}
            {bbdViewMode === 'chart' && (
              <div className="space-y-3">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={projections}
                      margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="bbdAssetGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0f172a" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#0f172a" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="bbdTaxGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="bbdBorrowGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="year"
                        tickFormatter={(val) => `Year ${val}`}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`}
                      />
                      <Tooltip
                        formatter={(val: any, name: any) => [
                          `$${Number(val).toLocaleString()}`,
                          name === 'portfolioAssetValue'
                            ? 'Portfolio Asset Value (FMV)'
                            : name === 'heirSteppedUpBasisBenefit'
                            ? 'IRC §1014 Tax Savings for Heirs'
                            : name === 'taxFreeBorrowingCapacity'
                            ? 'Tax-Free Borrowing Capacity (65% LTV)'
                            : 'Adjusted Tax Basis',
                        ]}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          fontSize: '12px',
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        height={36}
                        formatter={(val) => {
                          if (val === 'portfolioAssetValue') return 'Portfolio Value (FMV Stepped-Up)';
                          if (val === 'heirSteppedUpBasisBenefit') return 'IRC §1014 Tax Savings for Heirs';
                          if (val === 'taxFreeBorrowingCapacity') return 'Tax-Free Borrowing Capacity';
                          return 'Adjusted Basis (Decaying)';
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="portfolioAssetValue"
                        stroke="#0f172a"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#bbdAssetGrad)"
                        name="portfolioAssetValue"
                      />
                      <Area
                        type="monotone"
                        dataKey="heirSteppedUpBasisBenefit"
                        stroke="#059669"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#bbdTaxGrad)"
                        name="heirSteppedUpBasisBenefit"
                      />
                      <Area
                        type="monotone"
                        dataKey="taxFreeBorrowingCapacity"
                        stroke="#2563eb"
                        strokeWidth={1.5}
                        fillOpacity={1}
                        fill="url(#bbdBorrowGrad)"
                        name="taxFreeBorrowingCapacity"
                      />
                      <Line
                        type="monotone"
                        dataKey="adjustedBasis"
                        stroke="#dc2626"
                        strokeDasharray="4 4"
                        strokeWidth={2}
                        dot={false}
                        name="adjustedBasis"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>The green area represents the exact tax destruction permanently avoided by passing the real estate through IRC §1014 rather than selling.</span>
                  <span className="font-mono-numbers font-medium text-emerald-700">Year 30 Tax Wiped: ${(projections[projections.length - 1].heirSteppedUpBasisBenefit / 1000000).toFixed(2)}M</span>
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: IRS §1014 TAX SAVINGS LEDGER */}
            {bbdViewMode === 'taxledger' && (
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Holding Period</th>
                      <th className="py-2.5 px-3 text-right">Portfolio FMV</th>
                      <th className="py-2.5 px-3 text-right">Adjusted Basis</th>
                      <th className="py-2.5 px-3 text-right">Deprec. Recapture (25%)</th>
                      <th className="py-2.5 px-3 text-right">Capital Gains + NIIT</th>
                      <th className="py-2.5 px-3 text-right">State Tax ({stateTaxRate}%)</th>
                      <th className="py-2.5 px-3 text-right text-rose-700 font-semibold">Taxes if Sold</th>
                      <th className="py-2.5 px-3 text-right font-bold text-emerald-800 bg-emerald-50/50">§1014 Tax Savings</th>
                      <th className="py-2.5 px-3 text-right text-blue-700">Tax-Free Borrowing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono-numbers">
                    {projections.map((p) => (
                      <tr key={p.year} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-bold text-slate-900">Year {p.year}</td>
                        <td className="py-2 px-3 text-right font-semibold">${p.portfolioAssetValue.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-slate-500">${p.adjustedBasis.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-rose-600">-${p.depreciationRecaptureTax.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-rose-600">-${(p.longTermCapitalGainsTax + p.niitTax).toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-rose-600">-${p.stateCapitalGainsTax.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-bold text-rose-700">-${p.totalTaxesIfSold.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-800 bg-emerald-50/30">
                          +${p.heirSteppedUpBasisBenefit.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-blue-700">
                          ${p.taxFreeBorrowingCapacity.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Statutory Tax Mechanics & IRC §1014 Deep Dive */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase">
                <Scale className="w-4 h-4 text-emerald-600" />
                <span>Internal Revenue Code §1014</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Basis Step-Up to Fair Market Value</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Under IRC §1014(a), the basis of property in the hands of a person inheriting it from a decedent is the <strong>fair market value of the property at the date of the decedent’s death</strong>. Decades of 27.5-year straight-line depreciation deductions taken during your lifetime are never recaptured.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase">
                <Lock className="w-4 h-4 text-indigo-600" />
                <span>IRC §1001 & §7701 Debt Exemption</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Why Refinance Proceeds Are Tax-Free</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Under established Supreme Court doctrine (<em>Woodsam Associates v. Commissioner</em>), borrowing against appreciated property is <strong>not a taxable disposition</strong> under IRC §1001. A developer can pull $3.5M+ in loan proceeds and spend it on living expenses or new deals without reporting a penny of taxable income.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Dynasty Trust Integration</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Bypassing Probate & Generation Skipping</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                By vesting HoldCo non-voting shares into an Irrevocable Grantor Trust or Delaware Dynasty Trust, the portfolio bypasses public probate courts entirely. Trust distributions to children and grandchildren flow tax-advantaged while assets remain insulated from lawsuits or creditor claims.
              </p>
            </div>
          </div>

          {/* 4-Tier Dynasty Trust Ownership Architecture */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 lg:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                <span>Asset Protection & Estate Transfer</span>
                <span aria-hidden="true">·</span>
                <span>IRC §1014 Execution</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-display mt-1">
                4-Tier Dynasty Trust Ownership Architecture
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                How to structure developer entities so debt liquidity flows tax-free and property titles pass to your family without probate or estate taxation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {estateTrustRoadmap.map((item, idx) => (
                <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-emerald-700 font-mono-numbers uppercase tracking-wider block">
                    {item.step}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 font-display">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

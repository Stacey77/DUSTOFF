import React, { useState } from 'react';
import {
  Users,
  Home,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Sliders,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { UnitMixStrategyItem, UnitMixSummary } from '../types';
import { defaultUnitMixes, calculateUnitMixSummary, validateHudCompliance } from '../data/unitMixStrategy';

interface UnitMixDesignerProps {
  onNavigateToStacker: (units: 10 | 15 | 20) => void;
}

export const UnitMixDesigner: React.FC<UnitMixDesignerProps> = ({
  onNavigateToStacker,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<10 | 15 | 20>(10);
  const [mixItems, setMixItems] = useState<UnitMixStrategyItem[]>(
    defaultUnitMixes[10].map((item) => ({ ...item }))
  );
  const [showValidatorExpanded, setShowValidatorExpanded] = useState<boolean>(true);
  const [validatorFilter, setValidatorFilter] = useState<'all' | 'blocking' | 'issues'>('all');

  const handlePresetChange = (preset: 10 | 15 | 20) => {
    setSelectedPreset(preset);
    setMixItems(defaultUnitMixes[preset].map((item) => ({ ...item })));
  };

  const handleCountChange = (id: string, delta: number) => {
    const updated = mixItems.map((item) => {
      if (item.id === id) {
        const newCount = Math.max(0, item.count + delta);
        return {
          ...item,
          count: newCount,
          totalMonthlyRevenue: newCount * item.hudGrossRent,
          totalAnnualRevenue: newCount * item.hudGrossRent * 12,
        };
      }
      return item;
    });
    setMixItems(updated);
  };

  const handleAmiTierChange = (id: string, newAmi: 30 | 50 | 60 | 80) => {
    const amiCategories: Record<number, UnitMixStrategyItem['amiCategory']> = {
      30: 'Extremely Low (≤30%)',
      50: 'Very Low (31-50%)',
      60: 'Low (51-60%)',
      80: 'Moderate / Workforce (61-80%)',
    };

    const updated = mixItems.map((item) => {
      if (item.id === id) {
        // Adjust tenant contribution based on AMI tier
        const tenantShareRatio = newAmi === 30 ? 0.32 : newAmi === 50 ? 0.55 : newAmi === 60 ? 0.70 : 0.90;
        const tenantRent = Math.round(item.hudGrossRent * tenantShareRatio);
        const pbvSubsidy = Math.max(0, item.hudGrossRent - tenantRent - item.utilityAllowance);

        return {
          ...item,
          targetAmi: newAmi,
          amiCategory: amiCategories[newAmi],
          tenantRentPortion: tenantRent,
          pbvSubsidyPortion: pbvSubsidy,
        };
      }
      return item;
    });
    setMixItems(updated);
  };

  const summary = calculateUnitMixSummary(mixItems);
  const complianceAudit = validateHudCompliance(mixItems);

  const filteredRules = complianceAudit.rules.filter((rule) => {
    if (validatorFilter === 'blocking') return rule.severity === 'blocking';
    if (validatorFilter === 'issues') return rule.status === 'failed' || rule.status === 'warning';
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              <span>Unit Mix & Affordability Tier Engineering</span>
              <span aria-hidden="true">·</span>
              <span>10, 15 & 20-Unit Optimization</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 font-display mt-1">
              Bedroom Blend & Area Median Income (AMI) Strategy
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Design the optimal mix of studios, 1-BR, 2-BR, and 3-BR units across 30%, 50%, 60%, and 80% AMI tiers to guarantee compliance with HUD HOME, National HTF, and Section 8 PBV programs.
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg border border-slate-200 self-start md:self-auto shrink-0">
            <button
              onClick={() => handlePresetChange(10)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                selectedPreset === 10 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              10-Unit Strategy
            </button>
            <button
              onClick={() => handlePresetChange(15)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                selectedPreset === 15 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              15-Unit Strategy
            </button>
            <button
              onClick={() => handlePresetChange(20)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                selectedPreset === 20 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              20-Unit Strategy
            </button>
          </div>
        </div>

        {/* COMPLIANCE VALIDATOR MASTER PANEL (HUD 24 CFR Part 92 / 93) */}
        <div className="pt-2">
          <div className={`rounded-xl border transition-all ${
            complianceAudit.overallStatus === 'compliant'
              ? 'bg-emerald-50/50 border-emerald-300'
              : complianceAudit.overallStatus === 'warning'
              ? 'bg-amber-50/50 border-amber-300'
              : 'bg-rose-50/50 border-rose-300'
          }`}>
            {/* Validator Header */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-inherit">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                  complianceAudit.overallStatus === 'compliant'
                    ? 'bg-emerald-600 text-white'
                    : complianceAudit.overallStatus === 'warning'
                    ? 'bg-amber-600 text-white'
                    : 'bg-rose-600 text-white'
                }`}>
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      HUD 24 CFR Part 92 & Part 93 Compliance Validator
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded font-mono-numbers ${
                      complianceAudit.overallStatus === 'compliant'
                        ? 'bg-emerald-200 text-emerald-950'
                        : complianceAudit.overallStatus === 'warning'
                        ? 'bg-amber-200 text-amber-950'
                        : 'bg-rose-200 text-rose-950'
                    }`}>
                      {complianceAudit.overallStatus === 'compliant'
                        ? '100% Statutory Match'
                        : complianceAudit.overallStatus === 'warning'
                        ? `${complianceAudit.warningCount} Advisory Flag(s)`
                        : `${complianceAudit.failedCount} Critical Discrepancy`}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                    Statutory Rule Audit Score: <span className="font-mono-numbers text-emerald-800">{complianceAudit.score}/100</span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Active validation against HUD HOME (24 CFR Part 92), National HTF (24 CFR Part 93), Section 504 Accessibility, and Section 8 PBV unit mix standards.
                  </p>
                </div>
              </div>

              {/* Action and Filter Controls */}
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <div className="flex items-center gap-1 bg-white/80 p-1 rounded-lg border border-slate-200 text-[11px]">
                  <button
                    onClick={() => setValidatorFilter('all')}
                    className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                      validatorFilter === 'all' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Rules ({complianceAudit.rules.length})
                  </button>
                  <button
                    onClick={() => setValidatorFilter('issues')}
                    className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                      validatorFilter === 'issues' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Issues ({complianceAudit.failedCount + complianceAudit.warningCount})
                  </button>
                  <button
                    onClick={() => setValidatorFilter('blocking')}
                    className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                      validatorFilter === 'blocking' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Statutory Blocking
                  </button>
                </div>

                <button
                  onClick={() => setShowValidatorExpanded(!showValidatorExpanded)}
                  className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                  title={showValidatorExpanded ? 'Collapse rules audit' : 'Expand rules audit'}
                >
                  {showValidatorExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Collapsible Rule Cards */}
            {showValidatorExpanded && (
              <div className="p-4 sm:p-5 space-y-3 bg-white/40">
                {filteredRules.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-500">
                    No rules match the selected filter.
                  </div>
                ) : (
                  filteredRules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`p-3.5 rounded-xl border bg-white text-xs transition-shadow ${
                        rule.status === 'failed'
                          ? 'border-rose-300 ring-1 ring-rose-200'
                          : rule.status === 'warning'
                          ? 'border-amber-300 ring-1 ring-amber-100'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          {rule.status === 'failed' ? (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          ) : rule.status === 'warning' ? (
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                          <span className="font-bold text-slate-900 font-display">
                            {rule.title}
                          </span>
                          <span className="text-[10px] font-mono-numbers px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                            {rule.cfrCitation}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded font-mono-numbers ${
                            rule.severity === 'blocking'
                              ? 'bg-purple-100 text-purple-900'
                              : rule.severity === 'critical'
                              ? 'bg-rose-100 text-rose-900'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {rule.severity}
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded font-mono-numbers ${
                            rule.status === 'passed'
                              ? 'bg-emerald-100 text-emerald-900'
                              : rule.status === 'warning'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-rose-100 text-rose-900'
                          }`}>
                            {rule.status}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 space-y-1.5">
                        <p className={`font-semibold ${
                          rule.status === 'failed' ? 'text-rose-900' : rule.status === 'warning' ? 'text-amber-900' : 'text-slate-800'
                        }`}>
                          {rule.summary}
                        </p>
                        <p className="text-slate-600 leading-relaxed text-[11px]">
                          {rule.detail}
                        </p>
                        <div className="pt-2 mt-2 border-t border-slate-100 flex items-start gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                          <span className="font-bold text-[10px] tracking-wider uppercase px-2 py-0.5 rounded bg-slate-900 text-white shrink-0 mt-0.5">
                            Developer Action
                          </span>
                          <span className="text-slate-800 leading-snug font-medium">
                            {rule.recommendedAction}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Rent Schedule & Unit Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-display">
              {summary.unitsCount}-Unit Rent Schedule & Income Targeting Matrix
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Gross Residential Area: {summary.grossResidentialSqFt.toLocaleString()} sq ft · Total Annual Revenue: ${summary.totalAnnualGrossRent.toLocaleString()}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateToStacker(selectedPreset)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              <span>Transfer to Capital Stacker</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-4 text-left">Bedroom Type</th>
                <th className="py-3 px-4 text-center">Unit Count</th>
                <th className="py-3 px-4 text-right">Avg Sq Ft</th>
                <th className="py-3 px-4 text-left">Target AMI Tier</th>
                <th className="py-3 px-4 text-right">HUD FMR Gross</th>
                <th className="py-3 px-4 text-right">Tenant Share</th>
                <th className="py-3 px-4 text-right">HUD PBV Voucher</th>
                <th className="py-3 px-4 text-right">Total Annual Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mixItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {item.bedroomType}
                  </td>

                  {/* Count Controls */}
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleCountChange(item.id, -1)}
                        className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-mono-numbers font-bold text-slate-900">
                        {item.count}
                      </span>
                      <button
                        onClick={() => handleCountChange(item.id, 1)}
                        className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-right font-mono-numbers text-slate-600">
                    {item.sqFt} sq ft
                  </td>

                  {/* AMI Tier Selector */}
                  <td className="py-3 px-4">
                    <select
                      value={item.targetAmi}
                      onChange={(e) => handleAmiTierChange(item.id, Number(e.target.value) as 30 | 50 | 60 | 80)}
                      className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-800"
                    >
                      <option value={30}>30% AMI (Extremely Low)</option>
                      <option value={50}>50% AMI (Very Low)</option>
                      <option value={60}>60% AMI (Low-Income)</option>
                      <option value={80}>80% AMI (Workforce)</option>
                    </select>
                  </td>

                  <td className="py-3 px-4 text-right font-mono-numbers font-semibold text-slate-900">
                    ${item.hudGrossRent}/mo
                  </td>

                  <td className="py-3 px-4 text-right font-mono-numbers text-slate-700">
                    ${item.tenantRentPortion}/mo
                  </td>

                  <td className="py-3 px-4 text-right font-mono-numbers font-semibold text-emerald-700">
                    +${item.pbvSubsidyPortion}/mo
                  </td>

                  <td className="py-3 px-4 text-right font-mono-numbers font-bold text-slate-900">
                    ${(item.totalAnnualRevenue).toLocaleString()}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-bold text-slate-900">
                <td className="py-3 px-4">PORTFOLIO TOTALS</td>
                <td className="py-3 px-4 text-center font-mono-numbers">{summary.unitsCount} Units</td>
                <td className="py-3 px-4 text-right font-mono-numbers">{summary.grossResidentialSqFt.toLocaleString()} sq ft</td>
                <td className="py-3 px-4 text-slate-600 font-normal">Mixed 30%–80% AMI</td>
                <td className="py-3 px-4 text-right font-mono-numbers">Avg ${Math.round(summary.totalMonthlyGrossRent / summary.unitsCount)}/mo</td>
                <td className="py-3 px-4 text-right font-mono-numbers text-slate-700">${Math.round(summary.totalTenantPaidRent / 12).toLocaleString()}/mo</td>
                <td className="py-3 px-4 text-right font-mono-numbers text-emerald-700">${Math.round(summary.totalFederalVoucherHapSubsidy / 12).toLocaleString()}/mo</td>
                <td className="py-3 px-4 text-right font-mono-numbers">${summary.totalAnnualGrossRent.toLocaleString()} / yr</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Distribution Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bedroom Distribution Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Home className="w-4 h-4 text-indigo-600" />
              <span>Bedroom Count Allocation</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono-numbers">
              {summary.unitsCount} Total Units
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium text-slate-700">Studio Apartments</span>
                <span className="font-mono-numbers text-slate-900 font-bold">
                  {summary.bedroomDistribution.studios} Units ({((summary.bedroomDistribution.studios / summary.unitsCount) * 100).toFixed(0)}%)
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${(summary.bedroomDistribution.studios / summary.unitsCount) * 100}%` }}
                  className="h-full bg-indigo-500"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium text-slate-700">1-Bedroom Units</span>
                <span className="font-mono-numbers text-slate-900 font-bold">
                  {summary.bedroomDistribution.oneBed} Units ({((summary.bedroomDistribution.oneBed / summary.unitsCount) * 100).toFixed(0)}%)
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${(summary.bedroomDistribution.oneBed / summary.unitsCount) * 100}%` }}
                  className="h-full bg-blue-500"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium text-slate-700">2-Bedroom Family Flats</span>
                <span className="font-mono-numbers text-slate-900 font-bold">
                  {summary.bedroomDistribution.twoBed} Units ({((summary.bedroomDistribution.twoBed / summary.unitsCount) * 100).toFixed(0)}%)
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${(summary.bedroomDistribution.twoBed / summary.unitsCount) * 100}%` }}
                  className="h-full bg-emerald-500"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium text-slate-700">3-Bedroom Large Family Units</span>
                <span className="font-mono-numbers text-slate-900 font-bold">
                  {summary.bedroomDistribution.threeBed} Units ({((summary.bedroomDistribution.threeBed / summary.unitsCount) * 100).toFixed(0)}%)
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${(summary.bedroomDistribution.threeBed / summary.unitsCount) * 100}%` }}
                  className="h-full bg-amber-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* AMI Affordability Tier Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Income Targeting Distribution</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono-numbers">
              Area Median Income
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium text-slate-700">Extremely Low-Income (≤30% AMI)</span>
                <span className="font-mono-numbers text-emerald-700 font-bold">
                  {summary.amiDistribution.ami30Count} Units ({summary.amiDistribution.ami30Pct.toFixed(0)}%)
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${summary.amiDistribution.ami30Pct}%` }}
                  className="h-full bg-emerald-600"
                />
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Funded via National Housing Trust Fund (HTF)</span>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium text-slate-700">Very Low-Income (31%–50% AMI)</span>
                <span className="font-mono-numbers text-teal-700 font-bold">
                  {summary.amiDistribution.ami50Count} Units ({summary.amiDistribution.ami50Pct.toFixed(0)}%)
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${summary.amiDistribution.ami50Pct}%` }}
                  className="h-full bg-teal-500"
                />
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Funded via HUD HOME 20% statutory rule</span>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium text-slate-700">Low-Income (51%–60% AMI)</span>
                <span className="font-mono-numbers text-blue-700 font-bold">
                  {summary.amiDistribution.ami60Count} Units ({summary.amiDistribution.ami60Pct.toFixed(0)}%)
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${summary.amiDistribution.ami60Pct}%` }}
                  className="h-full bg-blue-500"
                />
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Funded via FHLBank AHP & State Soft Debt</span>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium text-slate-700">Workforce Housing (61%–80% AMI)</span>
                <span className="font-mono-numbers text-slate-700 font-bold">
                  {summary.amiDistribution.ami80Count} Units ({summary.amiDistribution.ami80Pct.toFixed(0)}%)
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${summary.amiDistribution.ami80Pct}%` }}
                  className="h-full bg-slate-400"
                />
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Cross-subsidized workforce units</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

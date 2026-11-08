import React, { useState } from 'react';
import {
  Award,
  Layers,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Building,
  Target,
  FileCheck,
} from 'lucide-react';
import { fundingTactics, federalApplicationSteps } from '../data/fundingStrategy';
import { federalProgramsData } from '../data/federalPrograms';

interface FederalFundingStrategyProps {
  onNavigateToTab: (tab: 'overview' | 'pipeline' | 'stacker' | 'strategy' | 'unitmix' | 'underwriter') => void;
}

export const FederalFundingStrategy: React.FC<FederalFundingStrategyProps> = ({
  onNavigateToTab,
}) => {
  const [activeTab, setActiveTab] = useState<'programs' | 'process' | 'tactics' | 'readiness'>('tactics');
  const [expandedTacticId, setExpandedTacticId] = useState<string | null>('tactic-site-control');

  // Readiness Assessment State
  const [readinessChecklist, setReadinessChecklist] = useState({
    samUeiRegistered: true,
    siteOptionSecured: true,
    under12UnitsOrDavisBaconBudgeted: true,
    incomeTargeting30PctIncluded: true,
    fhlbMemberBankIdentified: true,
    phase1EsaClean: true,
    energyModelZerhDesigned: true,
    section8PbvRequested: false,
  });

  const toggleChecklist = (key: keyof typeof readinessChecklist) => {
    setReadinessChecklist({
      ...readinessChecklist,
      [key]: !readinessChecklist[key],
    });
  };

  const trueCount = Object.values(readinessChecklist).filter(Boolean).length;
  const readinessScore = Math.round((trueCount / Object.keys(readinessChecklist).length) * 100);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            <span>Federal Funding Playbook</span>
            <span aria-hidden="true">·</span>
            <span>Programs, Eligibility & Win Strategies</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-display mt-1">
            Comprehensive Strategy for Securing Federal Funding
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            A step-by-step master strategy covering program eligibility, multi-layered subsidy architecture, application cycles, and proven tactics to maximize scoring in State Housing Finance Agency (HFA) and HUD NOFAs.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('tactics')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'tactics'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Proposal Optimization & Scoring Tactics
          </button>
          <button
            onClick={() => setActiveTab('process')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'process'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            5-Step Application Roadmap
          </button>
          <button
            onClick={() => setActiveTab('programs')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'programs'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Federal Program Eligibility Matrix
          </button>
          <button
            onClick={() => setActiveTab('readiness')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'readiness'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            NOFA Readiness Audit ({readinessScore}%)
          </button>
        </div>
      </div>

      {/* TAB 1: PROPOSAL OPTIMIZATION TACTICS */}
      {activeTab === 'tactics' && (
        <div className="space-y-6">
          <div className="bg-emerald-50/70 p-5 rounded-xl border border-emerald-200 space-y-2">
            <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider block flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span>How To Maximize Approval Rates in Competitive NOFAs:</span>
            </span>
            <p className="text-xs text-emerald-900 leading-relaxed">
              State Housing Finance Agencies (HFAs) score funding applications using mathematical Qualified Allocation Plan (QAP) rubrics. Applications that win 100% federal awards intentionally bundle <strong>site control readiness</strong>, <strong>deep income targeting (≤30% AMI)</strong>, <strong>green building certifications</strong>, and <strong>local bank sponsorships</strong> to maximize points.
            </p>
          </div>

          <div className="space-y-4">
            {fundingTactics.map((tactic) => {
              const isExpanded = expandedTacticId === tactic.id;
              return (
                <div
                  key={tactic.id}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-all"
                >
                  <div
                    onClick={() => setExpandedTacticId(isExpanded ? null : tactic.id)}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {tactic.category}
                        </span>
                        <span className="font-bold text-slate-900 font-mono-numbers">
                          {tactic.pointsImpact}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 font-display">
                        {tactic.title}
                      </h3>
                      <p className="text-xs text-slate-600 line-clamp-2 max-w-2xl">
                        {tactic.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="p-1 text-slate-400 hover:text-slate-700">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-4 text-xs">
                      <div>
                        <span className="font-bold text-slate-900 uppercase tracking-wider block text-[11px] mb-2">
                          Mandatory Execution Protocol:
                        </span>
                        <ul className="space-y-1.5 text-slate-700">
                          {tactic.actionSteps.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {tactic.statutoryReference && (
                        <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-[11px] text-slate-500 font-mono">
                          Statutory Authority: {tactic.statutoryReference}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: STEP-BY-STEP APPLICATION ROADMAP */}
      {activeTab === 'process' && (
        <div className="space-y-6">
          <div className="space-y-4">
            {federalApplicationSteps.map((step) => (
              <div
                key={step.stepNumber}
                className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono-numbers text-slate-500">
                      <span className="font-bold text-slate-900">Step 0{step.stepNumber}</span>
                      <span aria-hidden="true">·</span>
                      <span>{step.timeline}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-700 font-medium">{step.entity}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 font-display mt-1">
                      {step.title}
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 uppercase tracking-wider block text-[11px] mb-2">
                      Required Documentation & Deliverables:
                    </span>
                    <ul className="space-y-1.5 text-slate-700">
                      {step.deliverables.map((deliv, dIdx) => (
                        <li key={dIdx} className="flex items-start gap-2">
                          <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{deliv}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
                      Underwriter Strategic Guidance:
                    </span>
                    <p className="text-slate-700 leading-relaxed text-xs">
                      {step.keyAdvice}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: FEDERAL PROGRAM ELIGIBILITY MATRIX */}
      {activeTab === 'programs' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 font-display">
              Federal Funding Matrix for Missing-Middle Scale
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Summary of all federal, state, and bank programs that can be layered to reach 100% non-dilutive development financing.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3 px-4 text-left">Program</th>
                  <th className="py-3 px-4 text-left">Funding Agency</th>
                  <th className="py-3 px-4 text-right">Per Unit Award</th>
                  <th className="py-3 px-4 text-left">Davis-Bacon Rule</th>
                  <th className="py-3 px-4 text-left">Target AMI Tier</th>
                  <th className="py-3 px-4 text-left">Terms / Repayment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {federalProgramsData.map((p) => (
                  <tr key={p.code} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{p.name.split('(')[0]}</span>
                      <span className="font-mono-numbers text-[11px] text-emerald-700 font-semibold">{p.code}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{p.federalDepartment.split('(')[0]}</td>
                    <td className="py-3 px-4 text-right font-mono-numbers font-semibold text-slate-900">
                      {p.typicalAwardPerUnit.split('(')[0]}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{p.davisBaconThreshold}</td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-medium">
                        {p.code.includes('HTF') ? '≤30% AMI' : p.code.includes('AHP') ? '≤50% AMI' : '≤60% AMI'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {p.code.includes('PBV') ? '20-Yr HAP Subsidy' : '0% Forgivable Grant'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: NOFA READINESS AUDIT */}
      {activeTab === 'readiness' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 lg:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-display">
                Federal NOFA & QAP Readiness Audit
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Verify that your development firm and prospective site possess all prerequisites before submission.
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-xs text-slate-500 block">Readiness Score</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold text-emerald-700 font-mono-numbers">
                  {readinessScore}%
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  readinessScore >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {readinessScore >= 80 ? 'Application Ready' : 'Incomplete Prerequisites'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {Object.entries({
              samUeiRegistered: 'SAM.gov Active Registration & 12-char Unique Entity Identifier (UEI)',
              siteOptionSecured: 'Enforceable Purchase Option Agreement (≥ 180 Days) on Target Parcel',
              under12UnitsOrDavisBaconBudgeted: 'Davis-Bacon Compliance Strategy (Exempt for 10 Units; Budgeted for 15-20)',
              incomeTargeting30PctIncluded: 'Deep Income Targeting Included (At least 20% units reserved for ≤30% AMI for HTF)',
              fhlbMemberBankIdentified: 'FHLBank Commercial Member Bank Sponsor Identified & Initial Pitch Made',
              phase1EsaClean: 'Phase I Environmental Site Assessment (ESA) without Unmitigated Recognized Environmental Conditions',
              energyModelZerhDesigned: 'Architectural Energy Model drafted to meet DOE Zero Energy Ready Home (ZERH) standards',
              section8PbvRequested: 'Preliminary Section 8 Project-Based Voucher (PBV) Expression of Interest with local PHA',
            }).map(([key, label]) => {
              const checked = readinessChecklist[key as keyof typeof readinessChecklist];
              return (
                <div
                  key={key}
                  onClick={() => toggleChecklist(key as keyof typeof readinessChecklist)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                    checked ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {}}
                    className="mt-0.5 h-4 w-4 rounded text-emerald-600 border-slate-300 pointer-events-none"
                  />
                  <span className={`text-xs ${checked ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => onNavigateToTab('stacker')}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              <span>Model Capital Stack for this Submission</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

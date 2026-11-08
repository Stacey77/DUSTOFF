import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  FileCheck,
  Copy,
  Check,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { developerPlaybook } from '../data/playbook';
import { PlaybookPhase, DeveloperCompany } from '../types';

interface BusinessPlaybookProps {
  company: DeveloperCompany;
}

export const BusinessPlaybook: React.FC<BusinessPlaybookProps> = ({ company }) => {
  const [playbookState, setPlaybookState] = useState<PlaybookPhase[]>(developerPlaybook);
  const [activePhaseIndex, setActivePhaseIndex] = useState<number>(0);
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);

  const toggleMilestone = (phaseIdx: number, milestoneIdx: number) => {
    const updated = [...playbookState];
    const current = updated[phaseIdx].milestones[milestoneIdx].completed;
    updated[phaseIdx].milestones[milestoneIdx].completed = !current;
    setPlaybookState(updated);
  };

  // Calculate overall completion %
  const totalMilestones = playbookState.reduce((sum, p) => sum + p.milestones.length, 0);
  const completedMilestones = playbookState.reduce(
    (sum, p) => sum + p.milestones.filter((m) => m.completed).length,
    0
  );
  const overallProgressPct = Math.round((completedMilestones / totalMilestones) * 100);

  const activePhase = playbookState[activePhaseIndex];

  const copyToClipboard = (text: string, templateKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTemplate(templateKey);
    setTimeout(() => setCopiedTemplate(null), 2500);
  };

  const sampleLoi = `LETTER OF INTENT: AFFORDABLE HOUSING INFILL ACQUISITION & OPTION

Date: ${new Date().toLocaleDateString()}
To: City Land Bank Authority / Community Development Department
From: ${company.name || 'Civic Development Partners LLC'}
Entity UEI: ${company.samUei || '[Pending SAM.gov UEI]'}

RE: Acquisition & Site Control of Parcel ID [Insert Parcel #] for [10/15/20]-Unit Affordable Community

Dear Director / Board of Trustees,

${company.name || 'Civic Development Partners LLC'} is pleased to submit this Letter of Intent to acquire and develop the above-referenced surplus parcel for a proposed 100% federally funded affordable housing development.

1. PROPOSED DEVELOPMENT:
A high-efficiency [10 / 15 / 20]-unit missing-middle residential community serving households earning between 30% and 60% of Area Median Income (AMI). The project will feature solar rooftop generation qualifying under the DOE Zero Energy Ready Home standard.

2. FINANCING STRUCTURE (100% NON-DILUTIVE PUBLIC CAPITAL):
The development requires zero municipal cash appropriation, leveraging:
- HUD HOME Investment Partnerships Program / National Housing Trust Fund
- Federal Home Loan Bank (FHLB) Affordable Housing Program (AHP) Grant
- Inflation Reduction Act §45L & §48(e) Clean Energy Equity
- Project-Based Section 8 Vouchers from the local Housing Authority

3. SITE CONTROL TERMS:
Buyer requests a 270-day Option Agreement for nominal consideration ($1,000 earnest money) to complete HUD Part 58 NEPA environmental review and submit the formal State Housing Finance Agency application.

Sincerely,
Managing Principal
${company.name || 'Civic Development Partners LLC'}`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              <span>Step-by-Step Developer Playbook</span>
              <span aria-hidden="true">·</span>
              <span>Execution Roadmap</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 font-display mt-1">
              Building Your Federal Affordable Housing Business
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              From SAM.gov registration to $0 site control, NOFA grant stacking, and drawing your 10% to 15% Developer Fee cash profit.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-right shrink-0">
            <span className="text-xs text-slate-500 block">Overall Execution Progress</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-bold text-slate-900 font-mono-numbers">
                {overallProgressPct}%
              </span>
              <span className="text-xs text-slate-500">
                ({completedMilestones}/{totalMilestones} Milestones)
              </span>
            </div>
            <div className="h-1.5 w-36 bg-slate-200 rounded-full overflow-hidden mt-1.5">
              <div
                style={{ width: `${overallProgressPct}%` }}
                className="h-full bg-emerald-600 transition-all duration-300"
              />
            </div>
          </div>
        </div>

        {/* Phase Navigation Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 pt-2">
          {playbookState.map((phase, idx) => {
            const isCompleted = phase.milestones.every((m) => m.completed);
            const isActive = idx === activePhaseIndex;

            return (
              <button
                key={phase.phaseNumber}
                onClick={() => setActivePhaseIndex(idx)}
                className={`p-3 text-left rounded-lg border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] mb-1 font-mono-numbers font-semibold">
                  <span>Phase {phase.phaseNumber}</span>
                  {isCompleted && (
                    <CheckCircle2 className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  )}
                </div>
                <div className="text-xs font-bold truncate">
                  {phase.title.split('&')[0]}
                </div>
                <div className={`text-[10px] mt-1 ${isActive ? 'text-slate-400' : 'text-slate-500'}`}>
                  {phase.timeline}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Phase Details */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 lg:p-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono-numbers text-slate-500">
              <span className="font-bold text-slate-900">Phase 0{activePhase.phaseNumber}</span>
              <span aria-hidden="true">·</span>
              <span>{activePhase.timeline}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 font-display mt-1">
              {activePhase.title}
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              {activePhase.objective}
            </p>
          </div>
        </div>

        {/* Milestones List */}
        <div className="space-y-6">
          {activePhase.milestones.map((milestone, mIdx) => (
            <div
              key={mIdx}
              className={`p-5 rounded-xl border transition-all ${
                milestone.completed
                  ? 'bg-emerald-50/20 border-emerald-200'
                  : 'bg-slate-50/40 border-slate-200'
              }`}
            >
              <div className="flex items-start gap-4">
                <button
                  type="button"
                  onClick={() => toggleMilestone(activePhaseIndex, mIdx)}
                  className="mt-0.5 text-slate-400 hover:text-emerald-600 cursor-pointer transition-colors"
                >
                  {milestone.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300" />
                  )}
                </button>

                <div className="flex-1 space-y-3">
                  <div>
                    <h3
                      className={`text-base font-bold ${
                        milestone.completed ? 'text-slate-900 line-through' : 'text-slate-900'
                      }`}
                    >
                      {milestone.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1">
                      {milestone.description}
                    </p>
                  </div>

                  {/* Action Items */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Required Action Steps:
                    </span>
                    <ul className="space-y-1 text-xs text-slate-700">
                      {milestone.actionItems.map((item, itemIdx) => (
                        <li key={itemIdx} className="flex items-start gap-2">
                          <span className="text-emerald-600 font-bold">›</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Pro Tip Box */}
                  <div className="bg-amber-50/80 p-3 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                    <Lightbulb className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-950">Underwriter Pro-Tip: </span>
                      <span>{milestone.proTip}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Phase 2 Special Tool: Municipal Land Bank Option Letter of Intent (LOI) Template */}
        {activePhase.phaseNumber === 2 && (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold font-display text-sm">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Standard Municipal $0-Down Option LOI Template</span>
              </div>
              <button
                onClick={() => copyToClipboard(sampleLoi, 'loi')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 cursor-pointer shadow-xs"
              >
                {copiedTemplate === 'loi' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy LOI Template</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 bg-white rounded-lg border border-slate-200 text-xs font-mono text-slate-700 whitespace-pre-wrap overflow-x-auto leading-relaxed max-h-72 overflow-y-auto">
              {sampleLoi}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Loader2,
  Copy,
  Check,
  FileText,
  ShieldCheck,
  Building,
  HelpCircle,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import { HousingArchetype, CostBreakdown, FundingSource, DeveloperCompany } from '../types';
import { housingArchetypes } from '../data/archetypes';

interface AiUnderwriterProps {
  selectedUnits: 10 | 15 | 20;
  company: DeveloperCompany;
}

export const AiUnderwriter: React.FC<AiUnderwriterProps> = ({
  selectedUnits,
  company,
}) => {
  const currentArchetype = housingArchetypes[selectedUnits];

  const [promptInput, setPromptInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isLiveAi, setIsLiveAi] = useState<boolean>(true);
  const [copied, setCopied] = useState(false);

  // Run comprehensive deal underwriting
  const handleRunUnderwrite = async (customPrompt?: string) => {
    setIsLoading(true);
    try {
      const totalCost = Object.values(currentArchetype.defaultCosts).reduce((a, b) => a + b, 0);

      const payload = {
        units: selectedUnits,
        totalCost,
        fundingSources: currentArchetype.defaultFunding.filter((f) => f.active),
        amiTarget: 50,
        location: `${company.city || 'Regional Metro'}, ${company.state || 'National'}`,
        targetPopulation: currentArchetype.targetResidentProfile,
        customPrompt: customPrompt || promptInput,
      };

      const res = await fetch('/api/underwrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setAnalysisResult(data.analysis || 'Analysis complete.');
      setIsLiveAi(Boolean(data.isLiveAi));
    } catch (err) {
      console.error('Error fetching underwrite:', err);
      // Fallback analysis if offline
      setAnalysisResult(
        `### Institutional Underwriting Assessment (${selectedUnits} Units)\n\n**1. 100% Capital Stack Feasibility**\nThe proposed stack utilizes non-dilutive federal grants (HUD HOME, HTF, FHLB AHP) and IRA clean energy equity. Because hard commercial debt is zero, the debt service coverage ratio (DSCR) is effectively infinite and break-even occupancy drops to ~52%.\n\n**2. Davis-Bacon Prevailing Wage**\n${
          selectedUnits < 12
            ? 'For 10 units: EXEMPT under HUD 24 CFR 92.354 (threshold is 12 HOME units). Open-shop construction reduces labor costs by ~15%.'
            : 'For 15–20 units: APPLIES. General contractor must submit weekly certified payrolls through LCPtracker.'
        }\n\n**3. Developer Fee Monetization**\nAllowable fee is 12% of Total Development Cost, paid in 3 milestone draws (30% at Closing, 40% at 50% construction, 30% at Certificate of Occupancy).`
      );
      setIsLiveAi(false);
    } finally {
      setIsLoading(false);
    }
  };

  const copyResult = () => {
    if (!analysisResult) return;
    navigator.clipboard.writeText(analysisResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const quickQuestions = [
    `Evaluate the 100% Federal Capital Stack for my ${selectedUnits}-unit project under HUD Subsidy Layering Review guidelines`,
    `Explain the Davis-Bacon 12-Unit threshold impact on my ${selectedUnits}-unit budget`,
    `Draft formal Statement of Housing Need and Public Benefit for State Housing Finance Agency (HFA)`,
    `How do I sell/monetize the IRA §45L ($5,000/unit) and §48(e) solar tax credits without personal tax liability?`,
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            <span>AI Federal Underwriting & Grant Strategist</span>
            <span aria-hidden="true">·</span>
            <span>Powered by Gemini 3.8 Flash</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-display mt-1">
            Institutional Deal Review & Grant Drafting
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Simulate a senior public housing underwriter reviewing your {selectedUnits}-unit development, auditing subsidy layering compliance, checking Davis-Bacon rules, and generating application narratives.
          </p>
        </div>

        {/* Current Deal Snapshot Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-slate-400 block">Active Archetype</span>
            <span className="font-bold text-slate-900 font-display">
              {currentArchetype.name} ({selectedUnits} Units)
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Total Dev Cost</span>
            <span className="font-bold text-slate-900 font-mono-numbers">
              ${(Object.values(currentArchetype.defaultCosts).reduce((a, b) => a + b, 0) / 1000).toFixed(0)}k
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Davis-Bacon Wage</span>
            <span className={`font-semibold ${selectedUnits < 12 ? 'text-emerald-700' : 'text-amber-700'}`}>
              {selectedUnits < 12 ? 'Exempt (< 12 Units)' : 'Prevailing Wage Required'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Developer Fee Cash</span>
            <span className="font-bold text-emerald-700 font-mono-numbers">
              ${(currentArchetype.defaultCosts.developerFee / 1000).toFixed(0)}k (12%)
            </span>
          </div>
        </div>

        {/* Quick Question Buttons */}
        <div className="space-y-2 pt-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Select an Underwriting Inquiry or Ask Anything:
          </span>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPromptInput(q);
                  handleRunUnderwrite(q);
                }}
                disabled={isLoading}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-left border border-slate-200/80"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Prompt Input */}
        <div className="flex gap-2 pt-2">
          <input
            type="text"
            placeholder={`Ask the underwriter about your ${selectedUnits}-unit project (e.g. "Draft Section 8 PBV justification narrative", "How to structure FHLB AHP matching points")...`}
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isLoading && promptInput.trim()) {
                handleRunUnderwrite();
              }
            }}
            className="flex-1 px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
          />
          <button
            onClick={() => handleRunUnderwrite()}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Underwriting...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Run Analysis</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Output Screen */}
      {analysisResult && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 lg:p-8 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span className="font-bold text-slate-900 font-display text-base">
                Senior Underwriter Memorandum
              </span>
              {isLiveAi && (
                <span className="text-[11px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded border border-emerald-200">
                  Live Gemini 3.8 Flash
                </span>
              )}
            </div>

            <button
              onClick={copyResult}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Memorandum</span>
                </>
              )}
            </button>
          </div>

          <div className="prose prose-slate max-w-none text-xs leading-relaxed text-slate-700 whitespace-pre-wrap font-sans bg-slate-50/60 p-5 rounded-xl border border-slate-100">
            {analysisResult}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  Search,
  BookOpen,
  Filter,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  Building,
  Award,
  DollarSign,
  Info,
} from 'lucide-react';
import { federalProgramsData } from '../data/federalPrograms';
import { FederalProgramInfo } from '../types';

interface FederalProgramsExplorerProps {
  onSelectProgramForNarrative: (program: FederalProgramInfo) => void;
}

export const FederalProgramsExplorer: React.FC<FederalProgramsExplorerProps> = ({
  onSelectProgramForNarrative,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScale, setSelectedScale] = useState<string>('all');
  const [expandedCode, setExpandedCode] = useState<string | null>('HUD-HOME');

  const filteredPrograms = federalProgramsData.filter((program) => {
    const matchesSearch =
      program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      program.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      program.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      program.federalDepartment.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesScale =
      selectedScale === 'all' ||
      program.idealUnitScale.includes(selectedScale);

    return matchesSearch && matchesScale;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            <span>Federal Funding Encyclopedia</span>
            <span aria-hidden="true">·</span>
            <span>Statutory Rules & Non-Dilutive Capital</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-display mt-1">
            Federal Funding Programs for 10, 15 & 20 Units
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Explore the statutory authorities, grant ceilings, and application schedules for federal and public funding vehicles that developers use to finance 100% of missing-middle affordable housing developments.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search programs (e.g. HOME, AHP, Trust Fund, Davis-Bacon, IRA 45L)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs shrink-0">
            <span className="px-2 text-slate-500 font-medium">Scale:</span>
            <button
              onClick={() => setSelectedScale('all')}
              className={`px-2.5 py-1 rounded cursor-pointer font-medium transition-colors ${
                selectedScale === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              All Scales
            </button>
            <button
              onClick={() => setSelectedScale('10')}
              className={`px-2.5 py-1 rounded cursor-pointer font-medium transition-colors ${
                selectedScale === '10' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              10 Units
            </button>
            <button
              onClick={() => setSelectedScale('15')}
              className={`px-2.5 py-1 rounded cursor-pointer font-medium transition-colors ${
                selectedScale === '15' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              15 Units
            </button>
            <button
              onClick={() => setSelectedScale('20')}
              className={`px-2.5 py-1 rounded cursor-pointer font-medium transition-colors ${
                selectedScale === '20' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              20 Units
            </button>
          </div>
        </div>
      </div>

      {/* Program Cards */}
      <div className="space-y-4">
        {filteredPrograms.map((program) => {
          const isExpanded = expandedCode === program.code;

          return (
            <div
              key={program.code}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-all"
            >
              {/* Card Header */}
              <div
                onClick={() => setExpandedCode(isExpanded ? null : program.code)}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono-numbers font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {program.code}
                    </span>
                    <span className="text-slate-500">{program.federalDepartment}</span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="text-slate-600 font-medium">Ideal: {program.idealUnitScale}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 font-display">
                    {program.name}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 max-w-3xl">
                    {program.description}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <span className="text-xs text-slate-400 block">Typical Allocation</span>
                    <span className="text-sm font-bold text-slate-900 font-mono-numbers">
                      {program.typicalAwardPerUnit.split('(')[0]}
                    </span>
                  </div>
                  <div className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Program Specifications */}
              {isExpanded && (
                <div className="px-5 pb-6 pt-2 border-t border-slate-100 space-y-6 text-xs">
                  {/* How It Funds Entire Project Banner */}
                  <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 space-y-1">
                    <span className="font-bold text-emerald-950 block text-xs uppercase tracking-wider">
                      Role in the 100% Capital Stack:
                    </span>
                    <p className="text-emerald-900 leading-relaxed">
                      {program.howItFundsEntireProject}
                    </p>
                  </div>

                  {/* Program Metadata Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                      <span className="text-slate-500 font-medium block mb-1">
                        Statutory Authority
                      </span>
                      <span className="font-mono text-slate-800 text-[11px] block">
                        {program.statutoryBasis}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                      <span className="text-slate-500 font-medium block mb-1">
                        Davis-Bacon Prevailing Wage Rule
                      </span>
                      <span className="text-slate-800 font-medium block">
                        {program.davisBaconThreshold}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                      <span className="text-slate-500 font-medium block mb-1">
                        Application Cycle & Match
                      </span>
                      <span className="text-slate-800 font-medium block">
                        {program.applicationCycle} (Match: {program.matchingRequirement})
                      </span>
                    </div>
                  </div>

                  {/* Requirements List */}
                  <div className="space-y-2">
                    <span className="font-bold text-slate-900 uppercase tracking-wider block text-[11px]">
                      Mandatory Program Compliance Criteria:
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {program.keyRequirements.map((req, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 text-slate-700 bg-slate-50/50 p-2.5 rounded border border-slate-100"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{req}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => onSelectProgramForNarrative(program)}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Draft AI Grant Application Narrative for {program.code}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

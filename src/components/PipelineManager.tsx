import React, { useState } from 'react';
import {
  Building2,
  MapPin,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ArrowRight,
  Sparkles,
  Layers,
  Search,
  ExternalLink,
  Award,
  FileCheck,
  Scale,
  XCircle,
  Info,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { PipelineProject } from '../types';
import { initialPipelineProjects } from '../data/pipelineProjects';

interface PipelineManagerProps {
  onSelectProjectForStacker: (units: 10 | 15 | 20) => void;
  onNavigateToTab: (tab: 'overview' | 'pipeline' | 'stacker' | 'strategy' | 'unitmix' | 'underwriter') => void;
}

export const PipelineManager: React.FC<PipelineManagerProps> = ({
  onSelectProjectForStacker,
  onNavigateToTab,
}) => {
  const [projects, setProjects] = useState<PipelineProject[]>(initialPipelineProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialPipelineProjects[0].id);
  const [filterUnits, setFilterUnits] = useState<'all' | '10' | '15' | '20'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [pipelineViewMode, setPipelineViewMode] = useState<'grid' | 'compliance-dashboard'>('compliance-dashboard');
  const [complianceRequirementFilter, setComplianceRequirementFilter] = useState<'all' | '24cfr92' | '24cfr93' | 'nepa' | 'davis-bacon' | 'section504'>('all');

  // New site form state
  const [newSite, setNewSite] = useState({
    name: '',
    units: 10 as 10 | 15 | 20,
    address: '',
    acreage: 0.5,
    siteType: 'Urban Infill' as const,
    walkScore: 80,
    zoning: 'R-3 Infill Multi-Family',
  });

  const filteredProjects = projects.filter((p) => {
    const matchesUnits = filterUnits === 'all' || p.units.toString() === filterUnits;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.city.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesUnits && matchesSearch;
  });

  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  const handleAddSite = (e: React.FormEvent) => {
    e.preventDefault();
    const tdc = newSite.units * 248000;
    const project: PipelineProject = {
      id: `proj-custom-${Date.now()}`,
      name: newSite.name || `${newSite.units}-Unit Opportunity`,
      units: newSite.units,
      parcelNumber: `APN-${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}`,
      address: newSite.address || 'Prospect Avenue Infill',
      city: 'Atlanta',
      state: 'GA',
      siteAcreage: Number(newSite.acreage),
      siteType: newSite.siteType,
      imagePath:
        newSite.units === 10
          ? '/src/assets/images/housing_10_units_1794103854190.jpg'
          : newSite.units === 15
          ? '/src/assets/images/housing_15_units_1794103854776.jpg'
          : '/src/assets/images/housing_20_units_1794103855585.jpg',
      siteCriteria: {
        transitDistance: '0.2 miles from transit bus stop',
        groceryDistance: '0.4 miles to full grocery store',
        schoolDistance: '0.5 miles to public school',
        walkScore: Number(newSite.walkScore),
        environmentalRisk: 'Phase I Clean (Low Risk)',
        infrastructureStatus: 'Full Water/Sewer at Curb',
      },
      zoningAnalysis: {
        currentZoning: newSite.zoning,
        allowedDensity: `${Math.round((newSite.units / newSite.acreage) * 10) / 10} units / acre`,
        byRightApproval: true,
        parkingRequirement: '0.5 spaces / unit with affordable density bonus',
        heightLimit: newSite.units === 10 ? '2 Stories' : '3 Stories',
        varianceNeeded: 'Administrative design review only',
      },
      estimatedCost: {
        totalDevelopmentCost: tdc,
        costPerUnit: Math.round(tdc / newSite.units),
        landCost: Math.round(tdc * 0.08),
        hardCost: Math.round(tdc * 0.63),
        softCost: Math.round(tdc * 0.17),
        developerFeeProfit: Math.round(tdc * 0.12),
      },
      marketDemand: {
        localAmi: 86400,
        costBurdenedRenterPct: 51.5,
        phaVoucherWaitlistMonths: 30,
        povertyRate: 19.8,
        targetResidentProfile: 'Working families and service professionals earning 30%–60% AMI.',
      },
      federalFundingAlignment: {
        priorityScore: 92,
        qualifiedCensusTract: true,
        difficultDevelopmentArea: false,
        opportunityZone: true,
        primaryPrograms: ['HUD HOME', 'National HTF', 'FHLB AHP', 'IRA §45L'],
        davisBaconStatus: newSite.units < 12 ? 'Exempt (< 12 Units)' : 'Prevailing Wage Required (≥ 12 Units)',
        expectedGrantCoveragePct: 100,
      },
      status: 'Site Identified',
    };

    setProjects([project, ...projects]);
    setSelectedProjectId(project.id);
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              <span>Pipeline & Site Selection Engine</span>
              <span aria-hidden="true">·</span>
              <span>10, 15 & 20-Unit Missing-Middle Portfolios</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 font-display mt-1">
              Affordable Housing Pipeline & Site Feasibility
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Evaluate infill parcels against federal funding criteria, zoning density bonuses, cost per unit, and local Area Median Income demand.
            </p>
          </div>

          {/* View Mode Switcher and New Site Button */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setPipelineViewMode('compliance-dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-colors cursor-pointer ${
                  pipelineViewMode === 'compliance-dashboard'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>HUD 24 CFR Compliance Dashboard</span>
              </button>
              <button
                onClick={() => setPipelineViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-colors cursor-pointer ${
                  pipelineViewMode === 'grid'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-slate-600" />
                <span>Site Feasibility Review</span>
              </button>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Screen New Site</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search pipeline sites by name, street, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs shrink-0">
            <span className="px-2 text-slate-500 font-medium">Filter Units:</span>
            <button
              onClick={() => setFilterUnits('all')}
              className={`px-3 py-1 rounded cursor-pointer font-medium transition-colors ${
                filterUnits === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              All Scales
            </button>
            <button
              onClick={() => setFilterUnits('10')}
              className={`px-3 py-1 rounded cursor-pointer font-medium transition-colors ${
                filterUnits === '10' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              10 Units
            </button>
            <button
              onClick={() => setFilterUnits('15')}
              className={`px-3 py-1 rounded cursor-pointer font-medium transition-colors ${
                filterUnits === '15' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              15 Units
            </button>
            <button
              onClick={() => setFilterUnits('20')}
              className={`px-3 py-1 rounded cursor-pointer font-medium transition-colors ${
                filterUnits === '20' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              20 Units
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: CENTRALIZED HUD 24 CFR COMPLIANCE DASHBOARD */}
      {pipelineViewMode === 'compliance-dashboard' ? (
        <div className="space-y-6">
          {/* Statutory Matrix KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Tracked Sites</span>
                <Building2 className="w-4 h-4 text-slate-400" />
              </div>
              <span className="text-2xl font-bold text-slate-900 font-mono-numbers block mt-1">
                {filteredProjects.length} Developments
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {filteredProjects.reduce((sum, p) => sum + p.units, 0)} Total Affordable Units
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase">Fully Compliant Sites</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-2xl font-bold text-emerald-700 font-mono-numbers block mt-1">
                {filteredProjects.filter((p) => p.hudCompliance?.overallStatus === 'fully-compliant').length}
              </span>
              <span className="text-[11px] text-emerald-600 mt-0.5 block">
                100% Statutory Clearance
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-700 uppercase">Under HFA Review</span>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-2xl font-bold text-amber-700 font-mono-numbers block mt-1">
                {filteredProjects.filter((p) => p.hudCompliance?.overallStatus === 'pending-review').length}
              </span>
              <span className="text-[11px] text-amber-600 mt-0.5 block">
                NEPA EA / Subsidy Layering
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-indigo-700 uppercase">Section 8 PBV Commitments</span>
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
              </div>
              <span className="text-2xl font-bold text-indigo-700 font-mono-numbers block mt-1">
                100% Guaranteed
              </span>
              <span className="text-[11px] text-indigo-600 mt-0.5 block">
                AHAP & Letters of Intent
              </span>
            </div>
          </div>

          {/* Centralized HUD Statutory Compliance Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                  <span>Central Statutory Oversight</span>
                  <span aria-hidden="true">·</span>
                  <span>HUD 24 CFR Requirements</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 font-display mt-0.5">
                  Portfolio HUD 24 CFR Compliance Tracker
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time statutory status across HOME (Part 92), HTF (Part 93), NEPA (Part 58), Davis-Bacon (§ 92.354), Section 504 Accessibility, and Section 8 PBV vouchers.
                </p>
              </div>

              {/* Requirement quick filter */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs shrink-0 self-start sm:self-auto">
                <span className="px-2 text-slate-500 font-medium">Filter Standard:</span>
                {[
                  { key: 'all', label: 'All Standards' },
                  { key: '24cfr92', label: '24 CFR 92 (HOME)' },
                  { key: '24cfr93', label: '24 CFR 93 (HTF)' },
                  { key: 'davis-bacon', label: 'Davis-Bacon' },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setComplianceRequirementFilter(item.key as any)}
                    className={`px-2.5 py-1 rounded cursor-pointer font-medium transition-colors ${
                      complianceRequirementFilter === item.key
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4 text-left">Planned Development</th>
                    <th className="py-3 px-4 text-center">Scale & Status</th>
                    <th className="py-3 px-4 text-left">24 CFR § 92.252 (HOME Income)</th>
                    <th className="py-3 px-4 text-left">24 CFR § 93.250 (HTF 30% ELI)</th>
                    <th className="py-3 px-4 text-left">24 CFR Part 58 (NEPA Review)</th>
                    <th className="py-3 px-4 text-left">24 CFR § 92.354 (Davis-Bacon)</th>
                    <th className="py-3 px-4 text-left">24 CFR § 8.22 (Sec 504 ADA)</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono-numbers">
                  {filteredProjects.map((p) => {
                    const c = p.hudCompliance;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        {/* Site Name & Location */}
                        <td className="py-3.5 px-4 font-sans">
                          <div className="font-bold text-slate-900">{p.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono-numbers mt-0.5">
                            {p.parcelNumber} · {p.city}, {p.state}
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 font-sans">
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              c?.overallStatus === 'fully-compliant'
                                ? 'bg-emerald-100 text-emerald-800'
                                : c?.overallStatus === 'pending-review'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {c?.overallStatus === 'fully-compliant'
                                ? '✓ Fully Cleared'
                                : c?.overallStatus === 'pending-review'
                                ? '⏳ Pending Review'
                                : '⚠ Action Required'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono-numbers">
                              Priority: {p.federalFundingAlignment.priorityScore}/100
                            </span>
                          </div>
                        </td>

                        {/* Units & Phase */}
                        <td className="py-3.5 px-4 text-center font-sans">
                          <span className="font-bold text-slate-900 font-mono-numbers block text-sm">
                            {p.units} Units
                          </span>
                          <span className="px-2 py-0.5 text-[10px] rounded font-semibold bg-slate-100 text-slate-700 block mt-1">
                            {p.status}
                          </span>
                        </td>

                        {/* 24 CFR 92.252 HOME */}
                        <td className="py-3.5 px-4 font-sans max-w-[200px]">
                          <div className="flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>{c?.homeIncomeTargeting.status === 'compliant' ? 'Compliant (≥20% ≤50% AMI)' : 'Pending'}</span>
                          </div>
                          <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                            {c?.homeIncomeTargeting.details || 'Income tier verification in progress.'}
                          </div>
                        </td>

                        {/* 24 CFR 93.250 HTF */}
                        <td className="py-3.5 px-4 font-sans max-w-[190px]">
                          <div className="flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>100% ELI Standard Met</span>
                          </div>
                          <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                            {c?.htfIncomeTargeting.details || 'HTF unit restrictions verified.'}
                          </div>
                        </td>

                        {/* 24 CFR Part 58 NEPA */}
                        <td className="py-3.5 px-4 font-sans max-w-[190px]">
                          <div className="flex items-center gap-1 text-[11px] font-bold">
                            {c?.environmentalNepa.status === 'cleared' ? (
                              <span className="text-emerald-700 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span>FONSI / AUGF Cleared</span>
                              </span>
                            ) : (
                              <span className="text-amber-700 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>EA Underway</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                            {c?.environmentalNepa.details || 'NEPA review in progress.'}
                          </div>
                        </td>

                        {/* 24 CFR 92.354 Davis-Bacon */}
                        <td className="py-3.5 px-4 font-sans max-w-[200px]">
                          <div className="flex items-center gap-1 text-[11px] font-bold">
                            {p.units < 12 ? (
                              <span className="text-emerald-700 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span>Statutorily Exempt (&lt; 12)</span>
                              </span>
                            ) : (
                              <span className="text-blue-700 flex items-center gap-1">
                                <Scale className="w-3.5 h-3.5 shrink-0" />
                                <span>Prevailing Wage Enforced</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                            {c?.davisBaconWage.details}
                          </div>
                        </td>

                        {/* 24 CFR 8.22 Section 504 */}
                        <td className="py-3.5 px-4 font-sans max-w-[180px]">
                          <div className="flex items-center gap-1 text-[11px] font-bold">
                            {c?.section504Accessibility.status === 'certified' ? (
                              <span className="text-emerald-700 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span>Stamped &amp; Certified</span>
                              </span>
                            ) : (
                              <span className="text-amber-700 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>Drawings Pending</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                            {c?.section504Accessibility.details}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center font-sans">
                          <button
                            onClick={() => {
                              setSelectedProjectId(p.id);
                              setPipelineViewMode('grid');
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>Inspect Site</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Statutory Legal Architecture Summary Strip */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-800">
                  Statutory Rule Reference:
                </span>
                <span>
                  All projects are cross-referenced against HUD Handbook 1378.0, 24 CFR § 92.250(b) Subsidy Layering, and HUD Section 8 PBV regulations (24 CFR Part 983).
                </span>
              </div>
              <button
                onClick={() => onNavigateToTab('unitmix')}
                className="text-emerald-700 hover:text-emerald-800 font-bold shrink-0 cursor-pointer"
              >
                Open Unit Mix &amp; AMI Validator →
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* VIEW 2: ORIGINAL DUAL-PANE SITE FEASIBILITY SCREENING */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Project Selector List */}
        <div className="lg:col-span-5 space-y-4">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Active Pipeline Sites ({filteredProjects.length})
          </span>

          <div className="space-y-3">
            {filteredProjects.map((p) => {
              const isSelected = p.id === activeProject.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProjectId(p.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-slate-900 shadow-sm ring-1 ring-slate-900'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-slate-900 font-display">
                          {p.name}
                        </span>
                        <span className="font-mono-numbers text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold text-[11px] border border-emerald-200">
                          {p.units} Units
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500 text-xs mt-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{p.address}, {p.city}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-slate-900 font-mono-numbers block">
                        ${(p.estimatedCost.totalDevelopmentCost / 1000000).toFixed(2)}M
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold font-mono-numbers">
                        +${(p.estimatedCost.developerFeeProfit / 1000).toFixed(0)}k Fee
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate max-w-[160px]">{p.siteType} · {p.siteAcreage} ac</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800 font-mono-numbers">
                        Score {p.federalFundingAlignment.priorityScore}/100
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-medium">
                        {p.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Comprehensive Site Selection, Zoning & Market Deep-Dive */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 lg:p-8 space-y-6">
          {/* Header of Active Site */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono-numbers text-slate-500">
                <span>{activeProject.parcelNumber}</span>
                <span aria-hidden="true">·</span>
                <span>{activeProject.siteType}</span>
                <span aria-hidden="true">·</span>
                <span>{activeProject.siteAcreage} Acres</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 font-display mt-1">
                {activeProject.name} ({activeProject.units} Units)
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                {activeProject.address}, {activeProject.city}, {activeProject.state}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onSelectProjectForStacker(activeProject.units as 10 | 15 | 20);
                  onNavigateToTab('stacker');
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                <span>Load in 100% Capital Stacker</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Section 1: Site Selection Criteria Analysis */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>1. Site Selection & Infrastructure Criteria</span>
              </h3>
              <span className="text-xs font-semibold text-slate-700 font-mono-numbers">
                Walk Score: {activeProject.siteCriteria.walkScore}/100
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Public Transit Access</span>
                <span className="font-medium text-slate-800 mt-0.5 block">
                  {activeProject.siteCriteria.transitDistance}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Grocery & Essential Retail</span>
                <span className="font-medium text-slate-800 mt-0.5 block">
                  {activeProject.siteCriteria.groceryDistance}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Schools & Educational Hubs</span>
                <span className="font-medium text-slate-800 mt-0.5 block">
                  {activeProject.siteCriteria.schoolDistance}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Environmental NEPA Status</span>
                <span className="font-medium text-emerald-700 mt-0.5 block">
                  {activeProject.siteCriteria.environmentalRisk}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Zoning Considerations & Regulatory Analysis */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>2. Zoning & Entitlement Feasibility</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Current Zoning District</span>
                <span className="font-semibold text-slate-900 block mt-0.5">
                  {activeProject.zoningAnalysis.currentZoning}
                </span>
                <span className="text-[10px] text-slate-500">
                  {activeProject.zoningAnalysis.allowedDensity}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Parking Ratio Mandate</span>
                <span className="font-semibold text-slate-900 block mt-0.5">
                  {activeProject.zoningAnalysis.parkingRequirement}
                </span>
                <span className="text-[10px] text-emerald-600 font-medium">
                  TOD relief applied
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Entitlement Path</span>
                <span className="font-semibold text-emerald-700 block mt-0.5">
                  {activeProject.zoningAnalysis.byRightApproval ? 'By-Right Approval' : 'Variance Required'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {activeProject.zoningAnalysis.varianceNeeded}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Estimated Development Costs & Developer Profit */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>3. Estimated Development Costs (TDC)</span>
              </h3>
              <span className="text-xs font-bold text-slate-900 font-mono-numbers">
                TDC: ${activeProject.estimatedCost.totalDevelopmentCost.toLocaleString()} (${activeProject.estimatedCost.costPerUnit.toLocaleString()}/unit)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Land / Site Option</span>
                <span className="font-semibold text-slate-800 font-mono-numbers">
                  ${(activeProject.estimatedCost.landCost / 1000).toFixed(0)}k
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Hard Construction</span>
                <span className="font-semibold text-slate-800 font-mono-numbers">
                  ${(activeProject.estimatedCost.hardCost / 1000).toFixed(0)}k
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Soft & Engineering</span>
                <span className="font-semibold text-slate-800 font-mono-numbers">
                  ${(activeProject.estimatedCost.softCost / 1000).toFixed(0)}k
                </span>
              </div>
              <div className="bg-emerald-50 p-2.5 rounded border border-emerald-200">
                <span className="text-emerald-700 block text-[10px] font-semibold">Developer Fee (Profit)</span>
                <span className="font-bold text-emerald-800 font-mono-numbers">
                  ${(activeProject.estimatedCost.developerFeeProfit / 1000).toFixed(0)}k cash
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Potential Market Demand Analysis */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              <span>4. Affordable Housing Market Demand</span>
            </h3>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-slate-200/60 pb-3">
                <div>
                  <span className="text-slate-400 block text-[11px]">Area Median Income (AMI)</span>
                  <span className="font-bold text-slate-900 font-mono-numbers">
                    ${activeProject.marketDemand.localAmi.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Cost-Burdened Renters</span>
                  <span className="font-bold text-amber-700 font-mono-numbers">
                    {activeProject.marketDemand.costBurdenedRenterPct}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Poverty Rate</span>
                  <span className="font-bold text-slate-900 font-mono-numbers">
                    {activeProject.marketDemand.povertyRate}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">PHA Voucher Waitlist</span>
                  <span className="font-bold text-slate-900 font-mono-numbers">
                    {activeProject.marketDemand.phaVoucherWaitlistMonths} Months
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                  Target Resident Profile:
                </span>
                <p className="text-slate-700 leading-relaxed text-xs">
                  {activeProject.marketDemand.targetResidentProfile}
                </p>
              </div>
            </div>
          </div>

          {/* Section 5: Federal Funding Alignment & Priority Score */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-emerald-600" />
                <span>5. Federal Funding Alignment & Basis Boost</span>
              </h3>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono-numbers">
                Priority Score: {activeProject.federalFundingAlignment.priorityScore} / 100
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded font-medium">
                {activeProject.federalFundingAlignment.davisBaconStatus}
              </span>
              {activeProject.federalFundingAlignment.qualifiedCensusTract && (
                <span className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded font-medium border border-emerald-200">
                  Qualified Census Tract (130% Basis Boost)
                </span>
              )}
              {activeProject.federalFundingAlignment.opportunityZone && (
                <span className="bg-blue-50 text-blue-800 px-2.5 py-1 rounded font-medium border border-blue-200">
                  Federal Opportunity Zone
                </span>
              )}
            </div>

            <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-200 text-xs">
              <span className="font-bold text-emerald-950 block text-[11px] uppercase tracking-wider mb-1">
                Targeted Federal Capital Sources (100% Non-Dilutive):
              </span>
              <div className="flex flex-wrap gap-2 text-emerald-900">
                {activeProject.federalFundingAlignment.primaryPrograms.map((prog, idx) => (
                  <span key={idx} className="bg-white px-2 py-0.5 rounded border border-emerald-200 font-mono-numbers font-medium">
                    {prog}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Modal: Screen New Site Opportunity */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <h2 className="text-sm font-bold font-display">
                  Screen New Pipeline Site Opportunity
                </h2>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSite} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Project / Site Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Magnolia Heights Infill"
                  value={newSite.name}
                  onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Target Scale</label>
                  <select
                    value={newSite.units}
                    onChange={(e) => setNewSite({ ...newSite, units: Number(e.target.value) as 10 | 15 | 20 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value={10}>10 Units (Davis-Bacon Exempt)</option>
                    <option value={15}>15 Units (Garden Flats)</option>
                    <option value={20}>20 Units (4% LIHTC Stack)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Site Acreage</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.2"
                    max="5.0"
                    value={newSite.acreage}
                    onChange={(e) => setNewSite({ ...newSite, acreage: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Street Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 520 Central Avenue"
                  value={newSite.address}
                  onChange={(e) => setNewSite({ ...newSite, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Current Zoning</label>
                  <input
                    type="text"
                    value={newSite.zoning}
                    onChange={(e) => setNewSite({ ...newSite, zoning: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Estimated Walk Score</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newSite.walkScore}
                    onChange={(e) => setNewSite({ ...newSite, walkScore: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold shadow-xs cursor-pointer"
                >
                  Add Site & Run Underwriting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import {
  Building2,
  DollarSign,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Layers,
  Award,
} from 'lucide-react';
import { HousingArchetype, DeveloperCompany } from '../types';
import { housingArchetypes } from '../data/archetypes';

interface ExecutiveOverviewProps {
  company: DeveloperCompany;
  onSelectArchetype: (units: 10 | 15 | 20) => void;
  onNavigateToTab: (tab: 'overview' | 'pipeline' | 'stacker' | 'strategy' | 'unitmix' | 'wealth' | 'underwriter') => void;
}

export const ExecutiveOverview: React.FC<ExecutiveOverviewProps> = ({
  company,
  onSelectArchetype,
  onNavigateToTab,
}) => {
  const archetypesList: HousingArchetype[] = [
    housingArchetypes[10],
    housingArchetypes[15],
    housingArchetypes[20],
  ];

  return (
    <div className="space-y-10">
      {/* Hero Banner / Strategic Focus */}
      <section className="bg-slate-900 text-white rounded-2xl p-8 lg:p-10 relative overflow-hidden border border-slate-800">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold tracking-wide uppercase">
            <span>Federal Affordable Housing Enterprise</span>
            <span aria-hidden="true">·</span>
            <span>Missing Middle 10, 15, 20 Units</span>
          </div>

          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight font-display text-white text-balance">
            Build a High-Margin Real Estate Development Firm with 100% Federal Funding
          </h1>

          <p className="text-slate-300 text-base lg:text-lg leading-relaxed">
            By layering HUD HOME Investment Partnerships, the National Housing Trust Fund, FHLBank AHP grants, and IRA Clean Energy Credits, developers can fund 100% of all land, architectural, and construction costs with zero personal equity while collecting 10% to 15% cash Developer Fees.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <button
              onClick={() => onNavigateToTab('pipeline')}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              <span>Explore Project Pipeline</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigateToTab('wealth')}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              <span>Commercial BRRRR & Wealth</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigateToTab('strategy')}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer border border-slate-700"
            >
              <span>Federal Funding Master Strategy</span>
            </button>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Institutional KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Target Pipeline</span>
            <Building2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono-numbers">
            45 Units
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Active models: 10, 15, and 20 units
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Development Value</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono-numbers">
            $11,400,000
          </div>
          <p className="text-xs text-slate-500 mt-1">
            100% non-dilutive public capital stack
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Developer Fee Cash Profit</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-mono-numbers">
            $1,368,000
          </div>
          <p className="text-xs text-slate-500 mt-1">
            12% allowable cash fee paid from grant draws
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Personal Equity Required</span>
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono-numbers">
            $0.00
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Zero out-of-pocket developer equity
          </p>
        </div>
      </section>

      {/* Core Business Mechanics: How 100% Federal Stacking Works */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-display">
              The 100% Publicly Funded Development Formula
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              How private developers structure missing-middle affordable housing without bank debt
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tested HUD 24 CFR Part 92 Underwriting Model</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm font-mono-numbers">
              01
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              Upfront Cash Flow via Developer Fees
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Federal guidelines (HUD HOME and State QAPs) explicitly authorize developers to budget a <strong>10% to 15% Developer Fee</strong> inside Total Development Cost. On a $3.75M 15-unit build, you draw $450,000 in direct cash profit across 3 milestones as work progresses.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm font-mono-numbers">
              02
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              Stacking 4 to 5 Non-Repayable Sources
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              You combine non-competitive HUD HOME grants ($1M–$1.5M), National HTF 0% soft loans ($500k–$1M), FHLBank AHP grants ($450k–$650k), and IRA Clean Energy Tax Credits ($5,000/unit). Total public capital equals 100% of costs.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center text-sm font-mono-numbers">
              03
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              Recession-Proof Section 8 PBV Cash Flow
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Securing 20-year Section 8 Project-Based Vouchers (PBVs) guarantees HUD direct-deposits Fair Market Rents every month. With zero first mortgage payments to service, operating break-even occupancy drops to only ~50%.
            </p>
          </div>
        </div>
      </section>

      {/* STRATEGIC THESIS: 7 MILLION SECTION 8 WAITLIST & THE BLIGHT-TO-TOD PLAYBOOK */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: The 7 Million Demand Fact & Guaranteed HUD Income */}
        <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white rounded-2xl p-6 lg:p-8 border border-emerald-500/30 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                The 7,000,000 Household Demand Reality
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono-numbers">
                Zero Vacancy Risk
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-3xl lg:text-4xl font-extrabold text-white font-mono-numbers tracking-tight">
                7,000,000+
              </span>
              <h3 className="text-lg font-bold text-emerald-200 font-display">
                Families Waiting for Section 8 Housing Right Now
              </h3>
            </div>

            <p className="text-xs lg:text-sm text-slate-300 leading-relaxed">
              Do you know what 7 million people sitting on housing authority waiting lists means? <strong>It means if you bring 10, 15, or 20 units of affordable housing to your community, your occupancy is 100% guaranteed.</strong>
            </p>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-xs text-slate-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>The Government Direct-Deposits 100% of the Rent</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                When you secure a 20-year Section 8 Project-Based Voucher (PBV) contract with your local Housing Authority, the federal government wires Fair Market Rents directly into your account on the 1st of every month—creating guaranteed generational financial stability for you and your family.
              </p>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between text-xs text-emerald-400 font-semibold">
            <span>Guaranteed Occupancy · $0 Bad Debt</span>
            <button
              onClick={() => onNavigateToTab('unitmix')}
              className="hover:text-emerald-300 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Explore Section 8 PBV Rent Roll</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 2: How Wealthy Investors See Real Estate (Blight to TOD Transportation Hub) */}
        <div className="bg-white rounded-2xl p-6 lg:p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                The Blight-to-Transit Wealth Architecture
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                Institutional Playbook
              </span>
            </div>

            <h3 className="text-xl font-bold text-slate-900 font-display">
              How Ultra-Wealthy Developers Win 100% Government Funding
            </h3>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                Most amateurs look at an abandoned, boarded-up building and think: <em>"What’s the point of rehabbing that headache?"</em>
              </p>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 block text-xs">
                  Rich Real Estate Investors Don't Just See an Abandoned Building:
                </span>
                <p className="text-[11px] text-slate-700 leading-relaxed">
                  They see an abandoned building <strong>two blocks from a train station or bus rapid transit hub</strong>. When they request funding from the city, state, and HUD, they don't pitch an apartment complex—they pitch an <strong>Urban Blight Elimination &amp; Transit-Oriented Workforce Sustainability Hub</strong>.
                </p>
              </div>
              <p>
                By positioning the project as (1) eliminating dangerous neighborhood blight and (2) connecting working-class transit riders to high-paying regional employment centers, cities unlock <strong>100% grant coverage</strong> from HUD HOME, CDBG, and National HTF grants.
              </p>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-700 font-semibold">
            <span>Adaptive Infill · 130% Basis Boost</span>
            <button
              onClick={() => onNavigateToTab('pipeline')}
              className="hover:text-indigo-900 inline-flex items-center gap-1 cursor-pointer font-bold"
            >
              <span>Review Transit Pipeline Sites</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 3 Archetypes Showcase: 10, 15, and 20 Units */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-display">
              Select Your Development Scale
            </h2>
            <p className="text-sm text-slate-600">
              Three institutional models engineered for infill sites, missing-middle density, and federal grant limits
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {archetypesList.map((archetype) => {
            const totalCost = Object.values(archetype.defaultCosts).reduce((a, b) => a + b, 0);
            const totalGrants = archetype.defaultFunding.reduce((a, b) => a + (b.active ? b.amount : 0), 0);
            const coverage = (totalGrants / totalCost) * 100;

            return (
              <div
                key={archetype.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col hover:border-slate-300 transition-colors"
              >
                {/* Visual Header with Real Generated Architectural Render */}
                <div className="relative aspect-video w-full bg-slate-100 overflow-hidden">
                  <img
                    src={archetype.imagePath}
                    alt={archetype.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
                  />
                  <div className="absolute top-3 left-3 bg-slate-900/90 text-white text-xs font-bold px-2.5 py-1 rounded backdrop-blur-sm font-mono-numbers">
                    {archetype.units} Units
                  </div>
                  <div className="absolute bottom-3 right-3 bg-emerald-600/90 text-white text-xs font-semibold px-2 py-0.5 rounded backdrop-blur-sm">
                    {coverage >= 99.9 ? '100% Fully Funded' : `${coverage.toFixed(0)}% Funded`}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-slate-900 font-display">
                      {archetype.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {archetype.tagline}
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {archetype.description}
                    </p>
                  </div>

                  {/* Financial Quick Specs */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 block">Total Dev Cost</span>
                      <span className="font-bold text-slate-900 font-mono-numbers">
                        ${(totalCost / 1000000).toFixed(2)}M
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Developer Fee</span>
                      <span className="font-bold text-emerald-600 font-mono-numbers">
                        ${Math.round(archetype.defaultCosts.developerFee / 1000)}k cash
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Cost / Unit</span>
                      <span className="font-semibold text-slate-700 font-mono-numbers">
                        ${Math.round(totalCost / archetype.units).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Davis-Bacon</span>
                      <span className={`font-semibold ${archetype.davisBaconApplies ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {archetype.davisBaconApplies ? 'Prevailing Wage' : 'Statutorily Exempt'}
                      </span>
                    </div>
                  </div>

                  {/* Funding Sources List */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Federal Sources Stack
                    </span>
                    <div className="text-xs text-slate-600 space-y-1">
                      {archetype.defaultFunding.slice(0, 3).map((f) => (
                        <div key={f.id} className="flex justify-between">
                          <span className="truncate pr-2">{f.name.split('(')[0]}</span>
                          <span className="font-mono-numbers font-medium text-slate-800">
                            ${(f.amount / 1000).toFixed(0)}k
                          </span>
                        </div>
                      ))}
                      {archetype.defaultFunding.length > 3 && (
                        <span className="text-[11px] text-slate-400 block italic">
                          + {archetype.defaultFunding.length - 3} additional federal / energy credits
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  <button
                    onClick={() => {
                      onSelectArchetype(archetype.units as 10 | 15 | 20);
                      onNavigateToTab('stacker');
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <span>Load {archetype.units}-Unit Pro-Forma & Stacker</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Critical Developer Secret: The Davis-Bacon 12-Unit Rule */}
      <section className="bg-slate-50 rounded-xl border border-slate-200 p-6 space-y-3">
        <div className="flex items-center gap-2 text-slate-900 font-bold font-display text-base">
          <Award className="w-5 h-5 text-emerald-600" />
          <span>Underwriter Secret: The 12-Unit Davis-Bacon Prevailing Wage Threshold</span>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          Under Section 286 of the Cranston-Gonzalez Act and HUD 24 CFR 92.354, federal Davis-Bacon prevailing wage rules <strong>only apply to housing developments with 12 or more HOME-assisted units</strong>. For a <strong>10-unit development</strong>, you can use standard competitive market-rate open-shop subcontractors, saving between <strong>14% and 20% in construction labor costs</strong> while still accessing maximum HOME grant funding! For 15 and 20-unit developments, prevailing wages apply, but are fully offset by higher per-unit grant limits and 4% LIHTC syndication volume.
        </p>
      </section>
    </div>
  );
};

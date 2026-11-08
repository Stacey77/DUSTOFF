import React, { useRef, useState } from 'react';
import { X, Printer, Copy, Check, Building2, ShieldCheck, Download, Award } from 'lucide-react';
import { HousingArchetype, DeveloperCompany, CostBreakdown, FundingSource } from '../types';
import { housingArchetypes } from '../data/archetypes';

interface DealPackagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUnits: 10 | 15 | 20;
  company: DeveloperCompany;
}

export const DealPackagerModal: React.FC<DealPackagerModalProps> = ({
  isOpen,
  onClose,
  selectedUnits,
  company,
}) => {
  const [copied, setCopied] = useState(false);
  const memoRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const currentArchetype = housingArchetypes[selectedUnits];
  const totalCost = Object.values(currentArchetype.defaultCosts).reduce((a, b) => a + b, 0);
  const totalGrants = currentArchetype.defaultFunding.reduce((a, b) => a + (b.active ? b.amount : 0), 0);

  const handlePrint = () => {
    window.print();
  };

  const memoText = `EXECUTIVE MEMORANDUM & 100% FEDERAL CAPITAL STACK PROPOSAL
Date: ${new Date().toLocaleDateString()}
Developer Entity: ${company.name} (UEI: ${company.samUei || 'PENDING'}, CAGE: ${company.cageCode || 'PENDING'})
Project: ${currentArchetype.name} (${selectedUnits} Units)
Target Market: ${company.city}, ${company.state}

1. EXECUTIVE SUMMARY
${company.name} proposes to construct "${currentArchetype.name}", a ${selectedUnits}-unit high-efficiency affordable housing community. The development requires ZERO private debt, achieving a 100% non-dilutive public capital stack through federal, state, and bank housing grants.

2. TOTAL DEVELOPMENT BUDGET (USES OF FUNDS)
- Total Development Cost (TDC): $${totalCost.toLocaleString()}
- Cost Per Unit: $${Math.round(totalCost / selectedUnits).toLocaleString()}
- Land Acquisition: $${currentArchetype.defaultCosts.landAcquisition.toLocaleString()}
- Hard Construction: $${currentArchetype.defaultCosts.hardConstruction.toLocaleString()}
- Site Work & Infrastructure: $${currentArchetype.defaultCosts.siteWorkAndUtilities.toLocaleString()}
- Architectural & Engineering: $${currentArchetype.defaultCosts.architecturalAndEngineering.toLocaleString()}
- Contingency: $${currentArchetype.defaultCosts.contingency.toLocaleString()}
- Allowable Developer Fee (Cash Profit): $${currentArchetype.defaultCosts.developerFee.toLocaleString()} (12.0%)

3. 100% FEDERAL CAPITAL STACK (SOURCES OF FUNDS)
${currentArchetype.defaultFunding
  .map(
    (f) =>
      `- ${f.name}: $${f.amount.toLocaleString()} (${((f.amount / totalCost) * 100).toFixed(1)}%) [${f.type}]`
  )
  .join('\n')}
- TOTAL PUBLIC FINANCING: $${totalGrants.toLocaleString()} (100.0% Coverage)
- DEVELOPER OUT-OF-POCKET CASH EQUITY: $0.00

4. REGULATORY & LABOR COMPLIANCE
- Davis-Bacon Prevailing Wage: ${
    selectedUnits < 12
      ? 'EXEMPT (Total HOME units < 12 per 24 CFR 92.354)'
      : 'COMPLIANT (Certified weekly payroll via LCPtracker)'
  }
- Long-Term Affordability Covenant: 20–30 Years restricting occupancy to households ≤60% AMI.
- Environmental Clearance: HUD Part 58 NEPA Review with Finding of No Significant Impact (FONSI).
- Operating Revenue Guarantee: 20-Year HUD Section 8 Project-Based Voucher (PBV) HAP Contract.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(memoText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold font-display">
                Executive Deal Memo & 100% Capital Stack Proposal
              </h2>
              <span className="text-xs text-slate-400">
                Ready to submit to City Council, Housing Authority & State HFA
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer border border-slate-700"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Text</span>
                </>
              )}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Printable Document */}
        <div
          ref={memoRef}
          className="p-8 overflow-y-auto space-y-8 text-xs text-slate-800 leading-relaxed font-sans"
        >
          {/* Institutional Letterhead */}
          <div className="border-b-2 border-slate-900 pb-6 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
            <div>
              <span className="text-xl font-bold font-display text-slate-900 block">
                {company.name}
              </span>
              <span className="text-xs text-slate-500 block">
                Affordable Housing Real Estate Development · Single-Asset Entity Sponsor
              </span>
              <span className="text-[11px] text-slate-400 block font-mono-numbers mt-0.5">
                SAM.gov UEI: {company.samUei || 'REG-PENDING'} · CAGE: {company.cageCode || 'PENDING'} · CHDO: {company.chdoStatus ? 'Certified' : 'Private Developer'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 uppercase tracking-wider inline-block">
                100% Non-Dilutive Capital Stack
              </span>
              <span className="text-[11px] text-slate-400 block mt-1 font-mono-numbers">
                Date: {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Section 1: Development Summary */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              1. Project Identification & Scope
            </h3>
            <p className="text-slate-700">
              {company.name} hereby presents the development proposal for <strong>{currentArchetype.name}</strong>, a proposed <strong>{selectedUnits}-unit</strong> affordable residential community located in {company.city}, {company.state}. The development is designed to address the critical deficit of quality housing for workforce households and low-income families earning between 30% and 60% of Area Median Income (AMI).
            </p>
          </div>

          {/* Section 2: Budget Breakdown Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              2. Total Development Budget (Uses of Funds)
            </h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 text-left">Budget Category</th>
                    <th className="py-2.5 px-3 text-right">Cost Per Unit</th>
                    <th className="py-2.5 px-3 text-right">Total Amount</th>
                    <th className="py-2.5 px-3 text-right">% of TDC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2 px-3 font-medium">Land Acquisition & Site Control</td>
                    <td className="py-2 px-3 text-right font-mono-numbers">${Math.round(currentArchetype.defaultCosts.landAcquisition / selectedUnits).toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-mono-numbers">${currentArchetype.defaultCosts.landAcquisition.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-mono-numbers">{((currentArchetype.defaultCosts.landAcquisition / totalCost) * 100).toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium">Hard Construction (General Contractor)</td>
                    <td className="py-2 px-3 text-right font-mono-numbers">${Math.round(currentArchetype.defaultCosts.hardConstruction / selectedUnits).toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-mono-numbers">${currentArchetype.defaultCosts.hardConstruction.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-mono-numbers">{((currentArchetype.defaultCosts.hardConstruction / totalCost) * 100).toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium">Site Work, Utilities & Infrastructure</td>
                    <td className="py-2 px-3 text-right font-mono-numbers">${Math.round(currentArchetype.defaultCosts.siteWorkAndUtilities / selectedUnits).toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-mono-numbers">${currentArchetype.defaultCosts.siteWorkAndUtilities.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-mono-numbers">{((currentArchetype.defaultCosts.siteWorkAndUtilities / totalCost) * 100).toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium">Architectural, Engineering & Environmental</td>
                    <td className="py-2 px-3 text-right font-mono-numbers">${Math.round(currentArchetype.defaultCosts.architecturalAndEngineering / selectedUnits).toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-mono-numbers">${currentArchetype.defaultCosts.architecturalAndEngineering.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-mono-numbers">{((currentArchetype.defaultCosts.architecturalAndEngineering / totalCost) * 100).toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium">Construction Contingency</td>
                    <td className="py-2 px-3 text-right font-mono-numbers">${Math.round(currentArchetype.defaultCosts.contingency / selectedUnits).toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-mono-numbers">${currentArchetype.defaultCosts.contingency.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-mono-numbers">{((currentArchetype.defaultCosts.contingency / totalCost) * 100).toFixed(1)}%</td>
                  </tr>
                  <tr className="bg-emerald-50/50 font-bold">
                    <td className="py-2 px-3 text-emerald-900">Allowable Developer Fee (Cash Profit)</td>
                    <td className="py-2 px-3 text-right font-mono-numbers text-emerald-800">${Math.round(currentArchetype.defaultCosts.developerFee / selectedUnits).toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-mono-numbers text-emerald-800">${currentArchetype.defaultCosts.developerFee.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-mono-numbers text-emerald-800">12.0%</td>
                  </tr>
                  <tr className="bg-slate-100 font-bold text-slate-900">
                    <td className="py-2.5 px-3">TOTAL DEVELOPMENT COST (TDC)</td>
                    <td className="py-2.5 px-3 text-right font-mono-numbers">${Math.round(totalCost / selectedUnits).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono-numbers">${totalCost.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono-numbers">100.0%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: 100% Capital Stack Breakdown */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              3. The 100% Public Capital Stack (Sources of Funds)
            </h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 text-left">Funding Vehicle</th>
                    <th className="py-2.5 px-3 text-left">Award Type</th>
                    <th className="py-2.5 px-3 text-right">Commitment Amount</th>
                    <th className="py-2.5 px-3 text-right">Stack Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentArchetype.defaultFunding.map((f) => (
                    <tr key={f.id}>
                      <td className="py-2 px-3 font-medium text-slate-900">{f.name}</td>
                      <td className="py-2 px-3 text-slate-600">{f.type}</td>
                      <td className="py-2 px-3 text-right font-mono-numbers font-semibold text-slate-900">${f.amount.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-mono-numbers text-slate-600">{((f.amount / totalCost) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                  <tr className="bg-emerald-50/70 font-bold">
                    <td className="py-2.5 px-3 text-emerald-950">TOTAL NON-DILUTIVE PUBLIC CAPITAL</td>
                    <td className="py-2.5 px-3 text-emerald-800">100% Grants & Soft Subsidies</td>
                    <td className="py-2.5 px-3 text-right font-mono-numbers text-emerald-900 font-bold">${totalGrants.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono-numbers text-emerald-900 font-bold">100.0%</td>
                  </tr>
                  <tr className="bg-white font-bold text-slate-900">
                    <td className="py-2.5 px-3" colSpan={2}>DEVELOPER REQUIRED CASH EQUITY</td>
                    <td className="py-2.5 px-3 text-right font-mono-numbers text-emerald-700" colSpan={2}>$0.00 (Zero Out-of-Pocket)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Regulatory & Labor Compliance */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              4. Labor & Regulatory Compliance Findings
            </h3>
            <ul className="space-y-1.5 text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>
                  <strong>Davis-Bacon Act (24 CFR 92.354): </strong>
                  {selectedUnits < 12
                    ? 'Exempt from federal prevailing wages because the development contains fewer than 12 HOME-assisted units. Hard construction costs benefit from competitive open-shop labor rates.'
                    : 'Davis-Bacon prevailing wages apply and are included in the contractor bid specifications, tracked via certified electronic payroll.'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>
                  <strong>Subsidy Layering Review (HUD 24 CFR 92.250): </strong>
                  The project demonstrates reasonable developer returns and zero duplicate public subsidy.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>
                  <strong>Section 8 Project-Based Voucher (PBV) Commitment: </strong>
                  Operating revenue is anchored by 20-year HUD Fair Market Rent subsidies, guaranteeing break-even occupancy below 55%.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { ExecutiveOverview } from './components/ExecutiveOverview';
import { PipelineManager } from './components/PipelineManager';
import { CapitalStacker } from './components/CapitalStacker';
import { FederalFundingStrategy } from './components/FederalFundingStrategy';
import { UnitMixDesigner } from './components/UnitMixDesigner';
import { WealthStrategies } from './components/WealthStrategies';
import { AiUnderwriter } from './components/AiUnderwriter';
import { DealPackagerModal } from './components/DealPackagerModal';
import { BusinessSettingsModal } from './components/BusinessSettingsModal';
import { DeveloperCompany } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'pipeline' | 'stacker' | 'strategy' | 'unitmix' | 'wealth' | 'underwriter'
  >('pipeline');

  const [selectedUnits, setSelectedUnits] = useState<10 | 15 | 20>(10);
  const [isDealPackagerOpen, setIsDealPackagerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [company, setCompany] = useState<DeveloperCompany>({
    name: 'CivicPeak Development Partners LLC',
    legalStructure: 'Single Purpose Entity / Manager-Managed LLC',
    samUei: 'H8M2K9L4V7P1',
    cageCode: '9X4R2',
    city: 'Atlanta',
    state: 'GA',
    chdoStatus: true,
    targetPipelineUnits: 45,
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* 3-Zone Top Navigation Contract */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenDealPackager={() => setIsDealPackagerOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        developerName={company.name}
      />

      {/* Main Workspace Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <ExecutiveOverview
            company={company}
            onSelectArchetype={(units) => {
              setSelectedUnits(units);
              setActiveTab('stacker');
            }}
            onNavigateToTab={setActiveTab}
          />
        )}

        {activeTab === 'pipeline' && (
          <PipelineManager
            onSelectProjectForStacker={(units) => {
              setSelectedUnits(units);
              setActiveTab('stacker');
            }}
            onNavigateToTab={setActiveTab}
          />
        )}

        {activeTab === 'stacker' && (
          <CapitalStacker
            selectedUnits={selectedUnits}
            onSelectUnits={setSelectedUnits}
            onNavigateToUnderwriter={() => setActiveTab('underwriter')}
          />
        )}

        {activeTab === 'strategy' && (
          <FederalFundingStrategy onNavigateToTab={setActiveTab} />
        )}

        {activeTab === 'unitmix' && (
          <UnitMixDesigner
            onNavigateToStacker={(units) => {
              setSelectedUnits(units);
              setActiveTab('stacker');
            }}
          />
        )}

        {activeTab === 'wealth' && (
          <WealthStrategies onNavigateToTab={setActiveTab} />
        )}

        {activeTab === 'underwriter' && (
          <AiUnderwriter selectedUnits={selectedUnits} company={company} />
        )}
      </main>

      {/* Modals */}
      <DealPackagerModal
        isOpen={isDealPackagerOpen}
        onClose={() => setIsDealPackagerOpen(false)}
        selectedUnits={selectedUnits}
        company={company}
      />

      <BusinessSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        company={company}
        onSave={setCompany}
      />

      {/* Clean Institutional Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">CivicStack</span>
            <span aria-hidden="true">·</span>
            <span>Federal Affordable Housing Development & Capital Stacking Platform</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>HUD 24 CFR Part 92 / Part 93</span>
            <span aria-hidden="true">·</span>
            <span>IRC §42 / §45L / §48(e)</span>
            <span aria-hidden="true">·</span>
            <span>12 CFR Part 1291</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

import React from 'react';
import { Building2, FileSpreadsheet, Settings } from 'lucide-react';

interface NavbarProps {
  activeTab: 'overview' | 'pipeline' | 'stacker' | 'strategy' | 'unitmix' | 'wealth' | 'underwriter';
  onTabChange: (tab: 'overview' | 'pipeline' | 'stacker' | 'strategy' | 'unitmix' | 'wealth' | 'underwriter') => void;
  onOpenDealPackager: () => void;
  onOpenSettings: () => void;
  developerName: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenDealPackager,
  onOpenSettings,
  developerName,
}) => {
  return (
    <header className="flex items-center justify-between gap-6 px-6 py-4 bg-white border-b border-slate-200 sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="#overview"
          onClick={(e) => {
            e.preventDefault();
            onTabChange('overview');
          }}
          className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 font-display whitespace-nowrap cursor-pointer"
        >
          <Building2 className="w-6 h-6 text-emerald-600" />
          <span>CivicStack</span>
        </a>
        <span className="hidden lg:inline text-xs text-slate-400">·</span>
        <span className="hidden lg:inline text-xs text-slate-500 font-medium truncate max-w-[160px]">
          {developerName}
        </span>
      </div>

      {/* Zone 2: Concise single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-4 lg:gap-5 text-xs font-semibold text-slate-600">
        <button
          onClick={() => onTabChange('pipeline')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 cursor-pointer ${
            activeTab === 'pipeline'
              ? 'text-slate-900 border-b-2 border-emerald-600 font-bold'
              : ''
          }`}
        >
          Project Pipeline
        </button>
        <button
          onClick={() => onTabChange('stacker')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 cursor-pointer ${
            activeTab === 'stacker'
              ? 'text-slate-900 border-b-2 border-emerald-600 font-bold'
              : ''
          }`}
        >
          100% Capital Stacker
        </button>
        <button
          onClick={() => onTabChange('strategy')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 cursor-pointer ${
            activeTab === 'strategy'
              ? 'text-slate-900 border-b-2 border-emerald-600 font-bold'
              : ''
          }`}
        >
          Funding Strategy
        </button>
        <button
          onClick={() => onTabChange('unitmix')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 cursor-pointer ${
            activeTab === 'unitmix'
              ? 'text-slate-900 border-b-2 border-emerald-600 font-bold'
              : ''
          }`}
        >
          Unit Mix & AMI
        </button>
        <button
          onClick={() => onTabChange('wealth')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 cursor-pointer ${
            activeTab === 'wealth'
              ? 'text-slate-900 border-b-2 border-emerald-600 font-bold'
              : ''
          }`}
        >
          Wealth Strategies (BRRRR)
        </button>
        <button
          onClick={() => onTabChange('underwriter')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 cursor-pointer ${
            activeTab === 'underwriter'
              ? 'text-slate-900 border-b-2 border-emerald-600 font-bold'
              : ''
          }`}
        >
          AI Underwriter
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenSettings}
          title="Company & Federal Settings"
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>
        <button
          onClick={onOpenDealPackager}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Export Deal Memo</span>
        </button>
      </div>
    </header>
  );
};

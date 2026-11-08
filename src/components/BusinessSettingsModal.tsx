import React, { useState } from 'react';
import { X, Building2, Save, ShieldCheck } from 'lucide-react';
import { DeveloperCompany } from '../types';

interface BusinessSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: DeveloperCompany;
  onSave: (company: DeveloperCompany) => void;
}

export const BusinessSettingsModal: React.FC<BusinessSettingsModalProps> = ({
  isOpen,
  onClose,
  company,
  onSave,
}) => {
  const [formData, setFormData] = useState<DeveloperCompany>({ ...company });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full overflow-hidden shadow-2xl">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold font-display">
              Developer Business & Federal Credentials
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 block">
              Development Firm Legal Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. CivicPeak Development LLC"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">
                Primary City
              </label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g. Austin"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">
                State
              </label>
              <input
                type="text"
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="e.g. TX"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">
                SAM.gov UEI (12 chars)
              </label>
              <input
                type="text"
                value={formData.samUei}
                onChange={(e) => setFormData({ ...formData, samUei: e.target.value.toUpperCase() })}
                placeholder="e.g. Z9K2J7M8N4P1"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-slate-900 uppercase focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">
                CAGE Code
              </label>
              <input
                type="text"
                value={formData.cageCode}
                onChange={(e) => setFormData({ ...formData, cageCode: e.target.value.toUpperCase() })}
                placeholder="e.g. 8G5X2"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-slate-900 uppercase focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-900 block">
                Certified CHDO or 501(c)(3) Partner
              </span>
              <span className="text-[11px] text-slate-500">
                Unlocks 15% statutory federal HOME set-aside funds
              </span>
            </div>
            <input
              type="checkbox"
              checked={formData.chdoStatus}
              onChange={(e) => setFormData({ ...formData, chdoStatus: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors cursor-pointer font-semibold shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Business Profile</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

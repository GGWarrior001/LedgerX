import { useState, useRef } from 'react';
import { useAppStore } from '@/shared/stores/useAppStore';
import { dataService } from '@/shared/services/dataService';
import { FY_OPTIONS, CURRENCY_OPTIONS } from '@/lib/constants';

export default function Onboarding() {
  const setProfile    = useAppStore(s => s.setProfile);
  const [step, setStep]     = useState(1);
  const [name, setName]     = useState('');
  const [role, setRole]     = useState('');
  const [city, setCity]     = useState('');
  const [biz, setBiz]       = useState('');
  const [fy, setFy]         = useState('Apr-Mar');
  const [currency, setCurrency] = useState('₹');
  const fileRef = useRef<HTMLInputElement>(null);

  const onNext = () => {
    if (!name.trim() || !biz.trim()) return;
    setStep(2);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data || typeof data !== 'object') throw new Error('Invalid');
        const p = {
          name: name.trim(), role: role.trim() || 'Admin', city: city.trim(),
          businessName: biz.trim(), fiscalYear: fy, currency, dataChoice: 'import',
        };
        setProfile(p);
        dataService.importData(data);
      } catch {
        alert('Failed to import: Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const finish = (choice: 'fresh') => {
    const p = {
      name: name.trim(), role: role.trim() || 'Admin', city: city.trim(),
      businessName: biz.trim(), fiscalYear: fy, currency, dataChoice: choice,
    };
    setProfile(p);
    if (choice === 'fresh') dataService.loadFreshData();
  };

  return (
    <div className="onboarding-overlay">
      <div
        className="bg-card rounded-2xl w-[520px] max-w-[95vw] overflow-hidden shadow-2xl"
        style={{ animation: 'fadeIn 300ms ease' }}
      >
        <div
          className="px-8 pt-[30px] pb-6"
          style={{ background: 'linear-gradient(135deg, hsl(239 84% 67%), hsl(243 75% 59%))' }}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center font-extrabold text-base mb-4"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
          >
            LX
          </div>
          <h1 className="text-[22px] font-bold tracking-tight mb-1.5" style={{ color: '#fff' }}>
            Welcome to LedgerX
          </h1>
          <p className="text-[13.5px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Your modern accounting workspace — let's set it up in 2 quick steps.
          </p>
        </div>

        <div className="px-8 py-6">
          <div className="flex gap-1.5 mb-5">
            <div className="h-1 flex-1 rounded-sm bg-primary" />
            <div className={`h-1 flex-1 rounded-sm transition-colors ${step >= 2 ? 'bg-primary' : 'bg-border'}`} />
          </div>

          {step === 1 && (
            <div>
              <div className="form-field mb-3.5">
                <label>Your Full Name <span className="text-destructive">*</span></label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Arjun Kumar" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="form-field">
                  <label>Role / Title</label>
                  <input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Owner, Admin" />
                </div>
                <div className="form-field">
                  <label>City / Location</label>
                  <input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Bangalore" />
                </div>
              </div>
              <div className="form-field !mb-0">
                <label>Business Name <span className="text-destructive">*</span></label>
                <input value={biz} onChange={e => setBiz(e.target.value)} placeholder="e.g. Acme Pvt. Ltd." />
              </div>
              <div className="flex justify-between items-center mt-5">
                <span className="text-xs text-muted-foreground">Step 1 of 2</span>
                <button
                  onClick={onNext}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg text-[12.5px] font-medium bg-primary text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="text-[13.5px] font-semibold mb-2.5">How would you like to start?</div>
              <div className="grid grid-cols-2 gap-2.5">
                <div
                  className="border-2 border-border rounded-xl p-3.5 cursor-pointer transition-all hover:border-primary hover:bg-primary/5"
                  onClick={() => fileRef.current?.click()}
                >
                  <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
                  <div className="text-[22px] mb-2">📂</div>
                  <div className="text-[13px] font-semibold mb-1">Import Past Data</div>
                  <div className="text-[11.5px] text-muted-foreground">
                    Upload a previously exported JSON file to restore your data.
                  </div>
                </div>
                <div
                  className="border-2 border-border rounded-xl p-3.5 cursor-pointer transition-all hover:border-primary hover:bg-primary/5"
                  onClick={() => finish('fresh')}
                >
                  <div className="text-[22px] mb-2">✨</div>
                  <div className="text-[13px] font-semibold mb-1">Start Fresh</div>
                  <div className="text-[11.5px] text-muted-foreground">
                    Begin with an empty workspace and add your own real data.
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5 mt-4">
                <div className="form-field">
                  <label>Fiscal Year</label>
                  <select value={fy} onChange={e => setFy(e.target.value)}>
                    {FY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>Currency</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)}>
                    {CURRENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-between items-center mt-5">
                <button
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg text-[12.5px] font-medium bg-background border border-border cursor-pointer hover:bg-muted transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={() => finish('fresh')}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg text-[12.5px] font-medium bg-primary text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity"
                >
                  Get Started 🚀
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

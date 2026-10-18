/**
 * BackupWizard.tsx – Guided backup and restore wizard (PHASE 9)
 *
 * Export flow:
 *   1. Decrypts all data via dataService.exportData()
 *   2. JSON.stringify with pretty-print
 *   3. downloadBlob() as lx-backup-{YYYY-MM-DD}.json
 *
 * Import flow:
 *   1. User selects JSON file via <input type="file">
 *   2. Parse + basic structure check
 *   3. Show summary (invoice count, expense count, etc.)
 *   4. User confirms → dataService.importData()
 *   5. Success toast → dialog closes
 *
 * Error handling:
 *   - File too large (> 10 MB) rejected before parsing
 *   - Non-JSON or malformed JSON shown as user error
 *   - dataService.importData uses sanitizeArray to drop bad records
 */
import { useState, useRef } from 'react';
import { dataService }   from '@/shared/services/dataService';
import { toast }         from '@/hooks/use-toast';

interface Props {
  open:    boolean;
  onClose: () => void;
}

type WizardStep = 'menu' | 'export' | 'import-select' | 'import-confirm' | 'importing';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function BackupWizard({ open, onClose }: Props) {
  const [step,       setStep]       = useState<WizardStep>('menu');
  const [error,      setError]      = useState('');
  const [exporting,  setExporting]  = useState(false);
  const [parsedData, setParsedData] = useState<Record<string, unknown> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleClose = () => {
    setStep('menu'); setError(''); setParsedData(null);
    onClose();
  };

  // ── Export ─────────────────────────────────────────────────────────────────

  const handleExport = async () => {
    setExporting(true);
    setError('');
    try {
      const data = await dataService.exportData();
      const date = new Date().toISOString().split('T')[0];
      downloadJson(data, `lx-backup-${date}.json`);
      toast({ title: 'Backup downloaded', description: `lx-backup-${date}.json` });
      handleClose();
    } catch {
      setError('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // ── Import file selection ──────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      setError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          setError('Invalid backup file — expected a JSON object.');
          return;
        }
        setParsedData(parsed);
        setStep('import-confirm');
      } catch {
        setError('Could not parse JSON. Make sure this is a valid LedgerX backup file.');
      }
    };
    reader.onerror = () => setError('Failed to read file.');
    reader.readAsText(file);
  };

  // ── Import confirmation ────────────────────────────────────────────────────

  const handleImportConfirm = async () => {
    if (!parsedData) return;
    setStep('importing');
    setError('');
    try {
      await dataService.importData(parsedData);
      toast({ title: 'Import successful', description: 'Your data has been restored from backup.' });
      handleClose();
    } catch (err) {
      setStep('import-confirm');
      setError(err instanceof Error ? err.message : 'Import failed. The backup may be incompatible.');
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const importSummary = parsedData ? {
    invoices: Array.isArray(parsedData.invoices) ? parsedData.invoices.length : 0,
    expenses: Array.isArray(parsedData.expenses) ? parsedData.expenses.length : 0,
    clients:  Array.isArray(parsedData.clients)  ? parsedData.clients.length  : 0,
    vendors:  Array.isArray(parsedData.vendors)  ? parsedData.vendors.length  : 0,
  } : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Backup and restore"
    >
      <div className="bg-card border border-border rounded-2xl p-6 w-[440px] max-w-[95vw] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">
            {step === 'menu'           && 'Backup & Restore'}
            {step === 'export'         && 'Export Backup'}
            {step === 'import-select'  && 'Import Backup'}
            {step === 'import-confirm' && 'Confirm Restore'}
            {step === 'importing'      && 'Restoring Data…'}
          </h2>
          {step !== 'importing' && (
            <button onClick={handleClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">✕</button>
          )}
        </div>

        {/* Menu */}
        {step === 'menu' && (
          <div className="space-y-3">
            <button
              onClick={() => setStep('export')}
              className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-lg">↓</div>
              <div>
                <div className="text-sm font-medium">Export backup</div>
                <div className="text-xs text-muted-foreground">Download a JSON file with all your data</div>
              </div>
            </button>
            <button
              onClick={() => setStep('import-select')}
              className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-lg">↑</div>
              <div>
                <div className="text-sm font-medium">Restore from backup</div>
                <div className="text-xs text-muted-foreground">Import a previous JSON backup file</div>
              </div>
            </button>
          </div>
        )}

        {/* Export step */}
        {step === 'export' && (
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              This will download a JSON file containing all your invoices, expenses, clients, vendors, and profile settings.
              Store this file securely.
            </p>
            <div className="rounded-xl p-3 mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800">
              ⚠ The backup file is <strong>not encrypted</strong>. Protect it like sensitive financial data.
            </div>
            {error && <p className="text-xs text-destructive mb-3" role="alert">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => setStep('menu')} className="flex-1 py-2 rounded-lg text-sm border border-border hover:bg-muted transition-colors">Back</button>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex-1 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {exporting && <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />}
                {exporting ? 'Exporting…' : 'Download backup'}
              </button>
            </div>
          </div>
        )}

        {/* Import file select */}
        {step === 'import-select' && (
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Select a <code className="text-xs bg-muted px-1 rounded">.json</code> backup file exported from LedgerX.
            </p>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors mb-3"
              role="button"
              aria-label="Select backup file"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
            >
              <div className="text-2xl mb-2">📂</div>
              <div className="text-sm font-medium">Click to select file</div>
              <div className="text-xs text-muted-foreground mt-1">JSON backup file, max 10 MB</div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
              aria-hidden="true"
            />
            {error && <p className="text-xs text-destructive mb-3" role="alert">{error}</p>}
            <button onClick={() => setStep('menu')} className="w-full py-2 rounded-lg text-sm border border-border hover:bg-muted transition-colors">Back</button>
          </div>
        )}

        {/* Import confirm */}
        {step === 'import-confirm' && importSummary && (
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              This will <strong>replace all current data</strong> with the backup contents:
            </p>
            <div className="rounded-xl border border-border p-4 mb-3 grid grid-cols-2 gap-2">
              {[
                ['Invoices', importSummary.invoices],
                ['Expenses', importSummary.expenses],
                ['Clients',  importSummary.clients],
                ['Vendors',  importSummary.vendors],
              ].map(([label, count]) => (
                <div key={label as string} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl p-3 mb-4 text-xs text-destructive bg-destructive/5 border border-destructive/20">
              ⚠ Your current data will be permanently overwritten. This cannot be undone.
            </div>
            {error && <p className="text-xs text-destructive mb-3" role="alert">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => setStep('import-select')} className="flex-1 py-2 rounded-lg text-sm border border-border hover:bg-muted transition-colors">Back</button>
              <button
                onClick={handleImportConfirm}
                className="flex-1 py-2 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity"
              >
                Restore data
              </button>
            </div>
          </div>
        )}

        {/* Importing progress */}
        {step === 'importing' && (
          <div className="text-center py-4">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Restoring your data…</p>
          </div>
        )}
      </div>
    </div>
  );
}

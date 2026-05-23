import React, { useRef, useState } from 'react';
import type { CountdownEvent } from '../types';
import { Download, Upload, Copy, Check, FileCheck, AlertCircle } from 'lucide-react';

interface BackupPortabilityProps {
  events: CountdownEvent[];
  onImportEvents: (imported: Array<Omit<CountdownEvent, 'id' | 'source'>>) => void;
}

export function BackupPortability({ events, onImportEvents }: BackupPortabilityProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  // JSON template showcasing structure matching creation inputs
  const templateJson = [
    {
      title: "My Milestone Title",
      date: "1995-10-24T00:00:00.000Z",
      category: "personal",
      notificationTime: "custom_1d"
    }
  ];

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(JSON.stringify(templateJson, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export handler
  const handleExport = () => {
    // Export standard local fields map to keep file clean
    const cleanExportList = events.map(({ title, date, category, notificationTime }) => ({
      title,
      date,
      category,
      notificationTime,
    }));

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(cleanExportList, null, 2)
    )}`;
    
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', 'moments_milestones_backup.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import file processing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        
        // Ensure it's an array
        const rawList = Array.isArray(parsed) ? parsed : [parsed];
        
        // Validate each item
        const validatedList: Array<Omit<CountdownEvent, 'id' | 'source'>> = [];
        
        rawList.forEach((item: any, index) => {
          if (!item.title || typeof item.title !== 'string') {
            throw new Error(`Item at position ${index} is missing a valid title.`);
          }
          if (!item.date || isNaN(Date.parse(item.date))) {
            throw new Error(`Item "${item.title}" possesses an invalid date string format.`);
          }
          
          // Fallback category
          const allowedCategories = ['personal', 'work', 'anniversary', 'holiday', 'other'];
          const category = allowedCategories.includes(item.category) ? item.category : 'other';
          
          // Fallback notification time
          const allowedAlerts = ['persistent', 'monthly', 'weekly', 'custom_1d', 'custom_1w', 'custom_1m', 'none'];
          const notificationTime = allowedAlerts.includes(item.notificationTime) ? item.notificationTime : 'persistent';

          validatedList.push({
            title: item.title,
            date: new Date(item.date).toISOString(),
            category: category as any,
            notificationTime: notificationTime as any,
          });
        });

        if (validatedList.length === 0) {
          throw new Error("No milestones found to load.");
        }

        onImportEvents(validatedList);
        setImportSuccess(true);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err: any) {
        setImportError(err.message || "Failed parse. Make sure file is valid JSON.");
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="bg-[#0b0b0b] border border-zinc-805 p-6 space-y-5">
      <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
        <h4 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2 font-display">
          <Download size={13} className="text-zinc-400" />
          Portability & Backup
        </h4>
        <button
          onClick={handleCopyTemplate}
          className="text-zinc-500 hover:text-white flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold transition-colors cursor-pointer"
          title="Copy JSON Template"
        >
          {copied ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
          {copied ? 'Copied' : 'JSON Schema'}
        </button>
      </div>

      <p className="text-xs text-zinc-500 leading-relaxed font-sans">
        Transfer your milestone records between devices. Port your database using the JSON schema backup file format.
      </p>

      {/* Success and Error messages */}
      {importError && (
        <div className="flex items-start gap-2 border border-rose-950 bg-rose-950/20 text-rose-450 p-3 text-[11px] font-mono">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-bold">IMPORT_FAILED:</div>
            <p className="mt-0.5">{importError}</p>
          </div>
        </div>
      )}

      {importSuccess && (
        <div className="flex items-start gap-2 border border-emerald-950 bg-emerald-955/20 text-emerald-400 p-3 text-[11px] font-mono">
          <FileCheck size={14} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-bold">IMPORT_SUCCESS:</div>
            <p className="mt-0.5">Your JSON milestone records have been integrated successfully!</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          onClick={handleExport}
          className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 font-bold text-[10px] uppercase tracking-widest py-3 rounded-none transition"
        >
          <Download size={12} />
          Export JSON
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 bg-white hover:bg-zinc-200 text-black font-black text-[10px] uppercase tracking-widest py-3 rounded-none transition"
        >
          <Upload size={12} />
          Import File
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />
    </div>
  );
}

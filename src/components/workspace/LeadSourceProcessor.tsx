import React, { useCallback, useState } from 'react';
import { motion } from 'motion/react';
import { Upload, FileSpreadsheet, X, CheckCircle2, FileText, Loader2, Download, FileImage, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Lead } from '../../types';
import { cn } from '../../lib/utils';
import { extractLeadsFromFile, extractLeadsFromText } from '../../services/gemini';
import { generateHashId, getHistoryItem } from '../../lib/db';

interface Props {
  onLeadsLoaded: (leads: Lead[], saveToHistory?: boolean, historyLabel?: string, historyId?: string) => void;
  isLoading: boolean;
}

export default function LeadFileProcessor({ onLeadsLoaded, isLoading: externalLoading }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isLoading = externalLoading || localLoading;

  const handleFileUpload = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    setFileName(file.name);
    setLocalLoading(true);
    setErrorMsg(null);

    try {
      const fileIdStr = `${file.name}-${file.size}-${file.lastModified}`;
      const fileHash = await generateHashId(fileIdStr);
      const cached = await getHistoryItem(fileHash);

      if (cached) {
        onLeadsLoaded(cached.data, false);
        setLocalLoading(false);
        return;
      }

      if (ext === 'csv') {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const leads: Lead[] = results.data.map((row: any) => ({
              name: row.name || row.Name || row.full_name || '',
              company: row.company || row.Company || '',
              industry: row.industry || row.Industry || '',
              email: row.email || row.Email || '',
              role: row.role || row.Role || row.Title || row.title || '',
              status: 'idle' as const
            }));
            if (leads.length === 0) {
              setErrorMsg('No leads found in CSV. Check your column headers (name, email, company, etc.).');
              setFileName(null);
            } else {
              onLeadsLoaded(leads, true, file.name, fileHash);
            }
            setLocalLoading(false);
          },
          error: () => {
            setErrorMsg('Failed to parse CSV file.');
            setFileName(null);
            setLocalLoading(false);
          }
        });
      } else if (ext === 'xlsx' || ext === 'xls') {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(worksheet);
        
        const leads: Lead[] = json.map((row: any) => ({
          name: row.name || row.Name || row.full_name || '',
          company: row.company || row.Company || '',
          industry: row.industry || row.Industry || '',
          email: row.email || row.Email || '',
          role: row.role || row.Role || row.Title || row.title || '',
          status: 'idle' as const
        }));
        onLeadsLoaded(leads, true, file.name, fileHash);
        setLocalLoading(false);
      } else if (ext === 'pdf') {
        const fileReader = new FileReader();
        fileReader.onload = async function() {
          const typedarray = new Uint8Array(this.result as ArrayBuffer);
          try {
            // @ts-ignore
            const pdf = await window.pdfjsLib.getDocument(typedarray).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map((item: any) => item.str).join(' ');
              fullText += pageText + '\n';
            }
            if (!fullText.trim()) {
              setErrorMsg('Could not extract text from PDF. It may be a scanned image — try uploading as PNG/JPG instead.');
              setFileName(null);
              setLocalLoading(false);
              return;
            }
            const extractedLeads = await extractLeadsFromText(fullText);
            const mappedLeads = extractedLeads.map(l => ({ ...l, status: 'idle' as const }));
            if (mappedLeads.length === 0) {
              setErrorMsg('AI could not find any leads in this PDF. Check your Groq API key in Netlify env vars.');
              setFileName(null);
            } else {
              onLeadsLoaded(mappedLeads, true, file.name, fileHash);
            }
          } catch(e: any) {
            console.error("PDF Parsing Error", e);
            setErrorMsg(`PDF Error: ${e?.message || 'Unknown error. Check the browser console.'}`);
            setFileName(null);
          } finally {
            setLocalLoading(false);
          }
        };
        fileReader.readAsArrayBuffer(file);
      } else if (['jpeg', 'jpg', 'png'].includes(ext || '')) {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1];
            const extractedLeads = await extractLeadsFromFile(base64, file.type);
            const mappedLeads = extractedLeads.map(l => ({ ...l, status: 'idle' as const }));
            if (mappedLeads.length === 0) {
              setErrorMsg('AI could not extract leads from this image. Check your Groq API key in Netlify env vars.');
              setFileName(null);
            } else {
              onLeadsLoaded(mappedLeads, true, file.name, fileHash);
            }
          } catch (e: any) {
            setErrorMsg(`Image Error: ${e?.message || 'Unknown error.'}`);
            setFileName(null);
          } finally {
            setLocalLoading(false);
          }
        };
        reader.readAsDataURL(file);
      } else {
        alert('Unsupported file format. Please upload CSV, XLSX, PDF, or Image.');
        setFileName(null);
        setLocalLoading(false);
      }
    } catch (error: any) {
      console.error("File processing error:", error);
      setErrorMsg(`Processing failed: ${error?.message || 'Check your Groq API key is set in Netlify environment variables.'}`);
      setFileName(null);
      setLocalLoading(false);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  }, []);

  return (
    <div id="csv-section" className="glass-card p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
            <Upload size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Advanced Lead Processor</h2>
            <p className="text-xs text-slate-500">Supports CSV, XLSX, PDF, and Image extraction via AI</p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span className="flex-1">{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-300"><X size={14} /></button>
        </div>
      )}

      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "relative border-2 border-dashed rounded-2xl p-12 transition-all flex flex-col items-center justify-center text-center",
          isDragging ? "border-brand-primary bg-brand-primary/5" : "border-slate-800 hover:border-slate-700",
          fileName ? "bg-slate-900/30" : ""
        )}
      >
        <div className="mb-6 relative">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
            {isLoading ? <Loader2 size={32} className="animate-spin text-brand-primary" /> : <Upload size={32} />}
          </div>
          {fileName && !isLoading && (
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white scale-110 shadow-lg">
              <CheckCircle2 size={14} />
            </div>
          )}
        </div>

        {fileName && !isLoading ? (
          <div>
            <h3 className="text-lg font-bold text-white mb-1">{fileName}</h3>
            <p className="text-sm text-slate-400 mb-6 font-mono">Processed successfully • Ready to generate</p>
            <button 
              onClick={() => { setFileName(null); onLeadsLoaded([]); }}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 mx-auto underline outline-none"
            >
              <X size={12} /> Remove file
            </button>
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-bold text-white mb-1">
              {isLoading ? 'AI is processing file...' : 'Upload Leads Source'}
            </h3>
            <p className="text-sm text-slate-400 mb-6 max-w-xs">
              {isLoading 
                ? 'Extracting structured lead data using multi-modal AI intelligence.' 
                : 'Drag & Drop any spreadsheet, PDF, or screenshot of lead lists.'}
            </p>
            <input 
              type="file" 
              className="hidden" 
              id="file-input" 
              accept=".csv,.xlsx,.xls,.pdf,image/*"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />
            <label 
              htmlFor="file-input"
              className={cn(
                "btn-secondary cursor-pointer inline-flex items-center gap-2",
                isLoading && "pointer-events-none opacity-50"
              )}
            >
              Browse Files
            </label>
          </div>
        )}

        <div className="mt-12 w-full max-w-lg pt-8 border-t border-slate-800 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            <FileSpreadsheet size={14} className="text-green-500" />
            <span>Structured (CSV/XLSX)</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            <FileText size={14} className="text-red-500" />
            <span>Unstructured (PDF)</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            <FileImage size={14} className="text-brand-accent" />
            <span>Screenshots (PNG/JPG)</span>
          </div>
          <div className="flex items-center justify-end">
             <button className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-white transition-colors font-bold uppercase tracking-widest">
              <Download size={12} /> Template
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}

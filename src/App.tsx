import React, { useState } from 'react';
import Navbar from './components/layout/Navbar';
import Hero from './components/sections/Hero';
import InputSection from './components/workspace/InputSection';
import EmailCard from './components/workspace/EmailCard';
import LeadSourceProcessor from './components/workspace/LeadSourceProcessor';
import { generateEmails, improveEmail } from './services/gemini';
import { EmailGenerationParams, GeneratedEmail, Lead } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Sparkles, Check, Copy, Zap, Info, Download, Eye, X, Trash2, Star, Maximize2, Database } from 'lucide-react';
import { cn } from './lib/utils';
import { getAllHistory, getHistoryItem, saveHistory, deleteHistoryItem, toggleStarHistoryItem, generateHashId, HistoryRecord } from './lib/db';

const ComparisonView = React.lazy(() => import('./components/improvement/ComparisonView'));

export default function App() {
  const [emails, setEmails] = useState<GeneratedEmail[]>([]);
  const [activeVariation, setActiveVariation] = useState(0);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [improvementTarget, setImprovementTarget] = useState<GeneratedEmail | null>(null);
  const [copyToast, setCopyToast] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewLead, setViewLead] = useState<Lead | null>(null);
  const [viewLeadStep, setViewLeadStep] = useState<'Day 1' | 'Day 3' | 'Day 7' | 'LinkedIn'>('Day 1');
  const [viewHistoryData, setViewHistoryData] = useState<HistoryRecord | null>(null);
  const [isHistoryFullScreen, setIsHistoryFullScreen] = useState(false);

  const refreshHistory = async () => {
    try {
      const allHistory = await getAllHistory();
      setHistory(allHistory || []);
    } catch (e) {
      console.error('Error loading history:', e);
      setHistory([]);
    }
  };

  React.useEffect(() => {
    refreshHistory();
  }, []);

  const handleGenerate = async (params: EmailGenerationParams) => {
    const paramsHash = await generateHashId(JSON.stringify(params));
    const cached = await getHistoryItem(paramsHash);
    
    if (cached) {
      setEmails(cached.data);
      setActiveVariation(0);
      setTimeout(() => {
        document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setEmails([]);
    setActiveVariation(0);
    try {
      const results = await generateEmails(params);
      setEmails(results);
      
      await saveHistory({
        id: paramsHash,
        type: 'campaign',
        label: results[0]?.subjectLines[0] || 'AI Campaign',
        data: results
      });
      await refreshHistory();
      
      // Wait for animation frame
      setTimeout(() => {
        document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      const errMsg = err?.message || err?.toString() || "Something went wrong.";
      setError(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
      console.error("Caught API error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeadsLoaded = async (newLeds: Lead[], saveToHistory = false, historyLabel = '', historyId = '') => {
    setLeads(newLeds);
    if (saveToHistory && newLeds.length > 0 && historyId) {
      await saveHistory({
        id: historyId,
        type: 'leads',
        label: historyLabel || `Batch: ${newLeds.length} leads`,
        data: newLeds
      });
      await refreshHistory();
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2000);
  };

  const handleImproveUpdate = (newBody: string) => {
    if (!improvementTarget) return;
    setEmails(prev => prev.map(e => 
      e.id === improvementTarget.id ? { ...e, body: newBody } : e
    ));
  };

  const handleGenerateLead = async (index: number) => {
    const lead = leads[index];
    setLeads(prev => prev.map((l, i) => i === index ? { ...l, status: 'generating' } : l));
    
    try {
      const results = await generateEmails({
        productDescription: `Campaign for ${lead.company}. Industry: ${lead.industry}. Context: Personalize for ${lead.name} who is a ${lead.role}.`,
        targetAudience: lead.role,
        tone: 'Professional',
        goal: 'Sales Outreach'
      });
      
      setLeads(prev => prev.map((l, i) => 
        i === index ? { ...l, status: 'completed', generatedEmail: results[0] } : l
      ));
    } catch (err) {
      setLeads(prev => prev.map((l, i) => i === index ? { ...l, status: 'failed' } : l));
    }
  };

  const handleGenerateAllLeads = async () => {
    if (leads.length === 0) return;
    for (let i = 0; i < leads.length; i++) {
        if (leads[i].status === 'completed') continue;
        await handleGenerateLead(i);
    }
  };

  const handleExportCSV = () => {
    const data = leads.map(l => ({
      Name: l.name,
      Company: l.company,
      Email: l.email,
      Status: l.status,
      Subject: l.generatedEmail?.subjectLines[0] || '',
      Body: l.generatedEmail?.body || ''
    }));
    
    const headers = ['Name', 'Company', 'Email', 'Status', 'Subject', 'Body'];
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${(row as any)[h].replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'moxsend_leads_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main>
        <Hero />

        <div id="workspace" className="max-w-7xl mx-auto px-4 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Input Side */}
            <div className="lg:col-span-5 sticky top-24">
              <InputSection onGenerate={handleGenerate} isLoading={isLoading} />
              
              <div className="mt-8 p-6 glass-card bg-brand-primary/5 border-brand-primary/20">
                <h3 className="text-sm font-bold text-brand-primary flex items-center gap-2 mb-2">
                  <Sparkles size={14} /> AI Optimization Tip
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The more specific your product description, the better the personalization. Try mentioning a specific pain point your product solves for the target audience.
                </p>
              </div>
            </div>

            {/* Results Side */}
              <div id="results-section" className="lg:col-span-7 space-y-6 min-h-[600px]">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                      <Mail size={20} />
                    </span>
                    AI Concepts
                  </h3>
                  {emails.length > 0 && (
                    <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-lg">
                      {emails.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveVariation(i)}
                          className={cn(
                            "px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all",
                            activeVariation === i 
                              ? "bg-brand-primary text-white shadow-lg" 
                              : "text-slate-500 hover:text-slate-300"
                          )}
                        >
                          V{i + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div 
                      key="error"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-3"
                    >
                      <Zap size={16} />
                      {error}
                    </motion.div>
                  )}

                  {isLoading ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="glass-card p-12 shimmer h-[500px]"
                    />
                  ) : emails.length > 0 ? (
                    <motion.div
                      key={emails[activeVariation].id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <EmailCard 
                        email={emails[activeVariation]} 
                        onImprove={setImprovementTarget}
                        onCopy={handleCopy}
                      />
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="glass-card p-12 flex flex-col items-center justify-center text-center text-slate-400 border-dashed"
                    >
                      <div className="w-16 h-16 rounded-full bg-slate-900/50 border border-slate-800 flex items-center justify-center mb-6">
                        <Zap size={32} className="opacity-20" />
                      </div>
                      <h4 className="text-lg font-bold text-slate-300 mb-2">Workspace Ready</h4>
                      <p className="text-sm max-w-xs text-slate-400">Configure your outreach parameters and generate your first AI variants.</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
          </div>

          <div className="mt-32 space-y-20">
            <div className="space-y-8">
              <LeadSourceProcessor onLeadsLoaded={handleLeadsLoaded} isLoading={false} />

              {leads.length > 0 && (
                <div className="glass-card overflow-hidden shadow-2xl">
                  <div className="p-6 border-b border-slate-800 bg-slate-900/20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <h3 className="text-lg font-bold">Leads Queue ({leads.length})</h3>
                      {leads.some(l => l.status === 'completed') && (
                        <button 
                          onClick={handleExportCSV}
                          className="text-xs text-brand-accent hover:underline flex items-center gap-1"
                        >
                          <Download size={14} /> Export Results
                        </button>
                      )}
                    </div>
                    <button 
                      onClick={handleGenerateAllLeads}
                      className="btn-primary py-2 text-sm"
                    >
                      Generate All
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-slate-900/40 text-slate-500 border-b border-slate-800">
                          <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[10px]">Lead</th>
                          <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[10px]">Company</th>
                          <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[10px]">Industry</th>
                          <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[10px]">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {leads.map((lead, i) => (
                          <tr key={i} className="hover:bg-slate-800/20 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="font-medium text-white">{lead.name}</div>
                              <div className="text-[10px] text-slate-500">{lead.email}</div>
                            </td>
                            <td className="px-6 py-4 text-slate-300">{lead.company}</td>
                            <td className="px-6 py-4 text-slate-400 italic text-xs">{lead.industry}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-between gap-4">
                                  <span className={cn(
                                      "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter",
                                      lead.status === 'idle' ? "bg-slate-800 text-slate-400" :
                                      lead.status === 'generating' ? "bg-brand-primary/20 text-brand-primary" :
                                      lead.status === 'completed' ? "bg-green-500/20 text-green-400" :
                                      "bg-red-500/20 text-red-400"
                                  )}>
                                  <span className={cn(
                                      "w-1.5 h-1.5 rounded-full",
                                      lead.status === 'idle' ? "bg-slate-600" :
                                      lead.status === 'generating' ? "bg-brand-primary animate-pulse" :
                                      lead.status === 'completed' ? "bg-green-400" :
                                      "bg-red-400"
                                  )} />
                                  {lead.status}
                                  </span>
                                  
                                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button 
                                          onClick={() => {
                                              setViewLead(lead);
                                              setViewLeadStep('Day 1');
                                          }}
                                          className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 transition-colors"
                                          title="View Lead Details"
                                      >
                                          <Eye size={14} />
                                      </button>
                                      {lead.status === 'idle' || lead.status === 'failed' ? (
                                          <button 
                                              onClick={() => handleGenerateLead(i)}
                                              className="p-1.5 hover:bg-slate-800 rounded-md text-brand-primary transition-colors"
                                              title="Generate for this lead"
                                          >
                                              <Zap size={14} fill="currentColor" />
                                          </button>
                                      ) : lead.status === 'completed' ? (
                                          <button 
                                              onClick={() => lead.generatedEmail && setEmails([lead.generatedEmail])}
                                              className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 transition-colors"
                                              title="View Email"
                                          >
                                              <Mail size={14} />
                                          </button>
                                      ) : null}
                                  </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {history.length === 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-brand-primary/10">
                    <Database size={14} className="text-brand-primary" />
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">History Log</h3>
                </div>
                
                <div className="p-8 text-center glass-card rounded-xl border border-slate-800 shadow-2xl bg-slate-900/40 text-slate-400">
                  <Database size={48} className="mx-auto mb-4 text-slate-600 opacity-50" />
                  <h3 className="text-lg font-bold text-white mb-2">No History Yet</h3>
                  <p className="mb-4">Generate some emails or process some leads to build your history!</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div 
                  className="flex items-center justify-between text-slate-500 cursor-pointer hover:text-brand-primary transition-colors group"
                  onClick={() => setIsHistoryFullScreen(true)}
                  title="View Full Screen"
                >
                  <div className="flex items-center gap-2">
                     <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center group-hover:bg-brand-primary/10 transition-colors">
                        <Zap size={14} className="group-hover:text-brand-primary transition-colors" />
                     </div>
                     <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                       History Log 
                       <span className="text-[10px] normal-case tracking-normal opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                         <Maximize2 size={10} /> Click for Fullscreen
                       </span>
                     </h3>
                  </div>
                  <div className="text-xs font-medium bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                    {history.length} records
                  </div>
                </div>
                <div className="overflow-hidden glass-card rounded-xl border border-slate-800 shadow-2xl">
                  <div className="max-h-[380px] overflow-y-auto no-scrollbar">
                    <table className="w-full text-left text-sm relative">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-900/90 backdrop-blur-md text-slate-500 border-b border-slate-800 shadow-sm">
                          <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[10px]">Category</th>
                          <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[10px]">Saved Details</th>
                          <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[10px]">Items</th>
                          <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[10px]">Timestamp</th>
                          <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[10px] text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {history.map((item, idx) => (
                          <tr key={idx} className={cn(
                            "hover:bg-slate-800/20 transition-colors group",
                            item.starred && "bg-brand-accent/5 hover:bg-brand-accent/10"
                          )}>
                            <td className="px-6 py-4">
                               <div className="flex items-center gap-3">
                                  {item.type === 'campaign' ? (
                                    <div className="w-8 h-8 rounded-lg bg-brand-accent/10 flex items-center justify-center shadow-inner"><Mail size={14} className="text-brand-accent" /></div>
                                  ) : (
                                    <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center shadow-inner"><Zap size={14} className="text-brand-primary" /></div>
                                  )}
                                  <span className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                    {item.starred && <Star size={12} className="text-brand-accent fill-brand-accent" />}
                                    {item.type}
                                  </span>
                               </div>
                            </td>
                            <td className="px-6 py-4">
                               <div className="text-sm font-bold text-white mb-0.5 flex items-center gap-2">
                                 {item.label || 'Unnamed Record'}
                               </div>
                               <div className="text-[10px] text-slate-500 font-mono" title={item.id}>ID: {item.id.substring(0, 12)}...</div>
                            </td>
                            <td className="px-6 py-4">
                               <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter bg-slate-800 text-slate-300">
                                  {item.data?.length || 0} {item.type === 'campaign' ? 'Variants' : 'Leads'}
                               </span>
                            </td>
                            <td className="px-6 py-4 text-slate-400 text-xs font-medium">
                               {new Date(item.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-6 py-4 text-right">
                               <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                                 <button 
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        await toggleStarHistoryItem(item.id, !item.starred);
                                        await refreshHistory();
                                      } catch (err) {
                                        alert("Feature not ready! Please restart your backend server (run 'npm run server' again) to apply the database updates.");
                                      }
                                    }}
                                    className="p-2 hover:bg-brand-accent/20 text-slate-500 hover:text-brand-accent rounded-lg transition-colors border border-transparent hover:border-brand-accent/30"
                                    title={item.starred ? "Unstar" : "Star to top"}
                                 >
                                    <Star size={16} className={item.starred ? "fill-brand-accent text-brand-accent" : ""} />
                                 </button>
                                 <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setViewHistoryData(item);
                                    }}
                                    className="p-2 hover:bg-slate-800 text-slate-500 hover:text-white rounded-lg transition-colors border border-transparent hover:border-slate-700"
                                    title="View Details"
                                 >
                                    <Eye size={16} />
                                 </button>
                                 <button 
                                    onClick={async (e) => {
                                       e.stopPropagation();
                                       if (window.confirm('Are you sure you want to permanently delete this record? This action cannot be undone.')) {
                                          await deleteHistoryItem(item.id);
                                          await refreshHistory();
                                       }
                                    }}
                                    className="p-2 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
                                    title="Delete Record Forever"
                                 >
                                    <Trash2 size={16} />
                                 </button>
                               </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}


          </div>
        </div>

        <footer className="py-20 border-t border-slate-900 bg-slate-950/50 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-6 h-6 bg-brand-primary rounded flex items-center justify-center group">
              <Mail className="text-white w-4 h-4" />
            </div>
            <span className="text-lg font-bold">Moxsend</span>
          </div>
          <p className="text-sm text-slate-400">© 2026 Moxsend AI. All rights reserved.</p>
        </footer>
      </main>

      {/* Improvement Modal */}
      <AnimatePresence>
      <React.Suspense fallback={null}>
        {improvementTarget && (
          <ComparisonView 
            email={improvementTarget} 
            onClose={() => setImprovementTarget(null)}
            onUpdate={handleImproveUpdate}
          />
        )}
      </React.Suspense>
      </AnimatePresence>

      {/* Copy Toast */}
      <AnimatePresence>
        {copyToast && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] bg-brand-primary text-white px-6 py-3 rounded-full flex items-center gap-2 shadow-2xl font-bold text-sm"
          >
            <Check size={18} />
            Copied to clipboard
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lead Preview Modal */}
      <AnimatePresence>
        {viewLead && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass-card w-full max-w-2xl overflow-hidden shadow-2xl border-brand-primary/30"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-brand-primary/50 flex items-center justify-center text-brand-primary font-bold text-xl">
                    {viewLead.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{viewLead.name}</h3>
                    <p className="text-sm text-slate-400">{viewLead.role} at {viewLead.company}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewLead(null)}
                  className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Industry</label>
                    <p className="text-slate-200">{viewLead.industry || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email</label>
                    <p className="text-slate-200">{viewLead.email || 'N/A'}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-sm font-bold text-brand-primary flex items-center gap-2">
                    <Sparkles size={16} /> Structured Outreach Strategy
                  </h4>

                  {viewLead.generatedEmail ? (
                    <div className="space-y-6">
                      <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                        <label className="text-[10px] font-bold text-brand-accent uppercase mb-2 block tracking-widest">Target Subject Line</label>
                        <p className="text-sm text-slate-200 font-medium">"{viewLead.generatedEmail?.subjectLines?.[0] || 'AI failed to generate a subject line.'}"</p>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-widest">Psychological Strategy</label>
                        <div className="p-4 bg-brand-accent/5 border border-brand-accent/10 rounded-xl text-xs text-slate-300">
                          <span className="text-brand-accent font-bold">Why this works:</span> {viewLead.generatedEmail?.psychologicalInsight || 'Leverages professional courtesy and clear value proposition.'}
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-widest">Outreach Thread (Sequence)</label>
                            <div className="flex gap-1 p-1 bg-slate-900 rounded-lg">
                                {(['Day 1', 'Day 3', 'Day 7', 'LinkedIn'] as const).map((label) => (
                                    <button 
                                        key={label}
                                        onClick={() => setViewLeadStep(label)}
                                        className={cn(
                                            "px-2 py-1 text-[9px] font-bold rounded transition-colors",
                                            viewLeadStep === label 
                                                ? "bg-brand-primary text-white" 
                                                : "bg-slate-800 hover:bg-slate-700 text-slate-400"
                                        )}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-300 whitespace-pre-wrap leading-relaxed shadow-inner animate-in fade-in slide-in-from-bottom-2 duration-300">
                          {viewLeadStep === 'Day 1' && (viewLead.generatedEmail?.sequence?.day1?.body || viewLead.generatedEmail?.body || 'No content generated.')}
                          {viewLeadStep === 'Day 3' && (viewLead.generatedEmail?.sequence?.day3?.body || "Follow-up content not generated for this variant.")}
                          {viewLeadStep === 'Day 7' && (viewLead.generatedEmail?.sequence?.day7?.body || "Break-up content not generated for this variant.")}
                          {viewLeadStep === 'LinkedIn' && (viewLead.generatedEmail?.linkedInMessage || "LinkedIn connection note not generated.")}
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                            let textToCopy = viewLead.generatedEmail?.body || '';
                            if (viewLeadStep === 'Day 1') textToCopy = viewLead.generatedEmail?.sequence?.day1?.body || viewLead.generatedEmail?.body || '';
                            if (viewLeadStep === 'Day 3') textToCopy = viewLead.generatedEmail?.sequence?.day3?.body || '';
                            if (viewLeadStep === 'Day 7') textToCopy = viewLead.generatedEmail?.sequence?.day7?.body || '';
                            if (viewLeadStep === 'LinkedIn') textToCopy = viewLead.generatedEmail?.linkedInMessage || '';
                            handleCopy(textToCopy);
                        }}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                      >
                        <Copy size={18} /> Copy Active Message
                      </button>
                    </div>
                  ) : (
                    <div className="p-12 text-center border-2 border-dashed border-slate-800 rounded-2xl">
                      <Zap size={32} className="mx-auto mb-4 text-slate-700" />
                      <p className="text-slate-500 text-sm">No email has been generated for this lead yet.</p>
                      <button 
                        onClick={() => {
                          const idx = leads.findIndex(l => l === viewLead);
                          if (idx !== -1) handleGenerateLead(idx);
                        }}
                        className="mt-4 text-brand-primary font-bold hover:underline"
                      >
                        Generate Now
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen History Modal */}
      <AnimatePresence>
        {isHistoryFullScreen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4 md:p-8 bg-slate-950/90 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass-card w-full h-full max-w-7xl overflow-hidden shadow-2xl border-brand-primary/20 flex flex-col"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
                    <Zap size={24} className="text-brand-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">Moxsend Central History</h3>
                    <p className="text-sm text-slate-400">View and manage all your past AI generation runs</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsHistoryFullScreen(false)}
                  className="p-3 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 bg-slate-950/50 no-scrollbar">
                <table className="w-full text-left text-sm relative">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-900/90 backdrop-blur-md text-slate-500 border-b border-slate-800 shadow-sm">
                      <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[10px]">Category</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[10px]">Saved Details</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[10px]">Items</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[10px]">Timestamp</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[10px] text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {history.map((item, idx) => (
                      <tr key={idx} className={cn(
                        "hover:bg-slate-800/20 transition-colors group",
                        item.starred && "bg-brand-accent/5 hover:bg-brand-accent/10"
                      )}>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                              {item.type === 'campaign' ? (
                                <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center shadow-inner"><Mail size={16} className="text-brand-accent" /></div>
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center shadow-inner"><Zap size={16} className="text-brand-primary" /></div>
                              )}
                              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                {item.starred && <Star size={14} className="text-brand-accent fill-brand-accent" />}
                                {item.type}
                              </span>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="text-base font-bold text-white mb-1 flex items-center gap-2">
                             {item.label || 'Unnamed Record'}
                           </div>
                           <div className="text-[11px] text-slate-500 font-mono" title={item.id}>ID: {item.id}</div>
                        </td>
                        <td className="px-6 py-4">
                           <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-tighter bg-slate-800 text-slate-300">
                              {item.data?.length || 0} {item.type === 'campaign' ? 'Variants' : 'Leads'}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm font-medium">
                           {new Date(item.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                             <button 
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await toggleStarHistoryItem(item.id, !item.starred);
                                    await refreshHistory();
                                  } catch (err) {
                                    alert("Feature not ready! Please restart your backend server (run 'npm run server' again) to apply the database updates.");
                                  }
                                }}
                                className="p-3 hover:bg-brand-accent/20 text-slate-500 hover:text-brand-accent rounded-xl transition-colors border border-transparent hover:border-brand-accent/30"
                                title={item.starred ? "Unstar" : "Star to top"}
                             >
                                <Star size={18} className={item.starred ? "fill-brand-accent text-brand-accent" : ""} />
                             </button>
                             <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewHistoryData(item);
                                  setIsHistoryFullScreen(false);
                                }}
                                className="p-3 hover:bg-slate-800 text-slate-500 hover:text-white rounded-xl transition-colors border border-transparent hover:border-slate-700"
                                title="View Details"
                             >
                                <Eye size={18} />
                             </button>
                             <button 
                                onClick={async (e) => {
                                   e.stopPropagation();
                                   if (window.confirm('Are you sure you want to permanently delete this record? This action cannot be undone.')) {
                                      await deleteHistoryItem(item.id);
                                      await refreshHistory();
                                   }
                                }}
                                className="p-3 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-xl transition-colors border border-transparent hover:border-red-500/30"
                                title="Delete Record Forever"
                             >
                                <Trash2 size={18} />
                             </button>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Preview Modal */}
      <AnimatePresence>
        {viewHistoryData && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass-card w-full max-w-3xl overflow-hidden shadow-2xl border-brand-primary/30 max-h-[85vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
                <div className="flex items-center gap-4">
                  {viewHistoryData.type === 'campaign' ? (
                    <div className="w-12 h-12 rounded-xl bg-brand-accent/10 flex items-center justify-center border border-brand-accent/20">
                      <Mail size={24} className="text-brand-accent" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20">
                      <Zap size={24} className="text-brand-primary" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{viewHistoryData.label || 'Unnamed Record'}</h3>
                    <div className="flex items-center gap-3 text-xs">
                       <span className="text-slate-400 font-mono">ID: {viewHistoryData.id.substring(0, 16)}...</span>
                       <span className="text-slate-600">•</span>
                       <span className="text-brand-primary font-bold">{viewHistoryData.data?.length || 0} {viewHistoryData.type === 'campaign' ? 'Variants' : 'Leads'}</span>
                       <span className="text-slate-600">•</span>
                       <span className="text-slate-500">{new Date(viewHistoryData.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setViewHistoryData(null)}
                  className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 bg-slate-950/50">
                <div className="mb-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Data Preview
                </div>
                {viewHistoryData.type === 'campaign' ? (
                  <div className="space-y-4">
                    {(viewHistoryData.data as GeneratedEmail[]).slice(0, 2).map((email, i) => (
                      <div key={i} className="p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-inner">
                        <div className="text-[10px] text-brand-accent font-bold uppercase mb-2">Variant {i + 1}</div>
                        <h4 className="text-sm font-bold text-white mb-2">{email.subjectLines[0]}</h4>
                        <p className="text-xs text-slate-300 line-clamp-3">{email.body}</p>
                      </div>
                    ))}
                    {(viewHistoryData.data as GeneratedEmail[]).length > 2 && (
                       <div className="text-center text-xs text-slate-500 font-bold">
                         + {(viewHistoryData.data as GeneratedEmail[]).length - 2} more variants inside
                       </div>
                    )}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-inner">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-800/50 text-slate-400">
                          <th className="px-4 py-2 font-semibold">Name</th>
                          <th className="px-4 py-2 font-semibold">Company</th>
                          <th className="px-4 py-2 font-semibold">Role</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {(viewHistoryData.data as Lead[]).slice(0, 5).map((lead, i) => (
                          <tr key={i}>
                            <td className="px-4 py-3 text-white font-medium">{lead.name}</td>
                            <td className="px-4 py-3 text-slate-300">{lead.company}</td>
                            <td className="px-4 py-3 text-slate-400">{lead.role}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(viewHistoryData.data as Lead[]).length > 5 && (
                       <div className="p-2 text-center text-[10px] text-slate-500 font-bold bg-slate-900 border-t border-slate-800">
                         + {(viewHistoryData.data as Lead[]).length - 5} more leads inside
                       </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-800 bg-slate-900/40 flex justify-end gap-4">
                <button 
                  onClick={() => setViewHistoryData(null)}
                  className="btn-secondary py-2 px-6"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (viewHistoryData.type === 'campaign') {
                      setEmails(viewHistoryData.data);
                      setActiveVariation(0);
                      document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      setLeads(viewHistoryData.data);
                      document.getElementById('csv-section')?.scrollIntoView({ behavior: 'smooth' });
                    }
                    setViewHistoryData(null);
                  }}
                  className="btn-primary py-2 px-8 flex items-center gap-2 shadow-lg shadow-brand-primary/20 hover:shadow-brand-primary/40"
                >
                  <Sparkles size={16} /> Restore to Workspace
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

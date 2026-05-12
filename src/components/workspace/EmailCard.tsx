import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, RefreshCw, Star, Info, FileText, ChevronRight, Zap } from 'lucide-react';
import { GeneratedEmail } from '../../types';
import { cn } from '../../lib/utils';

interface Props {
  email: GeneratedEmail;
  onImprove: (email: GeneratedEmail) => void;
  onCopy: (text: string) => void;
}

export default function EmailCard({ email, onImprove, onCopy }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden group hover:border-brand-primary/30 transition-colors"
    >
      <div className="p-1 bg-gradient-to-r from-brand-primary/20 via-brand-secondary/20 to-brand-accent/20" />
      
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-brand-accent">
              <FileText size={16} />
            </div>
            <span className="text-sm font-semibold text-slate-300">Variation</span>
          </div>
        </div>

        {email.psychologicalInsight && (
          <div className="mb-6 p-3 bg-brand-accent/5 border border-brand-accent/20 rounded-xl flex gap-3">
             <Zap size={16} className="text-brand-accent shrink-0 mt-0.5" />
             <p className="text-[11px] text-slate-300 leading-relaxed italic">
                <span className="font-bold text-brand-accent not-italic">AI Insight:</span> {email.psychologicalInsight}
             </p>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subject Lines</h4>
          <div className="flex flex-wrap gap-2">
            {(email.subjectLines || []).map((s, i) => (
              <button 
                key={i}
                onClick={() => onCopy(s)}
                className="text-xs py-1.5 px-3 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 hover:border-brand-primary transition-colors flex items-center gap-2"
              >
                {s}
                <Copy size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Opening Hooks</h4>
          <div className="space-y-2">
            {(email.openingLines || []).map((line, i) => (
              <div key={i} className="text-xs p-2 bg-brand-primary/5 border border-brand-primary/10 rounded-lg text-slate-300 italic">
                "{line}"
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-950/50 rounded-xl border border-slate-800 p-5 mb-6">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Email Body</h4>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
            {email.body}
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Info size={12} /> AI Suggestions
          </h4>
          <ul className="space-y-1.5">
            {(email.suggestions || []).map((s, i) => (
              <li key={i} className="text-xs text-slate-300 flex items-start gap-2 italic">
                <ChevronRight size={10} className="mt-1 text-brand-primary" />
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => onCopy(email.body)}
            className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm py-2.5"
          >
            <Copy size={16} /> Copy
          </button>
          <button 
            onClick={() => onImprove(email)}
            className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm py-2.5"
          >
            <RefreshCw size={16} /> Improve
          </button>
        </div>
      </div>
    </motion.div>
  );
}


import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, ArrowRight, Zap, RefreshCw } from 'lucide-react';
import { GeneratedEmail } from '../../types';
import { improveEmail } from '../../services/gemini';

interface Props {
  email: GeneratedEmail;
  onClose: () => void;
  onUpdate: (newBody: string) => void;
}

export default function ComparisonView({ email, onClose, onUpdate }: Props) {
  const [request, setRequest] = useState('');
  const [improvedBody, setImprovedBody] = useState<string | null>(null);
  const [isImproving, setIsImproving] = useState(false);

  const handleImprove = async () => {
    if (!request) return;
    setIsImproving(true);
    try {
      const result = await improveEmail(email.body, request);
      setImprovedBody(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsImproving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-slate-950/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="glass-card w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/20 flex items-center justify-center text-brand-primary">
              <RefreshCw size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Refine with AI</h3>
              <p className="text-xs text-slate-500">Iterate on your messaging to perfection</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-600" /> Original Version
              </h4>
              <div className="glass-input h-full min-h-[300px] text-sm text-slate-400 opacity-70">
                {email.body}
              </div>
            </div>

            <div className="space-y-4 flex flex-col">
              <h4 className="text-sm font-bold text-brand-primary uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" /> AI Optimized Version
              </h4>
              <div className="flex-1 glass-input min-h-[300px] text-sm text-white overflow-y-auto whitespace-pre-wrap">
                {isImproving ? (
                  <div className="flex items-center justify-center h-full gap-3 text-slate-500 italic">
                    <RefreshCw className="animate-spin" size={18} />
                    AI is reimagining your message...
                  </div>
                ) : improvedBody ? (
                  improvedBody
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-600 italic">
                    Improved version will appear here
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900/40">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <input 
                type="text" 
                placeholder="How should I improve this? (e.g. 'Make it shorter', 'Add more urgency', 'Focus on product-led growth')"
                className="glass-input w-full pr-12"
                value={request}
                onChange={(e) => setRequest(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleImprove()}
              />
              <button 
                onClick={handleImprove}
                disabled={isImproving || !request}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-colors disabled:opacity-50"
              >
                <Zap size={20} fill={request ? "currentColor" : "none"} />
              </button>
            </div>
            {improvedBody && (
              <button 
                onClick={() => {
                  onUpdate(improvedBody);
                  onClose();
                }}
                className="btn-primary w-full md:w-auto flex items-center justify-center gap-2"
              >
                Apply Improvements <ArrowRight size={18} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

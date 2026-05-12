import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Target, Zap, MessageSquare } from 'lucide-react';
import { EmailGenerationParams } from '../../types';

interface Props {
  onGenerate: (params: EmailGenerationParams) => void;
  isLoading: boolean;
}

const TONES = ['Professional', 'Friendly', 'Persuasive', 'Startup Style', 'Enterprise', 'Casual'];
const GOALS = ['Sales Outreach', 'Demo Booking', 'Product Launch', 'Follow-Up', 'Investor Pitch', 'Partnership'];

const QUICK_TEMPLATES = [
  { label: 'SaaS Pitch', desc: 'B2B software solution for startups', params: { productDescription: 'AI-powered productivity tool for remote teams', targetAudience: '#CTO #SaaS_Founders #Ops_Managers', tone: 'Startup Style', goal: 'Sales Outreach' } },
  { label: 'Recruitment', desc: 'Hiring top talent for engineering', params: { productDescription: 'Series B FinTech startup looking for Lead Eng', targetAudience: '#Senior_Engineers #Tech_Leads #Fullstack', tone: 'Friendly', goal: 'Partnership' } },
  { label: 'Agency Lead Gen', desc: 'Marketing services for local business', params: { productDescription: 'Full-service digital marketing agency for brick-and-mortar', targetAudience: '#Local_Owners #RealEstate #Retail', tone: 'Professional', goal: 'Demo Booking' } },
  { label: 'Web3 Onboarding', desc: 'Web3 infrastructure for devs', params: { productDescription: 'EVM compatible L2 with zero-knowledge proofs', targetAudience: '#Solidity_Devs #Web3_Builders #Dapp_Devs', tone: 'Technical', goal: 'Partnership' } },
  { label: 'Ecommerce Audit', desc: 'Conversion rate optimization', params: { productDescription: 'CRO tool that identifies leaks in checkout funnel', targetAudience: '#Shopify_Owners #D2C_Brands #Ecommerce_Managers', tone: 'Persuasive', goal: 'Sales Outreach' } },
  { label: 'Enterprise Security', desc: 'Zero trust network access', params: { productDescription: 'Identity-first security for global distributed teams', targetAudience: '#CISO #IT_Staff #Security_Architects', tone: 'Enterprise', goal: 'Demo Booking' } },
  { label: 'Product Launch', desc: 'Announcement to waitlist', params: { productDescription: 'Feature-rich mobile app for personal finance', targetAudience: '#Waitlist_Users #Beta_Testers #Early_Adopters', tone: 'Friendly', goal: 'Product Launch' } },
  { label: 'Investor Update', desc: 'Quarterly growth report', params: { productDescription: 'Monthly recurring revenue and retention metrics', targetAudience: '#Investors #VCs #Angel_Investors', tone: 'Professional', goal: 'Partnership' } },
  { label: 'Follow-up Cold', desc: 'Second touch for non-responders', params: { productDescription: 'Re-iterating value of CRM automation', targetAudience: '#Sales_Teams #Marketing_Leads', tone: 'Friendly', goal: 'Follow-Up' } },
  { label: 'HR Tech Pitch', desc: 'Automated employee engagement', params: { productDescription: 'Software to measure and improve workplace culture', targetAudience: '#HR_Directors #People_Ops #CEOs', tone: 'Professional', goal: 'Demo Booking' } },
  { label: 'AI Consulting', desc: 'LLM implementation strategy', params: { productDescription: 'Custom AI strategy for Fortune 500 companies', targetAudience: '#Innovation_Leads #Digital_Transformation', tone: 'Enterprise', goal: 'Partnership' } },
];

export default function InputSection({ onGenerate, isLoading }: Props) {
  const [params, setParams] = useState<EmailGenerationParams>({
    productDescription: '',
    targetAudience: '',
    tone: 'Professional',
    goal: 'Sales Outreach'
  });
  const [search, setSearch] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [filteredTemplates, setFilteredTemplates] = useState(QUICK_TEMPLATES.slice(0, 10));

  React.useEffect(() => {
    if (!search.trim()) {
      setFilteredTemplates(QUICK_TEMPLATES.slice(0, 10));
      return;
    }

    const performSearch = async () => {
      try {
        const response = await fetch('https://ODIB8FT345-dsn.algolia.net/1/indexes/templates/query', {
          method: 'POST',
          headers: {
            'X-Algolia-Application-Id': 'ODIB8FT345',
            'X-Algolia-API-Key': '82b9fa5cb3e992e6e32847f258cd4a70',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: search })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.hits && data.hits.length > 0) {
            // Map Algolia hits back to our template format if needed
            setFilteredTemplates(data.hits);
            return;
          }
        }
      } catch (err) {
        console.warn('Algolia search failed, falling back to local filtering.', err);
      }

      // Fallback local filtering
      const localMatches = QUICK_TEMPLATES.filter(t => 
        t.label.toLowerCase().includes(search.toLowerCase()) || 
        t.desc.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 10);
      
      setFilteredTemplates(localMatches);
    };

    const debounce = setTimeout(performSearch, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  const applyTemplate = (template: any) => {
    setParams(template.params || template);
    setSearch('');
    setShowTemplates(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!params.productDescription || !params.targetAudience) return;
    onGenerate(params);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass-card p-6 md:p-8"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
          <Zap size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Campaign Logic</h2>
          <p className="text-xs text-slate-400">Configure your AI outreach parameters</p>
        </div>
      </div>

      <div className="mb-8 relative">
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Quick Templates</label>
        
        <div className="relative mb-4">
          <input 
            type="text"
            className="glass-input w-full text-sm pl-10"
            placeholder="Search templates (e.g. 'SaaS', 'Hiring')..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowTemplates(e.target.value.length >= 1);
            }}
            onFocus={() => search.length >= 1 && setShowTemplates(true)}
          />
          <Zap size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-primary" />
        </div>

        <AnimatePresence>
          {showTemplates && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute left-0 right-0 top-full mt-2 z-50 glass-card p-2 shadow-2xl border-brand-primary/20 max-h-[300px] overflow-y-auto"
            >
              <div className="grid grid-cols-1 gap-1">
                {filteredTemplates.length > 0 ? filteredTemplates.map((t, i) => (
                  <button 
                    key={i}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className="p-3 text-left hover:bg-brand-primary/10 rounded-lg transition-all group border border-transparent hover:border-brand-primary/20"
                  >
                    <div className="text-xs font-bold text-slate-200 group-hover:text-brand-primary transition-colors">{t.label}</div>
                    <div className="text-[10px] text-slate-400 line-clamp-1">{t.desc}</div>
                  </button>
                )) : (
                  <div className="p-4 text-center text-xs text-slate-400">No matching templates found</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 gap-3">
          {QUICK_TEMPLATES.slice(0, 10).map((t, i) => (
            <button 
              key={i} 
              type="button" 
              onClick={() => applyTemplate(t)}
              className="p-3 text-left bg-slate-900/50 border border-slate-800 rounded-xl hover:border-brand-primary/50 transition-all group"
            >
              <div className="text-xs font-bold text-slate-300 group-hover:text-brand-primary transition-colors">{t.label}</div>
              <div className="text-[10px] text-slate-400 line-clamp-1">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
            <MessageSquare size={14} /> Product Description
          </label>
          <textarea 
            className="glass-input w-full min-h-[140px] resize-y"
            placeholder="Describe your product & audience...&#10;Example: AI CRM platform for real estate agencies targeting growing sales teams."
            value={params.productDescription}
            onChange={(e) => setParams({ ...params, productDescription: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
            <Target size={14} /> Target Audience
          </label>
          <input 
            type="text"
            className="glass-input w-full"
            placeholder="e.g. Sales Directors, CTOs of Series A Startups"
            value={params.targetAudience}
            onChange={(e) => setParams({ ...params, targetAudience: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Tone</label>
            <select 
              className="glass-input w-full appearance-none bg-slate-900"
              value={params.tone}
              onChange={(e) => setParams({ ...params, tone: e.target.value })}
            >
              {TONES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Goal</label>
            <select 
              className="glass-input w-full appearance-none bg-slate-900"
              value={params.goal}
              onChange={(e) => setParams({ ...params, goal: e.target.value })}
            >
              {GOALS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          className="btn-primary w-full flex items-center justify-center gap-2 py-4"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              Generate Email
              <Send size={18} />
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
}

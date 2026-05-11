import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight, Upload } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-4 overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-primary/20 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-brand-secondary/10 blur-[150px] rounded-full" />
      
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900/50 border border-slate-800 rounded-full text-brand-accent text-sm font-medium mb-8">
            <Sparkles size={16} />
            <span>AI-Powered Outreach for the Modern Team</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold font-display tracking-tight leading-[1.1] mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-slate-500">
            Generate High-Converting <br />
            Cold Emails <span className="text-brand-primary">Instantly.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            Create personalized outreach emails, subject lines, and follow-ups in seconds. Moxsend turns your product ideas into responses.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' })}
              className="btn-primary flex items-center gap-2 group w-full sm:w-auto justify-center"
            >
              Start Generating
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => document.getElementById('csv-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="btn-secondary flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              <Upload size={18} />
              Upload Leads CSV
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

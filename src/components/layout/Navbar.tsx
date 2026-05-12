import React from 'react';
import { Mail, LayoutDashboard, History, Settings, User } from 'lucide-react';
import { motion } from 'motion/react';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/50 backdrop-blur-xl border-b border-slate-800/50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div 
            initial={{ rotate: -10 }}
            animate={{ rotate: 10 }}
            transition={{ repeat: Infinity, duration: 2, repeatType: "reverse" }}
            className="w-10 h-10 bg-gradient-to-br from-brand-primary to-brand-accent rounded-lg flex items-center justify-center"
          >
            <Mail className="text-white w-6 h-6" />
          </motion.div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 font-display">
            Moxsend
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <NavLink icon={<LayoutDashboard size={18} />} label="Dashboard" active />
          <NavLink icon={<History size={18} />} label="History" />
          <NavLink icon={<Settings size={18} />} label="Settings" />
        </div>

        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
            <User className="text-slate-400 w-5 h-5" />
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <a href="#" className={`flex items-center gap-2 text-sm font-medium transition-colors ${active ? 'text-brand-primary' : 'text-slate-300 hover:text-white'}`}>
      {icon}
      {label}
      {active && (
        <motion.div 
          layoutId="nav-underline"
          className="absolute bottom-[-22px] left-0 right-0 h-0.5 bg-brand-primary"
        />
      )}
    </a>
  );
}

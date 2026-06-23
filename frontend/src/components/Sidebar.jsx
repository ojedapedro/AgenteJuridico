import React from 'react';
import { Shield, FileText, User, LogOut, ChevronRight, Gavel, FileCheck } from 'lucide-react';

export default function Sidebar({ user, onLogout, categories = [], selectedCategory, onSelectCategory }) {
  return (
    <aside className="w-64 flex-shrink-0 bg-slate-950 flex flex-col justify-between hidden md:flex border-r border-slate-800">
      <div className="p-6 h-full flex flex-col">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-3 text-court-gold mb-10">
          <Shield className="w-8 h-8 shrink-0" />
          <h1 className="text-xl font-bold font-serif tracking-wide gold-glow leading-tight">
            Biblioteca<br/>Jurídica
          </h1>
        </div>

        {/* User Info (Minimalist) */}
        {user && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-8 shadow-inner">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-court-gold text-slate-950 flex items-center justify-center font-bold font-serif text-sm shrink-0">
                {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold truncate text-slate-200">{user.username}</p>
                <p className="text-xs text-court-gold/80 capitalize">{user.role}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Categories */}
        <nav className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest pl-2 mb-3">Expedientes</p>
          
          <button
            onClick={() => onSelectCategory && onSelectCategory('')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
              selectedCategory === '' 
                ? 'bg-court-gold text-slate-950 font-medium shadow-md shadow-court-gold/10' 
                : 'text-slate-400 hover:bg-slate-900 hover:text-court-gold'
            }`}
          >
            <div className="flex items-center space-x-3">
              <FileCheck className="w-4 h-4" />
              <span>Todos</span>
            </div>
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory && onSelectCategory(cat.id.toString())}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
                selectedCategory === cat.id.toString() || selectedCategory === cat.name
                  ? 'bg-court-gold text-slate-950 font-medium shadow-md shadow-court-gold/10' 
                  : 'text-slate-400 hover:bg-slate-900 hover:text-court-gold'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Gavel className={`w-4 h-4 ${selectedCategory === cat.id.toString() || selectedCategory === cat.name ? 'text-slate-950' : 'text-slate-500 group-hover:text-court-gold/70'}`} />
                <span className="truncate pr-2">{cat.name}</span>
              </div>
              {cat.count > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  selectedCategory === cat.id.toString() || selectedCategory === cat.name
                    ? 'bg-slate-950/20 text-slate-950' 
                    : 'bg-slate-800 text-slate-400 group-hover:bg-court-gold/10 group-hover:text-court-gold'
                }`}>
                  {cat.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center space-x-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 py-2.5 rounded-lg text-sm transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}

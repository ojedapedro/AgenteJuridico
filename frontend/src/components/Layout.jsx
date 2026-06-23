import React from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children, user, onLogout, categories, selectedCategory, onSelectCategory }) {
  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar 
        user={user} 
        onLogout={onLogout} 
        categories={categories} 
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-900 border-l border-slate-800">
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

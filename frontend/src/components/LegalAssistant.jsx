import React, { useState } from 'react';
import { Sparkles, Send, Bot, User, Loader2 } from 'lucide-react';

export default function LegalAssistant() {
  const [prompt, setPrompt] = useState('');
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const userMessage = prompt.trim();
    setPrompt('');
    setConversation(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const token = localStorage.getItem('jwt_token');
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: userMessage })
      });

      if (!response.ok) {
        throw new Error('No se pudo procesar la solicitud.');
      }

      const data = await response.json();
      setConversation(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (err) {
      console.error(err);
      setConversation(prev => [...prev, { role: 'assistant', content: 'Lo siento, ha ocurrido un error de conexión con la IA.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-5 rounded-xl shadow-xl flex flex-col h-[600px] mt-6">
      <div className="flex items-center space-x-3 mb-4 border-b border-slate-800 pb-4">
        <div className="bg-court-gold/10 p-2 rounded-lg border border-court-gold/20">
          <Sparkles className="w-5 h-5 text-court-gold" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-200 font-serif">Asistente Legal IA</h3>
          <p className="text-xs text-slate-400">Desarrollado con Gemini 3.5 Flash (Search Grounding)</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 custom-scrollbar pr-2">
        {conversation.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
            <Bot className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">Realiza consultas jurídicas.<br/>El asistente utiliza Google Search para obtener información actualizada y precisa.</p>
          </div>
        ) : (
          conversation.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-xl flex space-x-3 ${
                msg.role === 'user' 
                  ? 'bg-court-gold text-slate-950 rounded-tr-sm' 
                  : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm'
              }`}>
                {msg.role === 'user' ? null : <Bot className="w-5 h-5 mt-0.5 shrink-0" />}
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] p-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm flex space-x-3 items-center">
              <Bot className="w-5 h-5 shrink-0" />
              <Loader2 className="w-4 h-4 animate-spin text-court-gold" />
              <span className="text-sm text-slate-400">Buscando información actualizada...</span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleAsk} className="relative mt-auto">
        <input 
          type="text" 
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ej: ¿Cuáles son las últimas modificaciones de la LOPD en 2026?"
          disabled={loading}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-4 pr-12 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-court-gold transition-all disabled:opacity-50 shadow-inner"
        />
        <button 
          type="submit"
          disabled={!prompt.trim() || loading}
          className="absolute right-2 top-2 p-1.5 bg-court-gold text-slate-950 rounded-md hover:bg-court-gold-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

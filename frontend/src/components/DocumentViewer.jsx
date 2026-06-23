import React, { useState } from 'react';
import { Eye, FileText, Download, X, Lock, CheckCircle, Info } from 'lucide-react';

export default function DocumentViewer({ document, onClose, onDownload }) {
  const [downloading, setDownloading] = useState(false);
  
  if (!document) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await onDownload(document.id, document.title);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-full max-h-[85vh]">
      {/* Viewer Header */}
      <div className="bg-slate-950 p-6 flex justify-between items-start border-b border-slate-800">
        <div className="flex items-start space-x-4">
          <div className="bg-court-gold/10 p-3 rounded-xl border border-court-gold/20 shrink-0">
            <FileText className="w-8 h-8 text-court-gold" />
          </div>
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-xs bg-court-gold/15 text-court-gold px-2.5 py-0.5 rounded-full border border-court-gold/25 font-medium tracking-wide font-sans">
                {document.category_name || 'Documento'}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                ID: {document.id}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-100 font-serif leading-tight">
              {document.title}
            </h2>
            <div className="flex items-center space-x-2 mt-3 text-sm text-slate-400">
              <span className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-1 text-court-gold/70" />
                Validado
              </span>
              <span>•</span>
              <span>Subido el: {new Date(document.publication_date || document.created_at || Date.now()).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 shrink-0 ml-4">
          <button 
            onClick={handleDownload}
            disabled={downloading}
            className={`flex items-center justify-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-lg ${
              downloading
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-court-gold text-slate-950 hover:bg-court-gold-light shadow-court-gold/10'
            }`}
          >
            {downloading ? (
              <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{downloading ? 'Descargando...' : 'Descargar Cifrado'}</span>
          </button>
          
          <button 
            onClick={onClose}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
            title="Cerrar vista"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Viewer Content Area */}
      <div className="flex-1 overflow-y-auto p-8 bg-slate-900/50">
        <div className="max-w-3xl mx-auto">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Clasificación</p>
              <p className="text-sm text-slate-200 font-medium">{document.category_name || 'Desconocida'}</p>
            </div>
            <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Asignado a</p>
              <p className="text-sm text-slate-200 font-medium">{document.uploader_name || 'Sistema'}</p>
            </div>
            <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Cifrado</p>
              <p className="text-sm text-court-gold font-medium flex items-center">
                <Lock className="w-3 h-3 mr-1" /> AES-256
              </p>
            </div>
            <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Tamaño</p>
              <p className="text-sm text-slate-200 font-medium">-- KB</p>
            </div>
          </div>

          {/* Description Section */}
          <div className="bg-slate-950 rounded-xl p-6 border border-slate-800 mb-8 mt-4 shadow-sm">
            <h3 className="text-lg font-semibold text-court-gold mb-3 flex items-center font-serif">
              <Info className="w-5 h-5 mr-2 opacity-80" />
              Síntesis del Documento
            </h3>
            <div className="prose prose-invert prose-slate max-w-none text-slate-300 leading-relaxed text-sm">
              {document.description ? (
                <p>{document.description}</p>
              ) : (
                <p className="text-slate-500 italic">No se ha provisto descripción para este extracto.</p>
              )}
            </div>
          </div>

          <div className="text-center py-10 opacity-60">
            <Lock className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">Contenido Protegido</p>
            <p className="text-slate-500 text-sm mt-2 max-w-sm mx-auto">
              El contenido íntegro está resguardado mediante encriptación criptográfica. 
              Debe descargar el archivo para su visualización a través de una pasarela autorizada.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

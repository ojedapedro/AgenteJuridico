import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Download, Eye, FileText, Upload, Plus, X, 
  ChevronRight, Calendar, User, Shield, Info, LogOut, CheckCircle, AlertCircle
} from 'lucide-react';
import Layout from './Layout';
import DocumentViewer from './DocumentViewer';
import DocumentUploader from './DocumentUploader';
import LegalAssistant from './LegalAssistant';

export default function LegalLibrary({ user, onLogout }) {
  // Lista de documentos
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Categorías fijas requeridas
  const [categories, setCategories] = useState([
    { id: 1, name: 'Leyes', count: 0 },
    { id: 2, name: 'Sentencias', count: 0 },
    { id: 3, name: 'Contratos', count: 0 },
    { id: 4, name: 'Jurisprudencia', count: 0 },
    { id: 5, name: 'Decretos', count: 0 }
  ]);

  // Filtros activos
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Detalles de documento (Modal)
  const [activeDocDetails, setActiveDocDetails] = useState(null);

  // Cargar documentos desde la API (con Fallback a mock en memoria)
  const fetchDocuments = async () => {
    setLoading(true);
    setError('');
    
    // Obtener token del almacenamiento local
    const token = localStorage.getItem('jwt_token');

    try {
      const queryParams = new URLSearchParams();
      if (selectedCategory) queryParams.append('category', selectedCategory);
      if (searchQuery) queryParams.append('search', searchQuery);
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const response = await fetch(`/api/documents?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener documentos de la API backend.');
      }

      const data = await response.json();
      setDocuments(data);
      updateCategoryCounts(data);
    } catch (err) {
      console.warn('⚠️ Fallo de conexión con la API Backend. Cargando simulación local...', err);
      // Fallback: Simular datos para que funcione el frontend autónomamente
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (newMockDoc) => {
    if (newMockDoc) {
      setDocuments(prev => {
        const newDocs = [newMockDoc, ...prev];
        updateCategoryCounts(newDocs);
        return newDocs;
      });
    } else {
      fetchDocuments();
    }
  };

  const updateCategoryCounts = (docsList) => {
    setCategories(prev => prev.map(cat => {
      const count = docsList.filter(doc => 
        (doc.category_name && doc.category_name.toLowerCase() === cat.name.toLowerCase()) || 
        doc.category_id === cat.id
      ).length;
      return { ...cat, count };
    }));
  };

  const loadMockData = () => {
    // Datos jurídicos realistas y pre-cargados
    const dummyDocs = [
      {
        id: 'mock-1',
        title: 'Ley Orgánica de Protección de Datos Personales (LOPD)',
        description: 'Regula las obligaciones relativas al tratamiento de datos personales para garantizar la privacidad y los derechos fundamentales de los ciudadanos.',
        publication_date: '2026-05-12',
        category_id: 1,
        category_name: 'Leyes',
        tags: ['Protección de Datos', 'RGPD', 'Derecho Digital'],
        uploader_name: 'admin',
        file_hash: '2f9a764d...3e22'
      },
      {
        id: 'mock-2',
        title: 'Sentencia TS (Sala Civil) sobre Cláusulas Suelo',
        description: 'Fallo definitivo del Tribunal Supremo que declara la nulidad de las cláusulas de limitación de tipo de interés y ordena la restitución de las cantidades cobradas.',
        publication_date: '2026-06-01',
        category_id: 2,
        category_name: 'Sentencias',
        tags: ['Civil', 'Bancario', 'Consumidores'],
        uploader_name: 'abogado1',
        file_hash: '82cde99a...614f'
      },
      {
        id: 'mock-3',
        title: 'Contrato de Arrendamiento de Local Comercial',
        description: 'Modelo de acuerdo privado para el arrendamiento de oficinas o locales comerciales, incluyendo cláusulas de fianza, gastos de comunidad y actualización de rentas.',
        publication_date: '2026-06-10',
        category_id: 3,
        category_name: 'Contratos',
        tags: ['Civil', 'Mercantil', 'Arrendamientos'],
        uploader_name: 'admin',
        file_hash: 'ee74bc99...77df'
      },
      {
        id: 'mock-4',
        title: 'Decreto Ley de Medidas Urgentes para la Digitalización Judicial',
        description: 'Decreto presidencial destinado a modernizar los sistemas informáticos de la administración de justicia, facilitando los juicios telemáticos.',
        publication_date: '2026-04-18',
        category_id: 5,
        category_name: 'Decretos',
        tags: ['Derecho Digital', 'Administrativo'],
        uploader_name: 'admin',
        file_hash: 'aa9923bb...cc11'
      },
      {
        id: 'mock-5',
        title: 'Jurisprudencia Unificada sobre el Despido Disciplinario',
        description: 'Recopilación de resoluciones judiciales que unifican doctrina sobre los plazos y causas admisibles en despidos disciplinarios objetivos.',
        publication_date: '2026-03-24',
        category_id: 4,
        category_name: 'Jurisprudencia',
        tags: ['Laboral', 'Despidos'],
        uploader_name: 'abogado1',
        file_hash: '992a77ff...3d4f'
      }
    ];

    // Aplicar filtros locales para simulación
    let filtered = [...dummyDocs];
    if (selectedCategory) {
      filtered = filtered.filter(doc => doc.category_name.toLowerCase() === selectedCategory.toLowerCase());
    }
    if (searchQuery) {
      const s = searchQuery.toLowerCase();
      filtered = filtered.filter(doc => doc.title.toLowerCase().includes(s) || doc.description.toLowerCase().includes(s));
    }
    if (startDate) {
      filtered = filtered.filter(doc => doc.publication_date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(doc => doc.publication_date <= endDate);
    }

    setDocuments(filtered);
    
    // Contar categorías sobre la lista original simulada
    setCategories(prev => prev.map(cat => {
      const count = dummyDocs.filter(doc => doc.category_id === cat.id).length;
      return { ...cat, count };
    }));
  };

  useEffect(() => {
    fetchDocuments();
  }, [selectedCategory, searchQuery, startDate, endDate]);

  // Manejo de la descarga de documentos con validación de roles
  const handleDownload = async (docId, docTitle, categoryName) => {
    // Regla del lado del cliente (para ilustrar permisos)
    if (user.role === 'cliente' && categoryName === 'Contratos') {
      alert('⚠️ Descarga Denegada: Los usuarios con rol "cliente" no tienen autorización para descargar Contratos por directivas de privacidad.');
      return;
    }

    const token = localStorage.getItem('jwt_token');
    
    try {
      // 1. Validar permisos en el backend y obtener URL ofuscada
      const authResponse = await fetch(`/api/documents/download/${docId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!authResponse.ok) {
        const errorData = await authResponse.json();
        throw new Error(errorData.error || 'Error al autorizar descarga.');
      }

      const { downloadUrl } = await authResponse.json();

      // 2. Ejecutar la descarga desde la URL ofuscada / firmada
      const fileResponse = await fetch(downloadUrl);
      if (!fileResponse.ok) throw new Error('El enlace de descarga expiró o es inválido.');

      const blob = await fileResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = docTitle.endsWith('.pdf') || docTitle.endsWith('.docx') ? docTitle : `${docTitle}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.warn('⚠️ No se pudo realizar la descarga del backend. Descargando recurso local simulado...', err);
      
      // Simular descarga local creando un PDF ficticio vacío
      const blob = new Blob([`Contenido cifrado simulado del archivo legal: ${docTitle}`], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${docTitle}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    }
  };

  return (
    <>
      <Layout 
        user={user} 
        onLogout={onLogout} 
        categories={categories} 
        selectedCategory={selectedCategory} 
        onSelectCategory={setSelectedCategory}
      >
        {/* CONTENIDO CENTRAL */}
        
          {/* BARRA DE BÚSQUEDA Y FILTROS */}
          <div className="glass-panel p-4 rounded-xl flex flex-col space-y-3">
            <div className="flex space-x-3">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar leyes, sentencias, contratos, palabras clave..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-court-600 focus:ring-1 focus:ring-court-600"
                />
              </div>
              
              <button 
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`px-4 py-2 border rounded-lg text-sm flex items-center space-x-2 transition-all ${
                  showAdvancedFilters 
                    ? 'bg-court-600 border-court-600 text-slate-950 font-medium' 
                    : 'border-slate-800 hover:bg-slate-900 text-slate-300'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filtros Avanzados</span>
              </button>
            </div>

            {/* Panel de Filtros Avanzados */}
            {showAdvancedFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-3 border-t border-slate-800/40">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">Categoría (Móvil)</label>
                  <select 
                    value={selectedCategory} 
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-court-600"
                  >
                    <option value="">Todas las categorías</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">Publicación Desde</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-court-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">Publicación Hasta</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-court-600"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* TABLA / CUADRÍCULA DE DOCUMENTOS */}
          <div className="flex-1 flex flex-col min-h-0 bg-slate-900/40 border border-slate-800/80 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800/60 bg-slate-900/60 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                <FileText className="w-4 h-4 text-court-gold" />
                <span>Registros Jurídicos ({documents.length})</span>
              </h2>
              {selectedCategory && (
                <span className="text-xs bg-court-gold/15 text-court-gold px-2.5 py-0.5 rounded-full border border-court-gold/25">
                  Filtro: {selectedCategory}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-auto min-h-0">
              {loading ? (
                <div className="h-48 flex flex-col justify-center items-center">
                  <div className="w-8 h-8 border-4 border-court-gold border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm text-slate-400 mt-3">Descifrando y cargando lista...</p>
                </div>
              ) : documents.length === 0 ? (
                <div className="h-48 flex flex-col justify-center items-center text-slate-500">
                  <Info className="w-8 h-8 mb-2" />
                  <p className="text-sm">No se encontraron documentos en esta búsqueda.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider bg-slate-950/20">
                      <th className="py-3 px-4">Documento</th>
                      <th className="py-3 px-4 hidden sm:table-cell">Categoría</th>
                      <th className="py-3 px-4 hidden md:table-cell">Fecha Pub.</th>
                      <th className="py-3 px-4 hidden lg:table-cell">Etiquetas</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {documents.map((doc) => (
                      <tr 
                        key={doc.id}
                        className="hover:bg-slate-800/20 transition-colors text-slate-300 text-sm group"
                      >
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="flex items-start space-x-3">
                            <div className="p-2 bg-slate-900 rounded border border-slate-800 group-hover:border-court-800 transition-colors mt-0.5">
                              <FileText className="w-4 h-4 text-court-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-200 line-clamp-1 group-hover:text-court-gold transition-colors">{doc.title}</p>
                              <p className="text-xs text-slate-400 line-clamp-1">{doc.description || 'Sin descripción disponible.'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 hidden sm:table-cell">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs border ${
                            doc.category_name === 'Leyes' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            doc.category_name === 'Sentencias' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            doc.category_name === 'Contratos' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            doc.category_name === 'Jurisprudencia' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                            'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {doc.category_name}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 hidden md:table-cell text-xs text-slate-400">
                          {doc.publication_date}
                        </td>
                        <td className="py-3.5 px-4 hidden lg:table-cell max-w-[200px]">
                          <div className="flex flex-wrap gap-1">
                            {doc.tags && doc.tags.map((tag, idx) => (
                              <span 
                                key={idx} 
                                className="text-[10px] bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-800"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex justify-end space-x-1.5">
                            <button
                              onClick={() => setActiveDocDetails(doc)}
                              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors"
                              title="Ver Detalles"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownload(doc.id, doc.title, doc.category_name)}
                              className={`p-1.5 rounded transition-all flex items-center ${
                                user.role === 'cliente' && doc.category_name === 'Contratos'
                                  ? 'text-slate-600 hover:bg-red-500/5 hover:text-red-400 cursor-not-allowed'
                                  : 'hover:bg-court-gold/10 text-court-gold hover:text-court-gold-light'
                              }`}
                              title={user.role === 'cliente' && doc.category_name === 'Contratos' ? "Restringido para Clientes" : "Descargar Archivo"}
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <DocumentUploader user={user} categories={categories} onUploadSuccess={handleUploadSuccess} />
          
          {/* Asistente Legal de IA */}
          <LegalAssistant />
        </Layout>

      {/* DETALLES DE DOCUMENTO (MODAL) */}
      {activeDocDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
           <div className="w-full max-w-4xl h-[90vh]">
              <DocumentViewer 
                 document={activeDocDetails} 
                 onClose={() => setActiveDocDetails(null)} 
                 onDownload={(id, title) => handleDownload(id, title, activeDocDetails?.category_name)} 
              />
           </div>
        </div>
      )}
    </>
  );
}

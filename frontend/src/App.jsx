import React, { useState, useEffect } from 'react';
import LegalLibrary from './components/LegalLibrary';
import { Shield, Mail, Lock, User, PlusCircle, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Campos de formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('cliente');

  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);

  // Verificar si hay token previo en localStorage al iniciar
  useEffect(() => {
    const savedUser = localStorage.getItem('logged_user');
    const token = localStorage.getItem('jwt_token');
    if (savedUser && token) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed) setUser(parsed);
      } catch(e) {
        localStorage.removeItem('logged_user');
        localStorage.removeItem('jwt_token');
      }
    }
  }, []);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Credenciales inválidas.');
      }

      const data = await response.json();
      localStorage.setItem('jwt_token', data.token);
      localStorage.setItem('logged_user', JSON.stringify(data.user));
      setUser(data.user);
      showNotification('success', `¡Bienvenido de nuevo, ${data.user.username}!`);
    } catch (err) {
      console.warn('⚠️ No se pudo autenticar con el backend. Ejecutando inicio de sesión simulado (Local).', err);
      
      // Fallback de desarrollo: Inicio de sesión local simulado
      const demoUsers = {
        'admin@legal.com': { id: 'mock-admin', username: 'admin', role: 'administrador' },
        'abogado@legal.com': { id: 'mock-abogado', username: 'abogado1', role: 'abogado' },
        'cliente@legal.com': { id: 'mock-cliente', username: 'cliente1', role: 'cliente' }
      };

      const matchedUser = demoUsers[email.trim().toLowerCase()];
      if (matchedUser && (password === 'admin123' || password === 'abogado123' || password === 'cliente123')) {
        const fakeToken = 'fake-jwt-token-for-demo';
        localStorage.setItem('jwt_token', fakeToken);
        localStorage.setItem('logged_user', JSON.stringify(matchedUser));
        setUser(matchedUser);
      } else {
        showNotification('error', 'Credenciales de simulación incorrectas. Intenta con los accesos rápidos de abajo o inicia el servidor backend.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password, role })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Fallo al registrar usuario.');
      }

      showNotification('success', '¡Registro completado con éxito! Por favor inicia sesión.');
      setIsRegisterMode(false);
      setEmail(email);
    } catch (err) {
      console.warn('⚠️ No se pudo registrar en el backend. Simulando registro local...', err);
      
      // Simulación local de registro
      showNotification('success', '¡Simulación exitosa! Usuario registrado localmente. Ya puedes iniciar sesión.');
      setIsRegisterMode(false);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoRole) => {
    let mockUser = {};
    let emailStr = '';
    let passStr = '';
    
    if (demoRole === 'admin') {
      mockUser = { id: 'mock-admin', username: 'admin_demo', role: 'administrador' };
      emailStr = 'admin@legal.com';
      passStr = 'admin123';
    } else if (demoRole === 'abogado') {
      mockUser = { id: 'mock-lawyer', username: 'abogado_demo', role: 'abogado' };
      emailStr = 'abogado@legal.com';
      passStr = 'abogado123';
    } else {
      mockUser = { id: 'mock-client', username: 'cliente_demo', role: 'cliente' };
      emailStr = 'cliente@legal.com';
      passStr = 'cliente123';
    }

    setEmail(emailStr);
    setPassword(passStr);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailStr, password: passStr })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('jwt_token', data.token);
        localStorage.setItem('logged_user', JSON.stringify(data.user));
        setUser(data.user);
        showNotification('success', `Acceso rápido exitoso como ${data.user.username} (${data.user.role})`);
        return;
      }
    } catch (e) {
      console.warn('Backend no disponible para quick login. Usando simulación local.');
    } finally {
      setLoading(false);
    }

    localStorage.setItem('jwt_token', `fake-jwt-token-for-${demoRole}`);
    localStorage.setItem('logged_user', JSON.stringify(mockUser));
    setUser(mockUser);
    showNotification('success', `Acceso rápido exitoso como ${mockUser.username} (${mockUser.role})`);
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('logged_user');
    setUser(null);
    setEmail('');
    setPassword('');
    showNotification('success', 'Sesión cerrada correctamente.');
  };

  // Si está autenticado, renderizar la app principal de la biblioteca
  if (user) {
    return <LegalLibrary user={user} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen animated-bg flex flex-col justify-center items-center p-4 relative overflow-hidden">
      
      {/* NOTIFICACIÓN FLOTANTE */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-xl border flex items-center space-x-3 shadow-xl transition-all duration-300 animate-bounce ${
          notification.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' 
            : 'bg-red-500/10 border-red-500/25 text-red-400'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-xs font-medium">{notification.message}</span>
        </div>
      )}

      {/* DETALLES DE DISEÑO ABSTRACTO */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-court-gold/5 rounded-full filter blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-court-600/5 rounded-full filter blur-[100px] pointer-events-none"></div>

      {/* CONTENEDOR CENTRAL */}
      <div className="w-full max-w-md glass-panel p-8 rounded-2xl border border-slate-800 shadow-2xl relative z-10">
        
        {/* LOGOTIPO */}
        <div className="text-center mb-8">
          <div className="inline-flex bg-court-gold text-slate-950 p-3.5 rounded-2xl font-bold shadow-lg shadow-court-gold/15 mb-4">
            ⚖️
          </div>
          <h1 className="text-2xl font-bold font-serif text-court-gold gold-glow tracking-wider">
            LEGIS-DOCS
          </h1>
          <p className="text-xs text-slate-400 mt-1">Garantizando la Privacidad y Seguridad Documental</p>
        </div>

        {/* MODO LOGIN / REGISTRO */}
        {!isRegisterMode ? (
          // FORMULARIO DE LOGIN
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="email" 
                  required
                  placeholder="nombre@legal.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-court-gold transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-court-gold transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-court-gold text-slate-950 hover:bg-court-gold-light py-2 rounded-lg text-xs font-semibold shadow-lg shadow-court-gold/10 transition-all font-sans"
            >
              {loading ? 'Accediendo...' : 'Iniciar Sesión'}
            </button>

            <p className="text-center text-[10px] text-slate-500">
              ¿No tienes una cuenta?{' '}
              <button 
                type="button" 
                onClick={() => setIsRegisterMode(true)}
                className="text-court-gold hover:underline font-semibold"
              >
                Regístrate aquí
              </button>
            </p>
          </form>
        ) : (
          // FORMULARIO DE REGISTRO
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Nombre de Usuario</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  required
                  placeholder="abogado_juan"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-court-gold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="email" 
                  required
                  placeholder="ejemplo@legal.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-court-gold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="password" 
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-court-gold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Rol de Usuario</label>
              <div className="relative">
                <Shield className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <select 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-court-gold"
                >
                  <option value="cliente">Cliente (Consultor / Lector)</option>
                  <option value="abogado">Abogado (Editor / Carga)</option>
                  <option value="administrador">Administrador (Control Total)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-court-gold text-slate-950 hover:bg-court-gold-light py-2 rounded-lg text-xs font-semibold shadow-lg transition-all"
            >
              {loading ? 'Creando cuenta...' : 'Crear Cuenta Segura'}
            </button>

            <p className="text-center text-[10px] text-slate-500">
              ¿Ya tienes una cuenta?{' '}
              <button 
                type="button" 
                onClick={() => setIsRegisterMode(false)}
                className="text-court-gold hover:underline font-semibold"
              >
                Inicia sesión aquí
              </button>
            </p>
          </form>
        )}

        {/* ACCESO RÁPIDO PARA DEMOSTRACIÓN */}
        <div className="mt-8 pt-6 border-t border-slate-850">
          <div className="flex items-center space-x-1.5 text-court-gold mb-3 justify-center">
            <Sparkles className="w-3.5 h-3.5" />
            <h2 className="text-[10px] font-semibold tracking-wider uppercase">Accesos Rápidos Demo</h2>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={() => handleQuickLogin('admin')}
              className="px-2 py-1.5 bg-slate-900 hover:bg-slate-850 text-[10px] rounded border border-slate-800 text-slate-300 transition-colors flex flex-col items-center"
              title="Permisos totales de carga y descarga"
            >
              <span className="font-bold text-court-gold">Admin</span>
              <span className="text-[8px] text-slate-500">Control total</span>
            </button>
            <button 
              onClick={() => handleQuickLogin('abogado')}
              className="px-2 py-1.5 bg-slate-900 hover:bg-slate-850 text-[10px] rounded border border-slate-800 text-slate-300 transition-colors flex flex-col items-center"
              title="Permisos de carga y descarga básica"
            >
              <span className="font-bold text-blue-400">Abogado</span>
              <span className="text-[8px] text-slate-500">Carga/Descarga</span>
            </button>
            <button 
              onClick={() => handleQuickLogin('cliente')}
              className="px-2 py-1.5 bg-slate-900 hover:bg-slate-850 text-[10px] rounded border border-slate-800 text-slate-300 transition-colors flex flex-col items-center"
              title="Permisos mínimos de lectura"
            >
              <span className="font-bold text-emerald-400">Cliente</span>
              <span className="text-[8px] text-slate-500">Lector limitado</span>
            </button>
          </div>
          <p className="text-[9px] text-slate-500 text-center mt-2.5 leading-relaxed">
            * Al usar acceso rápido, se omite el backend si este no está en ejecución, cargando una simulación local autónoma para que puedas probar la interfaz de inmediato.
          </p>
        </div>

      </div>
    </div>
  );
}

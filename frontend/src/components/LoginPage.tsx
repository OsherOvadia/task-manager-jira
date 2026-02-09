import React, { useState } from 'react';
import { useAuthStore } from '../store';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { login } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password, rememberMe);
    } catch (err: any) {
      setError(err.response?.data?.error || 'אירעה שגיאה בהתחברות');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-10 left-10 w-40 h-40 bg-teal-500/10 rounded-full animate-pulse" />
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-teal-500/10 rounded-full animate-pulse delay-1000" />
      
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 backdrop-blur rounded-2xl shadow-2xl w-full max-w-md p-8 relative z-10 border border-teal-500/30 animate-fadeIn transform hover:scale-105 transition-transform duration-500">
        <div className="text-center mb-8 animate-slideDown">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent mb-2">🍽️ Mission Tracker</h1>
          <p className="text-teal-300/80 text-lg">Restaurant Operations Control</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="animate-slideUp" style={{animationDelay: '0.1s'}}>
            <label className="block text-sm font-semibold text-transparent bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-teal-500/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all duration-300 hover:border-teal-500 bg-slate-700/50 text-white placeholder-slate-400"
              placeholder="Enter email"
              required
            />
          </div>

          <div className="animate-slideUp" style={{animationDelay: '0.2s'}}>
            <label className="block text-sm font-semibold text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text mb-2">סיסמה</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 hover:border-purple-400 bg-gray-50/50"
              placeholder="הכנס סיסמה"
              required
            />
          </div>

          <div className="flex items-center animate-slideUp" style={{animationDelay: '0.3s'}}>
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-5 h-5 text-purple-600 border-2 border-purple-300 rounded focus:ring-2 focus:ring-purple-500 cursor-pointer transition-all duration-300 hover:border-purple-500"
            />
            <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-700 cursor-pointer font-medium hover:text-purple-600 transition-colors duration-300">
              זכור אותי בפעם הבאה
            </label>
          </div>

          {error && (
            <div className="bg-gradient-to-r from-red-400 to-pink-400 text-white p-4 rounded-xl text-sm font-semibold animate-shake">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 transition-all duration-300 transform hover:scale-105 active:scale-95 animate-slideUp"
            style={{animationDelay: '0.4s'}}
          >
            {loading ? '⏳ טוען...' : '🔓 התחברות'}
          </button>
        </form>

        <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200 animate-slideUp" style={{animationDelay: '0.5s'}}>
          <p className="text-sm font-bold text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text mb-3">📋 פרטי כניסה לדוגמה:</p>
          <div className="space-y-2">
            <p className="text-sm text-gray-700 bg-white/50 p-2 rounded-lg hover:bg-white/80 transition-colors duration-300">
              <span className="font-semibold">👑 מנהל:</span> <span className="font-mono text-xs">admin@restaurant.com</span> / <span className="font-mono text-xs">password123</span>
            </p>
            <p className="text-sm text-gray-700 bg-white/50 p-2 rounded-lg hover:bg-white/80 transition-colors duration-300">
              <span className="font-semibold">👨‍💼 מנהל:</span> <span className="font-mono text-xs">manager@restaurant.com</span> / <span className="font-mono text-xs">password123</span>
            </p>
            <p className="text-sm text-gray-700 bg-white/50 p-2 rounded-lg hover:bg-white/80 transition-colors duration-300">
              <span className="font-semibold">👤 עובד:</span> <span className="font-mono text-xs">john@restaurant.com</span> / <span className="font-mono text-xs">password123</span>
            </p>
          </div>
          <p className="text-xs text-gray-600 mt-3 text-center bg-blue-100/50 p-2 rounded font-semibold">
            ⚙️ רק מנהלי מערכת יכולים ליצור משתמשים חדשים
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        
        .animate-slideDown {
          animation: slideDown 0.5s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.5s ease-out forwards;
          opacity: 0;
        }
        
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
        
        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}

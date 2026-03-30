import { useState, useEffect, useCallback, useRef } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import { Toaster } from "sonner";
import SplashScreen from "@/components/SplashScreen";
import Header from "@/components/Header";
import ShopView from "@/components/ShopView";
import AdminPage from "@/components/AdminPage";
import MpsLogo from "@/components/MpsLogo";

axios.defaults.withCredentials = true;

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const BASE_PATH = process.env.REACT_APP_BASE_PATH || "";

function AuthGate({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const exchanged = useRef(false);

  const getRedirectUri = () => {
    const origin = window.location.origin;
    const base = BASE_PATH || '';
    return (origin + base).replace(/\/$/, '');
  };

  useEffect(() => {
    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code && !exchanged.current) {
        exchanged.current = true;
        const redirectUri = getRedirectUri();
        window.history.replaceState({}, "", window.location.pathname);
        try {
          const res = await axios.post(`${API}/auth/google/callback`, { code, redirect_uri: redirectUri });
          setUser(res.data);
          const savedPath = sessionStorage.getItem("auth_redirect");
          if (savedPath) {
            sessionStorage.removeItem("auth_redirect");
            const fullPath = (BASE_PATH || '') + savedPath;
            if (fullPath !== window.location.pathname) {
              window.history.replaceState({}, "", fullPath);
            }
          }
          setLoading(false);
          return;
        } catch (e) {
          setAuthError(e.response?.data?.detail || "Authentication failed");
          setLoading(false);
          return;
        }
      }

      try {
        const res = await axios.get(`${API}/auth/me`);
        setUser(res.data);
      } catch (e) {
        // Not logged in
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleLogout = async () => {
    try { await axios.post(`${API}/auth/logout`); } catch (e) {}
    setUser(null);
    setAuthError(null);
  };

  if (loading) return <SplashScreen />;

  if (!user) {
    const handleGoogleLogin = async () => {
      const currentPath = window.location.pathname.replace(BASE_PATH, '') || '/';
      sessionStorage.setItem("auth_redirect", currentPath);
      const redirectUri = getRedirectUri();
      try {
        const res = await axios.get(`${API}/auth/google/login?redirect_uri=${encodeURIComponent(redirectUri)}`);
        window.location.href = res.data.auth_url;
      } catch (e) {
        setAuthError("Failed to start Google login");
      }
    };

    return (
      <div className="min-h-screen bg-[#19305a] flex items-center justify-center p-4" data-testid="app-login">
        <Toaster position="top-center" richColors />
        <div className="bg-white rounded-[24px] shadow-2xl p-8 w-full max-w-sm animate-fade-in">
          <div className="flex flex-col items-center mb-6">
            <MpsLogo className="w-48 mb-4" fill="#19305a" />
            <h1 className="text-2xl font-black text-[#19305a]">Bee Shop Kiosk</h1>
            <p className="text-sm text-[#5a6b8a] mt-1">Sign in with your school Google account</p>
          </div>
          {authError && (
            <div data-testid="auth-error" className="text-[#c74747] text-sm font-bold text-center mb-4 bg-[#c74747]/5 rounded-[10px] p-3">
              <p>{authError}</p>
              {authError.includes("not in the system") && (
                <p className="text-xs font-medium text-[#5a6b8a] mt-2">Contact your administrator if you believe this is an error.</p>
              )}
            </div>
          )}
          <button
            data-testid="google-login-btn"
            onClick={handleGoogleLogin}
            className="w-full h-12 rounded-[12px] bg-white border-2 border-[#19305a]/10 text-[#19305a] font-bold text-base hover:bg-[#f3f6fb] active:translate-y-0.5 transition-all flex items-center justify-center gap-3"
          >
            <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 2.58z" fill="#EA4335"/></svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return children({ user, onLogout: handleLogout });
}

function KioskApp({ user, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState({});
  const [items, setItems] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [usedPairs, setUsedPairs] = useState([]);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [studRes, itemRes, activeRes] = await Promise.all([
        axios.get(`${API}/students`),
        axios.get(`${API}/items`),
        axios.get(`${API}/sessions/active`),
      ]);
      setStudents(studRes.data);
      setItems(itemRes.data);
      setActiveSession(activeRes.data);

      if (activeRes.data) {
        const usedRes = await axios.get(`${API}/transactions/used?session=${encodeURIComponent(activeRes.data.label)}`);
        setUsedPairs(usedRes.data);
      } else {
        setUsedPairs([]);
      }
    } catch (e) {
      console.error("Load failed:", e);
      setError("Cannot reach server — check Wi-Fi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const saveTransaction = async (txn) => {
    const res = await axios.post(`${API}/transactions`, txn);
    await loadData();
    return res.data;
  };

  const skipStudent = async (cls, student) => {
    await axios.post(`${API}/students/skip`, { class: cls, student });
    await loadData();
  };

  if (loading) return <SplashScreen />;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#f3f6fb]" data-testid="app-root">
      <Toaster position="top-center" richColors />

      {error && (
        <div data-testid="error-banner" className="bg-[#c74747] text-white px-4 py-2 text-center font-bold flex items-center justify-center gap-2">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 font-black text-xl leading-none">&times;</button>
        </div>
      )}

      <Header activeSession={activeSession} user={user} onLogout={onLogout} />

      <main className="flex-1 overflow-hidden">
        <ShopView
          students={students}
          items={items}
          activeSession={activeSession}
          usedPairs={usedPairs}
          onSave={saveTransaction}
          onSkip={skipStudent}
          api={API}
        />
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter basename={BASE_PATH}>
      <AuthGate>
        {({ user, onLogout }) => (
          <Routes>
            <Route path="/admin" element={<AdminPage user={user} onLogout={onLogout} />} />
            <Route path="*" element={<KioskApp user={user} onLogout={onLogout} />} />
          </Routes>
        )}
      </AuthGate>
    </BrowserRouter>
  );
}

export default App;

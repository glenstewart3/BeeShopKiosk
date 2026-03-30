import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import { Toaster } from "sonner";
import SplashScreen from "@/components/SplashScreen";
import Header from "@/components/Header";
import ShopView from "@/components/ShopView";
import AdminPage from "@/components/AdminPage";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function KioskApp() {
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

      <Header activeSession={activeSession} />

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

const BASE_PATH = process.env.REACT_APP_BASE_PATH || "";

function App() {
  return (
    <BrowserRouter basename={BASE_PATH}>
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<KioskApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

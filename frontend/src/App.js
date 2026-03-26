import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { Toaster, toast } from "sonner";
import SplashScreen from "@/components/SplashScreen";
import Header from "@/components/Header";
import ShopView from "@/components/ShopView";
import Dashboard from "@/components/Dashboard";
import SettingsPanel from "@/components/SettingsPanel";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("shop");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [students, setStudents] = useState({});
  const [items, setItems] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [usedPairs, setUsedPairs] = useState([]);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [studRes, itemRes, sessRes, activeRes] = await Promise.all([
        axios.get(`${API}/students`),
        axios.get(`${API}/items`),
        axios.get(`${API}/sessions`),
        axios.get(`${API}/sessions/active`),
      ]);
      setStudents(studRes.data);
      setItems(itemRes.data);
      setSessions(sessRes.data);
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

  useEffect(() => {
    loadData();
  }, [loadData]);

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

      <Header
        view={view}
        setView={setView}
        onSettings={() => setSettingsOpen(true)}
        activeSession={activeSession}
      />

      <main className="flex-1 overflow-hidden">
        {view === "shop" ? (
          <ShopView
            students={students}
            items={items}
            activeSession={activeSession}
            usedPairs={usedPairs}
            onSave={saveTransaction}
            onSkip={skipStudent}
            api={API}
          />
        ) : (
          <Dashboard
            sessions={sessions}
            activeSession={activeSession}
            api={API}
            onRefresh={loadData}
          />
        )}
      </main>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        items={items}
        sessions={sessions}
        activeSession={activeSession}
        api={API}
        onRefresh={loadData}
      />
    </div>
  );
}

export default App;

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { LogOut, Trophy, ShoppingCart, ChevronDown, ChevronUp, Download, Plus, Upload, Trash2, RefreshCw, Calendar, Users, Package, Pencil, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import MpsLogo from "@/components/MpsLogo";
import ImportModal from "@/components/ImportModal";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const COLORS = ["#f5a623", "#7cbde8", "#19305a", "#c74747", "#4ade80", "#a78bfa", "#f97316", "#06b6d4"];

function AdminPanel({ user, onLogout }) {
  const [tab, setTab] = useState("overview");
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [students, setStudents] = useState({});
  const [items, setItems] = useState([]);
  const [selectedSession, setSelectedSession] = useState("all");
  const [report, setReport] = useState({});
  const [itemReport, setItemReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedClass, setExpandedClass] = useState(null);
  const [showNewSession, setShowNewSession] = useState(false);
  const [newSessionLabel, setNewSessionLabel] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", cost: "", category: "Menu Item" });
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", cost: "", category: "" });

  const loadAll = useCallback(async () => {
    try {
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
    } catch (e) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReport = useCallback(async () => {
    try {
      const [rep, ir] = await Promise.all([
        axios.get(`${API}/report?session=${encodeURIComponent(selectedSession)}`),
        axios.get(`${API}/report/items?session=${encodeURIComponent(selectedSession)}`),
      ]);
      setReport(rep.data);
      setItemReport(ir.data);
    } catch (e) {
      toast.error("Failed to load report");
    }
  }, [selectedSession]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { loadReport(); }, [loadReport]);

  const totalEarned = Object.values(report).reduce((s, c) => s + c.summary.total_earned, 0);
  const totalSpent = Object.values(report).reduce((s, c) => s + c.summary.total_spent, 0);
  const totalSaved = Object.values(report).reduce((s, c) => s + c.summary.total_saved, 0);
  const totalStudents = Object.values(students).reduce((s, arr) => s + arr.length, 0);

  const classChartData = Object.entries(report).map(([cls, d]) => ({
    name: cls, earned: d.summary.total_earned, spent: d.summary.total_spent, saved: d.summary.total_saved
  })).sort((a, b) => a.name.localeCompare(b.name));

  const pieData = itemReport.slice(0, 8).map(i => ({ name: i.name, value: i.count }));

  const createSession = async () => {
    if (!newSessionLabel.trim()) { toast.error("Enter a session label"); return; }
    try {
      await axios.post(`${API}/sessions`, { label: newSessionLabel.trim() });
      toast.success("Session created & activated");
      setNewSessionLabel("");
      setShowNewSession(false);
      loadAll();
      loadReport();
    } catch (e) { toast.error("Failed to create session"); }
  };

  const switchSession = async (label) => {
    try {
      await axios.put(`${API}/sessions/${encodeURIComponent(label)}/activate`);
      toast.success("Switched to: " + label);
      loadAll();
    } catch (e) { toast.error("Failed"); }
  };

  const deleteSession = async (label) => {
    if (!window.confirm(`Delete session "${label}" and all its transactions? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/sessions/${encodeURIComponent(label)}`);
      toast.success("Session deleted");
      loadAll();
      loadReport();
    } catch (e) { toast.error("Failed to delete session"); }
  };

  const syncWellTrack = async () => {
    try {
      const res = await axios.post(`${API}/students/sync-welltrack`);
      toast.success(`Synced ${res.data.count} students from WellTrack`);
      loadAll();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to sync from WellTrack");
    }
  };

  const addItem = async () => {
    if (!newItem.name.trim() || !newItem.cost) { toast.error("Name and cost required"); return; }
    try {
      await axios.post(`${API}/items`, { name: newItem.name.trim(), cost: parseInt(newItem.cost, 10), category: newItem.category });
      toast.success("Item added");
      setNewItem({ name: "", cost: "", category: "Menu Item" });
      loadAll();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const deleteItem = async (name) => {
    try {
      await axios.delete(`${API}/items/${encodeURIComponent(name)}`);
      toast.success("Deleted");
      loadAll();
    } catch (e) { toast.error("Failed"); }
  };

  const startEditItem = (item) => {
    setEditingItem(item.name);
    setEditForm({ name: item.name, cost: String(item.cost), category: item.category });
  };

  const saveEditItem = async () => {
    if (!editForm.name.trim() || !editForm.cost) { toast.error("Name and cost required"); return; }
    try {
      await axios.put(`${API}/items/${encodeURIComponent(editingItem)}`, {
        name: editForm.name.trim(),
        cost: parseInt(editForm.cost, 10),
        category: editForm.category,
      });
      toast.success("Item updated");
      setEditingItem(null);
      loadAll();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to update"); }
  };

  const exportCSV = () => {
    let csv = "Class,Student,Earned,Spent,Saved,Items\n";
    Object.entries(report).forEach(([cls, data]) => {
      Object.entries(data.students).forEach(([stu, sdata]) => {
        const itemsStr = Object.entries(sdata.items).map(([n, c]) => `${n}x${c}`).join("; ");
        csv += `"${cls}","${stu}",${sdata.earned},${sdata.spent},${sdata.saved},"${itemsStr}"\n`;
      });
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `beeshop_report_${selectedSession}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const logout = async () => {
    try { await axios.post(`${API}/auth/logout`); } catch (e) {}
    onLogout();
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: Trophy },
    { id: "students", label: "Students", icon: Users },
    { id: "items", label: "Items", icon: Package },
    { id: "sessions", label: "Sessions", icon: Calendar },
  ];

  if (loading) return (
    <div className="min-h-screen bg-[#f3f6fb] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#7cbde8] border-t-[#f5a623] rounded-full" style={{ animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f3f6fb] flex flex-col" data-testid="admin-panel">
      {/* Admin header */}
      <header className="bg-[#19305a] text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <MpsLogo className="h-8" fill="#fff" />
          <span className="text-lg font-bold tracking-tight">Admin Panel</span>
        </div>
        <div className="flex items-center gap-2">
          {activeSession && (
            <span className="bg-[#f5a623]/20 text-[#f5a623] text-xs font-bold px-3 py-1 rounded-full">
              {activeSession.label}
            </span>
          )}
          {user && (
            <div className="flex items-center gap-2 mr-1">
              {user.picture && <img src={user.picture} alt="" className="w-7 h-7 rounded-full border-2 border-white/20" referrerPolicy="no-referrer" />}
              <span className="text-xs font-bold text-white/70 hidden sm:inline">{user.name}</span>
            </div>
          )}
          <button data-testid="admin-refresh-btn" onClick={() => { loadAll(); loadReport(); }} className="px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-all">
            <RefreshCw size={16} strokeWidth={3} />
          </button>
          <button data-testid="admin-logout-btn" onClick={logout} className="flex items-center gap-1 px-3 py-2 rounded-full bg-[#c74747]/20 text-[#c74747] hover:bg-[#c74747]/30 font-bold text-sm transition-all">
            <LogOut size={14} strokeWidth={3} /> Logout
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-[#19305a]/5 px-4 flex gap-1 shrink-0">
        {tabs.map(t => (
          <button
            key={t.id}
            data-testid={`admin-tab-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3 font-bold text-sm border-b-3 transition-all ${
              tab === t.id
                ? "border-[#f5a623] text-[#19305a]"
                : "border-transparent text-[#5a6b8a] hover:text-[#19305a]"
            }`}
          >
            <t.icon size={16} strokeWidth={3} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">

        {/* ── OVERVIEW TAB ── */}
        {tab === "overview" && (
          <div className="animate-fade-in space-y-6">
            {/* Session selector */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-bold text-[#19305a]">Session:</label>
                <select data-testid="admin-session-select" value={selectedSession} onChange={e => setSelectedSession(e.target.value)}
                  className="px-3 py-2 rounded-[12px] border-2 border-[#19305a]/10 bg-white text-[#19305a] font-bold text-sm focus:border-[#7cbde8] outline-none">
                  <option value="all">All Time</option>
                  {sessions.map(s => <option key={s.label} value={s.label}>{s.label}{s.active ? " (Active)" : ""}</option>)}
                </select>
              </div>
              <button data-testid="admin-export-csv" onClick={exportCSV}
                className="flex items-center gap-1 px-3 py-2 rounded-[12px] bg-[#f5a623]/10 text-[#f5a623] font-bold text-sm hover:bg-[#f5a623]/20 transition-all ml-auto">
                <Download size={14} strokeWidth={3} /> Export CSV
              </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div data-testid="admin-stat-earned" className="bg-white rounded-[16px] shadow-[0_8px_24px_rgba(25,48,90,0.06)] p-4 flex flex-col items-center">
                <Trophy size={22} className="text-[#7cbde8] mb-1" strokeWidth={3} />
                <span className="text-[10px] font-bold text-[#5a6b8a] uppercase tracking-wider">Total Earned</span>
                <span className="text-2xl font-black text-[#19305a]">{totalEarned}</span>
              </div>
              <div data-testid="admin-stat-spent" className="bg-white rounded-[16px] shadow-[0_8px_24px_rgba(25,48,90,0.06)] p-4 flex flex-col items-center">
                <ShoppingCart size={22} className="text-[#c74747] mb-1" strokeWidth={3} />
                <span className="text-[10px] font-bold text-[#5a6b8a] uppercase tracking-wider">Total Spent</span>
                <span className="text-2xl font-black text-[#19305a]">{totalSpent}</span>
              </div>
              <div data-testid="admin-stat-saved" className="bg-white rounded-[16px] shadow-[0_8px_24px_rgba(25,48,90,0.06)] p-4 flex flex-col items-center border-2 border-[#f5a623]/20">
                <span className="text-lg mb-1">🐝</span>
                <span className="text-[10px] font-bold text-[#5a6b8a] uppercase tracking-wider">Total Saved</span>
                <span className="text-2xl font-black text-[#f5a623]">{totalSaved}</span>
              </div>
              <div data-testid="admin-stat-students" className="bg-white rounded-[16px] shadow-[0_8px_24px_rgba(25,48,90,0.06)] p-4 flex flex-col items-center">
                <Users size={22} className="text-[#19305a] mb-1" strokeWidth={3} />
                <span className="text-[10px] font-bold text-[#5a6b8a] uppercase tracking-wider">Students</span>
                <span className="text-2xl font-black text-[#19305a]">{totalStudents}</span>
              </div>
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Bar chart - class breakdown */}
              {classChartData.length > 0 && (
                <div className="bg-white rounded-[16px] shadow-[0_8px_24px_rgba(25,48,90,0.06)] p-4 sm:p-6">
                  <h3 className="font-bold text-[#19305a] mb-4 text-sm">Tokens by Class</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={classChartData} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f6fb" />
                      <XAxis dataKey="name" tick={{ fill: "#19305a", fontWeight: 700, fontSize: 12 }} />
                      <YAxis tick={{ fill: "#5a6b8a", fontSize: 11 }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 24px rgba(25,48,90,0.12)" }} />
                      <Bar dataKey="earned" fill="#7cbde8" radius={[6, 6, 0, 0]} name="Earned" />
                      <Bar dataKey="spent" fill="#c74747" radius={[6, 6, 0, 0]} name="Spent" />
                      <Bar dataKey="saved" fill="#f5a623" radius={[6, 6, 0, 0]} name="Saved" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Pie chart - item popularity */}
              {pieData.length > 0 && (
                <div className="bg-white rounded-[16px] shadow-[0_8px_24px_rgba(25,48,90,0.06)] p-4 sm:p-6">
                  <h3 className="font-bold text-[#19305a] mb-4 text-sm">Item Popularity</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={{ stroke: "#5a6b8a" }}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 24px rgba(25,48,90,0.12)" }} />
                      <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Class detail cards */}
            <div className="space-y-3">
              <h3 className="font-bold text-[#19305a] text-sm">Class Breakdown</h3>
              {Object.entries(report).sort(([a],[b]) => a.localeCompare(b)).map(([cls, data]) => {
                const pct = data.summary.total_earned > 0 ? Math.round((data.summary.total_spent / data.summary.total_earned) * 100) : 0;
                const isExp = expandedClass === cls;
                return (
                  <div key={cls} className="bg-white rounded-[16px] shadow-[0_8px_24px_rgba(25,48,90,0.06)] overflow-hidden">
                    <button data-testid={`admin-class-card-${cls}`} onClick={() => setExpandedClass(isExp ? null : cls)}
                      className="w-full p-4 flex items-center justify-between hover:bg-[#f3f6fb] transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[10px] bg-[#19305a] text-white flex items-center justify-center font-black text-sm">{cls}</div>
                        <div className="text-left">
                          <div className="font-bold text-[#19305a] text-sm">{data.summary.student_count} students</div>
                          <div className="flex gap-3 text-xs text-[#5a6b8a]">
                            <span>E: {data.summary.total_earned}</span>
                            <span>S: {data.summary.total_spent}</span>
                            <span className="text-[#f5a623]">Sv: {data.summary.total_saved}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-[#f3f6fb] rounded-full overflow-hidden">
                          <div className="h-full bg-[#7cbde8] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-bold text-[#5a6b8a]">{pct}%</span>
                        {isExp ? <ChevronUp size={16} className="text-[#5a6b8a]" /> : <ChevronDown size={16} className="text-[#5a6b8a]" />}
                      </div>
                    </button>
                    {isExp && (
                      <div className="px-4 pb-4 animate-fade-in">
                        <table className="w-full text-sm">
                          <thead><tr className="text-xs font-bold text-[#5a6b8a] uppercase">
                            <th className="text-left py-2">Student</th><th className="text-right py-2">Earned</th>
                            <th className="text-right py-2">Spent</th><th className="text-right py-2">Saved</th>
                            <th className="text-left py-2 pl-3">Items</th>
                          </tr></thead>
                          <tbody>
                            {Object.entries(data.students).sort(([a],[b]) => a.localeCompare(b)).map(([stu, sd]) => (
                              <tr key={stu} className="border-t border-[#19305a]/5">
                                <td className="py-2 font-bold text-[#19305a]">{stu}</td>
                                <td className="text-right text-[#7cbde8] font-bold">{sd.earned}</td>
                                <td className="text-right text-[#c74747] font-bold">{sd.spent}</td>
                                <td className={`text-right font-bold ${sd.saved > 0 ? "text-[#f5a623]" : "text-[#5a6b8a]"}`}>{sd.saved > 0 && "🐝 "}{sd.saved}</td>
                                <td className="pl-3 text-xs text-[#5a6b8a]">{Object.entries(sd.items).map(([n,c]) => `${n} x${c}`).join(", ")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
              {Object.keys(report).length === 0 && <p className="text-center text-[#5a6b8a] mt-4">No transaction data yet</p>}
            </div>

            {/* Item popularity bar list */}
            {itemReport.length > 0 && (
              <div className="bg-white rounded-[16px] shadow-[0_8px_24px_rgba(25,48,90,0.06)] p-4 sm:p-6">
                <h3 className="font-bold text-[#19305a] mb-4 text-sm">Item Rankings</h3>
                <div className="space-y-2">
                  {itemReport.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-3" data-testid={`admin-item-rank-${i}`}>
                      <span className="w-6 text-center text-xs font-bold text-[#5a6b8a]">#{i+1}</span>
                      <span className="w-32 text-sm font-bold text-[#19305a] truncate">{item.name}</span>
                      <div className="flex-1 h-5 bg-[#f3f6fb] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(item.count / (itemReport[0]?.count || 1)) * 100}%`, background: COLORS[i % COLORS.length] }} />
                      </div>
                      <span className="text-sm font-bold text-[#19305a] w-10 text-right">{item.count}</span>
                      <span className="text-xs text-[#5a6b8a] w-14 text-right">{item.total_cost}t</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STUDENTS TAB ── */}
        {tab === "students" && (
          <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-xl font-bold text-[#19305a]">Students ({totalStudents})</h2>
              <div className="flex items-center gap-2">
                <button data-testid="admin-sync-welltrack-btn" onClick={syncWellTrack}
                  className="flex items-center gap-1 px-4 py-2 rounded-[12px] bg-[#19305a] text-white font-bold text-sm hover:bg-[#254680] transition-all">
                  <RefreshCw size={14} strokeWidth={3} /> Sync from WellTrack
                </button>
                <button data-testid="admin-import-btn" onClick={() => setShowImport(true)}
                  className="flex items-center gap-1 px-4 py-2 rounded-[12px] bg-[#7cbde8] text-[#19305a] font-bold text-sm hover:bg-[#7cbde8]/80 transition-all">
                  <Upload size={14} strokeWidth={3} /> Import CSV
                </button>
              </div>
            </div>
            {Object.keys(students).length === 0 ? (
              <div className="text-center text-[#5a6b8a] mt-12">
                <Users size={48} className="mx-auto mb-3 text-[#19305a]/20" />
                <p className="font-bold text-lg">No students imported yet</p>
                <p className="text-sm">Click "Import Students" to upload a CSV</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(students).sort(([a],[b]) => a.localeCompare(b)).map(([cls, stuList]) => (
                  <div key={cls} className="bg-white rounded-[16px] shadow-[0_8px_24px_rgba(25,48,90,0.06)] p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-[8px] bg-[#19305a] text-white flex items-center justify-center font-black text-xs">{cls}</div>
                      <span className="font-bold text-[#19305a]">{stuList.length} students</span>
                    </div>
                    <div className="space-y-1">
                      {stuList.map(s => (
                        <div key={s} className="px-3 py-1.5 rounded-[8px] bg-[#f3f6fb] text-sm font-medium text-[#19305a]">{s}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <ImportModal open={showImport} onClose={() => setShowImport(false)} api={API} onRefresh={loadAll} />
          </div>
        )}

        {/* ── ITEMS TAB ── */}
        {tab === "items" && (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-xl font-black text-[#19305a] tracking-tight">Shop Items ({items.length})</h2>

            <div className="bg-white rounded-[16px] shadow-[0_4px_20px_rgba(25,48,90,0.06)] p-4 border border-[#19305a]/5">
              <h3 className="text-[10px] font-extrabold text-[#7cbde8] uppercase tracking-[0.2em] mb-3">Add New Item</h3>
              <div className="flex flex-wrap gap-2">
                <input data-testid="admin-item-name" value={newItem.name} onChange={e => setNewItem(p => ({...p, name: e.target.value}))}
                  placeholder="Item name" className="flex-1 min-w-[150px] px-3 py-2 rounded-[10px] border border-[#19305a]/10 bg-[#f3f6fb] text-sm font-bold text-[#19305a] focus:border-[#7cbde8] focus:ring-2 focus:ring-[#7cbde8]/20 outline-none transition-all" />
                <input data-testid="admin-item-cost" type="number" value={newItem.cost} onChange={e => setNewItem(p => ({...p, cost: e.target.value}))}
                  placeholder="Cost" className="w-20 px-3 py-2 rounded-[10px] border border-[#19305a]/10 bg-[#f3f6fb] text-sm font-bold text-[#19305a] focus:border-[#7cbde8] focus:ring-2 focus:ring-[#7cbde8]/20 outline-none transition-all" />
                <select data-testid="admin-item-cat" value={newItem.category} onChange={e => setNewItem(p => ({...p, category: e.target.value}))}
                  className="px-3 py-2 rounded-[10px] border border-[#19305a]/10 bg-[#f3f6fb] text-sm font-bold text-[#19305a] focus:border-[#7cbde8] outline-none">
                  <option value="Menu Item">Menu Item</option>
                  <option value="Tub">Tub</option>
                </select>
                <button data-testid="admin-add-item-btn" onClick={addItem}
                  className="px-4 py-2 rounded-[10px] bg-[#19305a] text-white font-bold text-sm hover:bg-[#254680] transition-all flex items-center gap-1">
                  <Plus size={14} strokeWidth={3} /> Add
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map(item => (
                <div key={item.name} className="bg-white rounded-[14px] shadow-[0_4px_20px_rgba(25,48,90,0.06)] p-4 flex items-center justify-between border border-[#19305a]/5 hover:border-[#7cbde8]/30 transition-all group">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[#19305a] truncate">{item.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-extrabold text-[#f5a623]">{item.cost} tokens</span>
                      <span className="text-[10px] font-bold text-[#5a6b8a] bg-[#f3f6fb] px-2 py-0.5 rounded-full">{item.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button data-testid={`admin-edit-item-${item.name.replace(/\s/g, '-')}`} onClick={() => startEditItem(item)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[#7cbde8] hover:bg-[#7cbde8]/10 transition-all">
                      <Pencil size={14} strokeWidth={3} />
                    </button>
                    <button data-testid={`admin-delete-item-${item.name.replace(/\s/g, '-')}`} onClick={() => deleteItem(item.name)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[#c74747] hover:bg-[#c74747]/10 transition-all">
                      <Trash2 size={14} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Edit Item Modal */}
        {editingItem && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#19305a]/50 backdrop-blur-sm">
            <div data-testid="edit-item-modal" className="bg-white rounded-[20px] shadow-[0_24px_64px_rgba(25,48,90,0.25)] p-6 max-w-sm w-[90vw] border-2 border-[#19305a]/10 animate-bounce-in">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-[#19305a] tracking-tight">Edit Item</h2>
                <button data-testid="edit-item-close" onClick={() => setEditingItem(null)} className="w-7 h-7 rounded-full bg-[#19305a]/5 flex items-center justify-center hover:bg-[#19305a]/10 transition-all">
                  <X size={14} className="text-[#19305a]" strokeWidth={3} />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-extrabold text-[#5a6b8a] uppercase tracking-[0.15em]">Name</label>
                  <input data-testid="edit-item-name" value={editForm.name} onChange={e => setEditForm(p => ({...p, name: e.target.value}))}
                    className="w-full mt-1 px-3 py-2 rounded-[10px] border border-[#19305a]/10 bg-[#f3f6fb] text-sm font-bold text-[#19305a] focus:border-[#7cbde8] focus:ring-2 focus:ring-[#7cbde8]/20 outline-none transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-[#5a6b8a] uppercase tracking-[0.15em]">Cost (tokens)</label>
                  <input data-testid="edit-item-cost" type="number" value={editForm.cost} onChange={e => setEditForm(p => ({...p, cost: e.target.value}))}
                    className="w-full mt-1 px-3 py-2 rounded-[10px] border border-[#19305a]/10 bg-[#f3f6fb] text-sm font-bold text-[#19305a] focus:border-[#7cbde8] focus:ring-2 focus:ring-[#7cbde8]/20 outline-none transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-[#5a6b8a] uppercase tracking-[0.15em]">Category</label>
                  <select data-testid="edit-item-cat" value={editForm.category} onChange={e => setEditForm(p => ({...p, category: e.target.value}))}
                    className="w-full mt-1 px-3 py-2 rounded-[10px] border border-[#19305a]/10 bg-[#f3f6fb] text-sm font-bold text-[#19305a] focus:border-[#7cbde8] outline-none">
                    <option value="Menu Item">Menu Item</option>
                    <option value="Tub">Tub</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setEditingItem(null)}
                  className="flex-1 h-11 rounded-[10px] bg-[#19305a]/5 text-[#19305a] font-bold text-sm hover:bg-[#19305a]/10 transition-all">
                  Cancel
                </button>
                <button data-testid="edit-item-save" onClick={saveEditItem}
                  className="flex-1 h-11 rounded-[10px] bg-[#f5a623] text-[#19305a] font-bold text-sm shadow-[0_3px_0_rgba(200,130,20,1)] hover:brightness-105 active:translate-y-0.5 active:shadow-none transition-all">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── SESSIONS TAB ── */}
        {tab === "sessions" && (
          <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#19305a]">Sessions</h2>
              <button data-testid="admin-new-session-btn" onClick={() => setShowNewSession(!showNewSession)}
                className="flex items-center gap-1 px-4 py-2 rounded-[12px] bg-[#19305a] text-white font-bold text-sm hover:bg-[#254680] transition-all">
                <Plus size={14} strokeWidth={3} /> New Session
              </button>
            </div>

            {showNewSession && (
              <div className="bg-white rounded-[16px] shadow-[0_8px_24px_rgba(25,48,90,0.08)] p-4 flex items-center gap-3 animate-fade-in">
                <input data-testid="admin-session-label-input" value={newSessionLabel} onChange={e => setNewSessionLabel(e.target.value)}
                  placeholder="e.g. Term 1 Week 9" className="flex-1 px-4 py-2 rounded-[12px] border-2 border-[#19305a]/10 bg-[#f3f6fb] text-[#19305a] font-bold focus:border-[#7cbde8] outline-none"
                  onKeyDown={e => e.key === "Enter" && createSession()} />
                <button data-testid="admin-create-session-btn" onClick={createSession}
                  className="px-5 py-2 rounded-[12px] bg-[#f5a623] text-[#19305a] font-bold shadow-[0_4px_0_rgba(200,130,20,1)] hover:brightness-105 active:translate-y-1 active:shadow-none transition-all">
                  Create
                </button>
              </div>
            )}

            {activeSession && (
              <div className="bg-[#f5a623]/10 rounded-[16px] p-4 border-2 border-[#f5a623]/30">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-[#f5a623] uppercase tracking-wider">Active Session</span>
                </div>
                <span className="text-lg font-bold text-[#19305a]">{activeSession.label}</span>
                <span className="text-sm text-[#5a6b8a] ml-2">{activeSession.date}</span>
              </div>
            )}

            <div className="space-y-2">
              {sessions.map(s => (
                <div key={s.label} className={`bg-white rounded-[16px] shadow-[0_8px_24px_rgba(25,48,90,0.06)] p-4 flex items-center justify-between ${s.active ? "ring-2 ring-[#f5a623]" : ""}`}>
                  <div>
                    <span className="font-bold text-[#19305a]">{s.label}</span>
                    <span className="text-sm text-[#5a6b8a] ml-2">{s.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.active ? (
                      <span className="text-xs font-bold text-[#f5a623] bg-[#f5a623]/10 px-3 py-1 rounded-full">Active</span>
                    ) : (
                      <button data-testid={`admin-activate-session-${s.label.replace(/\s/g, '-')}`} onClick={() => switchSession(s.label)}
                        className="text-xs font-bold text-[#7cbde8] bg-[#7cbde8]/10 px-3 py-1 rounded-full hover:bg-[#7cbde8]/20 transition-all">
                        Activate
                      </button>
                    )}
                    <button data-testid={`admin-delete-session-${s.label.replace(/\s/g, '-')}`} onClick={() => deleteSession(s.label)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[#c74747] hover:bg-[#c74747]/10 transition-all">
                      <Trash2 size={14} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              ))}
              {sessions.length === 0 && <p className="text-center text-[#5a6b8a] mt-8">No sessions yet. Create one above.</p>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function AdminPage({ user, onLogout }) {
  return (
    <>
      <Toaster position="top-center" richColors />
      <AdminPanel user={user} onLogout={onLogout} />
    </>
  );
}

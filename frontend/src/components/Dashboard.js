import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Trophy, ShoppingCart, ChevronDown, ChevronUp, Download, Plus, Upload } from "lucide-react";
import ImportModal from "@/components/ImportModal";

export default function Dashboard({ sessions, activeSession, api, onRefresh }) {
  const [selectedSession, setSelectedSession] = useState("all");
  const [report, setReport] = useState({});
  const [itemReport, setItemReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedClass, setExpandedClass] = useState(null);
  const [showNewSession, setShowNewSession] = useState(false);
  const [newSessionLabel, setNewSessionLabel] = useState("");
  const [showImport, setShowImport] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const [rep, items] = await Promise.all([
        axios.get(`${api}/report?session=${encodeURIComponent(selectedSession)}`),
        axios.get(`${api}/report/items?session=${encodeURIComponent(selectedSession)}`),
      ]);
      setReport(rep.data);
      setItemReport(items.data);
    } catch (e) {
      toast.error("Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [api, selectedSession]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const totalEarned = Object.values(report).reduce((s, c) => s + c.summary.total_earned, 0);
  const totalSpent = Object.values(report).reduce((s, c) => s + c.summary.total_spent, 0);
  const totalSaved = Object.values(report).reduce((s, c) => s + c.summary.total_saved, 0);
  const maxItemCount = itemReport.length > 0 ? itemReport[0].count : 1;

  const createSession = async () => {
    if (!newSessionLabel.trim()) { toast.error("Enter a session label"); return; }
    try {
      await axios.post(`${api}/sessions`, { label: newSessionLabel.trim() });
      toast.success("Session created");
      setNewSessionLabel("");
      setShowNewSession(false);
      onRefresh();
    } catch (e) {
      toast.error("Failed to create session");
    }
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

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6" data-testid="dashboard-view">
      {/* Top controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-sm font-bold text-[#19305a]">Session:</label>
          <select
            data-testid="session-select"
            value={selectedSession}
            onChange={e => setSelectedSession(e.target.value)}
            className="px-3 py-2 rounded-[12px] border-2 border-[#19305a]/10 bg-white text-[#19305a] font-bold text-sm focus:border-[#7cbde8] outline-none"
          >
            <option value="all">All Time</option>
            {sessions.map(s => (
              <option key={s.label} value={s.label}>{s.label}{s.active ? " (Active)" : ""}</option>
            ))}
          </select>
        </div>

        <button data-testid="new-session-btn" onClick={() => setShowNewSession(!showNewSession)}
          className="flex items-center gap-1 px-3 py-2 rounded-[12px] bg-[#19305a] text-white font-bold text-sm hover:bg-[#254680] transition-all">
          <Plus size={14} strokeWidth={3} /> New Session
        </button>

        <button data-testid="import-students-btn" onClick={() => setShowImport(true)}
          className="flex items-center gap-1 px-3 py-2 rounded-[12px] bg-[#7cbde8] text-[#19305a] font-bold text-sm hover:bg-[#7cbde8]/80 transition-all">
          <Upload size={14} strokeWidth={3} /> Import Students
        </button>

        <button data-testid="export-csv-btn" onClick={exportCSV}
          className="flex items-center gap-1 px-3 py-2 rounded-[12px] bg-[#f5a623]/10 text-[#f5a623] font-bold text-sm hover:bg-[#f5a623]/20 transition-all ml-auto">
          <Download size={14} strokeWidth={3} /> Export CSV
        </button>
      </div>

      {/* New session form */}
      {showNewSession && (
        <div className="bg-white rounded-[16px] shadow-[0_8px_24px_rgba(25,48,90,0.08)] p-4 mb-6 flex items-center gap-3 animate-fade-in">
          <input
            data-testid="new-session-input"
            value={newSessionLabel}
            onChange={e => setNewSessionLabel(e.target.value)}
            placeholder="e.g. Term 1 Week 8"
            className="flex-1 px-4 py-2 rounded-[12px] border-2 border-[#19305a]/10 bg-[#f3f6fb] text-[#19305a] font-bold focus:border-[#7cbde8] outline-none"
            onKeyDown={e => e.key === "Enter" && createSession()}
          />
          <button data-testid="create-session-confirm-btn" onClick={createSession}
            className="px-4 py-2 rounded-[12px] bg-[#f5a623] text-[#19305a] font-bold shadow-[0_4px_0_rgba(200,130,20,1)] hover:brightness-105 active:translate-y-1 active:shadow-none transition-all">
            Create
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-3 border-[#7cbde8] border-t-[#f5a623] rounded-full" style={{ animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
            <div data-testid="stat-total-earned" className="bg-white rounded-[16px] shadow-[0_8px_24px_rgba(25,48,90,0.06)] p-4 flex flex-col items-center text-center">
              <Trophy size={24} className="text-[#7cbde8] mb-1" strokeWidth={3} />
              <span className="text-xs font-bold text-[#5a6b8a] uppercase tracking-wider">Total Earned</span>
              <span className="text-2xl sm:text-3xl font-black text-[#19305a]">{totalEarned}</span>
            </div>
            <div data-testid="stat-total-spent" className="bg-white rounded-[16px] shadow-[0_8px_24px_rgba(25,48,90,0.06)] p-4 flex flex-col items-center text-center">
              <ShoppingCart size={24} className="text-[#c74747] mb-1" strokeWidth={3} />
              <span className="text-xs font-bold text-[#5a6b8a] uppercase tracking-wider">Total Spent</span>
              <span className="text-2xl sm:text-3xl font-black text-[#19305a]">{totalSpent}</span>
            </div>
            <div data-testid="stat-total-saved" className="bg-white rounded-[16px] shadow-[0_8px_24px_rgba(25,48,90,0.06)] p-4 flex flex-col items-center text-center border-2 border-[#f5a623]/20">
              <span className="text-xl mb-1">🐝</span>
              <span className="text-xs font-bold text-[#5a6b8a] uppercase tracking-wider">Total Saved</span>
              <span className="text-2xl sm:text-3xl font-black text-[#f5a623]">{totalSaved}</span>
            </div>
          </div>

          {/* Class cards */}
          <div className="space-y-3 mb-6">
            {Object.entries(report).sort(([a],[b]) => a.localeCompare(b)).map(([cls, data]) => {
              const pct = data.summary.total_earned > 0 ? Math.round((data.summary.total_spent / data.summary.total_earned) * 100) : 0;
              const isExpanded = expandedClass === cls;
              return (
                <div key={cls} className="bg-white rounded-[16px] shadow-[0_8px_24px_rgba(25,48,90,0.06)] overflow-hidden">
                  <button
                    data-testid={`class-card-${cls}`}
                    onClick={() => setExpandedClass(isExpanded ? null : cls)}
                    className="w-full p-4 flex items-center justify-between hover:bg-[#f3f6fb] transition-all"
                  >
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
                        <div className="h-full bg-[#7cbde8] rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-bold text-[#5a6b8a]">{pct}%</span>
                      {isExpanded ? <ChevronUp size={16} className="text-[#5a6b8a]" /> : <ChevronDown size={16} className="text-[#5a6b8a]" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 animate-fade-in">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs font-bold text-[#5a6b8a] uppercase">
                            <th className="text-left py-2">Student</th>
                            <th className="text-right py-2">Earned</th>
                            <th className="text-right py-2">Spent</th>
                            <th className="text-right py-2">Saved</th>
                            <th className="text-left py-2 pl-3">Items</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(data.students).sort(([a],[b]) => a.localeCompare(b)).map(([stu, sdata]) => (
                            <tr key={stu} className="border-t border-[#19305a]/5">
                              <td className="py-2 font-bold text-[#19305a]">{stu}</td>
                              <td className="text-right text-[#7cbde8] font-bold">{sdata.earned}</td>
                              <td className="text-right text-[#c74747] font-bold">{sdata.spent}</td>
                              <td className={`text-right font-bold ${sdata.saved > 0 ? "text-[#f5a623]" : "text-[#5a6b8a]"}`}>
                                {sdata.saved > 0 && "🐝 "}{sdata.saved}
                              </td>
                              <td className="pl-3 text-xs text-[#5a6b8a]">
                                {Object.entries(sdata.items).map(([n,c]) => `${n} x${c}`).join(", ")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
            {Object.keys(report).length === 0 && (
              <p className="text-center text-[#5a6b8a] mt-8">No transaction data yet</p>
            )}
          </div>

          {/* Item popularity */}
          {itemReport.length > 0 && (
            <div className="bg-white rounded-[16px] shadow-[0_8px_24px_rgba(25,48,90,0.06)] p-4 sm:p-6">
              <h3 className="font-bold text-[#19305a] mb-4">Item Popularity</h3>
              <div className="space-y-3">
                {itemReport.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-3" data-testid={`item-pop-${item.name.replace(/\s/g, '-')}`}>
                    <span className="w-6 text-center text-xs font-bold text-[#5a6b8a]">#{i+1}</span>
                    <span className="w-32 text-sm font-bold text-[#19305a] truncate">{item.name}</span>
                    <div className="flex-1 h-6 bg-[#f3f6fb] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(item.count / maxItemCount) * 100}%`,
                          background: i === 0 ? "#f5a623" : i === 1 ? "#7cbde8" : "#19305a"
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold text-[#19305a] w-12 text-right">{item.count}</span>
                    <span className="text-xs text-[#5a6b8a] w-16 text-right">{item.total_cost}t</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <ImportModal open={showImport} onClose={() => setShowImport(false)} api={api} onRefresh={onRefresh} />
    </div>
  );
}

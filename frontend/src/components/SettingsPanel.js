import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { X, Trash2, Plus, RefreshCw, Calendar } from "lucide-react";

export default function SettingsPanel({ open, onClose, items, sessions, activeSession, api, onRefresh }) {
  const [newItem, setNewItem] = useState({ name: "", cost: "", category: "Menu Item" });
  const [adding, setAdding] = useState(false);

  const addItem = async () => {
    if (!newItem.name.trim() || !newItem.cost) { toast.error("Name and cost required"); return; }
    setAdding(true);
    try {
      await axios.post(`${api}/items`, { name: newItem.name.trim(), cost: parseInt(newItem.cost, 10), category: newItem.category });
      toast.success("Item added");
      setNewItem({ name: "", cost: "", category: "Menu Item" });
      onRefresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to add item");
    } finally {
      setAdding(false);
    }
  };

  const deleteItem = async (name) => {
    try {
      await axios.delete(`${api}/items/${encodeURIComponent(name)}`);
      toast.success("Item deleted");
      onRefresh();
    } catch (e) {
      toast.error("Failed to delete item");
    }
  };

  const setActiveSession = async (label) => {
    try {
      await axios.post(`${api}/sessions`, { label });
      toast.success("Session activated: " + label);
      onRefresh();
    } catch (e) {
      toast.error("Failed to set session");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="settings-panel">
      <div className="absolute inset-0 bg-[#19305a]/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-fade-in" style={{ animationDuration: '0.2s' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#19305a]/5 shrink-0 bg-[#19305a]">
          <h2 className="text-lg font-bold text-white">Settings</h2>
          <button data-testid="settings-close-btn" onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
            <X size={16} className="text-white" strokeWidth={3} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Active session */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.15em] text-[#7cbde8] mb-3">
              <Calendar size={14} strokeWidth={3} /> Active Session
            </h3>
            {activeSession ? (
              <div className="bg-[#f5a623]/10 rounded-[12px] p-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#19305a]">{activeSession.label}</span>
                  <span className="text-xs text-[#5a6b8a] ml-2">{activeSession.date}</span>
                </div>
                <span className="text-xs font-bold text-[#f5a623] bg-[#f5a623]/10 px-2 py-1 rounded-full">Active</span>
              </div>
            ) : (
              <p className="text-[#5a6b8a] text-sm">No active session. Create one from the Dashboard.</p>
            )}
            {sessions.filter(s => !s.active).length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-[#5a6b8a] font-bold">Switch to:</p>
                {sessions.filter(s => !s.active).slice(0, 5).map(s => (
                  <button key={s.label} onClick={() => setActiveSession(s.label)}
                    className="w-full text-left px-3 py-2 rounded-[8px] text-sm text-[#19305a] hover:bg-[#f3f6fb] transition-all">
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Item management */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.15em] text-[#7cbde8] mb-3">
              Items ({items.length})
            </h3>

            {/* Add item form */}
            <div className="bg-[#f3f6fb] rounded-[12px] p-3 mb-3 space-y-2">
              <div className="flex gap-2">
                <input
                  data-testid="add-item-name"
                  value={newItem.name}
                  onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
                  placeholder="Item name"
                  className="flex-1 px-3 py-2 rounded-[8px] border border-[#19305a]/10 bg-white text-sm text-[#19305a] font-bold focus:border-[#7cbde8] outline-none"
                />
                <input
                  data-testid="add-item-cost"
                  type="number"
                  value={newItem.cost}
                  onChange={e => setNewItem(p => ({ ...p, cost: e.target.value }))}
                  placeholder="Cost"
                  className="w-20 px-3 py-2 rounded-[8px] border border-[#19305a]/10 bg-white text-sm text-[#19305a] font-bold focus:border-[#7cbde8] outline-none"
                />
              </div>
              <div className="flex gap-2">
                <select
                  data-testid="add-item-category"
                  value={newItem.category}
                  onChange={e => setNewItem(p => ({ ...p, category: e.target.value }))}
                  className="flex-1 px-3 py-2 rounded-[8px] border border-[#19305a]/10 bg-white text-sm text-[#19305a] font-bold focus:border-[#7cbde8] outline-none"
                >
                  <option value="Menu Item">Menu Item</option>
                  <option value="Tub">Tub</option>
                </select>
                <button data-testid="add-item-btn" onClick={addItem} disabled={adding}
                  className="px-4 py-2 rounded-[8px] bg-[#19305a] text-white font-bold text-sm hover:bg-[#254680] transition-all disabled:opacity-50">
                  <Plus size={14} strokeWidth={3} />
                </button>
              </div>
            </div>

            {/* Items list */}
            <div className="space-y-1">
              {items.map(item => (
                <div key={item.name} className="flex items-center justify-between px-3 py-2 rounded-[8px] hover:bg-[#f3f6fb] transition-all group">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#19305a]">{item.name}</span>
                    <span className="text-xs text-[#f5a623] font-bold">{item.cost}t</span>
                    <span className="text-xs text-[#5a6b8a] bg-[#f3f6fb] px-2 py-0.5 rounded-full">{item.category}</span>
                  </div>
                  <button data-testid={`delete-item-${item.name.replace(/\s/g, '-')}`} onClick={() => deleteItem(item.name)}
                    className="w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 text-[#c74747] hover:bg-[#c74747]/10 transition-all">
                    <Trash2 size={12} strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Reload */}
          <section>
            <button data-testid="reload-data-btn" onClick={() => { onRefresh(); toast.success("Data refreshed"); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[12px] bg-[#19305a]/5 text-[#19305a] font-bold text-sm hover:bg-[#19305a]/10 transition-all">
              <RefreshCw size={14} strokeWidth={3} /> Reload Data
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

import { ShoppingCart, BarChart3, Settings } from "lucide-react";
import MpsLogo from "@/components/MpsLogo";

export default function Header({ view, setView, onSettings, activeSession }) {
  return (
    <header data-testid="app-header" className="bg-[#19305a] text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-lg" style={{ minHeight: 56 }}>
      <div className="flex items-center gap-3">
        <MpsLogo className="h-8" fill="#fff" />
        <span className="text-lg font-bold tracking-tight hidden sm:inline">Bee Shop Kiosk</span>
      </div>

      <div className="flex items-center gap-2">
        {activeSession && (
          <span data-testid="active-session-badge" className="bg-[#7cbde8]/20 text-[#7cbde8] text-xs font-bold px-3 py-1 rounded-full mr-2 hidden sm:inline-flex">
            {activeSession.label}
          </span>
        )}

        <button
          data-testid="nav-shop-btn"
          onClick={() => setView("shop")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${
            view === "shop"
              ? "bg-[#f5a623] text-[#19305a]"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          <ShoppingCart size={18} strokeWidth={3} />
          <span className="hidden sm:inline">Shop</span>
        </button>

        <button
          data-testid="nav-dashboard-btn"
          onClick={() => setView("dashboard")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${
            view === "dashboard"
              ? "bg-[#f5a623] text-[#19305a]"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          <BarChart3 size={18} strokeWidth={3} />
          <span className="hidden sm:inline">Dashboard</span>
        </button>

        <button
          data-testid="settings-btn"
          onClick={onSettings}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
        >
          <Settings size={18} strokeWidth={3} />
        </button>
      </div>
    </header>
  );
}

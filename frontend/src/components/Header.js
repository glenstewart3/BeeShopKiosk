import { LogOut } from "lucide-react";
import MpsLogo from "@/components/MpsLogo";

export default function Header({ activeSession, user, onLogout }) {
  return (
    <header data-testid="app-header" className="bg-[#19305a] text-white px-4 py-2 flex items-center justify-between shrink-0 shadow-lg" style={{ minHeight: 48 }}>
      <div className="flex items-center gap-3">
        <MpsLogo className="h-8" fill="#fff" />
        <span className="text-lg font-bold tracking-tight hidden sm:inline">Bee Shop Kiosk</span>
      </div>

      <div className="flex items-center gap-2">
        {activeSession && (
          <span data-testid="active-session-badge" className="bg-[#7cbde8]/20 text-[#7cbde8] text-xs font-bold px-3 py-1 rounded-full">
            {activeSession.label}
          </span>
        )}
        {user && (
          <>
            {user.picture && <img src={user.picture} alt="" className="w-6 h-6 rounded-full border border-white/20" referrerPolicy="no-referrer" />}
            <span className="text-xs font-bold text-white/60 hidden sm:inline">{user.name}</span>
            <button data-testid="kiosk-logout-btn" onClick={onLogout} className="px-2 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all" title="Logout">
              <LogOut size={14} strokeWidth={3} />
            </button>
          </>
        )}
      </div>
    </header>
  );
}

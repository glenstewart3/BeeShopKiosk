import MpsLogo from "@/components/MpsLogo";

export default function Header({ activeSession }) {
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
      </div>
    </header>
  );
}

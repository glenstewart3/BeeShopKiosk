import MpsLogo from "@/components/MpsLogo";

export default function SplashScreen() {
  return (
    <div data-testid="splash-screen" className="fixed inset-0 z-50 flex items-center justify-center bg-[#19305a]">
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <MpsLogo className="w-80 max-w-[80vw]" fill="#fff" />
        <h2 className="text-white text-2xl font-bold tracking-tight">Bee Shop Kiosk</h2>
        <p className="text-[#7cbde8] text-lg font-medium">Loading classes & items...</p>
        <div className="w-10 h-10 border-4 border-[#7cbde8] border-t-[#f5a623] rounded-full" style={{ animation: 'spin 0.8s linear infinite' }} />
      </div>
    </div>
  );
}

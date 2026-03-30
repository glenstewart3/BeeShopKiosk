import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { RotateCcw, Delete, Check, X, ShoppingCart, ArrowLeft } from "lucide-react";

function StepIndicator({ step }) {
  const steps = [
    { num: 1, label: "Class" },
    { num: 2, label: "Student" },
    { num: 3, label: "Tokens" },
    { num: 4, label: "Shop" },
  ];
  return (
    <div data-testid="step-indicator" className="flex items-center gap-1">
      {steps.map((s, i) => (
        <div key={s.num} className="flex items-center gap-1">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold tracking-wide transition-all duration-300 ${
            step === s.num
              ? "bg-[#f5a623] text-[#19305a] shadow-[0_2px_8px_rgba(245,166,35,0.4)] scale-105"
              : step > s.num
                ? "bg-[#19305a] text-white"
                : "bg-[#19305a]/8 text-[#19305a]/35"
          }`}>
            <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black ${
              step === s.num ? "bg-[#19305a]/15" : step > s.num ? "bg-white/20" : "bg-[#19305a]/8"
            }`}>{step > s.num ? "✓" : s.num}</span>
            <span className="hidden sm:inline">{s.label}</span>
          </div>
          {i < 3 && <div className={`w-6 h-[2px] rounded-full transition-all duration-300 ${step > s.num ? "bg-[#19305a]" : "bg-[#19305a]/10"}`} />}
        </div>
      ))}
    </div>
  );
}

function Breadcrumb({ items, onBack }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <button onClick={onBack} className="flex items-center gap-1 text-[#7cbde8] font-bold text-sm hover:text-[#19305a] transition-colors">
        <ArrowLeft size={14} strokeWidth={3} /> Back
      </button>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2">
          <span className="text-[#19305a]/20">/</span>
          <span className={`font-bold text-sm ${i === items.length - 1 ? "text-[#7cbde8]" : "text-[#19305a]"}`}>{item}</span>
        </span>
      ))}
    </div>
  );
}

export default function ShopView({ students, items, activeSession, usedPairs, onSave, onSkip }) {
  const [step, setStep] = useState(1);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [earned, setEarned] = useState(0);
  const [earnedBuffer, setEarnedBuffer] = useState("");
  const [cart, setCart] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const usedSet = useMemo(() => {
    const s = new Set();
    (usedPairs || []).forEach(p => s.add(`${p.class}|${p.student}`));
    return s;
  }, [usedPairs]);

  const classes = useMemo(() => {
    return Object.keys(students).sort((a, b) => {
      const na = parseInt(a), nb = parseInt(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
  }, [students]);

  const remainingStudents = useCallback((cls) => {
    return (students[cls] || []).filter(s => !usedSet.has(`${cls}|${s}`));
  }, [students, usedSet]);

  const spent = useMemo(() => cart.reduce((sum, i) => sum + i.cost, 0), [cart]);
  const saved = earned - spent;
  const remaining = earned - spent;

  const groupedItems = useMemo(() => {
    const groups = {};
    items.forEach(item => {
      const cat = item.category || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [items]);

  const resetAll = () => {
    setStep(1); setSelectedClass(null); setSelectedStudent(null);
    setEarned(0); setEarnedBuffer(""); setCart([]); setShowConfirm(false);
  };

  const handleClassSelect = (cls) => { setSelectedClass(cls); setStep(2); };
  const handleStudentSelect = (stu) => { setSelectedStudent(stu); setEarnedBuffer(""); setEarned(0); setCart([]); setStep(3); };

  const keypadInput = (digit) => { if (earnedBuffer.length < 3) setEarnedBuffer(prev => prev + digit); };
  const keypadBack = () => setEarnedBuffer(prev => prev.slice(0, -1));
  const keypadClear = () => setEarnedBuffer("");
  const keypadAdd = (n) => { setEarnedBuffer(String(parseInt(earnedBuffer || "0", 10) + n)); };
  const keypadSet = () => {
    const val = parseInt(earnedBuffer || "0", 10);
    if (val <= 0) { toast.error("Enter tokens earned"); return; }
    setEarned(val); setStep(4);
  };

  const addToCart = (item) => { if (remaining - item.cost < 0) return; setCart(prev => [...prev, item]); };
  const removeFromCart = (idx) => setCart(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!activeSession) { toast.error("No active session. Create one in Settings."); return; }
    setSaving(true);
    try {
      await onSave({
        class: selectedClass, student: selectedStudent, earned, spent,
        items: cart.map(i => ({ name: i.name, cost: i.cost })),
        session_label: activeSession.label,
      });
      setSaving(false); setShowConfirm(false); setShowSuccess(true);
      setTimeout(() => { setShowSuccess(false); resetAll(); }, 1500);
    } catch (e) {
      setSaving(false);
      toast.error("Save failed: " + (e.response?.data?.detail || e.message));
    }
  };

  if (!activeSession) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="text-5xl">🐝</div>
        <h2 className="text-2xl font-black text-[#19305a]">No Active Session</h2>
        <p className="text-[#5a6b8a] text-center max-w-sm">Go to <span className="font-bold text-[#19305a]">/admin</span> to create a new session before starting the shop.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" data-testid="shop-view">
      {/* Top bar */}
      <div className="px-3 py-2 flex items-center justify-between bg-white border-b border-[#19305a]/8 shrink-0">
        <StepIndicator step={step} />
        <button data-testid="reset-btn" onClick={resetAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#19305a]/5 text-[#19305a] font-bold text-xs hover:bg-[#c74747]/10 hover:text-[#c74747] transition-all">
          <RotateCcw size={13} strokeWidth={3} /> Reset
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Step 1 - Class */}
        {step === 1 && (
          <div className="flex-1 overflow-y-auto p-4 pt-6 sm:p-5 sm:pt-8 animate-fade-in" data-testid="step-class">
            <h2 className="text-lg font-black text-[#19305a] mb-4 tracking-tight">Select a Class</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {classes.map(cls => {
                const rem = remainingStudents(cls).length;
                return (
                  <button key={cls} data-testid={`class-btn-${cls}`} onClick={() => handleClassSelect(cls)} disabled={rem === 0}
                    className={`relative min-h-[64px] rounded-[14px] font-black text-2xl transition-all duration-200 flex flex-col items-center justify-center gap-0.5 ${
                      rem === 0
                        ? "bg-[#19305a]/4 text-[#19305a]/20 cursor-not-allowed"
                        : "bg-white text-[#19305a] shadow-[0_4px_20px_rgba(25,48,90,0.07)] hover:shadow-[0_8px_32px_rgba(25,48,90,0.14)] hover:-translate-y-1 active:translate-y-0 active:shadow-[0_2px_8px_rgba(25,48,90,0.1)] border border-[#19305a]/6 hover:border-[#7cbde8]"
                    }`}>
                    {cls}
                    <span className={`text-[10px] font-extrabold uppercase tracking-widest ${
                      rem === 0 ? "text-[#19305a]/20" : "bg-[#7cbde8]/12 text-[#7cbde8]"
                    }`}>
                      {rem} remaining
                    </span>
                  </button>
                );
              })}
            </div>
            {classes.length === 0 && (
              <div className="flex flex-col items-center justify-center mt-20 gap-3">
                <div className="text-4xl">🐝</div>
                <p className="text-lg font-bold text-[#19305a]">No students imported yet</p>
                <p className="text-sm text-[#5a6b8a]">Go to /admin to import students</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2 - Student */}
        {step === 2 && selectedClass && (
          <div className="flex-1 overflow-y-auto p-4 pt-6 sm:p-5 sm:pt-8 animate-fade-in" data-testid="step-student">
            <Breadcrumb items={[selectedClass]} onBack={() => setStep(1)} />
            <h2 className="text-lg font-black text-[#19305a] mb-4 tracking-tight">Select a Student</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {remainingStudents(selectedClass).map(stu => (
                <div key={stu} className="relative">
                  <button data-testid={`student-btn-${stu.replace(/\s/g, '-')}`} onClick={() => handleStudentSelect(stu)}
                    className="w-full min-h-[60px] rounded-[14px] bg-white text-[#19305a] font-bold text-sm shadow-[0_4px_20px_rgba(25,48,90,0.07)] hover:shadow-[0_8px_32px_rgba(25,48,90,0.14)] hover:-translate-y-1 active:translate-y-0 transition-all duration-200 border border-[#19305a]/6 hover:border-[#7cbde8] px-3">
                    {stu}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 - Tokens Numpad */}
        {step === 3 && (
          <div className="flex-1 flex flex-col items-center p-3 pt-4 animate-fade-in" data-testid="step-tokens">
            <div className="w-full max-w-md">
              <Breadcrumb items={[selectedClass, selectedStudent]} onBack={() => setStep(2)} />
            </div>
            <div className="bg-white rounded-[16px] shadow-[0_4px_24px_rgba(25,48,90,0.08)] p-4 w-full max-w-md flex flex-col border border-[#19305a]/5">
              <h2 className="text-xs font-extrabold text-[#5a6b8a] uppercase tracking-[0.15em] mb-1">Tokens Earned</h2>
              <div data-testid="earned-display" className="text-center text-5xl font-black text-[#19305a] mb-3 min-h-[60px] flex items-center justify-center tabular-nums">
                {earnedBuffer || "0"}
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[1,2,3,4,5,6,7,8,9].map(d => (
                  <button key={d} data-testid={`numpad-btn-${d}`} onClick={() => keypadInput(String(d))}
                    className="h-12 text-xl font-black rounded-[10px] bg-[#f3f6fb] text-[#19305a] hover:bg-[#7cbde8] hover:text-white active:scale-[0.96] transition-all duration-150 flex items-center justify-center border border-transparent hover:border-[#7cbde8]">
                    {d}
                  </button>
                ))}
                <button data-testid="numpad-btn-clear" onClick={keypadClear}
                  className="h-12 text-xs font-extrabold rounded-[10px] bg-[#c74747]/8 text-[#c74747] hover:bg-[#c74747] hover:text-white active:scale-[0.96] transition-all duration-150">
                  CLEAR
                </button>
                <button data-testid="numpad-btn-0" onClick={() => keypadInput("0")}
                  className="h-12 text-xl font-black rounded-[10px] bg-[#f3f6fb] text-[#19305a] hover:bg-[#7cbde8] hover:text-white active:scale-[0.96] transition-all duration-150 flex items-center justify-center border border-transparent hover:border-[#7cbde8]">
                  0
                </button>
                <button data-testid="numpad-btn-back" onClick={keypadBack}
                  className="h-12 rounded-[10px] bg-[#f3f6fb] text-[#19305a] hover:bg-[#19305a]/10 active:scale-[0.96] transition-all duration-150 flex items-center justify-center">
                  <Delete size={20} strokeWidth={3} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button data-testid="numpad-add-5" onClick={() => keypadAdd(5)}
                  className="h-12 text-lg font-bold rounded-[10px] bg-[#7cbde8]/10 text-[#7cbde8] hover:bg-[#7cbde8] hover:text-white active:scale-[0.96] transition-all duration-150">
                  +5
                </button>
                <button data-testid="numpad-add-10" onClick={() => keypadAdd(10)}
                  className="h-12 text-lg font-bold rounded-[10px] bg-[#7cbde8]/10 text-[#7cbde8] hover:bg-[#7cbde8] hover:text-white active:scale-[0.96] transition-all duration-150">
                  +10
                </button>
              </div>
              <button data-testid="set-tokens-btn" onClick={keypadSet}
                className="w-full h-12 text-lg font-bold rounded-[12px] bg-[#f5a623] text-[#19305a] shadow-[0_4px_0_rgba(200,130,20,1)] hover:brightness-105 active:translate-y-1 active:shadow-none transition-all duration-150">
                Set Tokens &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Step 4 - Shop */}
        {step === 4 && (
          <div className="flex-1 flex overflow-hidden animate-fade-in" data-testid="step-shop">
            {/* Items panel */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 border-r border-[#19305a]/6">
              <Breadcrumb items={[selectedClass, selectedStudent]} onBack={() => { setStep(3); setCart([]); }} />

              {Object.entries(groupedItems).map(([cat, catItems]) => (
                <div key={cat} className="mb-4">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#7cbde8] mb-2 pl-1">{cat}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {catItems.map(item => {
                      const disabled = item.cost > remaining;
                      return (
                        <button key={item.name} data-testid={`item-btn-${item.name.replace(/\s/g, '-')}`} onClick={() => addToCart(item)} disabled={disabled}
                          className={`min-h-[52px] rounded-[10px] px-3 py-2 font-bold text-sm transition-all duration-150 flex flex-col items-center justify-center gap-0.5 ${
                            disabled
                              ? "bg-[#19305a]/3 text-[#19305a]/18 cursor-not-allowed"
                              : "bg-white text-[#19305a] shadow-[0_2px_12px_rgba(25,48,90,0.06)] hover:shadow-[0_6px_20px_rgba(25,48,90,0.12)] hover:-translate-y-0.5 active:translate-y-0 border border-[#19305a]/6 hover:border-[#f5a623]"
                          }`}>
                          <span className="truncate max-w-full text-xs">{item.name}</span>
                          <span className={`text-[10px] font-extrabold ${disabled ? "text-[#19305a]/15" : "text-[#f5a623]"}`}>{item.cost} tokens</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Cart panel */}
            <div className="w-64 md:w-72 flex flex-col bg-white shrink-0 border-l border-[#19305a]/5" data-testid="cart-panel">
              <div className="p-3 border-b border-[#19305a]/6">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart size={16} className="text-[#19305a]" strokeWidth={3} />
                  <h3 className="font-black text-[#19305a] text-sm tracking-tight">Cart</h3>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#7cbde8]/10 text-[#7cbde8] text-[10px] font-extrabold">
                    Earned {earned}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#c74747]/10 text-[#c74747] text-[10px] font-extrabold">
                    Spent {spent}
                  </span>
                  <span data-testid="saved-pill" className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${saved > 0 ? "bg-[#f5a623]/15 text-[#f5a623]" : "bg-[#19305a]/5 text-[#19305a]/30"}`}>
                    {saved > 0 && "🐝 "}Saved {saved}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                {cart.length === 0 ? (
                  <p className="text-[#5a6b8a]/50 text-xs text-center mt-6 font-bold">Tap items to add</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {cart.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-[#f3f6fb] rounded-[8px] px-2.5 py-1.5">
                        <div>
                          <span className="text-xs font-bold text-[#19305a]">{item.name}</span>
                          <span className="text-[10px] text-[#f5a623] font-bold ml-1.5">{item.cost}t</span>
                        </div>
                        <button data-testid={`remove-cart-${idx}`} onClick={() => removeFromCart(idx)} className="w-5 h-5 rounded-full bg-[#c74747]/10 text-[#c74747] flex items-center justify-center hover:bg-[#c74747] hover:text-white transition-all">
                          <X size={10} strokeWidth={3} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-[#19305a]/6">
                <button data-testid="save-transaction-btn" onClick={() => setShowConfirm(true)}
                  className="w-full h-11 rounded-[10px] bg-[#f5a623] text-[#19305a] font-bold text-sm shadow-[0_3px_0_rgba(200,130,20,1)] hover:brightness-105 active:translate-y-0.5 active:shadow-none transition-all duration-150">
                  Save Transaction
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#19305a]/50 backdrop-blur-sm" data-testid="confirm-modal">
          <div className="bg-white rounded-[20px] shadow-[0_24px_64px_rgba(25,48,90,0.25)] p-6 max-w-md w-[90vw] border-2 border-[#19305a]/10 animate-bounce-in">
            <h2 className="text-lg font-black text-[#19305a] mb-4 text-center tracking-tight">Confirm Transaction</h2>
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between"><span className="text-[#5a6b8a]">Student</span><span className="font-bold">{selectedStudent}</span></div>
              <div className="flex justify-between"><span className="text-[#5a6b8a]">Class</span><span className="font-bold">{selectedClass}</span></div>
              <div className="flex justify-between"><span className="text-[#5a6b8a]">Earned</span><span className="font-bold text-[#7cbde8]">{earned}</span></div>
              <div className="flex justify-between"><span className="text-[#5a6b8a]">Spent</span><span className="font-bold text-[#c74747]">{spent}</span></div>
              <div className="flex justify-between border-t border-[#19305a]/5 pt-2">
                <span className="text-[#5a6b8a] font-bold">Saved</span>
                <span className={`font-black text-base ${saved > 0 ? "text-[#f5a623]" : ""}`}>{saved > 0 && "🐝 "}{saved}</span>
              </div>
            </div>
            {cart.length > 0 && (
              <div className="bg-[#f3f6fb] rounded-[10px] p-3 mb-4 max-h-28 overflow-y-auto">
                {cart.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs py-0.5">
                    <span className="text-[#19305a]">{item.name}</span>
                    <span className="text-[#f5a623] font-bold">{item.cost}t</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-3">
              <button data-testid="confirm-cancel-btn" onClick={() => setShowConfirm(false)}
                className="flex-1 h-11 rounded-[10px] bg-[#19305a]/5 text-[#19305a] font-bold text-sm hover:bg-[#19305a]/10 transition-all">
                Cancel
              </button>
              <button data-testid="confirm-save-btn" onClick={handleSave}
                className="flex-1 h-11 rounded-[10px] bg-[#f5a623] text-[#19305a] font-bold text-sm shadow-[0_3px_0_rgba(200,130,20,1)] hover:brightness-105 active:translate-y-0.5 active:shadow-none transition-all">
                {saving ? "Saving..." : "Confirm & Save 🐝"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saving Overlay */}
      {saving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#19305a]/70 backdrop-blur-sm" data-testid="saving-overlay">
          <div className="flex flex-col items-center gap-4 animate-bounce-in">
            <div className="w-12 h-12 border-4 border-white/30 border-t-[#f5a623] rounded-full" style={{ animation: 'spin 0.8s linear infinite' }} />
            <p className="text-white text-lg font-bold">Saving...</p>
            <p className="text-[#f5a623] text-lg font-black">Cross out {spent} tokens from {selectedStudent}'s card</p>
          </div>
        </div>
      )}

      {/* Success */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#19305a]/50 backdrop-blur-sm" data-testid="success-overlay">
          <div className="flex flex-col items-center gap-3 animate-bounce-in">
            <div className="w-20 h-20 rounded-full bg-[#f5a623] flex items-center justify-center animate-pulse-honey shadow-[0_0_40px_rgba(245,166,35,0.5)]">
              <Check size={40} className="text-[#19305a]" strokeWidth={4} />
            </div>
            <p className="text-white text-2xl font-black">Done! 🐝</p>
          </div>
        </div>
      )}
    </div>
  );
}

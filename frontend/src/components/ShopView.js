import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { RotateCcw, UserX, Delete, Check, X, ShoppingCart } from "lucide-react";

function StepIndicator({ step }) {
  const steps = [
    { num: 1, label: "Class" },
    { num: 2, label: "Student" },
    { num: 3, label: "Tokens" },
    { num: 4, label: "Shop" },
  ];
  return (
    <div data-testid="step-indicator" className="flex items-center gap-1 sm:gap-2">
      {steps.map((s, i) => (
        <div key={s.num} className="flex items-center gap-1 sm:gap-2">
          <div className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold transition-all ${
            step === s.num ? "bg-[#7cbde8] text-[#19305a] scale-105" :
            step > s.num ? "bg-[#19305a] text-white" : "bg-[#19305a]/10 text-[#19305a]/40"
          }`}>
            <span className="w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black bg-white/30">{s.num}</span>
            <span className="hidden sm:inline">{s.label}</span>
          </div>
          {i < 3 && <div className={`w-4 sm:w-8 h-0.5 ${step > s.num ? "bg-[#19305a]" : "bg-[#19305a]/10"}`} />}
        </div>
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
    setStep(1);
    setSelectedClass(null);
    setSelectedStudent(null);
    setEarned(0);
    setEarnedBuffer("");
    setCart([]);
    setShowConfirm(false);
  };

  const handleClassSelect = (cls) => {
    setSelectedClass(cls);
    setStep(2);
  };

  const handleStudentSelect = (stu) => {
    setSelectedStudent(stu);
    setEarnedBuffer("");
    setEarned(0);
    setCart([]);
    setStep(3);
  };

  const handleSkip = async (stu) => {
    if (!activeSession) { toast.error("No active session"); return; }
    await onSkip(selectedClass, stu);
    toast.success(`${stu} marked as skipped`);
  };

  const keypadInput = (digit) => {
    if (earnedBuffer.length < 3) setEarnedBuffer(prev => prev + digit);
  };
  const keypadBack = () => setEarnedBuffer(prev => prev.slice(0, -1));
  const keypadClear = () => setEarnedBuffer("");
  const keypadAdd = (n) => {
    const current = parseInt(earnedBuffer || "0", 10);
    setEarnedBuffer(String(current + n));
  };
  const keypadSet = () => {
    const val = parseInt(earnedBuffer || "0", 10);
    if (val <= 0) { toast.error("Enter tokens earned"); return; }
    setEarned(val);
    setStep(4);
  };

  const addToCart = (item) => {
    if (remaining - item.cost < 0) return;
    setCart(prev => [...prev, item]);
  };
  const removeFromCart = (idx) => setCart(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!activeSession) { toast.error("No active session. Create one in Settings."); return; }
    setSaving(true);
    try {
      await onSave({
        class: selectedClass,
        student: selectedStudent,
        earned,
        spent,
        items: cart.map(i => ({ name: i.name, cost: i.cost })),
        session_label: activeSession.label,
      });
      setSaving(false);
      setShowConfirm(false);
      setShowSuccess(true);
      setTimeout(() => { setShowSuccess(false); resetAll(); }, 1500);
    } catch (e) {
      setSaving(false);
      toast.error("Save failed: " + (e.response?.data?.detail || e.message));
    }
  };

  if (!activeSession) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="text-6xl">🐝</div>
        <h2 className="text-2xl font-bold text-[#19305a]">No Active Session</h2>
        <p className="text-[#5a6b8a] text-center">Open Settings to create a new session before starting the shop.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" data-testid="shop-view">
      {/* Top bar */}
      <div className="px-3 py-2 flex items-center justify-between bg-white border-b border-[#19305a]/5 shrink-0">
        <StepIndicator step={step} />
        <button data-testid="reset-btn" onClick={resetAll} className="flex items-center gap-1 px-3 py-1.5 rounded-[12px] bg-[#19305a]/5 text-[#19305a] font-bold text-sm hover:bg-[#19305a]/10 transition-all">
          <RotateCcw size={14} strokeWidth={3} /> Reset
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Step 1 - Class */}
        {step === 1 && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 animate-fade-in" data-testid="step-class">
            <h2 className="text-xl font-bold text-[#19305a] mb-4">Select a Class</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {classes.map(cls => {
                const rem = remainingStudents(cls).length;
                return (
                  <button
                    key={cls}
                    data-testid={`class-btn-${cls}`}
                    onClick={() => handleClassSelect(cls)}
                    disabled={rem === 0}
                    className={`relative min-h-[72px] rounded-[16px] font-bold text-xl transition-all flex flex-col items-center justify-center gap-1 ${
                      rem === 0
                        ? "bg-[#19305a]/5 text-[#19305a]/30 cursor-not-allowed"
                        : "bg-white text-[#19305a] shadow-[0_8px_24px_rgba(25,48,90,0.08)] hover:shadow-[0_16px_32px_rgba(25,48,90,0.14)] hover:-translate-y-1 active:translate-y-0 border-2 border-transparent hover:border-[#7cbde8]"
                    }`}
                  >
                    {cls}
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${rem === 0 ? "bg-[#19305a]/5 text-[#19305a]/30" : "bg-[#7cbde8]/20 text-[#7cbde8]"}`}>
                      {rem} left
                    </span>
                  </button>
                );
              })}
            </div>
            {classes.length === 0 && (
              <div className="text-center text-[#5a6b8a] mt-12">
                <p className="text-lg font-bold">No students imported yet</p>
                <p className="text-sm">Use Settings to import students</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2 - Student */}
        {step === 2 && selectedClass && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 animate-fade-in" data-testid="step-student">
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setStep(1)} className="text-[#7cbde8] font-bold text-sm hover:underline">&larr; Back</button>
              <span className="text-[#19305a]/30">/</span>
              <span className="font-bold text-[#19305a]">{selectedClass}</span>
            </div>
            <h2 className="text-xl font-bold text-[#19305a] mb-4">Select a Student</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {remainingStudents(selectedClass).map(stu => (
                <div key={stu} className="relative group">
                  <button
                    data-testid={`student-btn-${stu.replace(/\s/g, '-')}`}
                    onClick={() => handleStudentSelect(stu)}
                    className="w-full min-h-[64px] rounded-[16px] bg-white text-[#19305a] font-bold text-base shadow-[0_8px_24px_rgba(25,48,90,0.08)] hover:shadow-[0_16px_32px_rgba(25,48,90,0.14)] hover:-translate-y-1 active:translate-y-0 transition-all border-2 border-transparent hover:border-[#7cbde8] px-2"
                  >
                    {stu}
                  </button>
                  <button
                    data-testid={`skip-btn-${stu.replace(/\s/g, '-')}`}
                    onClick={() => handleSkip(stu)}
                    className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-[#c74747] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    title="Skip (Absent)"
                  >
                    <UserX size={14} strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 - Tokens Numpad */}
        {step === 3 && (
          <div className="flex-1 flex flex-col items-center justify-center p-3 animate-fade-in" data-testid="step-tokens">
            <div className="flex items-center gap-2 mb-1 self-start">
              <button onClick={() => setStep(2)} className="text-[#7cbde8] font-bold text-sm hover:underline">&larr; Back</button>
              <span className="text-[#19305a]/30">/</span>
              <span className="font-bold text-[#19305a]">{selectedClass}</span>
              <span className="text-[#19305a]/30">/</span>
              <span className="font-bold text-[#7cbde8]">{selectedStudent}</span>
            </div>
            <div className="bg-white rounded-[16px] shadow-[0_8px_24px_rgba(25,48,90,0.1)] p-4 w-full max-w-md flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-[#5a6b8a] uppercase tracking-wider">Tokens Earned</h2>
                <div className="flex gap-2">
                  <button data-testid="numpad-add-5" onClick={() => keypadAdd(5)}
                    className="h-8 px-4 text-sm font-bold rounded-[8px] bg-[#7cbde8]/10 text-[#7cbde8] hover:bg-[#7cbde8] hover:text-white active:scale-95 transition-all">
                    +5
                  </button>
                  <button data-testid="numpad-add-10" onClick={() => keypadAdd(10)}
                    className="h-8 px-4 text-sm font-bold rounded-[8px] bg-[#7cbde8]/10 text-[#7cbde8] hover:bg-[#7cbde8] hover:text-white active:scale-95 transition-all">
                    +10
                  </button>
                </div>
              </div>
              <div data-testid="earned-display" className="text-center text-5xl font-black text-[#19305a] mb-3 min-h-[56px] flex items-center justify-center">
                {earnedBuffer || "0"}
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[1,2,3,4,5,6,7,8,9].map(d => (
                  <button key={d} data-testid={`numpad-btn-${d}`} onClick={() => keypadInput(String(d))}
                    className="h-12 text-xl font-black rounded-[10px] bg-[#f3f6fb] text-[#19305a] hover:bg-[#7cbde8] hover:text-white active:scale-95 transition-all flex items-center justify-center">
                    {d}
                  </button>
                ))}
                <button data-testid="numpad-btn-clear" onClick={keypadClear}
                  className="h-12 text-sm font-bold rounded-[10px] bg-[#c74747]/10 text-[#c74747] hover:bg-[#c74747] hover:text-white active:scale-95 transition-all">
                  Clear
                </button>
                <button data-testid="numpad-btn-0" onClick={() => keypadInput("0")}
                  className="h-12 text-xl font-black rounded-[10px] bg-[#f3f6fb] text-[#19305a] hover:bg-[#7cbde8] hover:text-white active:scale-95 transition-all flex items-center justify-center">
                  0
                </button>
                <button data-testid="numpad-btn-back" onClick={keypadBack}
                  className="h-12 rounded-[10px] bg-[#f3f6fb] text-[#19305a] hover:bg-[#19305a]/10 active:scale-95 transition-all flex items-center justify-center">
                  <Delete size={20} strokeWidth={3} />
                </button>
              </div>
              <button data-testid="set-tokens-btn" onClick={keypadSet}
                className="w-full h-12 text-lg font-bold rounded-[12px] bg-[#f5a623] text-[#19305a] shadow-[0_4px_0_rgba(200,130,20,1)] hover:brightness-105 active:translate-y-1 active:shadow-none transition-all">
                Set Tokens &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Step 4 - Shop */}
        {step === 4 && (
          <div className="flex-1 flex overflow-hidden animate-fade-in" data-testid="step-shop">
            {/* Items panel */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 border-r border-[#19305a]/5">
              <div className="flex items-center gap-2 mb-3">
                <button onClick={() => { setStep(3); setCart([]); }} className="text-[#7cbde8] font-bold text-sm hover:underline">&larr; Back</button>
                <span className="text-[#19305a]/30">/</span>
                <span className="font-bold text-sm text-[#19305a]">{selectedClass}</span>
                <span className="text-[#19305a]/30">/</span>
                <span className="font-bold text-sm text-[#7cbde8]">{selectedStudent}</span>
              </div>

              {Object.entries(groupedItems).map(([cat, catItems]) => (
                <div key={cat} className="mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#7cbde8] mb-2">{cat}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {catItems.map(item => {
                      const disabled = item.cost > remaining;
                      return (
                        <button
                          key={item.name}
                          data-testid={`item-btn-${item.name.replace(/\s/g, '-')}`}
                          onClick={() => addToCart(item)}
                          disabled={disabled}
                          className={`min-h-[56px] rounded-[12px] px-3 py-2 font-bold text-sm transition-all flex flex-col items-center justify-center gap-0.5 ${
                            disabled
                              ? "bg-[#19305a]/5 text-[#19305a]/25 cursor-not-allowed"
                              : "bg-white text-[#19305a] shadow-[0_4px_12px_rgba(25,48,90,0.06)] hover:shadow-[0_8px_20px_rgba(25,48,90,0.12)] hover:-translate-y-0.5 active:translate-y-0 border border-transparent hover:border-[#7cbde8]"
                          }`}
                        >
                          <span className="truncate max-w-full">{item.name}</span>
                          <span className={`text-xs font-bold ${disabled ? "text-[#19305a]/20" : "text-[#f5a623]"}`}>{item.cost} tokens</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Cart panel */}
            <div className="w-72 md:w-80 flex flex-col bg-white shrink-0" data-testid="cart-panel">
              <div className="p-4 border-b border-[#19305a]/5">
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingCart size={18} className="text-[#19305a]" strokeWidth={3} />
                  <h3 className="font-bold text-[#19305a]">Cart</h3>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#7cbde8]/10 text-[#7cbde8] text-xs font-bold">
                    Earned: {earned}
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#c74747]/10 text-[#c74747] text-xs font-bold">
                    Spent: {spent}
                  </span>
                  <span data-testid="saved-pill" className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${saved > 0 ? "bg-[#f5a623]/15 text-[#f5a623]" : "bg-[#19305a]/5 text-[#19305a]/40"}`}>
                    {saved > 0 && "🐝 "}Saved: {saved}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {cart.length === 0 ? (
                  <p className="text-[#5a6b8a] text-sm text-center mt-8">No items in cart</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {cart.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-[#f3f6fb] rounded-[10px] px-3 py-2">
                        <div>
                          <span className="text-sm font-bold text-[#19305a]">{item.name}</span>
                          <span className="text-xs text-[#f5a623] ml-2">{item.cost}t</span>
                        </div>
                        <button data-testid={`remove-cart-${idx}`} onClick={() => removeFromCart(idx)} className="w-6 h-6 rounded-full bg-[#c74747]/10 text-[#c74747] flex items-center justify-center hover:bg-[#c74747] hover:text-white transition-all">
                          <X size={12} strokeWidth={3} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-[#19305a]/5 flex flex-col gap-2">
                <button data-testid="save-transaction-btn" onClick={() => setShowConfirm(true)}
                  className="w-full h-12 rounded-[12px] bg-[#f5a623] text-[#19305a] font-bold text-base shadow-[0_4px_0_rgba(200,130,20,1)] hover:brightness-105 active:translate-y-1 active:shadow-none transition-all">
                  Save Transaction
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#19305a]/40 backdrop-blur-md" data-testid="confirm-modal">
          <div className="bg-white rounded-[24px] shadow-2xl p-6 sm:p-8 max-w-lg w-[90vw] border-4 border-[#19305a] animate-bounce-in">
            <h2 className="text-xl font-bold text-[#19305a] mb-4 text-center">Confirm Transaction</h2>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between"><span className="text-[#5a6b8a]">Student</span><span className="font-bold">{selectedStudent}</span></div>
              <div className="flex justify-between"><span className="text-[#5a6b8a]">Class</span><span className="font-bold">{selectedClass}</span></div>
              <div className="flex justify-between"><span className="text-[#5a6b8a]">Earned</span><span className="font-bold text-[#7cbde8]">{earned}</span></div>
              <div className="flex justify-between"><span className="text-[#5a6b8a]">Spent</span><span className="font-bold text-[#c74747]">{spent}</span></div>
              <div className="flex justify-between"><span className="text-[#5a6b8a]">Saved</span><span className={`font-bold ${saved > 0 ? "text-[#f5a623]" : ""}`}>{saved > 0 && "🐝 "}{saved}</span></div>
            </div>
            {cart.length > 0 && (
              <div className="bg-[#f3f6fb] rounded-[12px] p-3 mb-4 max-h-32 overflow-y-auto">
                {cart.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-0.5">
                    <span className="text-[#19305a]">{item.name}</span>
                    <span className="text-[#f5a623] font-bold">{item.cost}t</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-3">
              <button data-testid="confirm-cancel-btn" onClick={() => setShowConfirm(false)}
                className="flex-1 h-12 rounded-[12px] bg-[#19305a]/5 text-[#19305a] font-bold hover:bg-[#19305a]/10 transition-all">
                Cancel
              </button>
              <button data-testid="confirm-save-btn" onClick={handleSave}
                className="flex-1 h-12 rounded-[12px] bg-[#f5a623] text-[#19305a] font-bold shadow-[0_4px_0_rgba(200,130,20,1)] hover:brightness-105 active:translate-y-1 active:shadow-none transition-all">
                {saving ? "Saving..." : "Confirm & Save 🐝"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saving Overlay */}
      {saving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#19305a]/60 backdrop-blur-md" data-testid="saving-overlay">
          <div className="flex flex-col items-center gap-4 animate-bounce-in">
            <div className="w-12 h-12 border-4 border-white border-t-[#f5a623] rounded-full" style={{ animation: 'spin 0.8s linear infinite' }} />
            <p className="text-white text-lg font-bold">Saving, please wait...</p>
            <p className="text-[#f5a623] text-xl font-bold">Cross out: {spent} tokens from {selectedStudent}'s card</p>
          </div>
        </div>
      )}

      {/* Success animation */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#19305a]/40 backdrop-blur-md" data-testid="success-overlay">
          <div className="flex flex-col items-center gap-4 animate-bounce-in">
            <div className="w-24 h-24 rounded-full bg-[#f5a623] flex items-center justify-center animate-pulse-honey">
              <Check size={48} className="text-[#19305a]" strokeWidth={4} />
            </div>
            <p className="text-white text-2xl font-bold">Done! 🐝</p>
          </div>
        </div>
      )}
    </div>
  );
}

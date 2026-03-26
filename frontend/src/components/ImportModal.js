import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { X, Upload, FileText, AlertCircle, Check } from "lucide-react";

export default function ImportModal({ open, onClose, api, onRefresh }) {
  const [csvText, setCsvText] = useState("");
  const [parsed, setParsed] = useState([]);
  const [errors, setErrors] = useState([]);
  const [importing, setImporting] = useState(false);

  const parseCSV = (text) => {
    const lines = text.trim().split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) { setParsed([]); setErrors(["No data"]); return; }

    const hasHeader = lines[0].toLowerCase().includes("class") || lines[0].toLowerCase().includes("student");
    const dataLines = hasHeader ? lines.slice(1) : lines;
    const results = [];
    const errs = [];

    dataLines.forEach((line, idx) => {
      const parts = line.split(",").map(s => s.trim().replace(/^["']|["']$/g, ""));
      if (parts.length < 2) { errs.push(`Row ${idx + 1}: needs at least 2 columns`); return; }
      const cls = parts[0];
      const stu = parts[1];
      if (!cls || !stu) { errs.push(`Row ${idx + 1}: empty class or student`); return; }
      results.push({ class: cls, student: stu });
    });

    setParsed(results);
    setErrors(errs);
  };

  const handleTextChange = (text) => {
    setCsvText(text);
    if (text.trim()) parseCSV(text);
    else { setParsed([]); setErrors([]); }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      setCsvText(text);
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const doImport = async () => {
    if (parsed.length === 0) { toast.error("No valid rows to import"); return; }
    setImporting(true);
    try {
      const res = await axios.post(`${api}/students/import`, parsed);
      toast.success(`Imported ${res.data.count} students`);
      onRefresh();
      onClose();
      setCsvText("");
      setParsed([]);
      setErrors([]);
    } catch (e) {
      toast.error("Import failed: " + (e.response?.data?.detail || e.message));
    } finally {
      setImporting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#19305a]/40 backdrop-blur-md" data-testid="import-modal">
      <div className="bg-white rounded-[24px] shadow-2xl p-6 sm:p-8 max-w-2xl w-[90vw] border-4 border-[#19305a] animate-bounce-in max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#19305a]">Import Students</h2>
          <button data-testid="import-close-btn" onClick={onClose} className="w-8 h-8 rounded-full bg-[#19305a]/5 flex items-center justify-center hover:bg-[#19305a]/10 transition-all">
            <X size={16} className="text-[#19305a]" strokeWidth={3} />
          </button>
        </div>

        <p className="text-sm text-[#5a6b8a] mb-3">
          Paste CSV data (format: <code className="bg-[#f3f6fb] px-1 rounded text-[#19305a] font-bold">Class,Student</code>) or upload a .csv file.
        </p>

        <div className="flex gap-3 mb-3">
          <label data-testid="import-file-input" className="flex items-center gap-2 px-4 py-2 rounded-[12px] bg-[#7cbde8]/10 text-[#7cbde8] font-bold text-sm cursor-pointer hover:bg-[#7cbde8]/20 transition-all">
            <Upload size={14} strokeWidth={3} />
            Upload CSV
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        <textarea
          data-testid="import-textarea"
          value={csvText}
          onChange={e => handleTextChange(e.target.value)}
          placeholder="Class,Student&#10;4A,Jane Smith&#10;4A,John Doe&#10;4B,Alice Brown"
          className="w-full h-32 px-4 py-3 rounded-[12px] border-2 border-[#19305a]/10 bg-[#f3f6fb] text-[#19305a] text-sm font-mono resize-none focus:border-[#7cbde8] outline-none mb-3"
        />

        {errors.length > 0 && (
          <div className="flex items-start gap-2 bg-[#c74747]/5 text-[#c74747] text-xs rounded-[8px] p-2 mb-3">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <div>{errors.join(", ")}</div>
          </div>
        )}

        {parsed.length > 0 && (
          <div className="flex-1 overflow-y-auto mb-3 border rounded-[12px] border-[#19305a]/5">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#f3f6fb]">
                <tr className="text-xs font-bold text-[#5a6b8a] uppercase">
                  <th className="text-left p-2">#</th>
                  <th className="text-left p-2">Class</th>
                  <th className="text-left p-2">Student</th>
                </tr>
              </thead>
              <tbody>
                {parsed.slice(0, 100).map((row, i) => (
                  <tr key={i} className="border-t border-[#19305a]/5">
                    <td className="p-2 text-[#5a6b8a]">{i + 1}</td>
                    <td className="p-2 font-bold text-[#19305a]">{row.class}</td>
                    <td className="p-2 text-[#19305a]">{row.student}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsed.length > 100 && <p className="text-center text-xs text-[#5a6b8a] py-2">...and {parsed.length - 100} more</p>}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-[#5a6b8a]">
            {parsed.length > 0 && (
              <span className="flex items-center gap-1"><FileText size={14} /> {parsed.length} rows ready</span>
            )}
          </span>
          <button
            data-testid="confirm-import-btn"
            onClick={doImport}
            disabled={parsed.length === 0 || importing}
            className="px-6 py-3 rounded-[12px] bg-[#f5a623] text-[#19305a] font-bold shadow-[0_4px_0_rgba(200,130,20,1)] hover:brightness-105 active:translate-y-1 active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {importing ? "Importing..." : `Confirm Import (${parsed.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

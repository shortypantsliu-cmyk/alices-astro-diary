import { useState, useEffect, useRef } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

// ── Load SheetJS from CDN ─────────────────────────────────────────────────────
const XLSXLoader = () => {
  useEffect(() => {
    if (window.XLSX) return;
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    document.head.appendChild(script);
  }, []);
  return null;
};

// ── Inject fonts ──────────────────────────────────────────────────────────────
const FontLoader = () => {
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&family=Exo+2:wght@300;400;600&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);
  return null;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const DSO_TYPES = ["Galaxy", "Emission Nebula", "Reflection Nebula", "Planetary Nebula", "Supernova Remnant", "Open Cluster", "Globular Cluster", "Dark Nebula", "Other"];

const PALETTE = {
  bg: "#070a12",
  panel: "#0e1628",
  border: "#243050",
  accent: "#38d4ff",
  gold: "#ffc05a",
  red: "#ff6b84",
  green: "#4eeaa0",
  text: "#e8f0ff",        // brighter primary text — near white with a blue tint
  muted: "#8aa4c8",       // muted labels — much lighter than before, still clearly secondary
  galaxy: "#c4a8ff",
  nebula: "#4eeaa0",
  cluster: "#ffc05a",
  other: "#7ec8ff",
};

const TYPE_COLORS = {
  "Galaxy": "#a78bfa",
  "Emission Nebula": "#f87171",
  "Reflection Nebula": "#60a5fa",
  "Planetary Nebula": "#34d399",
  "Supernova Remnant": "#fb923c",
  "Open Cluster": "#fbbf24",
  "Globular Cluster": "#f59e0b",
  "Dark Nebula": "#94a3b8",
  "Other": "#6b7280",
};

// Fields: telescope, date, dsoName (catalog), dsoType, commonName, numSubs, exposureTime, notes
const EMPTY_SESSION = {
  id: "",
  date: "",
  telescope: "",
  dsoName: "",
  dsoType: "Galaxy",
  commonName: "",
  exposureTime: "",
  numSubs: "",
  notes: "",
};

function fmtTime(seconds) {
  if (!seconds || seconds === 0) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function totalSecs(session) {
  return (parseFloat(session.exposureTime) || 0) * (parseInt(session.numSubs) || 0);
}

// ── Starfield Background ──────────────────────────────────────────────────────
const Stars = () => {
  const stars = useRef(
    Array.from({ length: 120 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 1.8 + 0.4,
      opacity: Math.random() * 0.6 + 0.2,
      delay: Math.random() * 4,
    }))
  );
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {stars.current.map(s => (
        <div key={s.id} style={{
          position: "absolute", left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size, borderRadius: "50%",
          background: "white", opacity: s.opacity,
          animation: `twinkle ${2 + s.delay}s ease-in-out ${s.delay}s infinite alternate`,
        }} />
      ))}
      <style>{`
        @keyframes twinkle { from { opacity: var(--op, 0.3); transform: scale(1); } to { opacity: calc(var(--op, 0.3) * 0.3); transform: scale(0.7); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(0,194,255,0.4); } 50% { box-shadow: 0 0 0 6px rgba(0,194,255,0); } }
      `}</style>
    </div>
  );
};

// ── Input components ──────────────────────────────────────────────────────────
const inputStyle = {
  background: "#111d35", border: `1px solid ${PALETTE.border}`, borderRadius: 6,
  color: PALETTE.text, padding: "8px 12px", width: "100%", fontSize: 14,
  fontFamily: "'Exo 2', sans-serif", outline: "none", boxSizing: "border-box",
};
const labelStyle = {
  color: PALETTE.muted, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase",
  marginBottom: 4, display: "block", fontFamily: "'Rajdhani', sans-serif",
};

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={labelStyle}>{label}</label>
    {children}
  </div>
);

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, accent = PALETTE.accent }) => (
  <div style={{
    background: PALETTE.panel, border: `1px solid ${PALETTE.border}`,
    borderTop: `2px solid ${accent}`, borderRadius: 8, padding: "18px 20px",
    flex: "1 1 160px", minWidth: 140, animation: "fadeIn 0.4s ease both",
  }}>
    <div style={{ color: PALETTE.muted, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", fontFamily: "'Rajdhani', sans-serif", marginBottom: 6 }}>{label}</div>
    <div style={{ color: accent, fontSize: 28, fontFamily: "'Share Tech Mono', monospace", lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ color: PALETTE.muted, fontSize: 12, marginTop: 4, fontFamily: "'Exo 2', sans-serif" }}>{sub}</div>}
  </div>
);

// ── Main App ──────────────────────────────────────────────────────────────────
// ── Confirm Dialog ────────────────────────────────────────────────────────────
const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
  <div style={{
    position: "fixed", inset: 0, zIndex: 1000,
    background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center",
  }}>
    <div style={{
      background: PALETTE.panel, border: `1px solid ${PALETTE.border}`,
      borderRadius: 10, padding: "28px 32px", maxWidth: 380, width: "90%",
      animation: "fadeIn 0.2s ease",
    }}>
      <div style={{ color: PALETTE.text, fontSize: 15, marginBottom: 22, lineHeight: 1.5, fontFamily: "'Exo 2', sans-serif" }}>
        {message}
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{
          background: "none", border: `1px solid ${PALETTE.border}`, color: PALETTE.muted,
          borderRadius: 6, padding: "8px 20px", cursor: "pointer",
          fontFamily: "'Rajdhani', sans-serif", fontSize: 13, letterSpacing: 1,
        }}>CANCEL</button>
        <button onClick={onConfirm} style={{
          background: PALETTE.red, color: "#fff", border: "none",
          borderRadius: 6, padding: "8px 20px", cursor: "pointer",
          fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: 1,
        }}>DELETE</button>
      </div>
    </div>
  </div>
);

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [tab, setTab] = useState("dashboard");
  const [form, setForm] = useState({ ...EMPTY_SESSION });
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState("date");
  const [sortDir, setSortDir] = useState(-1);
  const [importMsg, setImportMsg] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null); // { message, onConfirm }
  const [topScopeFilter, setTopScopeFilter] = useState("All");
  const [typeBreakdownMode, setTypeBreakdownMode] = useState("sessions"); // "sessions" | "objects"
  const [objectSearch, setObjectSearch] = useState("");
  const fileRef = useRef();

  // Load from storage
  useEffect(() => {
    try {
      const val = localStorage.getItem("dso-sessions");
      if (val) setSessions(JSON.parse(val));
    } catch {}
  }, []);

  // Save to storage
  const persist = (data) => {
    try { localStorage.setItem("dso-sessions", JSON.stringify(data)); } catch {}
  };

  const updateSessions = (newList) => { setSessions(newList); persist(newList); };

  const saveSession = () => {
    if (!form.dsoName.trim()) return;
    const entry = {
      ...form,
      id: editId || `s_${Date.now()}`,
      exposureTime: parseFloat(form.exposureTime) || 0,
      numSubs: parseInt(form.numSubs) || 0,
    };
    let next;
    if (editId) {
      next = sessions.map(s => s.id === editId ? entry : s);
    } else {
      next = [...sessions, entry];
    }
    updateSessions(next);
    setForm({ ...EMPTY_SESSION });
    setEditId(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setTab("log");
  };

  const askConfirm = (message, onConfirm) => setConfirmDialog({ message, onConfirm });
  const closeConfirm = () => setConfirmDialog(null);

  const deleteSession = (id) => {
    askConfirm("Remove this session? This cannot be undone.", () => {
      updateSessions(sessions.filter(s => s.id !== id));
      closeConfirm();
    });
  };

  const editSession = (s) => {
    setForm({ ...s });
    setEditId(s.id);
    setTab("add");
  };

  // Convert any date value to a YYYY-MM-DD string
  const parseDate = (val) => {
    if (!val) return "";
    // Already a clean string date
    if (typeof val === "string" && val.trim()) {
      // Handle DD/MM/YYYY
      const dmyMatch = val.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
      if (dmyMatch) {
        const [, d, m, y] = dmyMatch;
        const year = y.length === 2 ? "20" + y : y;
        return `${year}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
      }
      // Try native Date parse for other string formats
      const d = new Date(val);
      if (!isNaN(d)) return d.toISOString().slice(0, 10);
      return val;
    }
    // Excel serial number (number of days since 1900-01-01)
    if (typeof val === "number") {
      const excelEpoch = new Date(1899, 11, 30);
      const d = new Date(excelEpoch.getTime() + val * 86400000);
      if (!isNaN(d)) return d.toISOString().slice(0, 10);
    }
    return String(val);
  };

  // Import from Excel/CSV
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const XLSX = window.XLSX;
        if (!XLSX) { setImportMsg("✗ XLSX library not loaded yet — try again in a moment"); setTimeout(() => setImportMsg(""), 4000); return; }
        const wb = XLSX.read(ev.target.result, { type: "binary", cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { raw: true });
        const imported = rows.map((r, i) => ({
          id: `import_${Date.now()}_${i}`,
          date: parseDate(r.date || r.Date || r["Capture Date"] || r["capture date"] || ""),
          telescope: r.telescope || r.Telescope || "",
          dsoName: r.dsoName || r["DSO Catalog Name"] || r["DSO Name"] || r.name || r.Name || "",
          dsoType: r.dsoType || r["DSO Type"] || r.Type || r.type || "Other",
          commonName: r.commonName || r["Common Name"] || r.common || "",
          exposureTime: parseFloat(r.exposureTime || r["Exposure Time (sec)"] || r["Exposure (s)"] || r.exposure || 0),
          numSubs: parseInt(r.numSubs || r["Number of Subs"] || r["Num Subs"] || r.subs || 0),
          notes: r.notes || r.Notes || "",
        })).filter(r => r.dsoName);
        const next = [...sessions, ...imported];
        updateSessions(next);
        setImportMsg(`✓ Imported ${imported.length} session${imported.length !== 1 ? "s" : ""}`);
        setTimeout(() => setImportMsg(""), 4000);
      } catch (err) {
        setImportMsg("✗ Import failed — check file format");
        setTimeout(() => setImportMsg(""), 4000);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  // Export
  const exportXLSX = () => {
    const XLSX = window.XLSX;
    if (!XLSX) { alert("XLSX library not loaded yet — try again in a moment."); return; }
    const data = sessions.map(s => ({
      date: s.date,
      telescope: s.telescope,
      dsoName: s.dsoName,
      dsoType: s.dsoType,
      commonName: s.commonName,
      exposureTime: s.exposureTime,
      numSubs: s.numSubs,
      totalTime_s: totalSecs(s),
      notes: s.notes,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sessions");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    a.download = `AlicesAstroDiary_${stamp}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Analytics
  const totalTime = sessions.reduce((a, s) => a + totalSecs(s), 0);
  const uniqueObjects = new Set(sessions.map(s => s.dsoName)).size;
  const typeCounts = sessions.reduce((acc, s) => { acc[s.dsoType] = (acc[s.dsoType] || 0) + 1; return acc; }, {});
  const uniqueNames = new Set(sessions.map(s => s.dsoName.trim().toUpperCase()));
  const messierCount = [...uniqueNames].filter(n => /^M\d+$/.test(n)).length;
  const caldwellCount = [...uniqueNames].filter(n => /^C\d+$/.test(n)).length;
  const ngcCount = [...uniqueNames].filter(n => /^NGC\s*\d+/i.test(n)).length;
  const uniqueTypeCounts = sessions.reduce((acc, s) => {
    const key = s.dsoType + "__" + s.dsoName.trim().toUpperCase();
    acc[s.dsoType] = acc[s.dsoType] || new Set();
    acc[s.dsoType].add(key);
    return acc;
  }, {});
  const uniqueTypeData = Object.entries(uniqueTypeCounts).map(([name, set]) => ({ name, value: set.size }));
  const typeData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));
  const telescopeTimes = sessions.reduce((acc, s) => {
    const k = s.telescope || "Unknown";
    acc[k] = (acc[k] || 0) + totalSecs(s) / 3600;
    return acc;
  }, {});
  const telesData = Object.entries(telescopeTimes).map(([name, hours]) => ({ name, hours: parseFloat(hours.toFixed(2)) }));

  // Unique telescope names for the top-targets filter
  const telescopeNames = ["All", ...Array.from(new Set(sessions.map(s => s.telescope).filter(Boolean))).sort()];

  // Top objects by time — filtered by selected telescope
  const objTimes = sessions
    .filter(s => topScopeFilter === "All" || s.telescope === topScopeFilter)
    .reduce((acc, s) => {
      const k = s.commonName ? `${s.dsoName} — ${s.commonName}` : s.dsoName;
      acc[k] = (acc[k] || 0) + totalSecs(s);
      return acc;
    }, {});
  const topObjects = Object.entries(objTimes).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Filtered + sorted log
  const filtered = sessions.filter(s =>
    !search ||
    s.dsoName.toLowerCase().includes(search.toLowerCase()) ||
    s.commonName?.toLowerCase().includes(search.toLowerCase()) ||
    s.telescope?.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    let av = a[sortCol], bv = b[sortCol];
    if (sortCol === "totalTime") { av = totalSecs(a); bv = totalSecs(b); }
    if (typeof av === "string") return sortDir * av.localeCompare(bv);
    return sortDir * ((av || 0) - (bv || 0));
  });

  const sortBy = (col) => { if (sortCol === col) setSortDir(d => -d); else { setSortCol(col); setSortDir(-1); } };

  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "log", label: "Session Log" },
    { id: "add", label: editId ? "Edit Session" : "Add Session" },
    { id: "import", label: "Import / Export" },
  ];

  const TH = ({ col, label }) => (
    <th onClick={() => sortBy(col)} style={{
      padding: "10px 14px", textAlign: "left", cursor: "pointer", userSelect: "none",
      color: sortCol === col ? PALETTE.accent : PALETTE.muted,
      fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase",
      fontFamily: "'Rajdhani', sans-serif", whiteSpace: "nowrap",
      borderBottom: `1px solid ${PALETTE.border}`,
    }}>
      {label} {sortCol === col ? (sortDir === 1 ? "↑" : "↓") : ""}
    </th>
  );

  return (
    <div style={{ minHeight: "100vh", background: PALETTE.bg, color: PALETTE.text, fontFamily: "'Exo 2', sans-serif", position: "relative" }}>
      <FontLoader />
      <XLSXLoader />
      <Stars />
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={closeConfirm}
        />
      )}

      {/* ── Header ── */}
      <div style={{ position: "relative", zIndex: 10, borderBottom: `1px solid ${PALETTE.border}`, background: "rgba(7,10,18,0.9)", backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0 0" }}>
            <div>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 26, fontWeight: 700, color: PALETTE.accent, letterSpacing: 3, lineHeight: 1 }}>
                ✦ Alice's Astro Diary
              </div>
              <div style={{ color: PALETTE.muted, fontSize: 11, letterSpacing: 2, marginTop: 2 }}>DEEP SKY IMAGING JOURNAL</div>
            </div>
            <div style={{ color: PALETTE.muted, fontSize: 12, textAlign: "right", fontFamily: "'Share Tech Mono', monospace" }}>
              <div style={{ color: PALETTE.gold }}>{sessions.length} sessions</div>
              <div>{fmtTime(totalTime)} total</div>
            </div>
          </div>
          {/* Nav */}
          <div style={{ display: "flex", gap: 0, marginTop: 16 }}>
            {navItems.map(n => (
              <button key={n.id} onClick={() => setTab(n.id)} style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "10px 20px", fontSize: 13, letterSpacing: 1,
                fontFamily: "'Rajdhani', sans-serif", fontWeight: 600,
                color: tab === n.id ? PALETTE.accent : PALETTE.muted,
                borderBottom: `2px solid ${tab === n.id ? PALETTE.accent : "transparent"}`,
                transition: "all 0.2s",
              }}>
                {n.label.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "30px 20px" }}>

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            {sessions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: PALETTE.muted }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔭</div>
                <div style={{ fontSize: 18, fontFamily: "'Rajdhani', sans-serif", letterSpacing: 2 }}>NO SESSIONS YET</div>
                <div style={{ fontSize: 13, marginTop: 8 }}>Add your first imaging session to see analytics here</div>
                <button onClick={() => setTab("add")} style={{
                  marginTop: 20, background: PALETTE.accent, color: PALETTE.bg, border: "none",
                  borderRadius: 6, padding: "10px 24px", cursor: "pointer",
                  fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: 1,
                }}>ADD FIRST SESSION</button>
              </div>
            ) : (<>
              {/* Stat cards */}
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
                <StatCard label="Total Imaging Time" value={fmtTime(totalTime)} accent={PALETTE.accent} />
                <StatCard label="Sessions Logged" value={sessions.length} accent={PALETTE.gold} />
                <StatCard label="Unique Objects" value={uniqueObjects} accent={PALETTE.green} />
                <div style={{ background: PALETTE.panel, border: `1px solid ${PALETTE.border}`, borderTop: `2px solid ${PALETTE.nebula}`, borderRadius: 8, padding: "18px 20px", flex: "1 1 160px", minWidth: 160, animation: "fadeIn 0.4s ease both" }}>
                  <div style={{ color: PALETTE.muted, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", fontFamily: "'Rajdhani', sans-serif", marginBottom: 10 }}>Catalog Breakdown</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[["Messier", messierCount, PALETTE.gold], ["Caldwell", caldwellCount, PALETTE.accent], ["NGC", ngcCount, PALETTE.green]].map(([label, count, color]) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: PALETTE.muted, fontSize: 12, fontFamily: "'Rajdhani', sans-serif", letterSpacing: 1 }}>{label}</span>
                        <span style={{ color, fontSize: 20, fontFamily: "'Share Tech Mono', monospace", lineHeight: 1 }}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, marginBottom: 28 }}>

                {/* Type breakdown — horizontal bar chart with toggle */}
                <div style={{ background: PALETTE.panel, border: `1px solid ${PALETTE.border}`, borderRadius: 10, padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 13, letterSpacing: 2, color: PALETTE.muted }}>OBJECT TYPE BREAKDOWN</div>
                    <div style={{ display: "flex", background: "#0a1020", border: `1px solid ${PALETTE.border}`, borderRadius: 6, overflow: "hidden" }}>
                      {[["sessions", "Sessions"], ["objects", "Unique"]].map(([mode, label]) => (
                        <button key={mode} onClick={() => setTypeBreakdownMode(mode)} style={{
                          background: typeBreakdownMode === mode ? PALETTE.accent : "none",
                          color: typeBreakdownMode === mode ? PALETTE.bg : PALETTE.muted,
                          border: "none", padding: "4px 12px", cursor: "pointer",
                          fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 700,
                          letterSpacing: 1, transition: "all 0.15s",
                        }}>{label}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(() => {
                      const data = typeBreakdownMode === "sessions" ? typeData : uniqueTypeData;
                      const sorted = [...data].sort((a, b) => b.value - a.value);
                      const maxVal = Math.max(...sorted.map(t => t.value), 1);
                      return sorted.map(({ name, value }) => {
                        const color = TYPE_COLORS[name] || "#6b7280";
                        const barPct = (value / maxVal) * 100;
                        return (
                          <div key={name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 130, flexShrink: 0, textAlign: "right", color: color, fontSize: 12, fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, letterSpacing: 0.3 }}>
                              {name}
                            </div>
                            <div style={{ flex: 1, background: `${color}20`, borderRadius: 3, height: 18, position: "relative", overflow: "hidden" }}>
                              <div style={{
                                width: `${barPct}%`, height: "100%",
                                background: `linear-gradient(90deg, ${color}99, ${color})`,
                                borderRadius: 3, transition: "width 0.8s ease",
                              }} />
                            </div>
                            <div style={{ width: 28, flexShrink: 0, textAlign: "right", color: PALETTE.text, fontSize: 13, fontFamily: "'Share Tech Mono', monospace", fontWeight: 600 }}>
                              {value}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Telescope time bar */}
                <div style={{ background: PALETTE.panel, border: `1px solid ${PALETTE.border}`, borderRadius: 10, padding: "20px 20px 12px" }}>
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 13, letterSpacing: 2, color: PALETTE.muted, marginBottom: 16 }}>IMAGING TIME BY TELESCOPE (HRS)</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={telesData} margin={{ left: -20 }}>
                      <XAxis dataKey="name" tick={{ fill: PALETTE.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: PALETTE.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: PALETTE.panel, border: `1px solid ${PALETTE.border}`, borderRadius: 6, color: PALETTE.text, fontSize: 12 }} />
                      <Bar dataKey="hours" fill={PALETTE.accent} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Objects */}
              <div style={{ background: PALETTE.panel, border: `1px solid ${PALETTE.border}`, borderRadius: 10, padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 13, letterSpacing: 2, color: PALETTE.muted }}>TOP TARGETS BY TOTAL IMAGING TIME</div>
                  <select
                    value={topScopeFilter}
                    onChange={e => setTopScopeFilter(e.target.value)}
                    style={{
                      background: "#111d35", border: `1px solid ${PALETTE.border}`, borderRadius: 5,
                      color: topScopeFilter === "All" ? PALETTE.muted : PALETTE.accent,
                      padding: "5px 10px", fontSize: 12, fontFamily: "'Rajdhani', sans-serif",
                      letterSpacing: 1, cursor: "pointer", outline: "none",
                    }}
                  >
                    {telescopeNames.map(t => (
                      <option key={t} value={t}>{t === "All" ? "ALL TELESCOPES" : t}</option>
                    ))}
                  </select>
                </div>
                {topObjects.map(([name, secs], i) => {
                  const pct = (secs / (topObjects[0][1] || 1)) * 100;
                  const color = [PALETTE.gold, PALETTE.accent, PALETTE.green, PALETTE.galaxy, "#f87171"][i];
                  return (
                    <div key={name} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontFamily: "'Share Tech Mono', monospace", color: PALETTE.text, fontSize: 13 }}>{i + 1}. {name}</span>
                        <span style={{ color, fontFamily: "'Share Tech Mono', monospace", fontSize: 13 }}>{fmtTime(secs)}</span>
                      </div>
                      <div style={{ background: PALETTE.border, borderRadius: 2, height: 4 }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.8s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* ── Object Lookup ── */}
              <div style={{ background: PALETTE.panel, border: `1px solid ${PALETTE.border}`, borderRadius: 10, padding: "20px", marginTop: 20 }}>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 13, letterSpacing: 2, color: PALETTE.muted, marginBottom: 14 }}>OBJECT LOOKUP</div>
                <input
                  value={objectSearch}
                  onChange={e => setObjectSearch(e.target.value)}
                  placeholder="Search by catalog name or common name…"
                  style={{ ...inputStyle, maxWidth: 380, padding: "9px 14px", marginBottom: 16 }}
                />
                {(() => {
                  const q = objectSearch.trim().toLowerCase();
                  if (!q) return <div style={{ color: PALETTE.muted, fontSize: 12, fontFamily: "'Share Tech Mono', monospace" }}>Enter a name to see a summary</div>;
                  const matched = sessions.filter(s =>
                    s.dsoName.trim().toLowerCase() === q ||
                    (s.commonName && s.commonName.toLowerCase().includes(q))
                  );
                  if (matched.length === 0) return <div style={{ color: PALETTE.muted, fontSize: 13, fontFamily: "'Share Tech Mono', monospace" }}>No sessions found for &#x201C;{objectSearch}&#x201D;</div>;
                  const totalSessions = matched.length;
                  const totalT = matched.reduce((a, s) => a + totalSecs(s), 0);
                  const totalSubsAll = matched.reduce((a, s) => a + (parseInt(s.numSubs) || 0), 0);
                  const scopes = [...new Set(matched.map(s => s.telescope).filter(Boolean))];
                  const firstName = matched[0].dsoName;
                  const commonName = matched.find(s => s.commonName)?.commonName || null;
                  const dsoType = matched[0].dsoType;
                  const byScope = scopes.map(sc => {
                    const ss = matched.filter(s => s.telescope === sc);
                    return { scope: sc, sessions: ss.length, time: ss.reduce((a, s) => a + totalSecs(s), 0) };
                  });
                  const noScope = matched.filter(s => !s.telescope);
                  if (noScope.length > 0) byScope.push({ scope: "Unknown", sessions: noScope.length, time: noScope.reduce((a, s) => a + totalSecs(s), 0) });
                  const typeColor = TYPE_COLORS[dsoType] || "#6b7280";
                  return (
                    <div style={{ animation: "fadeIn 0.3s ease" }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 20, color: PALETTE.text, fontWeight: 700 }}>{firstName}</span>
                        {commonName && <span style={{ fontFamily: "'Exo 2', sans-serif", fontSize: 14, color: PALETTE.muted }}>{commonName}</span>}
                        <span style={{ background: `${typeColor}22`, color: typeColor, padding: "2px 9px", borderRadius: 4, fontSize: 11, fontFamily: "'Rajdhani', sans-serif", letterSpacing: 0.5 }}>{dsoType}</span>
                      </div>
                      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
                        {[
                          ["Sessions", totalSessions, PALETTE.gold],
                          ["Total Time", fmtTime(totalT), PALETTE.accent],
                          ["Total Subs", totalSubsAll, PALETTE.green],
                          ["Telescopes", scopes.length || "—", PALETTE.galaxy],
                        ].map(([label, val, color]) => (
                          <div key={label} style={{ background: "#0a1020", border: `1px solid ${PALETTE.border}`, borderRadius: 7, padding: "10px 16px", minWidth: 100 }}>
                            <div style={{ color: PALETTE.muted, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'Rajdhani', sans-serif", marginBottom: 4 }}>{label}</div>
                            <div style={{ color, fontSize: 20, fontFamily: "'Share Tech Mono', monospace", lineHeight: 1 }}>{val}</div>
                          </div>
                        ))}
                      </div>
                      {byScope.length > 0 && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ color: PALETTE.muted, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'Rajdhani', sans-serif", marginBottom: 8 }}>By Telescope</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {byScope.sort((a, b) => b.time - a.time).map(({ scope, sessions: sc, time }) => (
                              <div key={scope} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ width: 160, flexShrink: 0, color: PALETTE.text, fontSize: 12, fontFamily: "'Exo 2', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{scope}</div>
                                <div style={{ flex: 1, background: `${PALETTE.accent}18`, borderRadius: 3, height: 14, overflow: "hidden" }}>
                                  <div style={{ width: `${(time / totalT) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${PALETTE.accent}80, ${PALETTE.accent})`, borderRadius: 3, transition: "width 0.6s ease" }} />
                                </div>
                                <div style={{ width: 80, flexShrink: 0, textAlign: "right", color: PALETTE.accent, fontSize: 12, fontFamily: "'Share Tech Mono', monospace" }}>{fmtTime(time)}</div>
                                <div style={{ width: 60, flexShrink: 0, textAlign: "right", color: PALETTE.muted, fontSize: 11, fontFamily: "'Share Tech Mono', monospace" }}>{sc} sess.</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {matched.some(s => s.notes) && (
                        <div>
                          <div style={{ color: PALETTE.muted, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'Rajdhani', sans-serif", marginBottom: 8 }}>Session Notes</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {matched.filter(s => s.notes).map(s => (
                              <div key={s.id} style={{ background: "#0a1020", border: `1px solid ${PALETTE.border}`, borderRadius: 6, padding: "8px 12px" }}>
                                <span style={{ color: PALETTE.muted, fontSize: 11, fontFamily: "'Share Tech Mono', monospace", marginRight: 10 }}>{s.date || "—"}</span>
                                <span style={{ color: PALETTE.text, fontSize: 12, fontFamily: "'Exo 2', sans-serif" }}>{s.notes}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

            </>)}
          </div>
        )}

        {/* ── SESSION LOG ── */}
        {tab === "log" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by catalog name, common name, telescope…"
                style={{ ...inputStyle, maxWidth: 360, padding: "9px 14px" }}
              />
              <button onClick={() => { setForm({ ...EMPTY_SESSION }); setEditId(null); setTab("add"); }} style={{
                background: PALETTE.accent, color: PALETTE.bg, border: "none", borderRadius: 6,
                padding: "9px 18px", cursor: "pointer", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: 1,
              }}>+ ADD SESSION</button>
            </div>

            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: PALETTE.muted }}>
                {sessions.length === 0 ? "No sessions logged yet" : "No results match your search"}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "rgba(0,194,255,0.04)" }}>
                      <TH col="date" label="Date" />
                      <TH col="telescope" label="Telescope" />
                      <TH col="dsoName" label="Catalog Name" />
                      <TH col="dsoType" label="Type" />
                      <TH col="commonName" label="Common Name" />
                      <TH col="numSubs" label="Subs" />
                      <TH col="exposureTime" label="Exp (s)" />
                      <TH col="totalTime" label="Total Time" />
                      <th style={{ padding: "10px 14px", borderBottom: `1px solid ${PALETTE.border}` }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s, i) => (
                      <tr key={s.id} style={{
                        borderBottom: `1px solid ${PALETTE.border}`,
                        background: i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent",
                        transition: "background 0.15s",
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(56,212,255,0.1)"}
                        onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent"}
                      >
                        <td style={{ padding: "10px 14px", color: PALETTE.muted, fontFamily: "'Share Tech Mono', monospace", whiteSpace: "nowrap" }}>{s.date || "—"}</td>
                        <td style={{ padding: "10px 14px", color: PALETTE.muted }}>{s.telescope || "—"}</td>
                        <td style={{ padding: "10px 14px", fontWeight: 600, color: PALETTE.text, fontFamily: "'Share Tech Mono', monospace" }}>{s.dsoName}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ background: `${TYPE_COLORS[s.dsoType] || "#6b7280"}22`, color: TYPE_COLORS[s.dsoType] || "#6b7280", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontFamily: "'Rajdhani', sans-serif", letterSpacing: 0.5, whiteSpace: "nowrap" }}>
                            {s.dsoType}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px", color: PALETTE.text, fontStyle: s.commonName ? "normal" : "italic" }}>{s.commonName || <span style={{ color: PALETTE.muted }}>—</span>}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "'Share Tech Mono', monospace", color: PALETTE.text }}>{s.numSubs || "—"}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "'Share Tech Mono', monospace", color: PALETTE.text }}>{s.exposureTime || "—"}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "'Share Tech Mono', monospace", color: PALETTE.gold }}>{fmtTime(totalSecs(s))}</td>
                        <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                          <button onClick={() => editSession(s)} style={{ background: "none", border: `1px solid ${PALETTE.border}`, color: PALETTE.muted, cursor: "pointer", padding: "4px 10px", borderRadius: 4, marginRight: 6, fontSize: 11, fontFamily: "'Rajdhani', sans-serif" }}>EDIT</button>
                          <button onClick={() => deleteSession(s.id)} style={{ background: "none", border: `1px solid ${PALETTE.red}33`, color: PALETTE.red, cursor: "pointer", padding: "4px 10px", borderRadius: 4, fontSize: 11, fontFamily: "'Rajdhani', sans-serif" }}>DEL</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ color: PALETTE.muted, fontSize: 12, marginTop: 14, fontFamily: "'Share Tech Mono', monospace" }}>
              {filtered.length} of {sessions.length} sessions · {fmtTime(filtered.reduce((a, s) => a + totalSecs(s), 0))} total
            </div>
          </div>
        )}

        {/* ── ADD / EDIT SESSION ── */}
        {tab === "add" && (
          <div style={{ animation: "fadeIn 0.4s ease", maxWidth: 680 }}>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: PALETTE.accent, letterSpacing: 2, marginBottom: 24 }}>
              {editId ? "✦ EDIT SESSION" : "✦ LOG NEW SESSION"}
            </div>
            <div style={{ background: PALETTE.panel, border: `1px solid ${PALETTE.border}`, borderRadius: 10, padding: "28px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>

                <Field label="Capture Date">
                  <input type="date" style={inputStyle} value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </Field>

                <Field label="Telescope">
                  <input style={inputStyle} placeholder="e.g. Seestar S50, Dwarf 3"
                    value={form.telescope}
                    onChange={e => setForm(f => ({ ...f, telescope: e.target.value }))} />
                </Field>

                <Field label="DSO Catalog Name *">
                  <input style={inputStyle} placeholder="e.g. M42, NGC 7293, IC 1805"
                    value={form.dsoName}
                    onChange={e => setForm(f => ({ ...f, dsoName: e.target.value }))} />
                </Field>

                <Field label="DSO Type">
                  <select style={inputStyle} value={form.dsoType}
                    onChange={e => setForm(f => ({ ...f, dsoType: e.target.value }))}>
                    {DSO_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>

                <Field label="Common Name">
                  <input style={inputStyle} placeholder="e.g. Orion Nebula, Helix Nebula"
                    value={form.commonName}
                    onChange={e => setForm(f => ({ ...f, commonName: e.target.value }))} />
                </Field>

                <Field label="Number of Subs Saved">
                  <input type="number" style={inputStyle} placeholder="e.g. 60"
                    value={form.numSubs} min="0"
                    onChange={e => setForm(f => ({ ...f, numSubs: e.target.value }))} />
                </Field>

                <Field label="Exposure Time (seconds per sub)">
                  <input type="number" style={inputStyle} placeholder="e.g. 300"
                    value={form.exposureTime} min="0"
                    onChange={e => setForm(f => ({ ...f, exposureTime: e.target.value }))} />
                </Field>

                <Field label="Total Imaging Time">
                  <div style={{ ...inputStyle, color: PALETTE.gold, fontFamily: "'Share Tech Mono', monospace", cursor: "default" }}>
                    {fmtTime((parseFloat(form.exposureTime) || 0) * (parseInt(form.numSubs) || 0))}
                  </div>
                </Field>

              </div>

              <Field label="Notes">
                <textarea style={{ ...inputStyle, height: 80, resize: "vertical" }}
                  placeholder="Seeing conditions, moon phase, calibration frames, processing notes…"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </Field>

              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button onClick={saveSession} disabled={!form.dsoName.trim()} style={{
                  background: form.dsoName.trim() ? PALETTE.accent : PALETTE.border,
                  color: form.dsoName.trim() ? PALETTE.bg : PALETTE.muted,
                  border: "none", borderRadius: 6, padding: "11px 28px",
                  cursor: form.dsoName.trim() ? "pointer" : "default",
                  fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: 1,
                  transition: "all 0.2s",
                }}>
                  {editId ? "SAVE CHANGES" : "LOG SESSION"}
                </button>
                <button onClick={() => { setForm({ ...EMPTY_SESSION }); setEditId(null); }} style={{
                  background: "none", border: `1px solid ${PALETTE.border}`, color: PALETTE.muted,
                  borderRadius: 6, padding: "11px 20px", cursor: "pointer",
                  fontFamily: "'Rajdhani', sans-serif", fontSize: 13, letterSpacing: 1,
                }}>CLEAR</button>
                {saved && <span style={{ color: PALETTE.green, fontFamily: "'Share Tech Mono', monospace", fontSize: 13, alignSelf: "center" }}>✓ Saved</span>}
              </div>
            </div>

            {/* Quick exposure reference */}
            <div style={{ marginTop: 20, background: `${PALETTE.gold}11`, border: `1px solid ${PALETTE.gold}33`, borderRadius: 8, padding: "14px 18px" }}>
              <div style={{ color: PALETTE.gold, fontFamily: "'Rajdhani', sans-serif", fontSize: 12, letterSpacing: 1.5, marginBottom: 8 }}>QUICK EXPOSURE SHORTCUTS</div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 12, fontFamily: "'Share Tech Mono', monospace" }}>
                {[["10s", 10], ["30s", 30], ["1 min", 60], ["2 min", 120], ["3 min", 180], ["5 min", 300], ["10 min", 600]].map(([l, v]) => (
                  <span key={l} style={{ cursor: "pointer", color: PALETTE.gold }}
                    onClick={() => setForm(f => ({ ...f, exposureTime: v }))}>{l}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── IMPORT / EXPORT ── */}
        {tab === "import" && (
          <div style={{ animation: "fadeIn 0.4s ease", maxWidth: 600 }}>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: PALETTE.accent, letterSpacing: 2, marginBottom: 24 }}>
              ✦ IMPORT / EXPORT
            </div>

            {/* Import */}
            <div style={{ background: PALETTE.panel, border: `1px solid ${PALETTE.border}`, borderRadius: 10, padding: "28px", marginBottom: 20 }}>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, letterSpacing: 2, color: PALETTE.muted, marginBottom: 16 }}>IMPORT FROM EXCEL / CSV</div>
              <div
                onClick={() => fileRef.current.click()}
                style={{ border: `2px dashed ${PALETTE.border}`, borderRadius: 8, padding: "40px 20px", textAlign: "center", cursor: "pointer", transition: "border-color 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = PALETTE.accent}
                onMouseLeave={e => e.currentTarget.style.borderColor = PALETTE.border}
              >
                <div style={{ fontSize: 32, marginBottom: 10 }}>📂</div>
                <div style={{ color: PALETTE.text, marginBottom: 6, fontFamily: "'Rajdhani', sans-serif", letterSpacing: 1 }}>Click to choose .xlsx or .csv file</div>
                <div style={{ color: PALETTE.muted, fontSize: 12 }}>Accepts .xlsx, .xls, .csv</div>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: "none" }} />
              {importMsg && (
                <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 6, background: importMsg.startsWith("✓") ? `${PALETTE.green}22` : `${PALETTE.red}22`, color: importMsg.startsWith("✓") ? PALETTE.green : PALETTE.red, fontFamily: "'Share Tech Mono', monospace", fontSize: 13 }}>
                  {importMsg}
                </div>
              )}
              {/* Column reference */}
              <div style={{ marginTop: 20, background: `${PALETTE.accent}11`, border: `1px solid ${PALETTE.accent}33`, borderRadius: 8, padding: "14px 18px" }}>
                <div style={{ color: PALETTE.accent, fontFamily: "'Rajdhani', sans-serif", fontSize: 12, letterSpacing: 1.5, marginBottom: 10 }}>EXPECTED COLUMN NAMES</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", fontSize: 12, fontFamily: "'Share Tech Mono', monospace" }}>
                  {[
                    ["date", "Capture date"],
                    ["telescope", "Scope used"],
                    ["dsoName", "Catalog name (M42, etc.)"],
                    ["dsoType", "Galaxy, Nebula, etc."],
                    ["commonName", "Orion Nebula, etc."],
                    ["numSubs", "Number of subs saved"],
                    ["exposureTime", "Seconds per sub"],
                    ["notes", "Free text notes"],
                  ].map(([col, desc]) => (
                    <div key={col}>
                      <span style={{ color: PALETTE.accent }}>{col}</span>
                      <span style={{ color: PALETTE.muted, fontSize: 11 }}> — {desc}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, color: PALETTE.muted, fontSize: 11 }}>Column names are flexible — also matches "DSO Catalog Name", "Common Name", "Exposure Time (sec)", etc.</div>
              </div>
            </div>

            {/* Export */}
            <div style={{ background: PALETTE.panel, border: `1px solid ${PALETTE.border}`, borderRadius: 10, padding: "28px" }}>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, letterSpacing: 2, color: PALETTE.muted, marginBottom: 16 }}>EXPORT YOUR DATA</div>
              <button onClick={exportXLSX} disabled={sessions.length === 0} style={{
                background: sessions.length > 0 ? PALETTE.gold : PALETTE.border,
                color: sessions.length > 0 ? PALETTE.bg : PALETTE.muted,
                border: "none", borderRadius: 6, padding: "11px 28px",
                cursor: sessions.length > 0 ? "pointer" : "default",
                fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: 1, marginRight: 12,
              }}>
                ⬇ EXPORT TO EXCEL
              </button>
              <span style={{ color: PALETTE.muted, fontSize: 12, fontFamily: "'Share Tech Mono', monospace" }}>
                {sessions.length} session{sessions.length !== 1 ? "s" : ""} · {fmtTime(totalTime)}
              </span>
            </div>

            {/* Danger zone */}
            {sessions.length > 0 && (
              <div style={{ marginTop: 20, background: `${PALETTE.red}11`, border: `1px solid ${PALETTE.red}33`, borderRadius: 10, padding: "20px 28px" }}>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, letterSpacing: 2, color: PALETTE.red, marginBottom: 12 }}>DANGER ZONE</div>
                <button onClick={() => askConfirm(`Delete all ${sessions.length} sessions? This cannot be undone.`, () => { updateSessions([]); closeConfirm(); })} style={{
                  background: "none", border: `1px solid ${PALETTE.red}`, color: PALETTE.red, borderRadius: 6,
                  padding: "9px 20px", cursor: "pointer", fontFamily: "'Rajdhani', sans-serif", fontSize: 13, letterSpacing: 1,
                }}>CLEAR ALL DATA</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

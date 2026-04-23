import { useState, useEffect, useRef } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

// ── Storage (Netlify Blobs via /api/data, localStorage fallback for local dev) ─
// Set VITE_DIARY_SECRET in your .env (local) and in Netlify env vars (deployed).
// The same secret must be set as DIARY_SECRET in your Netlify site settings.
const DIARY_TOKEN = import.meta.env.VITE_DIARY_SECRET;
const USE_NETLIFY = Boolean(DIARY_TOKEN);

const storage = {
  get: async (key) => {
    if (USE_NETLIFY) {
      try {
        const res = await fetch(`/api/data?key=${encodeURIComponent(key)}`, {
          headers: { "x-diary-token": DIARY_TOKEN },
        });
        if (!res.ok) return null;
        return res.text();
      } catch { return null; }
    }
    return Promise.resolve(localStorage.getItem(key));
  },
  set: async (key, val) => {
    if (USE_NETLIFY) {
      try {
        await fetch(`/api/data?key=${encodeURIComponent(key)}`, {
          method: "POST",
          headers: { "x-diary-token": DIARY_TOKEN, "Content-Type": "application/json" },
          body: val,
        });
      } catch {}
      return;
    }
    localStorage.setItem(key, val);
    return Promise.resolve();
  },
};

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

// Telescope upgrade hierarchy — higher tier = better for most targets
const SCOPE_TIER = { "D2": 1, "D3": 2, "D3-16MB": 2, "S50": 3 };

// Full Messier catalog for completion tracking
const MESSIER = [
  {m:1,  n:"Crab Nebula",           t:"Supernova Remnant"},  {m:2,  n:"",                    t:"Globular Cluster"},
  {m:3,  n:"",                       t:"Globular Cluster"},  {m:4,  n:"",                    t:"Globular Cluster"},
  {m:5,  n:"",                       t:"Globular Cluster"},  {m:6,  n:"Butterfly Cluster",   t:"Open Cluster"},
  {m:7,  n:"Ptolemy Cluster",        t:"Open Cluster"},      {m:8,  n:"Lagoon Nebula",       t:"Emission Nebula"},
  {m:9,  n:"",                       t:"Globular Cluster"},  {m:10, n:"",                    t:"Globular Cluster"},
  {m:11, n:"Wild Duck Cluster",      t:"Open Cluster"},      {m:12, n:"",                    t:"Globular Cluster"},
  {m:13, n:"Hercules Cluster",       t:"Globular Cluster"},  {m:14, n:"",                    t:"Globular Cluster"},
  {m:15, n:"",                       t:"Globular Cluster"},  {m:16, n:"Eagle Nebula",        t:"Emission Nebula"},
  {m:17, n:"Omega Nebula",           t:"Emission Nebula"},   {m:18, n:"",                    t:"Open Cluster"},
  {m:19, n:"",                       t:"Globular Cluster"},  {m:20, n:"Trifid Nebula",       t:"Emission Nebula"},
  {m:21, n:"",                       t:"Open Cluster"},      {m:22, n:"",                    t:"Globular Cluster"},
  {m:23, n:"",                       t:"Open Cluster"},      {m:24, n:"Sagittarius Star Cloud",t:"Other"},
  {m:25, n:"",                       t:"Open Cluster"},      {m:26, n:"",                    t:"Open Cluster"},
  {m:27, n:"Dumbbell Nebula",        t:"Planetary Nebula"},  {m:28, n:"",                    t:"Globular Cluster"},
  {m:29, n:"",                       t:"Open Cluster"},      {m:30, n:"",                    t:"Globular Cluster"},
  {m:31, n:"Andromeda Galaxy",       t:"Galaxy"},            {m:32, n:"",                    t:"Galaxy"},
  {m:33, n:"Triangulum Galaxy",      t:"Galaxy"},            {m:34, n:"",                    t:"Open Cluster"},
  {m:35, n:"",                       t:"Open Cluster"},      {m:36, n:"",                    t:"Open Cluster"},
  {m:37, n:"",                       t:"Open Cluster"},      {m:38, n:"",                    t:"Open Cluster"},
  {m:39, n:"",                       t:"Open Cluster"},      {m:40, n:"Winnecke 4",          t:"Other"},
  {m:41, n:"",                       t:"Open Cluster"},      {m:42, n:"Orion Nebula",        t:"Emission Nebula"},
  {m:43, n:"De Mairan's Nebula",     t:"Emission Nebula"},   {m:44, n:"Beehive Cluster",     t:"Open Cluster"},
  {m:45, n:"Pleiades",               t:"Open Cluster"},      {m:46, n:"",                    t:"Open Cluster"},
  {m:47, n:"",                       t:"Open Cluster"},      {m:48, n:"",                    t:"Open Cluster"},
  {m:49, n:"",                       t:"Galaxy"},            {m:50, n:"",                    t:"Open Cluster"},
  {m:51, n:"Whirlpool Galaxy",       t:"Galaxy"},            {m:52, n:"",                    t:"Open Cluster"},
  {m:53, n:"",                       t:"Globular Cluster"},  {m:54, n:"",                    t:"Globular Cluster"},
  {m:55, n:"",                       t:"Globular Cluster"},  {m:56, n:"",                    t:"Globular Cluster"},
  {m:57, n:"Ring Nebula",            t:"Planetary Nebula"},  {m:58, n:"",                    t:"Galaxy"},
  {m:59, n:"",                       t:"Galaxy"},            {m:60, n:"",                    t:"Galaxy"},
  {m:61, n:"",                       t:"Galaxy"},            {m:62, n:"",                    t:"Globular Cluster"},
  {m:63, n:"Sunflower Galaxy",       t:"Galaxy"},            {m:64, n:"Black Eye Galaxy",    t:"Galaxy"},
  {m:65, n:"",                       t:"Galaxy"},            {m:66, n:"",                    t:"Galaxy"},
  {m:67, n:"",                       t:"Open Cluster"},      {m:68, n:"",                    t:"Globular Cluster"},
  {m:69, n:"",                       t:"Globular Cluster"},  {m:70, n:"",                    t:"Globular Cluster"},
  {m:71, n:"",                       t:"Globular Cluster"},  {m:72, n:"",                    t:"Globular Cluster"},
  {m:73, n:"",                       t:"Other"},             {m:74, n:"Phantom Galaxy",      t:"Galaxy"},
  {m:75, n:"",                       t:"Globular Cluster"},  {m:76, n:"Little Dumbbell",     t:"Planetary Nebula"},
  {m:77, n:"Cetus A",                t:"Galaxy"},            {m:78, n:"",                    t:"Reflection Nebula"},
  {m:79, n:"",                       t:"Globular Cluster"},  {m:80, n:"",                    t:"Globular Cluster"},
  {m:81, n:"Bode's Galaxy",          t:"Galaxy"},            {m:82, n:"Cigar Galaxy",        t:"Galaxy"},
  {m:83, n:"Southern Pinwheel",      t:"Galaxy"},            {m:84, n:"",                    t:"Galaxy"},
  {m:85, n:"",                       t:"Galaxy"},            {m:86, n:"",                    t:"Galaxy"},
  {m:87, n:"Virgo A",                t:"Galaxy"},            {m:88, n:"",                    t:"Galaxy"},
  {m:89, n:"",                       t:"Galaxy"},            {m:90, n:"",                    t:"Galaxy"},
  {m:91, n:"",                       t:"Galaxy"},            {m:92, n:"",                    t:"Globular Cluster"},
  {m:93, n:"",                       t:"Open Cluster"},      {m:94, n:"Cat's Eye Galaxy",    t:"Galaxy"},
  {m:95, n:"",                       t:"Galaxy"},            {m:96, n:"",                    t:"Galaxy"},
  {m:97, n:"Owl Nebula",             t:"Planetary Nebula"},  {m:98, n:"",                    t:"Galaxy"},
  {m:99, n:"",                       t:"Galaxy"},            {m:100,n:"",                    t:"Galaxy"},
  {m:101,n:"Pinwheel Galaxy",        t:"Galaxy"},            {m:102,n:"Spindle Galaxy",      t:"Galaxy"},
  {m:103,n:"",                       t:"Open Cluster"},      {m:104,n:"Sombrero Galaxy",     t:"Galaxy"},
  {m:105,n:"",                       t:"Galaxy"},            {m:106,n:"",                    t:"Galaxy"},
  {m:107,n:"",                       t:"Globular Cluster"},  {m:108,n:"Surfboard Galaxy",    t:"Galaxy"},
  {m:109,n:"",                       t:"Galaxy"},            {m:110,n:"",                    t:"Galaxy"},
];

const PALETTE = {
  bg: "#070a12",
  panel: "#0e1628",
  border: "#2e3d60",
  accent: "#38d4ff",
  gold: "#ffc05a",
  red: "#ff6b84",
  green: "#4eeaa0",
  text: "#edf4ff",        // near-white primary text
  muted: "#b8cce0",       // noticeably lighter — readable at small sizes
  galaxy: "#c4a8ff",
  nebula: "#4eeaa0",
  cluster: "#ffc05a",
  other: "#7ec8ff",
};

const TYPE_COLORS = {
  "Galaxy":            "#b39dfa",   // purple — lifted from #a78bfa
  "Emission Nebula":   "#f87171",
  "Reflection Nebula": "#60a5fa",
  "Planetary Nebula":  "#34d399",
  "Supernova Remnant": "#fb923c",
  "Open Cluster":      "#fbbf24",
  "Globular Cluster":  "#f9a825",   // amber — slightly warmer for contrast
  "Dark Nebula":       "#b0bec5",   // lifted from #94a3b8 — much more readable
  "Other":             "#90a4ae",   // lifted from #6b7280
};

// Fields: telescope, date, dsoName (catalog), dsoType, commonName, numSubs, exposureTime, notes, secondaries
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
  secondaries: "",   // comma-separated catalog names, e.g. "M32, M110"
};

// Parse secondaries string into a trimmed, uppercased array
const parseSecondaries = (val) =>
  val ? String(val).split(",").map(s => s.trim()).filter(Boolean) : [];

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

// Images are stored as { url, telescope } objects.
// Old entries saved as plain strings are normalised on read.
const normalizeImg = (img) =>
  typeof img === "string" ? { url: img, telescope: "" } : img;

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
  color: PALETTE.text, padding: "8px 12px", width: "100%", fontSize: 15,
  fontFamily: "'Exo 2', sans-serif", outline: "none", boxSizing: "border-box",
};
const labelStyle = {
  color: PALETTE.muted, fontSize: 13, letterSpacing: 1, textTransform: "uppercase",
  marginBottom: 5, display: "block", fontFamily: "'Rajdhani', sans-serif", fontWeight: 600,
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
    <div style={{ color: PALETTE.muted, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, marginBottom: 6 }}>{label}</div>
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
  const [objectImages, setObjectImages] = useState({}); // { "M42": ["url1","url2"], ... }
  const [imageInput, setImageInput] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [gallerySort, setGallerySort] = useState("name");
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  const [scopePickerOpen, setScopePickerOpen] = useState(null);
  const [imageScope, setImageScope] = useState("");
  const [insightsSettingsOpen, setInsightsSettingsOpen] = useState(false);
  const [insightsSettings, setInsightsSettings] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("insights-settings"));
      if (saved && typeof saved === "object") {
        return { lat: 37.33, lng: -121.89, horizonN: 20, horizonE: 25, horizonS: 15, horizonW: 30, saturationThreshold: 8 * 3600, ...saved };
      }
    } catch {}
    return { lat: 37.33, lng: -121.89, horizonN: 20, horizonE: 25, horizonS: 15, horizonW: 30, saturationThreshold: 8 * 3600 };
  });
  const [secInput, setSecInput] = useState("");
  const fileRef = useRef();

  // Responsive breakpoint listener
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Load from storage
  useEffect(() => {
    (async () => {
      try {
        const val = await storage.get("dso-sessions");
        if (val) setSessions(JSON.parse(val));
        const imgVal = await storage.get("dso-images");
        if (imgVal) setObjectImages(JSON.parse(imgVal));
      } catch {}
    })();
  }, []);

  // Persist insights settings to localStorage whenever they change
  useEffect(() => {
    try { localStorage.setItem("insights-settings", JSON.stringify(insightsSettings)); } catch {}
  }, [insightsSettings]);

  // Close scope picker on any outside click — uses document listener to avoid
  // z-index stacking context issues (overlay div approach doesn't work when the
  // content area has position:relative + zIndex:1 which traps child z-indices)
  useEffect(() => {
    if (!scopePickerOpen) return;
    const close = () => setScopePickerOpen(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [scopePickerOpen]);

  // Save to storage
  const persist = (data) => {
    try { storage.set("dso-sessions", JSON.stringify(data)); } catch {}
  };

  const persistImages = (data) => {
    try { storage.set("dso-images", JSON.stringify(data)); } catch {}
  };

  const addImage = (dsoKey, url, telescope = "") => {
    if (!url.trim()) return;
    const entry = { url: url.trim(), telescope };
    const next = { ...objectImages, [dsoKey]: [...(objectImages[dsoKey] || []), entry] };
    setObjectImages(next);
    persistImages(next);
    setImageInput("");
    setImageScope("");
  };

  const updateImageScope = (dsoKey, idx, telescope) => {
    setObjectImages(prev => {
      const imgs = (prev[dsoKey] || []).map(normalizeImg);
      const updated = imgs.map((img, i) => i === idx ? { ...img, telescope } : img);
      const next = { ...prev, [dsoKey]: updated };
      persistImages(next);
      return next;
    });
    setScopePickerOpen(null);
  };

  const removeImage = (dsoKey, idx) => {
    const next = { ...objectImages, [dsoKey]: objectImages[dsoKey].filter((_, i) => i !== idx) };
    if (next[dsoKey].length === 0) delete next[dsoKey];
    setObjectImages(next);
    persistImages(next);
  };

  const updateSessions = (newList) => { setSessions(newList); persist(newList); };

  const saveSession = () => {
    if (!form.dsoName.trim()) return;
    const entry = {
      ...form,
      id: editId || `s_${Date.now()}`,
      exposureTime: parseFloat(form.exposureTime) || 0,
      numSubs: parseInt(form.numSubs) || 0,
      secondaries: form.secondaries || "",
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
    setSecInput("");
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
    setForm({ ...EMPTY_SESSION, ...s, secondaries: s.secondaries || "" });
    setSecInput("");
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
          secondaries: r.secondaries || r.Secondaries || "",
        })).filter(r => r.dsoName);
        const next = [...sessions, ...imported];
        updateSessions(next);

        // Import Images sheet if present
        const imgSheet = wb.Sheets["Images"];
        let importedImgCount = 0;
        if (imgSheet) {
          const imgRows = XLSX.utils.sheet_to_json(imgSheet, { raw: true });
          const merged = { ...objectImages };
          imgRows.forEach(r => {
            const key = (r.dsoName || "").trim().toUpperCase();
            const url = (r.imageUrl || "").trim();
            const telescope = (r.telescope || "").trim();
            if (!key || !url) return;
            if (!merged[key]) merged[key] = [];
            const entry = { url, telescope };
            if (!merged[key].some(img => normalizeImg(img).url === url)) { merged[key].push(entry); importedImgCount++; }
          });
          setObjectImages(merged);
          persistImages(merged);
        }

        const imgNote = importedImgCount > 0 ? `, ${importedImgCount} image link${importedImgCount !== 1 ? "s" : ""}` : "";
        setImportMsg(`✓ Imported ${imported.length} session${imported.length !== 1 ? "s" : ""}${imgNote}`);
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
      secondaries: s.secondaries || "",
      exposureTime: s.exposureTime,
      numSubs: s.numSubs,
      totalTime_s: totalSecs(s),
      notes: s.notes,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sessions");

    // Images sheet — one row per URL including telescope tag
    const imageRows = Object.entries(objectImages).flatMap(([dsoName, imgs]) =>
      imgs.map(img => {
        const { url, telescope } = normalizeImg(img);
        return { dsoName, imageUrl: url, telescope };
      })
    );
    if (imageRows.length > 0) {
      const wsImg = XLSX.utils.json_to_sheet(imageRows);
      XLSX.utils.book_append_sheet(wb, wsImg, "Images");
    }

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

  // Build lookup: uppercase catalog name → dsoType from sessions where it was a primary.
  // Used to resolve secondary object types for the "Unique" breakdown and stat cards.
  const primaryTypeMap = sessions.reduce((acc, s) => {
    const k = s.dsoName.trim().toUpperCase();
    if (!acc[k]) acc[k] = s.dsoType;
    return acc;
  }, {});

  // MESSIER catalog lookup by "M<n>" key
  const messierTypeMap = MESSIER.reduce((acc, m) => { acc[`M${m.m}`] = m.t; return acc; }, {});

  // Resolve the DSO type for any catalog name (used for secondaries)
  const resolveType = (name) => {
    const key = name.trim().toUpperCase();
    if (primaryTypeMap[key]) return primaryTypeMap[key];
    if (messierTypeMap[key]) return messierTypeMap[key];
    return "Other";
  };

  const totalTime = sessions.reduce((a, s) => a + totalSecs(s), 0);

  // Sessions mode type counts — primaries only (unchanged)
  const typeCounts = sessions.reduce((acc, s) => { acc[s.dsoType] = (acc[s.dsoType] || 0) + 1; return acc; }, {});
  const typeData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));

  // Unique names — primaries + secondaries combined (for stat cards and catalog counts)
  const uniqueNames = new Set(sessions.map(s => s.dsoName.trim().toUpperCase()));
  sessions.forEach(s => parseSecondaries(s.secondaries).forEach(sec => uniqueNames.add(sec.trim().toUpperCase())));
  const uniqueObjects = uniqueNames.size;
  const messierCount = [...uniqueNames].filter(n => /^M\d+$/.test(n)).length;
  const caldwellCount = [...uniqueNames].filter(n => /^C\d+$/.test(n)).length;
  const ngcCount = [...uniqueNames].filter(n => /^NGC\s*\d+/i.test(n)).length;

  // Unique mode type counts — primaries + secondaries, type resolved via resolveType()
  const uniqueTypeCounts = sessions.reduce((acc, s) => {
    // primary
    const pk = s.dsoName.trim().toUpperCase();
    acc[s.dsoType] = acc[s.dsoType] || new Set();
    acc[s.dsoType].add(pk);
    // secondaries
    parseSecondaries(s.secondaries).forEach(sec => {
      const sk = sec.trim().toUpperCase();
      const t = resolveType(sk);
      acc[t] = acc[t] || new Set();
      acc[t].add(sk);
    });
    return acc;
  }, {});
  const uniqueTypeData = Object.entries(uniqueTypeCounts).map(([name, set]) => ({ name, value: set.size }));
  const telescopeTimes = sessions.reduce((acc, s) => {
    const k = s.telescope || "Unknown";
    acc[k] = (acc[k] || 0) + totalSecs(s) / 3600;
    return acc;
  }, {});
  const telesData = Object.entries(telescopeTimes).map(([name, hours]) => ({ name, hours: parseFloat(hours.toFixed(2)) }));

  // Unique telescope names for the top-targets filter
  const telescopeNames = ["All", ...Array.from(new Set(sessions.map(s => s.telescope).filter(Boolean))).sort()];
  const scopeOptions   = Array.from(new Set(sessions.map(s => s.telescope).filter(Boolean))).sort();

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
    s.telescope?.toLowerCase().includes(search.toLowerCase()) ||
    (s.secondaries && s.secondaries.toLowerCase().includes(search.toLowerCase()))
  ).sort((a, b) => {
    let av = a[sortCol], bv = b[sortCol];
    if (sortCol === "totalTime") { av = totalSecs(a); bv = totalSecs(b); }
    if (typeof av === "string") return sortDir * av.localeCompare(bv);
    return sortDir * ((av || 0) - (bv || 0));
  });

  const sortBy = (col) => { if (sortCol === col) setSortDir(d => -d); else { setSortCol(col); setSortDir(-1); } };

  const navItems = [
    { id: "dashboard", label: "Dashboard",                             short: "Dash",    icon: "◈" },
    { id: "log",       label: "Session Log",                           short: "Log",     icon: "≡" },
    { id: "add",       label: editId ? "Edit Session" : "Add Session", short: editId ? "Edit" : "Add", icon: "⊕" },
    { id: "gallery",   label: "Gallery",                               short: "Gallery", icon: "⊞" },
    { id: "insights",  label: "Insights",                              short: "Insights",icon: "◎" },
    { id: "import",    label: "Import / Export",                       short: "I/O",     icon: "⇅" },
  ];

  const TH = ({ col, label }) => (
    <th onClick={() => sortBy(col)} style={{
      padding: "10px 14px", textAlign: "left", cursor: "pointer", userSelect: "none",
      color: sortCol === col ? PALETTE.accent : PALETTE.muted,
      fontSize: 12, letterSpacing: 1, textTransform: "uppercase",
      fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, whiteSpace: "nowrap",
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

      {/* ── Lightbox ── */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 2000,
            background: "rgba(0,0,0,0.92)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            style={{
              position: "absolute", top: 20, right: 24,
              background: "none", border: "none", color: "white",
              fontSize: 32, cursor: "pointer", lineHeight: 1, opacity: 0.7,
            }}
          >✕</button>
          <img
            src={lightboxUrl}
            alt="DSO image"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: "92vw", maxHeight: "88vh",
              objectFit: "contain", borderRadius: 8,
              boxShadow: "0 0 60px rgba(0,0,0,0.8)",
            }}
            onError={e => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
          <div style={{
            display: "none", flexDirection: "column", alignItems: "center", gap: 16,
            color: "white", textAlign: "center",
          }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 48 }}>🔗</div>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 16, letterSpacing: 2, opacity: 0.7 }}>
              IMAGE CAN&#x2019;T BE DISPLAYED DIRECTLY
            </div>
            <a
              href={lightboxUrl} target="_blank" rel="noreferrer"
              style={{
                color: "#38d4ff", fontFamily: "'Rajdhani', sans-serif",
                fontSize: 14, letterSpacing: 1, textDecoration: "none",
                border: "1px solid #38d4ff", borderRadius: 6, padding: "8px 20px",
              }}
            >OPEN IN NEW TAB</a>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ position: "relative", zIndex: 10, borderBottom: `1px solid ${PALETTE.border}`, background: "rgba(7,10,18,0.9)", backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "0 16px" : "0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "12px 0" : "16px 0 0" }}>
            <div>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: isMobile ? 20 : 26, fontWeight: 700, color: PALETTE.accent, letterSpacing: 3, lineHeight: 1 }}>
                ✦ Alice's Astro Diary
              </div>
              <div style={{ color: PALETTE.muted, fontSize: 11, letterSpacing: 2, marginTop: 2 }}>DEEP SKY IMAGING JOURNAL</div>
            </div>
            <div style={{ color: PALETTE.muted, fontSize: 12, textAlign: "right", fontFamily: "'Share Tech Mono', monospace" }}>
              <div style={{ color: PALETTE.gold }}>{sessions.length} sessions</div>
              <div>{fmtTime(totalTime)} total</div>
            </div>
          </div>
          {/* Nav — desktop only; mobile uses fixed bottom bar */}
          {!isMobile && (
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
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: isMobile ? "20px 16px 100px" : "30px 20px" }}>

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
                        <div style={{ marginBottom: 16 }}>
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

                      {/* ── Images ── */}
                      {(() => {
                        const dsoKey = firstName.trim().toUpperCase();
                        const imgs = (objectImages[dsoKey] || []).map(normalizeImg);
                        return (
                          <div>
                            <div style={{ color: PALETTE.muted, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'Rajdhani', sans-serif", marginBottom: 10 }}>Images</div>
                            {imgs.length > 0 && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                                {imgs.map((imgData, idx) => {
                                  const isPickerOpen = scopePickerOpen?.dsoKey === dsoKey && scopePickerOpen?.idx === idx;
                                  return (
                                    <div key={idx} style={{ position: "relative", borderRadius: 6, overflow: "visible", border: `1px solid ${PALETTE.border}`, cursor: "pointer" }}
                                      onClick={() => setLightboxUrl(imgData.url)}
                                    >
                                      <div style={{ borderRadius: 6, overflow: "hidden", width: 140, height: 100 }}>
                                        <img
                                          src={imgData.url} alt={`${firstName} ${idx + 1}`}
                                          style={{ width: 140, height: 100, objectFit: "cover", display: "block" }}
                                          onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                                        />
                                        <div style={{ display: "none", width: 140, height: 100, background: "#0a1020", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6, padding: 10, boxSizing: "border-box" }}>
                                          <div style={{ fontSize: 22 }}>🔗</div>
                                          <div style={{ color: PALETTE.accent, fontSize: 11, fontFamily: "'Rajdhani', sans-serif", letterSpacing: 1, textAlign: "center", wordBreak: "break-all", lineHeight: 1.3 }}>
                                            {(() => { try { return new URL(imgData.url).hostname.replace("www.", ""); } catch { return "Open link"; } })()}
                                          </div>
                                        </div>
                                      </div>
                                      {/* Remove button */}
                                      <button
                                        onClick={e => { e.stopPropagation(); removeImage(dsoKey, idx); }}
                                        style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.7)", border: "none", borderRadius: 3, color: PALETTE.red, cursor: "pointer", fontSize: 13, lineHeight: 1, padding: "2px 5px", zIndex: 5 }}
                                      >✕</button>
                                      {/* Scope badge */}
                                      <div style={{ position: "absolute", bottom: 4, left: 4, zIndex: 45 }} onClick={e => e.stopPropagation()}>
                                        <button
                                          onClick={() => setScopePickerOpen(isPickerOpen ? null : { dsoKey, idx })}
                                          style={{
                                            background: imgData.telescope ? "rgba(56,212,255,0.2)" : "rgba(255,192,90,0.25)",
                                            border: `1px solid ${imgData.telescope ? PALETTE.accent + "60" : PALETTE.gold + "60"}`,
                                            borderRadius: 3, padding: "1px 5px", cursor: "pointer",
                                            color: imgData.telescope ? PALETTE.accent : PALETTE.gold,
                                            fontSize: 10, fontFamily: "'Rajdhani', sans-serif", letterSpacing: 0.5, whiteSpace: "nowrap",
                                          }}
                                        >{imgData.telescope || "+ scope"}</button>
                                        {isPickerOpen && (
                                          <div style={{ position: "absolute", bottom: "100%", left: 0, marginBottom: 4, background: PALETTE.panel, border: `1px solid ${PALETTE.border}`, borderRadius: 6, overflow: "hidden", minWidth: 150, zIndex: 50, boxShadow: "0 4px 16px rgba(0,0,0,0.6)" }}>
                                            {scopeOptions.map(sc => (
                                              <button key={sc} onClick={e => { e.stopPropagation(); updateImageScope(dsoKey, idx, sc); }} style={{ display: "block", width: "100%", background: imgData.telescope === sc ? `${PALETTE.accent}20` : "none", border: "none", padding: "7px 12px", cursor: "pointer", textAlign: "left", color: imgData.telescope === sc ? PALETTE.accent : PALETTE.text, fontSize: 12, fontFamily: "'Rajdhani', sans-serif", letterSpacing: 0.5 }}>{sc}</button>
                                            ))}
                                            {!scopeOptions.length && <div style={{ padding: "7px 12px", color: PALETTE.muted, fontSize: 11, fontFamily: "'Rajdhani', sans-serif" }}>No telescopes in log yet</div>}
                                            {imgData.telescope && (
                                              <button onClick={e => { e.stopPropagation(); updateImageScope(dsoKey, idx, ""); }} style={{ display: "block", width: "100%", background: "none", border: "none", borderTop: `1px solid ${PALETTE.border}`, padding: "6px 12px", cursor: "pointer", textAlign: "left", color: PALETTE.muted, fontSize: 11, fontFamily: "'Rajdhani', sans-serif" }}>Remove tag</button>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {/* Add image row — URL + scope picker + button */}
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <input
                                value={imageInput}
                                onChange={e => setImageInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && addImage(dsoKey, imageInput, imageScope)}
                                placeholder="Paste image URL…"
                                style={{ ...inputStyle, flex: "1 1 180px", padding: "7px 12px", fontSize: 13 }}
                              />
                              <select
                                value={imageScope}
                                onChange={e => setImageScope(e.target.value)}
                                style={{ ...inputStyle, flex: "0 0 auto", padding: "7px 10px", fontSize: 12, color: imageScope ? PALETTE.text : PALETTE.muted }}
                              >
                                <option value="">No scope</option>
                                {scopeOptions.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                              </select>
                              <button
                                onClick={() => addImage(dsoKey, imageInput, imageScope)}
                                disabled={!imageInput.trim()}
                                style={{
                                  background: imageInput.trim() ? PALETTE.accent : PALETTE.border,
                                  color: imageInput.trim() ? PALETTE.bg : PALETTE.muted,
                                  border: "none", borderRadius: 6, padding: "7px 16px", cursor: imageInput.trim() ? "pointer" : "default",
                                  fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: 1, whiteSpace: "nowrap",
                                }}
                              >ADD</button>
                            </div>
                          </div>
                        );
                      })()}
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
                        <td style={{ padding: "10px 14px", color: PALETTE.muted, fontFamily: "'Share Tech Mono', monospace", whiteSpace: "nowrap", fontSize: 13 }}>{s.date || "—"}</td>
                        <td style={{ padding: "10px 14px", color: PALETTE.text, fontSize: 13 }}>{s.telescope || "—"}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ fontWeight: 700, color: PALETTE.text, fontFamily: "'Share Tech Mono', monospace", fontSize: 14 }}>{s.dsoName}</span>
                          {parseSecondaries(s.secondaries).length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 4 }}>
                              {parseSecondaries(s.secondaries).map(sec => (
                                <span key={sec} style={{ background: `${PALETTE.accent}15`, border: `1px solid ${PALETTE.accent}40`, color: PALETTE.accent, borderRadius: 3, padding: "0px 5px", fontSize: 10, fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, letterSpacing: 0.5 }}>{sec}</span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ background: `${TYPE_COLORS[s.dsoType] || "#90a4ae"}30`, color: TYPE_COLORS[s.dsoType] || "#90a4ae", padding: "3px 9px", borderRadius: 4, fontSize: 12, fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, letterSpacing: 0.5, whiteSpace: "nowrap" }}>
                            {s.dsoType}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px", color: PALETTE.text, fontSize: 13, fontStyle: s.commonName ? "normal" : "italic" }}>{s.commonName || <span style={{ color: PALETTE.muted }}>—</span>}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "'Share Tech Mono', monospace", color: PALETTE.text, fontSize: 13 }}>{s.numSubs || "—"}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "'Share Tech Mono', monospace", color: PALETTE.text, fontSize: 13 }}>{s.exposureTime || "—"}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "'Share Tech Mono', monospace", color: PALETTE.gold, fontSize: 13 }}>{fmtTime(totalSecs(s))}</td>
                        <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                          <button onClick={() => editSession(s)} style={{ background: "none", border: `1px solid ${PALETTE.border}`, color: PALETTE.muted, cursor: "pointer", padding: "4px 10px", borderRadius: 4, marginRight: 6, fontSize: 12, fontFamily: "'Rajdhani', sans-serif" }}>EDIT</button>
                          <button onClick={() => deleteSession(s.id)} style={{ background: "none", border: `1px solid ${PALETTE.red}55`, color: PALETTE.red, cursor: "pointer", padding: "4px 10px", borderRadius: 4, fontSize: 12, fontFamily: "'Rajdhani', sans-serif" }}>DEL</button>
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

              {/* Secondaries — full width below grid */}
              <Field label="Secondary Objects (also in frame)">
                <div>
                  {parseSecondaries(form.secondaries).length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                      {parseSecondaries(form.secondaries).map(sec => (
                        <span key={sec} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: `${PALETTE.accent}18`, border: `1px solid ${PALETTE.accent}50`, color: PALETTE.accent, borderRadius: 4, padding: "3px 8px", fontSize: 13, fontFamily: "'Rajdhani', sans-serif", fontWeight: 600 }}>
                          {sec}
                          <span
                            onClick={() => {
                              const updated = parseSecondaries(form.secondaries).filter(x => x !== sec).join(", ");
                              setForm(f => ({ ...f, secondaries: updated }));
                            }}
                            style={{ cursor: "pointer", opacity: 0.7, fontSize: 12, lineHeight: 1 }}>✕</span>
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      style={{ ...inputStyle, flex: 1 }}
                      placeholder="e.g. M32  then press Enter or Add"
                      value={secInput}
                      onChange={e => setSecInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && secInput.trim()) {
                          e.preventDefault();
                          const tag = secInput.trim().toUpperCase();
                          const existing = parseSecondaries(form.secondaries);
                          if (!existing.includes(tag)) {
                            setForm(f => ({ ...f, secondaries: [...existing, tag].join(", ") }));
                          }
                          setSecInput("");
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!secInput.trim()) return;
                        const tag = secInput.trim().toUpperCase();
                        const existing = parseSecondaries(form.secondaries);
                        if (!existing.includes(tag)) {
                          setForm(f => ({ ...f, secondaries: [...existing, tag].join(", ") }));
                        }
                        setSecInput("");
                      }}
                      style={{ background: PALETTE.border, color: PALETTE.text, border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: 1, whiteSpace: "nowrap" }}
                    >ADD</button>
                  </div>
                </div>
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
                <button onClick={() => { setForm({ ...EMPTY_SESSION }); setEditId(null); setSecInput(""); }} style={{
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

        {/* ── GALLERY ── */}
        {tab === "gallery" && (() => {
          const imageEntries = Object.entries(objectImages); // [["M42", ["url1",...]], ...]

          // Build a lookup of DSO metadata from sessions
          const dsoMeta = {};
          sessions.forEach(s => {
            const key = s.dsoName.trim().toUpperCase();
            if (!dsoMeta[key]) {
              dsoMeta[key] = { dsoName: s.dsoName, commonName: s.commonName || "", dsoType: s.dsoType, totalTime: 0, latestDate: "", byScope: {} };
            }
            const t = totalSecs(s);
            dsoMeta[key].totalTime += t;
            const sc = s.telescope || "";
            if (sc) dsoMeta[key].byScope[sc] = (dsoMeta[key].byScope[sc] || 0) + t;
            if (!dsoMeta[key].commonName && s.commonName) dsoMeta[key].commonName = s.commonName;
            if (s.date && s.date > dsoMeta[key].latestDate) dsoMeta[key].latestDate = s.date;
          });

          const totalImageCount = imageEntries.reduce((a, [, urls]) => a + urls.length, 0);

          return (
            <div style={{ animation: "fadeIn 0.4s ease" }}>
              {/* Header row */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: totalImageCount > 0 ? 10 : 0 }}>
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: PALETTE.accent, letterSpacing: 2 }}>
                    ✦ IMAGE GALLERY
                  </div>
                  {imageEntries.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: PALETTE.muted, fontSize: 11, fontFamily: "'Rajdhani', sans-serif", letterSpacing: 1.5, textTransform: "uppercase" }}>Sort</span>
                      <div style={{ display: "flex", background: "#0a1020", border: `1px solid ${PALETTE.border}`, borderRadius: 6, overflow: "hidden" }}>
                        {[["name", "Name"], ["type", "DSO Type"], ["telescope", "Telescope"]].map(([mode, label]) => (
                          <button key={mode} onClick={() => setGallerySort(mode)} style={{
                            background: gallerySort === mode ? PALETTE.accent : "none",
                            color: gallerySort === mode ? PALETTE.bg : PALETTE.muted,
                            border: "none", padding: "6px 14px", cursor: "pointer",
                            fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 700,
                            letterSpacing: 1, transition: "all 0.15s", whiteSpace: "nowrap",
                          }}>{label}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {totalImageCount > 0 && (
                  <div style={{ color: PALETTE.muted, fontSize: 12, fontFamily: "'Share Tech Mono', monospace" }}>
                    {totalImageCount} image{totalImageCount !== 1 ? "s" : ""} across {imageEntries.length} object{imageEntries.length !== 1 ? "s" : ""}
                  </div>
                )}
              </div>

              {imageEntries.length === 0 ? (
                // Empty state
                <div style={{ textAlign: "center", padding: "80px 0", color: PALETTE.muted }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🖼️</div>
                  <div style={{ fontSize: 18, fontFamily: "'Rajdhani', sans-serif", letterSpacing: 2, marginBottom: 8 }}>NO IMAGES YET</div>
                  <div style={{ fontSize: 13, maxWidth: 340, margin: "0 auto", lineHeight: 1.7 }}>
                    Add image URLs from the <span style={{ color: PALETTE.accent }}>Dashboard</span> — search for an object in the Object Lookup panel and paste your AstroBin or image links there.
                  </div>
                  <button onClick={() => setTab("dashboard")} style={{
                    marginTop: 24, background: PALETTE.accent, color: PALETTE.bg, border: "none",
                    borderRadius: 6, padding: "10px 24px", cursor: "pointer",
                    fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: 1,
                  }}>GO TO DASHBOARD</button>
                </div>
              ) : (
                // Object cards grid
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
                  {imageEntries
                    .sort((a, b) => {
                      const ma = dsoMeta[a[0]] || { dsoName: a[0], commonName: "", dsoType: "Other", totalTime: 0, latestDate: "", byScope: {} };
                      const mb = dsoMeta[b[0]] || { dsoName: b[0], commonName: "", dsoType: "Other", totalTime: 0, latestDate: "", byScope: {} };
                      if (gallerySort === "name") return ma.dsoName.localeCompare(mb.dsoName);
                      if (gallerySort === "type") {
                        const tc = ma.dsoType.localeCompare(mb.dsoType);
                        return tc !== 0 ? tc : ma.dsoName.localeCompare(mb.dsoName);
                      }
                      if (gallerySort === "telescope") {
                        // Sort by the first tagged telescope on each entry (alphabetical), untagged last
                        const taA = a[1].map(normalizeImg).map(i => i.telescope).filter(Boolean).sort()[0] || "zzz";
                        const taB = b[1].map(normalizeImg).map(i => i.telescope).filter(Boolean).sort()[0] || "zzz";
                        const tc = taA.localeCompare(taB);
                        return tc !== 0 ? tc : ma.dsoName.localeCompare(mb.dsoName);
                      }
                      return 0;
                    })
                    .map(([dsoKey, rawImgs]) => {
                      const imgs = rawImgs.map(normalizeImg);
                      const meta = dsoMeta[dsoKey] || { dsoName: dsoKey, commonName: "", dsoType: "Other", totalTime: 0, byScope: {} };
                      const typeColor = TYPE_COLORS[meta.dsoType] || "#6b7280";

                      // Scopes that appear in tagged images — used for the card header time lines
                      const taggedScopes = [...new Set(imgs.map(i => i.telescope).filter(Boolean))];
                      const untaggedCount = imgs.filter(i => !i.telescope).length;

                      return (
                        <div key={dsoKey} style={{
                          background: PALETTE.panel,
                          border: `1px solid ${PALETTE.border}`,
                          borderTop: `2px solid ${typeColor}`,
                          borderRadius: 10,
                          overflow: "visible",
                          animation: "fadeIn 0.4s ease",
                        }}>
                          {/* Card header */}
                          <div style={{ padding: "14px 16px 10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 16, color: PALETTE.text, fontWeight: 700 }}>
                                {meta.dsoName}
                              </span>
                              {meta.commonName && (
                                <span style={{ fontFamily: "'Exo 2', sans-serif", fontSize: 12, color: PALETTE.muted }}>
                                  {meta.commonName}
                                </span>
                              )}
                              <span style={{
                                marginLeft: "auto",
                                background: `${typeColor}22`, color: typeColor,
                                padding: "2px 8px", borderRadius: 4,
                                fontSize: 10, fontFamily: "'Rajdhani', sans-serif", letterSpacing: 0.5, whiteSpace: "nowrap",
                              }}>
                                {meta.dsoType}
                              </span>
                            </div>
                            {/* Per-scope integration time — only for scopes with a tagged image */}
                            <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>
                              {taggedScopes.map(sc => (
                                <div key={sc} style={{ fontSize: 11, fontFamily: "'Share Tech Mono', monospace", color: PALETTE.muted }}>
                                  <span style={{ color: PALETTE.gold }}>{fmtTime(meta.byScope[sc] || 0)}</span>
                                  <span style={{ color: PALETTE.muted }}> · {sc}</span>
                                </div>
                              ))}
                              {untaggedCount > 0 && (
                                <div style={{ fontSize: 11, fontFamily: "'Rajdhani', sans-serif", color: PALETTE.gold, letterSpacing: 0.5 }}>
                                  {untaggedCount} image{untaggedCount !== 1 ? "s" : ""} — tap badge to tag scope
                                </div>
                              )}
                              {taggedScopes.length === 0 && untaggedCount === 0 && null}
                            </div>
                          </div>

                          {/* Image grid */}
                          <div style={{
                            display: "grid",
                            gridTemplateColumns: imgs.length === 1 ? "1fr" : imgs.length === 2 ? "1fr 1fr" : "1fr 1fr 1fr",
                            gap: 2,
                            padding: "0 2px 2px",
                            borderRadius: "0 0 8px 8px",
                            overflow: "visible",
                          }}>
                            {imgs.map((imgData, idx) => {
                              const isFirst = idx === 0;
                              const imgHeight = imgs.length === 1 ? 220 : imgs.length === 2 ? 160 : idx === 0 && imgs.length > 3 ? 160 : 120;
                              const isPickerOpen = scopePickerOpen?.dsoKey === dsoKey && scopePickerOpen?.idx === idx;
                              return (
                                <div
                                  key={idx}
                                  onClick={() => setLightboxUrl(imgData.url)}
                                  style={{
                                    position: "relative",
                                    cursor: "pointer",
                                    borderRadius: idx === 0 ? "0 0 0 8px" : idx === imgs.length - 1 ? "0 0 8px 0" : 0,
                                    overflow: "visible",
                                    background: "#0a1020",
                                    gridColumn: isFirst && imgs.length === 3 ? "span 1" : undefined,
                                  }}
                                >
                                  <div style={{ borderRadius: idx === 0 ? "0 0 0 8px" : idx === imgs.length - 1 ? "0 0 8px 0" : 0, overflow: "hidden", height: imgHeight }}>
                                    <img
                                      src={imgData.url}
                                      alt={`${meta.dsoName} ${idx + 1}`}
                                      style={{ width: "100%", height: imgHeight, objectFit: "cover", display: "block", transition: "transform 0.3s ease" }}
                                      onMouseEnter={e => e.target.style.transform = "scale(1.04)"}
                                      onMouseLeave={e => e.target.style.transform = "scale(1)"}
                                      onError={e => {
                                        e.target.style.display = "none";
                                        e.target.nextSibling.style.display = "flex";
                                      }}
                                    />
                                    {/* Fallback for non-embeddable links */}
                                    <div style={{
                                      display: "none",
                                      width: "100%", height: imgHeight,
                                      background: "#0a1020",
                                      alignItems: "center", justifyContent: "center",
                                      flexDirection: "column", gap: 6, padding: 10,
                                      boxSizing: "border-box",
                                    }}>
                                      <div style={{ fontSize: 24 }}>🔗</div>
                                      <div style={{ color: PALETTE.accent, fontSize: 11, fontFamily: "'Rajdhani', sans-serif", letterSpacing: 1, textAlign: "center" }}>
                                        {(() => { try { return new URL(imgData.url).hostname.replace("www.", ""); } catch { return "Link"; } })()}
                                      </div>
                                      <a
                                        href={imgData.url} target="_blank" rel="noreferrer"
                                        onClick={e => e.stopPropagation()}
                                        style={{
                                          color: PALETTE.accent, fontSize: 10,
                                          fontFamily: "'Rajdhani', sans-serif", letterSpacing: 1,
                                          textDecoration: "none", border: `1px solid ${PALETTE.accent}44`,
                                          borderRadius: 4, padding: "3px 8px", marginTop: 2,
                                        }}
                                      >OPEN ↗</a>
                                    </div>
                                    {/* Hover overlay */}
                                    <div style={{
                                      position: "absolute", inset: 0,
                                      background: "rgba(0,0,0,0)",
                                      transition: "background 0.2s",
                                      display: "flex", alignItems: "center", justifyContent: "center",
                                    }}
                                      onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.25)"}
                                      onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0)"}
                                    />
                                  </div>

                                  {/* Scope badge — bottom-left, outside overflow:hidden wrapper */}
                                  <div style={{ position: "absolute", bottom: 6, left: 6, zIndex: 45 }} onClick={e => e.stopPropagation()}>
                                    <button
                                      onClick={() => setScopePickerOpen(isPickerOpen ? null : { dsoKey, idx })}
                                      style={{
                                        background: imgData.telescope ? "rgba(56,212,255,0.2)" : "rgba(255,192,90,0.28)",
                                        border: `1px solid ${imgData.telescope ? PALETTE.accent + "55" : PALETTE.gold + "55"}`,
                                        borderRadius: 3, padding: "2px 6px", cursor: "pointer",
                                        color: imgData.telescope ? PALETTE.accent : PALETTE.gold,
                                        fontSize: 10, fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, letterSpacing: 0.5,
                                        whiteSpace: "nowrap", backdropFilter: "blur(4px)",
                                      }}
                                    >{imgData.telescope || "+ scope"}</button>

                                    {isPickerOpen && (
                                      <div style={{
                                        position: "absolute", bottom: "100%", left: 0, marginBottom: 4,
                                        background: PALETTE.panel, border: `1px solid ${PALETTE.border}`,
                                        borderRadius: 6, overflow: "hidden", minWidth: 160, zIndex: 50,
                                        boxShadow: "0 4px 20px rgba(0,0,0,0.7)",
                                      }}>
                                        {scopeOptions.map(sc => (
                                          <button key={sc} onClick={e => { e.stopPropagation(); updateImageScope(dsoKey, idx, sc); }} style={{
                                            display: "block", width: "100%",
                                            background: imgData.telescope === sc ? `${PALETTE.accent}20` : "none",
                                            border: "none", padding: "8px 14px", cursor: "pointer",
                                            textAlign: "left",
                                            color: imgData.telescope === sc ? PALETTE.accent : PALETTE.text,
                                            fontSize: 12, fontFamily: "'Rajdhani', sans-serif", letterSpacing: 0.5,
                                          }}>{sc}</button>
                                        ))}
                                        {!scopeOptions.length && (
                                          <div style={{ padding: "8px 14px", color: PALETTE.muted, fontSize: 11, fontFamily: "'Rajdhani', sans-serif" }}>No telescopes in log</div>
                                        )}
                                        {imgData.telescope && (
                                          <button onClick={e => { e.stopPropagation(); updateImageScope(dsoKey, idx, ""); }} style={{
                                            display: "block", width: "100%", background: "none",
                                            border: "none", borderTop: `1px solid ${PALETTE.border}`,
                                            padding: "7px 14px", cursor: "pointer", textAlign: "left",
                                            color: PALETTE.muted, fontSize: 11, fontFamily: "'Rajdhani', sans-serif",
                                          }}>Remove tag</button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── INSIGHTS ── */}
        {tab === "insights" && (() => {
          // ── Per-object analysis ────────────────────────────────────────────
          // Build per-primary object map (integration time from primaries only)
          const objMap = {};
          sessions.forEach(s => {
            const key = s.dsoName.trim().toUpperCase();
            if (!objMap[key]) objMap[key] = { dsoName: s.dsoName, commonName: s.commonName || "", dsoType: s.dsoType, sessions: [], totalTime: 0, isSecondaryOnly: false };
            objMap[key].totalTime += totalSecs(s);
            objMap[key].sessions.push(s);
            if (s.commonName && !objMap[key].commonName) objMap[key].commonName = s.commonName;
          });
          // Add secondary-only objects (zero integration time, no dedicated sessions)
          sessions.forEach(s => {
            parseSecondaries(s.secondaries).forEach(sec => {
              const key = sec.trim().toUpperCase();
              if (!objMap[key]) {
                objMap[key] = { dsoName: sec, commonName: "", dsoType: "Other", sessions: [], totalTime: 0, isSecondaryOnly: true };
              }
            });
          });

          const candidates = Object.values(objMap).map(obj => {
            const scopes = [...new Set(obj.sessions.map(s => s.telescope).filter(Boolean))];
            const tiers  = scopes.map(sc => SCOPE_TIER[sc] || 0);
            const maxTier = tiers.length ? Math.max(...tiers) : 0;
            const exps    = obj.sessions.map(s => parseFloat(s.exposureTime) || 0).filter(x => x > 0);
            const minExp  = exps.length ? Math.min(...exps) : 0;
            const dates   = obj.sessions.map(s => s.date).filter(Boolean).sort();
            const lastDate = dates[dates.length - 1] || "";
            const daysSince = lastDate ? (Date.now() - new Date(lastDate)) / 86400000 : 9999;

            const shortSubs  = minExp > 0 && minExp < 30;
            const noD3orS50  = maxTier < 2;
            const noS50      = maxTier < 3 && !noD3orS50;
            const lowTime    = obj.totalTime < saturationThreshold;
            const stale      = daysSince > 365;

            let score = 0;
            if (obj.isSecondaryOnly) score += 4; // never targeted — high priority
            else {
              if (shortSubs) score += 2;
              if (noD3orS50)  score += 3;
              else if (noS50) score += 1;
              if (lowTime)    score += Math.round(3 * Math.max(0, 1 - obj.totalTime / saturationThreshold));
              if (stale)      score += 1;
            }

            return { ...obj, scopes, maxTier, minExp, lastDate, daysSince, shortSubs, noD3orS50, noS50, lowTime, stale, score };
          }).filter(c => c.score > 0).sort((a, b) => b.score - a.score);

          // ── Messier completion — primaries + secondaries both count ─────────
          const loggedM = new Set();
          sessions.forEach(s => {
            const hit = s.dsoName.trim().toUpperCase().match(/^M(\d{1,3})$/);
            if (hit) loggedM.add(parseInt(hit[1]));
            parseSecondaries(s.secondaries).forEach(sec => {
              const sh = sec.trim().toUpperCase().match(/^M(\d{1,3})$/);
              if (sh) loggedM.add(parseInt(sh[1]));
            });
          });
          const messierDone    = MESSIER.filter(m => loggedM.has(m.m));
          const messierMissing = MESSIER.filter(m => !loggedM.has(m.m));

          const { lat, lng, horizonN, horizonE, horizonS, horizonW, saturationThreshold } = insightsSettings;
          const setSetting = (key, val) => setInsightsSettings(s => ({ ...s, [key]: val }));
          const threshHours = Math.round(saturationThreshold / 3600);

          // helper: small signal badge
          const SigBadge = ({ label, color, bg }) => (
            <span style={{ background: bg, color, border: `1px solid ${color}55`, borderRadius: 3, padding: "2px 7px", fontSize: 11, fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, letterSpacing: 0.5, whiteSpace: "nowrap" }}>{label}</span>
          );

          // helper: compact number input for settings
          const SettingNum = ({ label, value, onChange, step = 1, min, max, unit = "" }) => (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 80 }}>
              <div style={{ color: PALETTE.muted, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'Rajdhani', sans-serif" }}>{label}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input
                  type="number" value={value} step={step} min={min} max={max}
                  onChange={e => onChange(parseFloat(e.target.value) || 0)}
                  style={{ ...inputStyle, width: 72, padding: "5px 8px", fontSize: 13, fontFamily: "'Share Tech Mono', monospace" }}
                />
                {unit && <span style={{ color: PALETTE.muted, fontSize: 11, fontFamily: "'Rajdhani', sans-serif" }}>{unit}</span>}
              </div>
            </div>
          );

          return (
            <div style={{ animation: "fadeIn 0.4s ease" }}>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: PALETTE.accent, letterSpacing: 2, marginBottom: 6 }}>
                ✦ INSIGHTS
              </div>

              {sessions.length === 0 ? (
                <div style={{ textAlign: "center", padding: "80px 0", color: PALETTE.muted }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🔭</div>
                  <div style={{ fontSize: 16, fontFamily: "'Rajdhani', sans-serif", letterSpacing: 2 }}>NO SESSIONS YET</div>
                </div>
              ) : (<>

                {/* ── Settings panel ── */}
                <div style={{ background: PALETTE.panel, border: `1px solid ${PALETTE.border}`, borderRadius: 10, marginBottom: 20, overflow: "hidden" }}>
                  {/* Header / toggle */}
                  <button
                    onClick={() => setInsightsSettingsOpen(o => !o)}
                    style={{
                      width: "100%", background: "none", border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 10, padding: "13px 20px",
                      color: insightsSettingsOpen ? PALETTE.accent : PALETTE.muted,
                      fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 1.5,
                      textTransform: "uppercase", textAlign: "left",
                      borderBottom: insightsSettingsOpen ? `1px solid ${PALETTE.border}` : "none",
                      transition: "color 0.2s",
                    }}
                  >
                    <span style={{ fontSize: 15 }}>⚙</span>
                    <span>Settings</span>
                    <span style={{ marginLeft: "auto", fontSize: 14, opacity: 0.6, transition: "transform 0.2s", display: "inline-block", transform: insightsSettingsOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                  </button>

                  {/* Body */}
                  {insightsSettingsOpen && (
                    <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 20 }}>

                      {/* Location */}
                      <div>
                        <div style={{ color: PALETTE.muted, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'Rajdhani', sans-serif", marginBottom: 10 }}>Observer Location</div>
                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                          <SettingNum label="Latitude" value={lat}  onChange={v => setSetting("lat",  v)} step={0.01} min={-90}  max={90}  unit="°N" />
                          <SettingNum label="Longitude" value={lng} onChange={v => setSetting("lng",  v)} step={0.01} min={-180} max={180} unit="°E" />
                        </div>
                        <div style={{ marginTop: 6, color: PALETTE.muted, fontSize: 11, fontFamily: "'Exo 2', sans-serif" }}>
                          Default: San Jose, CA (37.33°N, −121.89°E)
                        </div>
                      </div>

                      {/* Horizon limits */}
                      <div>
                        <div style={{ color: PALETTE.muted, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'Rajdhani', sans-serif", marginBottom: 10 }}>Horizon Altitude Limits</div>
                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                          <SettingNum label="North" value={horizonN} onChange={v => setSetting("horizonN", v)} min={0} max={89} unit="°" />
                          <SettingNum label="East"  value={horizonE} onChange={v => setSetting("horizonE", v)} min={0} max={89} unit="°" />
                          <SettingNum label="South" value={horizonS} onChange={v => setSetting("horizonS", v)} min={0} max={89} unit="°" />
                          <SettingNum label="West"  value={horizonW} onChange={v => setSetting("horizonW", v)} min={0} max={89} unit="°" />
                        </div>
                        <div style={{ marginTop: 6, color: PALETTE.muted, fontSize: 11, fontFamily: "'Exo 2', sans-serif" }}>
                          Minimum altitude above horizon for each cardinal direction
                        </div>
                      </div>

                      {/* Saturation threshold */}
                      <div>
                        <div style={{ color: PALETTE.muted, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'Rajdhani', sans-serif", marginBottom: 10 }}>Saturation Threshold</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                          <input type="range" min={1} max={20} step={1} value={threshHours}
                            onChange={e => setSetting("saturationThreshold", parseInt(e.target.value) * 3600)}
                            style={{ flex: "1 1 160px", accentColor: PALETTE.accent, cursor: "pointer", minWidth: 120 }}
                          />
                          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 18, color: PALETTE.gold, minWidth: 36 }}>{threshHours}h</div>
                          <div style={{ color: PALETTE.muted, fontSize: 12, fontFamily: "'Exo 2', sans-serif" }}>
                            Objects with ≥ {threshHours}h on best scope at 30s+ subs are treated as complete
                          </div>
                        </div>
                      </div>

                    </div>
                  )}
                </div>

                {/* ── Re-image / Revisit Candidates ── */}
                <div style={{ marginBottom: 32 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 14 }}>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 15, fontWeight: 700, color: PALETTE.text, letterSpacing: 2 }}>RE-IMAGE / REVISIT CANDIDATES</div>
                    <div style={{ color: PALETTE.muted, fontSize: 12, fontFamily: "'Share Tech Mono', monospace" }}>{candidates.length} object{candidates.length !== 1 ? "s" : ""}</div>
                  </div>

                  {candidates.length === 0 ? (
                    <div style={{ color: PALETTE.muted, fontSize: 13, padding: "24px 0", fontFamily: "'Exo 2', sans-serif" }}>
                      All logged objects meet the current threshold — lower it or log more sessions to see candidates.
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: "rgba(0,194,255,0.04)" }}>
                            {[["Object", "left"], ["Type", "left"], ["Scopes used", "left"], ["Min exp", "right"], ["Integration", "right"], ["Signals", "left"], ["Score", "center"]].map(([h, a]) => (
                              <th key={h} style={{ padding: "9px 14px", textAlign: a, color: PALETTE.muted, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'Rajdhani', sans-serif", borderBottom: `1px solid ${PALETTE.border}`, whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {candidates.map((c, i) => {
                            const typeColor = TYPE_COLORS[c.dsoType] || "#6b7280";
                            const pct = Math.min(100, Math.round((c.totalTime / saturationThreshold) * 100));
                            return (
                              <tr key={c.dsoName} style={{ borderBottom: `1px solid ${PALETTE.border}`, background: i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent" }}>
                                {/* Object */}
                                <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                                  <span style={{ fontFamily: "'Share Tech Mono', monospace", color: PALETTE.text, fontWeight: 700 }}>{c.dsoName}</span>
                                  {c.commonName && <span style={{ color: PALETTE.muted, fontSize: 11, marginLeft: 7, fontFamily: "'Exo 2', sans-serif" }}>{c.commonName}</span>}
                                </td>
                                {/* Type */}
                                <td style={{ padding: "10px 14px" }}>
                                  <span style={{ background: `${typeColor}30`, color: typeColor, padding: "3px 8px", borderRadius: 4, fontSize: 12, fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, letterSpacing: 0.5, whiteSpace: "nowrap" }}>{c.dsoType}</span>
                                </td>
                                {/* Scopes */}
                                <td style={{ padding: "10px 14px" }}>
                                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                    {["D2", "D3", "S50"].map(sc => {
                                      const used = c.scopes.includes(sc);
                                      return (
                                        <span key={sc} style={{ padding: "1px 6px", borderRadius: 3, fontSize: 10, fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, border: `1px solid ${used ? PALETTE.border : PALETTE.border + "55"}`, color: used ? PALETTE.text : PALETTE.border, background: used ? "#0a1020" : "transparent", opacity: used ? 1 : 0.4 }}>{sc}</span>
                                      );
                                    })}
                                  </div>
                                </td>
                                {/* Min exp */}
                                <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "'Share Tech Mono', monospace", color: c.shortSubs ? PALETTE.gold : PALETTE.green, whiteSpace: "nowrap" }}>
                                  {c.minExp > 0 ? `${c.minExp}s` : "—"}
                                </td>
                                {/* Integration with progress bar */}
                                <td style={{ padding: "10px 14px", textAlign: "right", whiteSpace: "nowrap" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                                    <div style={{ width: 60, background: `${PALETTE.accent}18`, borderRadius: 3, height: 6, overflow: "hidden" }}>
                                      <div style={{ width: `${pct}%`, height: "100%", background: pct >= 100 ? PALETTE.green : pct >= 50 ? PALETTE.gold : PALETTE.red, borderRadius: 3 }} />
                                    </div>
                                    <span style={{ fontFamily: "'Share Tech Mono', monospace", color: PALETTE.muted, fontSize: 12 }}>{fmtTime(c.totalTime)}</span>
                                  </div>
                                </td>
                                {/* Signals */}
                                <td style={{ padding: "10px 14px" }}>
                                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                    {c.isSecondaryOnly && <SigBadge label="SECONDARY" color={PALETTE.galaxy} bg={`${PALETTE.galaxy}18`} />}
                                    {c.shortSubs  && <SigBadge label="SHORT SUBS"    color={PALETTE.gold}   bg={`${PALETTE.gold}18`} />}
                                    {c.noD3orS50  && <SigBadge label="TRY D3 / S50" color={PALETTE.red}    bg={`${PALETTE.red}18`} />}
                                    {c.noS50      && <SigBadge label="TRY S50"       color="#fb923c"        bg="rgba(251,146,60,.15)" />}
                                    {c.lowTime    && !c.isSecondaryOnly && <SigBadge label="MORE TIME" color={PALETTE.accent} bg={`${PALETTE.accent}15`} />}
                                    {c.stale      && !c.isSecondaryOnly && <SigBadge label="REVISIT"   color={PALETTE.muted}  bg={`${PALETTE.muted}18`} />}
                                  </div>
                                </td>
                                {/* Score */}
                                <td style={{ padding: "10px 14px", textAlign: "center" }}>
                                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 16, color: c.score >= 6 ? PALETTE.red : c.score >= 4 ? PALETTE.gold : PALETTE.muted }}>{c.score}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Score legend */}
                  <div style={{ marginTop: 12, display: "flex", gap: 20, flexWrap: "wrap", fontSize: 12, fontFamily: "'Rajdhani', sans-serif", color: PALETTE.muted, letterSpacing: 0.5 }}>
                    <span>Score: <span style={{ color: PALETTE.red }}>6–9</span> high  <span style={{ color: PALETTE.gold }}>4–5</span> medium  <span style={{ color: PALETTE.muted }}>1–3</span> low</span>
                    <span style={{ marginLeft: "auto" }}>SECONDARY +4 · SHORT SUBS +2 · TRY D3/S50 +3 · TRY S50 +1 · MORE TIME up to +3 · REVISIT +1</span>
                  </div>
                </div>

                {/* ── Messier Catalog Completion ── */}
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 15, fontWeight: 700, color: PALETTE.text, letterSpacing: 2 }}>MESSIER CATALOG COMPLETION</div>
                    <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13 }}>
                      <span style={{ color: PALETTE.green }}>{messierDone.length}</span>
                      <span style={{ color: PALETTE.muted }}> / 110 imaged</span>
                      {messierMissing.length > 0 && <span style={{ color: PALETTE.muted }}> · {messierMissing.length} remaining</span>}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ background: `${PALETTE.accent}18`, borderRadius: 4, height: 6, marginBottom: 18, overflow: "hidden" }}>
                    <div style={{ width: `${(messierDone.length / 110) * 100}%`, height: "100%", background: PALETTE.green, borderRadius: 4, transition: "width 0.6s ease" }} />
                  </div>

                  {/* Grid: all 110 cells */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(46px, 1fr))", gap: 4, marginBottom: 16 }}>
                    {MESSIER.map(({ m, n, t }) => {
                      const done = loggedM.has(m);
                      const tc = TYPE_COLORS[t] || "#90a4ae";
                      return (
                        <div key={m} title={`M${m}${n ? " · " + n : ""} · ${t}`} style={{
                          background: done ? `${tc}30` : "#0a1020",
                          border: `1px solid ${done ? tc + "70" : PALETTE.border}`,
                          borderRadius: 5, padding: "5px 2px", textAlign: "center", cursor: "default",
                          transition: "background 0.2s",
                        }}>
                          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: done ? tc : PALETTE.muted, fontWeight: done ? 700 : 400, lineHeight: 1 }}>M{m}</div>
                          {done && n && <div style={{ fontSize: 9, color: tc, fontFamily: "'Rajdhani', sans-serif", marginTop: 2, letterSpacing: 0.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 2px" }}>{n.split(" ")[0]}</div>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Missing objects grouped by type */}
                  {messierMissing.length > 0 && (() => {
                    const byType = {};
                    messierMissing.forEach(({ m, n, t }) => {
                      if (!byType[t]) byType[t] = [];
                      byType[t].push({ m, n });
                    });
                    return (
                      <div style={{ background: PALETTE.panel, border: `1px solid ${PALETTE.border}`, borderRadius: 10, padding: "16px 20px" }}>
                        <div style={{ color: PALETTE.muted, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, marginBottom: 12 }}>Not yet imaged — by type</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {Object.entries(byType).sort((a, b) => b[1].length - a[1].length).map(([type, items]) => {
                            const tc = TYPE_COLORS[type] || "#90a4ae";
                            return (
                              <div key={type} style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                                <span style={{ background: `${tc}28`, color: tc, padding: "3px 10px", borderRadius: 4, fontSize: 12, fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, letterSpacing: 0.5, whiteSpace: "nowrap", minWidth: 140, textAlign: "center" }}>{type}</span>
                                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                                  {items.sort((a, b) => a.m - b.m).map(({ m, n }) => (
                                    <span key={m} title={n || undefined} style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: PALETTE.text, background: "#0a1020", border: `1px solid ${PALETTE.border}`, borderRadius: 3, padding: "2px 7px", cursor: n ? "help" : "default" }}>M{m}{n ? " *" : ""}</span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ marginTop: 10, color: PALETTE.muted, fontSize: 12, fontFamily: "'Exo 2', sans-serif" }}>* hover for common name</div>
                      </div>
                    );
                  })()}
                </div>
              </>)}
            </div>
          );
        })()}

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
                    ["secondaries", "e.g. M32, M110"],
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

      {/* ── Mobile Bottom Nav ── */}
      {isMobile && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
          background: "rgba(7,10,18,0.97)", backdropFilter: "blur(16px)",
          borderTop: `1px solid ${PALETTE.border}`,
          display: "flex",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}>
          {navItems.map(n => {
            const active = tab === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                style={{
                  flex: 1, background: "none", border: "none", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center",
                  padding: "6px 2px 8px", gap: 2, WebkitTapHighlightColor: "transparent",
                }}
              >
                {/* Active pip */}
                <div style={{
                  width: 20, height: 2, borderRadius: 1, marginBottom: 2,
                  background: active ? PALETTE.accent : "transparent",
                  transition: "background 0.2s",
                }} />
                {/* Icon */}
                <div style={{
                  fontSize: 20, lineHeight: 1,
                  color: active ? PALETTE.accent : PALETTE.muted,
                  fontFamily: "'Rajdhani', sans-serif",
                  transition: "color 0.2s",
                }}>
                  {n.icon}
                </div>
                {/* Label */}
                <div style={{
                  fontSize: 10, letterSpacing: 0.8,
                  fontFamily: "'Rajdhani', sans-serif", fontWeight: 600,
                  color: active ? PALETTE.accent : PALETTE.muted,
                  transition: "color 0.2s",
                }}>
                  {n.short.toUpperCase()}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

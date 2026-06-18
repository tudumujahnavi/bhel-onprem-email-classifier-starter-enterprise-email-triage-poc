import { useState, useEffect } from "react";

const API = "/api";

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const MATCH_LABEL = {
  body:     { text: "Body Content", color: "#43a047" },
  vendor:   { text: "Known Vendor", color: "#fb8c00" },
  external: { text: "External",     color: "#78909c" },
  manual:   { text: "Manual",       color: "#8e24aa" },
  default:  { text: "Default",      color: "#aaa"    },
};

function StatCard({ label, value, color, sub }) {
  return (
    <div style={{ background: "#fff", borderRadius: 10, padding: "12px 16px", flex: 1, borderTop: `4px solid ${color}`, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", minWidth: 80 }}>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color, marginTop: 2, fontWeight: 600 }}>{sub}</div>}
    </div>
  );
}

export default function App() {
  const [emails, setEmails]         = useState([]);
  const [departments, setDepts]     = useState([]);
  const [stats, setStats]           = useState({});
  const [selected, setSelected]     = useState(null);
  const [filter, setFilter]         = useState("Important");
  const [actionLoading, setAL]      = useState(null);
  const [forwardingAll, setFAll]    = useState(false);
  const [autoMode, setAutoMode]     = useState(false);
  const [toast, setToast]           = useState(null);
  const [changingDept, setChDept]   = useState(false);
  const [replyText, setReplyText]   = useState("");
  const [replyMode, setReplyMode]   = useState(false);
  const [replyLoading, setRLoading] = useState(false);
  const [sending, setSending]       = useState(false);

  const load = () => {
    fetch(`${API}/emails`).then(r => r.json()).then(setEmails);
    fetch(`${API}/departments`).then(r => r.json()).then(setDepts);
    fetch(`${API}/stats`).then(r => r.json()).then(d => { setStats(d); setAutoMode(d.autoForwardMode); });
  };

  useEffect(() => { load(); }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const act = async (url, method = "POST", body) => {
    const opts = { method, headers: { "Content-Type": "application/json" } };
    if (body) opts.body = JSON.stringify(body);
    return (await fetch(url, opts)).json();
  };

  const forwardOne = async (id) => {
    setAL(id + "-fwd");
    const data = await act(`${API}/emails/${id}/forward`);
    setEmails(prev => prev.map(e => e.id === id ? { ...e, status: "forwarded" } : e));
    showToast(`✅ Forwarded to ${data.forwardedTo}`);
    setAL(null); load();
  };

  const rejectOne = async (id) => {
    setAL(id + "-rej");
    await act(`${API}/emails/${id}/reject`);
    setEmails(prev => prev.map(e => e.id === id ? { ...e, status: "rejected" } : e));
    showToast("🚫 Email rejected", "warn");
    setAL(null); setSelected(null); load();
  };

  const forwardAll = async () => {
    setFAll(true);
    const data = await act(`${API}/emails/forward-all`);
    load(); showToast(`✅ ${data.count} emails forwarded`);
    setFAll(false);
  };

  const toggleAuto = async () => {
    const data = await act(`${API}/auto-forward/toggle`);
    setAutoMode(data.autoForwardMode); load();
    showToast(data.message, "info");
  };

  const reclassify = async (emailId, deptName) => {
    await act(`${API}/emails/${emailId}/reclassify`, "PATCH", { departmentName: deptName });
    const dept = departments.find(d => d.name === deptName);
    setEmails(prev => prev.map(e => e.id !== emailId ? e : { ...e, department: dept.name, forwardTo: dept.email, color: dept.color, status: "pending", matchedBy: "manual" }));
    setChDept(false); showToast(`Moved to ${deptName}`);
  };

  const generateReply = async (email) => {
    setRLoading(true);
    const data = await act(`${API}/emails/${email.id}/generate-reply`);
    setReplyText(data.reply); setReplyMode(true); setRLoading(false);
  };

  const saveReply = async (id) => {
    await act(`${API}/emails/${id}/reply`, "PATCH", { reply: replyText });
    setEmails(prev => prev.map(e => e.id === id ? { ...e, reply: replyText } : e));
    showToast("✅ Reply saved");
  };

  const sendReply = async (email) => {
    setSending(true);
    const data = await act(`${API}/emails/${email.id}/send-reply`, "POST", { replyText });
    if (data.success) {
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, reply: replyText, replySent: true } : e));
      showToast(`✉️ Reply sent to ${data.sentTo}`);
      setReplyMode(false);
    } else if (data.error === "SMTP not configured") {
      showToast("⚠️ SMTP not set up — use Copy instead", "warn");
    } else {
      showToast("❌ Failed to send: " + (data.detail || data.error), "error");
    }
    setSending(false);
  };

  const handleSelect = (email) => {
    setSelected(email.id); setChDept(false); setReplyMode(false);
    setReplyText(email.reply || "");
    if (!email.read) {
      fetch(`${API}/emails/${email.id}/read`, { method: "PATCH" });
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, read: true } : e));
    }
  };

  const FILTERS = ["Important", "All", "Pending", "External", "Rejected",
    ...departments.filter(d => d.name !== "External").map(d => d.name)];

  const filterCount = (f) => {
    if (f === "All")       return emails.length;
    if (f === "Important") return emails.filter(e => e.isImportant && e.status !== "rejected").length;
    if (f === "Pending")   return emails.filter(e => e.status === "pending" && e.department !== "External").length;
    if (f === "External")  return emails.filter(e => e.department === "External").length;
    if (f === "Rejected")  return emails.filter(e => e.status === "rejected").length;
    return emails.filter(e => e.department === f).length;
  };

  const filterColor = (f) => {
    if (f === "Important") return "#e53935";
    if (f === "Rejected")  return "#757575";
    if (f === "External")  return "#78909c";
    if (f === "Pending")   return "#fb8c00";
    return departments.find(d => d.name === f)?.color || "#003087";
  };

  const filtered = emails.filter(e => {
    if (filter === "All")       return true;
    if (filter === "Important") return e.isImportant && e.status !== "rejected";
    if (filter === "Pending")   return e.status === "pending" && e.department !== "External";
    if (filter === "External")  return e.department === "External";
    if (filter === "Rejected")  return e.status === "rejected";
    return e.department === filter;
  });

  const selectedEmail = selected ? emails.find(e => e.id === selected) : null;
  const isExternal    = selectedEmail?.department === "External";
  const isRejected    = selectedEmail?.status === "rejected";

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", minHeight: "100vh", background: "#f0f2f5", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ background: "#003087", color: "#fff", padding: "0 20px", height: 54, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: "#ffcc00", borderRadius: 6, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#003087", fontSize: 14 }}>B</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>BHEL Mail Manager</div>
            <div style={{ fontSize: 10, color: "#a0b4d6" }}>On-Premise · Rule-Based NLP · No Internet Required</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={toggleAuto} style={{ background: autoMode ? "#c62828" : "#1b5e20", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            {autoMode ? "🤖 Auto ON" : "🤖 Auto OFF"}
          </button>
          <button onClick={forwardAll} disabled={forwardingAll || !stats.pending}
            style={{ background: !stats.pending ? "#1a2f50" : "#ffcc00", color: "#003087", border: "none", borderRadius: 8, padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: !stats.pending ? "not-allowed" : "pointer", opacity: !stats.pending ? 0.5 : 1 }}>
            {forwardingAll ? "⏳..." : `📤 Forward All (${stats.pending || 0})`}
          </button>
        </div>
      </div>

      {/* Auto banner */}
      {autoMode && (
        <div style={{ background: "#1b5e20", color: "#fff", padding: "6px 20px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
          🤖 Auto-Forward ON — Body-matched emails forwarded automatically. External emails require manual review.
          <button onClick={toggleAuto} style={{ marginLeft: "auto", background: "none", border: "1px solid #fff", borderRadius: 6, color: "#fff", padding: "2px 10px", cursor: "pointer", fontSize: 11 }}>Turn Off</button>
        </div>
      )}

      {/* SMTP warning */}
      {stats.smtpConfigured === false && (
        <div style={{ background: "#fff8e1", borderBottom: "1px solid #ffe082", padding: "5px 20px", fontSize: 11, color: "#e65100" }}>
          ⚠️ SMTP not configured — Direct Send is disabled. Sir can use <strong>Copy</strong> to paste reply into Outlook manually. To enable Send, add credentials to <code>backend/.env</code>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "flex", gap: 10, padding: "12px 16px 0", flexWrap: "wrap" }}>
        <StatCard label="Total"     value={emails.length}        color="#003087" />
        <StatCard label="Important" value={stats.important || 0} color="#e53935" sub="Needs attention" />
        <StatCard label="Pending"   value={stats.pending || 0}   color="#fb8c00" />
        <StatCard label="Forwarded" value={stats.forwarded || 0} color="#43a047" />
        <StatCard label="External"  value={stats.external || 0}  color="#78909c" />
        <StatCard label="Rejected"  value={stats.rejected || 0}  color="#757575" />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, padding: "10px 16px 0", flexWrap: "wrap" }}>
        {FILTERS.map(f => {
          const isActive = filter === f;
          const col = filterColor(f);
          return (
            <button key={f} onClick={() => setFilter(f)} style={{ background: isActive ? col : "#fff", color: isActive ? "#fff" : "#555", border: `2px solid ${isActive ? col : "#e0e0e0"}`, borderRadius: 20, padding: "4px 12px", fontSize: 11, cursor: "pointer", fontWeight: isActive ? 700 : 500 }}>
              {f === "Important" ? "⭐ " : f === "Rejected" ? "🚫 " : f === "External" ? "📥 " : ""}{f} ({filterCount(f)})
            </button>
          );
        })}
      </div>

      {/* Main */}
      <div style={{ display: "flex", gap: 12, padding: "10px 16px 16px", flex: 1, overflow: "hidden", height: "calc(100vh - 175px)" }}>

        {/* List */}
        <div style={{ width: selectedEmail ? "40%" : "100%", overflowY: "auto", background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", flexShrink: 0 }}>
          {filtered.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#bbb" }}>No emails here.</div>}
          {filtered.map(email => (
            <div key={email.id} onClick={() => handleSelect(email)}
              style={{ padding: "11px 14px", borderBottom: "1px solid #f5f5f5", cursor: "pointer", background: selected === email.id ? "#e8f0fe" : !email.read ? "#fffde7" : "#fff", borderLeft: `4px solid ${email.isImportant ? "#e53935" : email.color}`, opacity: email.status === "rejected" ? 0.45 : email.status === "forwarded" ? 0.6 : 1 }}>
              <div style={{ fontSize: 10, color: "#888", marginBottom: 2, fontFamily: "monospace", background: "#f5f5f5", display: "inline-block", padding: "1px 6px", borderRadius: 4 }}>{email.from}</div>
              <div style={{ fontWeight: !email.read ? 700 : 500, fontSize: 13, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email.isImportant && "⭐ "}{email.subject}</div>
              <div style={{ fontSize: 11, color: "#bbb", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email.body.substring(0, 60)}...</div>
              <div style={{ marginTop: 6, display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ background: email.color, color: "#fff", borderRadius: 8, padding: "1px 8px", fontSize: 10, fontWeight: 600 }}>{email.department}</span>
                <span style={{ background: email.sentimentColor, color: "#fff", borderRadius: 8, padding: "1px 8px", fontSize: 10, fontWeight: 600 }}>{email.sentimentIcon} {email.sentiment}</span>
                {email.replySent && <span style={{ fontSize: 10, color: "#1565c0", fontWeight: 700 }}>✉️ Replied</span>}
                {email.status === "forwarded" && <span style={{ fontSize: 10, color: "#43a047", fontWeight: 700, marginLeft: "auto" }}>✅ Forwarded</span>}
                {email.status === "rejected"  && <span style={{ fontSize: 10, color: "#757575", fontWeight: 700, marginLeft: "auto" }}>🚫 Rejected</span>}
                {email.status === "pending" && email.department !== "External" && <span style={{ fontSize: 10, color: "#fb8c00", fontWeight: 700, marginLeft: "auto" }}>⏳ Pending</span>}
                {email.department === "External" && email.status === "pending" && <span style={{ fontSize: 10, color: "#78909c", fontWeight: 700, marginLeft: "auto" }}>📥 Manual</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Detail */}
        {selectedEmail && (
          <div style={{ flex: 1, overflowY: "auto", background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 16, color: "#111", lineHeight: 1.4, flex: 1, paddingRight: 10 }}>{selectedEmail.isImportant && "⭐ "}{selectedEmail.subject}</h2>
              <button onClick={() => { setSelected(null); setReplyMode(false); }} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "#ccc" }}>✕</button>
            </div>

            {/* Sender */}
            <div style={{ background: "#f5f5f5", borderRadius: 8, padding: "8px 12px", marginBottom: 10, fontFamily: "monospace", fontSize: 12, color: "#333" }}>
              <span style={{ color: "#999", fontSize: 10 }}>FROM: </span>{selectedEmail.from}
              <span style={{ marginLeft: 14, color: "#999", fontSize: 10 }}>TIME: </span>{formatTime(selectedEmail.time)}
            </div>

            {/* Badges */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ background: selectedEmail.sentimentColor, color: "#fff", borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{selectedEmail.sentimentIcon} {selectedEmail.sentiment}</span>
              <span style={{ background: selectedEmail.color, color: "#fff", borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{selectedEmail.department}</span>
              <span style={{ fontSize: 11, color: (MATCH_LABEL[selectedEmail.matchedBy] || MATCH_LABEL.default).color, fontWeight: 600 }}>● {(MATCH_LABEL[selectedEmail.matchedBy] || MATCH_LABEL.default).text}</span>
              {selectedEmail.isImportant && <span style={{ background: "#fff3e0", color: "#e65100", borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>⭐ High Priority</span>}
              {selectedEmail.replySent && <span style={{ background: "#e3f2fd", color: "#1565c0", borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>✉️ Reply Sent</span>}
            </div>

            {/* Routing */}
            {!isExternal && (
              <div style={{ background: "#f0f2f5", borderRadius: 10, padding: "10px 14px", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 13, color: "#444" }}>
                  Route → <strong>{selectedEmail.department}</strong>
                  <span style={{ fontFamily: "monospace", marginLeft: 8, color: "#888", fontSize: 12 }}>{selectedEmail.forwardTo}</span>
                </div>
                <button onClick={() => setChDept(!changingDept)} style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer", color: "#555" }}>✏️ Change</button>
              </div>
            )}

            {/* External notice */}
            {isExternal && (
              <div style={{ background: "#f5f5f5", border: "1px solid #ddd", borderRadius: 10, padding: "10px 14px", marginBottom: 10 }}>
                <div style={{ fontWeight: 700, color: "#555", fontSize: 13, marginBottom: 4 }}>📥 External — Manual Review</div>
                <div style={{ fontSize: 12, color: "#888" }}>Not from BHEL. Handle personally or forward to a department.</div>
              </div>
            )}

            {/* Change dept */}
            {(changingDept || isExternal) && !isRejected && (
              <div style={{ background: "#fafafa", border: "1px solid #eee", borderRadius: 10, padding: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>{isExternal ? "Forward to:" : "Select department:"}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {departments.filter(d => d.name !== "External").map(d => (
                    <button key={d.name} onClick={() => reclassify(selectedEmail.id, d.name)}
                      style={{ background: d.color, color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>{d.name}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Body */}
            <div style={{ background: "#fafafa", border: "1px solid #eee", borderRadius: 10, padding: "14px 16px", fontSize: 13, lineHeight: 1.8, color: "#222", marginBottom: 14, whiteSpace: "pre-wrap" }}>
              {selectedEmail.body}
            </div>

            {/* Action buttons */}
            {!isRejected && (
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                {!isExternal && selectedEmail.status !== "forwarded" && (
                  <button onClick={() => forwardOne(selectedEmail.id)} disabled={actionLoading === selectedEmail.id + "-fwd"}
                    style={{ background: "#003087", color: "#fff", border: "none", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", flex: 1, opacity: actionLoading === selectedEmail.id + "-fwd" ? 0.7 : 1 }}>
                    {actionLoading === selectedEmail.id + "-fwd" ? "⏳..." : `📤 Forward → ${selectedEmail.forwardTo}`}
                  </button>
                )}
                {selectedEmail.status === "forwarded" && !isExternal && (
                  <div style={{ background: "#e8f5e9", border: "1px solid #c8e6c9", borderRadius: 8, padding: "10px", fontSize: 13, color: "#2e7d32", fontWeight: 600, flex: 1, textAlign: "center" }}>
                    ✅ Forwarded to {selectedEmail.forwardTo}
                  </div>
                )}
                <button onClick={() => { setReplyMode(!replyMode); if (!replyMode && !replyText) generateReply(selectedEmail); }}
                  style={{ background: "#1565c0", color: "#fff", border: "none", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  ✍️ Reply
                </button>
                <button onClick={() => rejectOne(selectedEmail.id)} disabled={actionLoading === selectedEmail.id + "-rej"}
                  style={{ background: "#fff", color: "#c62828", border: "2px solid #c62828", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  🚫 Reject
                </button>
              </div>
            )}

            {isRejected && (
              <div style={{ background: "#f5f5f5", borderRadius: 8, padding: "10px", fontSize: 13, color: "#757575", fontWeight: 600, textAlign: "center", marginBottom: 14 }}>
                🚫 This email has been rejected
              </div>
            )}

            {/* Reply box */}
            {replyMode && (
              <div style={{ border: "2px solid #1565c0", borderRadius: 12, overflow: "hidden" }}>
                {/* Reply header */}
                <div style={{ background: "#1565c0", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>
                    ✍️ Reply to: {selectedEmail.from}
                    {replyLoading && <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.8 }}>⏳ Generating...</span>}
                  </div>
                  <button onClick={() => generateReply(selectedEmail)} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 6, color: "#fff", padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                    🔄 Regenerate
                  </button>
                </div>

                {/* Editable reply */}
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  rows={10}
                  placeholder="Write or edit your reply here..."
                  style={{ width: "100%", boxSizing: "border-box", border: "none", borderBottom: "1px solid #eee", padding: "12px 14px", fontSize: 13, lineHeight: 1.7, fontFamily: "inherit", resize: "vertical", outline: "none" }}
                />

                {/* Reply actions */}
                <div style={{ background: "#f5f8ff", padding: "10px 14px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {/* SEND button */}
                  <button onClick={() => sendReply(selectedEmail)} disabled={sending || !replyText.trim()}
                    style={{ background: sending ? "#aaa" : "#1565c0", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: sending ? "not-allowed" : "pointer", flex: 1 }}>
                    {sending ? "⏳ Sending..." : "📨 Send Reply"}
                  </button>

                  {/* COPY button */}
                  <button onClick={() => { navigator.clipboard.writeText(replyText); showToast("📋 Copied — paste into Outlook"); }}
                    style={{ background: "#fff", color: "#1565c0", border: "2px solid #1565c0", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    📋 Copy
                  </button>

                  {/* SAVE button */}
                  <button onClick={() => saveReply(selectedEmail.id)}
                    style={{ background: "#fff", color: "#555", border: "1px solid #ddd", borderRadius: 8, padding: "9px 14px", fontSize: 12, cursor: "pointer" }}>
                    💾 Save Draft
                  </button>
                </div>

                {/* SMTP hint */}
                {!stats.smtpConfigured && (
                  <div style={{ background: "#fff8e1", padding: "6px 14px", fontSize: 11, color: "#e65100" }}>
                    💡 <strong>Send</strong> requires SMTP setup in <code>backend/.env</code>. Until then use <strong>Copy</strong> → paste into Outlook.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: toast.type === "error" ? "#c62828" : toast.type === "warn" ? "#e65100" : toast.type === "info" ? "#1565c0" : "#1b5e20", color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", zIndex: 9999 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

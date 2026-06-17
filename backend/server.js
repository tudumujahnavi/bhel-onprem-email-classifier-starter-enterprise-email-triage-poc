const express    = require("express");
const cors       = require("cors");
const nodemailer = require("nodemailer");
const { classifyEmail, analyzeSentiment, scoreImportance, DEPARTMENTS } = require("./classifier");
const { generateReply } = require("./replyGenerator");

// Load .env if it exists (optional — only needed for Send feature)
try { require("fs").readFileSync(".env").toString().split("\n").forEach(line => { const [k,v] = line.split("="); if (k && v) process.env[k.trim()] = v.trim(); }); } catch {}

const app  = express();
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

let emails          = require("./emails");
let autoForwardMode = false;

// ─── Build SMTP transporter if credentials exist ──────────────────────────────
function getTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: "smtp-mail.outlook.com",
    port: 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: { rejectUnauthorized: false },
  });
}

// ─── GET all emails ───────────────────────────────────────────────────────────
app.get("/api/emails", (req, res) => res.json(emails));

// ─── GET departments ──────────────────────────────────────────────────────────
app.get("/api/departments", (req, res) => res.json(DEPARTMENTS));

// ─── GET stats ────────────────────────────────────────────────────────────────
app.get("/api/stats", (req, res) => res.json({
  total:          emails.length,
  pending:        emails.filter(e => e.status === "pending" && e.department !== "External").length,
  forwarded:      emails.filter(e => e.status === "forwarded").length,
  rejected:       emails.filter(e => e.status === "rejected").length,
  external:       emails.filter(e => e.department === "External").length,
  important:      emails.filter(e => e.isImportant && e.status === "pending").length,
  autoForwardMode,
  smtpConfigured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
}));

// ─── FORWARD single email ─────────────────────────────────────────────────────
app.post("/api/emails/:id/forward", (req, res) => {
  const email = emails.find(e => e.id === parseInt(req.params.id));
  if (!email) return res.status(404).json({ error: "Not found" });
  email.status = "forwarded";
  email.read = true;
  email.forwardedAt = new Date().toISOString();
  console.log(`📤 Forwarded: "${email.subject}" → ${email.forwardTo}`);
  res.json({ success: true, forwardedTo: email.forwardTo });
});

// ─── FORWARD ALL internal pending ────────────────────────────────────────────
app.post("/api/emails/forward-all", (req, res) => {
  let count = 0;
  emails.forEach(e => {
    if (e.status === "pending" && e.department !== "External") {
      e.status = "forwarded"; e.read = true;
      e.forwardedAt = new Date().toISOString();
      count++;
    }
  });
  res.json({ success: true, count });
});

// ─── REJECT email ─────────────────────────────────────────────────────────────
app.post("/api/emails/:id/reject", (req, res) => {
  const email = emails.find(e => e.id === parseInt(req.params.id));
  if (!email) return res.status(404).json({ error: "Not found" });
  email.status = "rejected"; email.read = true;
  res.json({ success: true });
});

// ─── TOGGLE auto-forward ──────────────────────────────────────────────────────
app.post("/api/auto-forward/toggle", (req, res) => {
  autoForwardMode = !autoForwardMode;
  let count = 0;
  if (autoForwardMode) {
    emails.forEach(e => {
      if (e.status === "pending" && e.matchedBy === "body" && e.department !== "External") {
        e.status = "forwarded"; e.read = true;
        e.forwardedAt = new Date().toISOString();
        count++;
      }
    });
  }
  res.json({ autoForwardMode, message: autoForwardMode ? `Auto-forward ON. ${count} emails forwarded.` : "Auto-forward OFF." });
});

// ─── GENERATE AI reply ────────────────────────────────────────────────────────
app.post("/api/emails/:id/generate-reply", (req, res) => {
  const email = emails.find(e => e.id === parseInt(req.params.id));
  if (!email) return res.status(404).json({ error: "Not found" });
  const reply = generateReply(email);
  email.reply = reply;
  res.json({ success: true, reply });
});

// ─── SAVE edited reply ────────────────────────────────────────────────────────
app.patch("/api/emails/:id/reply", (req, res) => {
  const email = emails.find(e => e.id === parseInt(req.params.id));
  if (!email) return res.status(404).json({ error: "Not found" });
  email.reply = req.body.reply;
  res.json({ success: true });
});

// ─── SEND reply via SMTP (Outlook) ───────────────────────────────────────────
app.post("/api/emails/:id/send-reply", async (req, res) => {
  const email = emails.find(e => e.id === parseInt(req.params.id));
  if (!email) return res.status(404).json({ error: "Not found" });

  const transporter = getTransporter();
  if (!transporter) {
    return res.status(400).json({
      error: "SMTP not configured",
      message: "Add SMTP_USER and SMTP_PASS to backend/.env file to enable direct sending."
    });
  }

  const { replyText } = req.body;
  if (!replyText) return res.status(400).json({ error: "No reply text provided" });

  try {
    await transporter.sendMail({
      from:    process.env.SMTP_USER,
      to:      email.from,
      subject: `Re: ${email.subject}`,
      text:    replyText,
    });
    email.reply      = replyText;
    email.replySent  = true;
    email.replySentAt = new Date().toISOString();
    console.log(`✉️  Reply sent to ${email.from}`);
    res.json({ success: true, sentTo: email.from });
  } catch (err) {
    console.error("SMTP error:", err.message);
    res.status(500).json({ error: "Failed to send email", detail: err.message });
  }
});

// ─── RECLASSIFY ───────────────────────────────────────────────────────────────
app.patch("/api/emails/:id/reclassify", (req, res) => {
  const email = emails.find(e => e.id === parseInt(req.params.id));
  if (!email) return res.status(404).json({ error: "Not found" });
  const dept = DEPARTMENTS.find(d => d.name === req.body.departmentName);
  if (!dept) return res.status(400).json({ error: "Invalid department" });
  email.department = dept.name; email.forwardTo = dept.email;
  email.color = dept.color; email.status = "pending"; email.matchedBy = "manual";
  res.json({ success: true });
});

// ─── MARK read ────────────────────────────────────────────────────────────────
app.patch("/api/emails/:id/read", (req, res) => {
  const email = emails.find(e => e.id === parseInt(req.params.id));
  if (!email) return res.status(404).json({ error: "Not found" });
  email.read = true;
  res.json({ success: true });
});

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => res.json({
  status: "ok", total: emails.length,
  smtpConfigured: !!(process.env.SMTP_USER && process.env.SMTP_PASS)
}));

app.listen(PORT, () => {
  console.log(`✅ BHEL Mail Server running at http://localhost:${PORT}`);
  console.log(`📧 ${emails.length} emails loaded`);
  console.log(`✉️  SMTP: ${process.env.SMTP_USER ? `Configured (${process.env.SMTP_USER})` : "Not configured — Copy mode only"}`);
});

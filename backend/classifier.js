/**
 * BHEL EMAIL ROUTING SYSTEM — Body-Based Routing
 * Rule-Based NLP — 100% on-premise, no internet, no API
 *
 * KEY LOGIC:
 * - Sender ID = just context (who sent it)
 * - Email BODY = decides where to forward (who needs to act)
 *
 * Example:
 *   From: hr.payroll@bhel.in (HR sent this)
 *   Body: "Server is down, IT needs to fix it"
 *   → Forward to: IT & Servers  (not HR)
 *
 * ─── HOW TO ADD A DEPARTMENT ────────────────────────────────────────────────
 * 1. Add to DEPARTMENTS array: { name, email, color }
 * 2. Add action keywords to ACTION_KEYWORDS
 *
 * ─── HOW TO REMOVE A DEPARTMENT ─────────────────────────────────────────────
 * 1. Delete from DEPARTMENTS array
 * 2. Delete its entry from ACTION_KEYWORDS
 * ────────────────────────────────────────────────────────────────────────────
 */

const DEPARTMENTS = [
  { name: "IT & Servers",         email: "it@bhel.in",          color: "#1e88e5" },
  { name: "Human Resources",      email: "hr@bhel.in",          color: "#8e24aa" },
  { name: "Finance & Accounts",   email: "finance@bhel.in",     color: "#43a047" },
  { name: "Operations",           email: "operations@bhel.in",  color: "#f4511e" },
  { name: "Procurement & Stores", email: "procurement@bhel.in", color: "#fb8c00" },
  { name: "Management",           email: "management@bhel.in",  color: "#00897b" },
  { name: "External",             email: "",                     color: "#78909c" },
];

/**
 * ACTION KEYWORDS
 * These describe what ACTION is needed — not who sent the email.
 * The department with the highest keyword match score gets the email.
 *
 * Think: "Who needs to DO something after reading this email?"
 */
const ACTION_KEYWORDS = [
  {
    department: "IT & Servers",
    keywords: [
      // System problems that IT must fix
      "server down", "server outage", "network issue", "network down",
      "system not working", "cannot log in", "login issue", "database error",
      "vpn not working", "internet not working", "connectivity issue",
      "software problem", "hardware failure", "it support needed",
      "password reset", "access denied", "firewall", "bandwidth",
      "backup failed", "data center", "it team", "technical issue",
      "system crash", "it helpdesk", "computer not working",
    ],
  },
  {
    department: "Human Resources",
    keywords: [
      // Actions HR must take
      "approve leave", "leave application", "leave request",
      "salary approval", "payroll processing", "salary disbursement",
      "hr approval", "recruitment approval", "interview panel",
      "offer letter", "joining formalities", "employee transfer",
      "increment approval", "appraisal", "resignation acceptance",
      "attendance issue", "pf settlement", "gratuity",
      "onboarding", "training schedule", "hr policy",
    ],
  },
  {
    department: "Finance & Accounts",
    keywords: [
      // Actions Finance must take
      "payment pending", "invoice approval", "payment approval",
      "budget approval", "fund release", "reimbursement approval",
      "gst filing", "tds", "tax compliance", "audit documents",
      "expense approval", "purchase order payment", "vendor payment",
      "accounts team", "finance team", "bill payment",
      "financial report", "balance sheet", "ledger",
      "cheque", "neft", "bank transfer approval",
    ],
  },
  {
    department: "Operations",
    keywords: [
      // Actions Operations must take
      "production halted", "production stopped", "zone halted",
      "plant shutdown", "machine breakdown", "generator failure",
      "turbine issue", "boiler problem", "maintenance required",
      "repair needed", "site issue", "commissioning delayed",
      "erection problem", "installation issue", "operations team",
      "production delay", "unit down", "equipment failure",
      "field team", "site supervisor needed",
    ],
  },
  {
    department: "Procurement & Stores",
    keywords: [
      // Actions Procurement must take
      "spare parts needed", "material required", "stock shortage",
      "indent approval", "purchase approval", "procurement needed",
      "vendor selection", "quotation approval", "rfq", "request for quotation",
      "supply needed", "delivery pending", "goods not received",
      "stores team", "inventory low", "purchase order needed",
      "material dispatch", "warehouse", "supplier issue",
    ],
  },
  {
    department: "Management",
    keywords: [
      // Actions Management must take
      "director approval", "chairman approval", "board approval",
      "management decision", "policy approval", "escalation to management",
      "urgent escalation", "board meeting", "action required from management",
      "management review", "strategic decision", "compliance approval",
      "senior approval", "head of department", "cmd approval",
      "immediate attention", "priority decision",
    ],
  },
];

// ─── SENTIMENT ANALYSIS ───────────────────────────────────────────────────────
const SENTIMENT_RULES = {
  angry: {
    keywords: ["unacceptable","no response","frustrated","third reminder","fourth reminder","still pending","nobody","ignored","outrageous","fed up","ridiculous","pathetic","worst","terrible","incompetent","shameful","disgusted"],
    label: "Angry", color: "#c62828", icon: "😡", priority: 1,
  },
  urgent: {
    keywords: ["urgent","emergency","critical","breakdown","halted","outage","down since","immediate action","asap","deadline","not resolved","escalate","production stopped","cannot wait","time sensitive","immediately"],
    label: "Urgent", color: "#e53935", icon: "🚨", priority: 2,
  },
  concerned: {
    keywords: ["worried","concern","delay","behind schedule","overdue","pending","awaiting","no update","follow up","reminder","second reminder","not received","unclear"],
    label: "Concerned", color: "#fb8c00", icon: "⚠️", priority: 3,
  },
  positive: {
    keywords: ["thank you","thanks","appreciate","grateful","pleased","great work","well done","excellent","good job","congratulations","successful","completed","resolved","approved"],
    label: "Positive", color: "#43a047", icon: "😊", priority: 5,
  },
  neutral: {
    keywords: [],
    label: "Neutral", color: "#1e88e5", icon: "📧", priority: 4,
  },
};

function analyzeSentiment(subject, body) {
  const text = (subject + " " + body).toLowerCase();
  let detected = "neutral";
  let highestPriority = 99;
  for (const [key, rule] of Object.entries(SENTIMENT_RULES)) {
    if (key === "neutral") continue;
    if (rule.keywords.some(kw => text.includes(kw)) && rule.priority < highestPriority) {
      highestPriority = rule.priority;
      detected = key;
    }
  }
  return SENTIMENT_RULES[detected];
}

// ─── IMPORTANCE SCORING ───────────────────────────────────────────────────────
function scoreImportance(subject, body, sentiment) {
  const text = (subject + " " + body).toLowerCase();
  let score = 0;
  if (sentiment.priority === 1) score += 40;
  if (sentiment.priority === 2) score += 30;
  if (sentiment.priority === 3) score += 15;
  if (text.includes("board") || text.includes("chairman") || text.includes("director")) score += 20;
  if (text.includes("deadline") || text.includes("today") || text.includes("immediately")) score += 15;
  if (text.includes("halted") || text.includes("stopped") || text.includes("breakdown")) score += 25;
  return score;
}

// ─── DETECT IF EXTERNAL ───────────────────────────────────────────────────────
const VENDOR_DOMAINS = ["mahindra.com","tatasteel.com","abcparts.com","larsentoubro.com","siemens.com","abb.com"];

function isExternalSender(fromEmail) {
  const domain = fromEmail.toLowerCase().split("@")[1] || "";
  if (domain.includes("bhel.in")) return false;
  return true;
}

function isKnownVendor(fromEmail) {
  const domain = fromEmail.toLowerCase().split("@")[1] || "";
  return VENDOR_DOMAINS.some(vd => domain.includes(vd));
}

// ─── MAIN CLASSIFIER — routes by BODY content ─────────────────────────────────
function classifyEmail(fromEmail, subject, body) {
  const domain = fromEmail.toLowerCase().split("@")[1] || "";

  // External non-vendor → External folder
  if (isExternalSender(fromEmail) && !isKnownVendor(fromEmail)) {
    return { ...DEPARTMENTS.find(d => d.name === "External"), matchedBy: "external" };
  }

  // Score each department based on what ACTION the body is asking for
  const text = (subject + " " + body).toLowerCase();
  let bestDept = null;
  let bestScore = 0;

  for (const rule of ACTION_KEYWORDS) {
    const score = rule.keywords.filter(kw => text.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestDept = rule.department;
    }
  }

  // If body clearly says who should act → use that
  if (bestDept && bestScore > 0) {
    return { ...DEPARTMENTS.find(d => d.name === bestDept), matchedBy: "body" };
  }

  // Known vendor with no body match → Procurement (vendor emails need procurement action)
  if (isKnownVendor(fromEmail)) {
    return { ...DEPARTMENTS.find(d => d.name === "Procurement & Stores"), matchedBy: "vendor" };
  }

  // Nothing matched → Management (they decide)
  return { ...DEPARTMENTS.find(d => d.name === "Management"), matchedBy: "default" };
}

module.exports = { DEPARTMENTS, classifyEmail, analyzeSentiment, scoreImportance, isExternalSender };

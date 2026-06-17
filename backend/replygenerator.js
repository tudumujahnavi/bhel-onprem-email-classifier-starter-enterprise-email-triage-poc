/**
 * AI REPLY GENERATOR — No API, No Internet, 100% Free
 *
 * How it works:
 * - Reads the email subject, body and department
 * - Detects the intent (complaint, request, inquiry, report etc.)
 * - Picks the right template and fills in relevant details from the email
 * - Returns a professional draft reply for sir to review and edit
 */

function generateReply(email) {
  const subject = email.subject.toLowerCase();
  const body = email.body.toLowerCase();
  const text = subject + " " + body;
  const senderName = extractName(email.from);
  const dept = email.department;

  // ─── Detect intent ──────────────────────────────────────────────────────────

  const isUrgent       = /urgent|immediate|emergency|breakdown|outage|down|halted|critical/.test(text);
  const isComplaint    = /problem|issue|not working|failed|error|delay|overdue|pending/.test(text);
  const isRequest      = /request|approval|kindly|please|requesting|need your/.test(text);
  const isReport       = /report|progress|status|week|update|summary/.test(text);
  const isInquiry      = /inquiry|enquiry|information|guidance|opening|visit|interview|collaboration/.test(text);
  const isInvoice      = /invoice|payment|quotation|overdue|bill/.test(text);
  const isLeave        = /leave|medical|emergency leave|absent/.test(text);
  const isMeeting      = /meeting|board|agenda|attendance|schedule/.test(text);

  // ─── Pick template based on intent ─────────────────────────────────────────

  if (isUrgent && isComplaint) {
    return `Dear ${senderName},

Thank you for bringing this to my attention urgently.

I have noted the issue regarding "${email.subject}" and have escalated it to the concerned ${dept} team immediately. They will get back to you at the earliest.

Please keep me updated if the situation worsens or is not resolved within the expected timeframe.

Regards,
[Sir's Name]
BHEL`;
  }

  if (isInvoice) {
    return `Dear ${senderName},

Thank you for your communication regarding "${email.subject}".

I have forwarded this to our Finance & Accounts department for review and necessary action. They will coordinate with you directly regarding the payment / quotation status.

For urgent follow-up, please contact: finance@bhel.in

Regards,
[Sir's Name]
BHEL`;
  }

  if (isLeave) {
    return `Dear ${senderName},

Thank you for informing me in advance.

Your leave request has been noted and forwarded to the HR department for processing. Please ensure your work responsibilities are handed over appropriately before your leave begins.

Wishing you and your family a speedy recovery.

Regards,
[Sir's Name]
BHEL`;
  }

  if (isMeeting) {
    return `Dear ${senderName},

Thank you for the reminder regarding "${email.subject}".

I have noted the schedule and will ensure all pending action points are addressed before the meeting. Please share any additional documents or agenda items if required.

Regards,
[Sir's Name]
BHEL`;
  }

  if (isReport) {
    return `Dear ${senderName},

Thank you for submitting the progress report on "${email.subject}".

I have reviewed the update. Please coordinate with the relevant departments to address any delays or pending items mentioned. Keep me posted on the next milestone.

Regards,
[Sir's Name]
BHEL`;
  }

  if (isRequest) {
    return `Dear ${senderName},

Thank you for your request regarding "${email.subject}".

I have reviewed your request and forwarded it to the ${dept} team for necessary action. You will be informed once a decision has been made.

Please feel free to follow up if you do not hear back within 2 working days.

Regards,
[Sir's Name]
BHEL`;
  }

  if (isInquiry) {
    return `Dear ${senderName},

Thank you for reaching out to us.

We have received your inquiry regarding "${email.subject}". Your request has been noted and will be reviewed by the appropriate team. We will get back to you with a response within 3–5 working days.

Thank you for your interest in BHEL.

Regards,
[Sir's Name]
BHEL`;
  }

  // Default reply
  return `Dear ${senderName},

Thank you for your email regarding "${email.subject}".

I have received your message and it has been forwarded to the ${dept} team for review and action. You will be contacted shortly.

Regards,
[Sir's Name]
BHEL`;
}

// Extract a readable name from email address
// "hr.recruitment@bhel.in" → "HR Recruitment Team"
// "rahul.sharma@gmail.com" → "Rahul Sharma"
function extractName(fromEmail) {
  const local = fromEmail.split("@")[0];
  const domain = fromEmail.split("@")[1] || "";

  const isBhel = domain.includes("bhel.in");

  const name = local
    .replace(/[._-]/g, " ")
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return isBhel ? name + " Team" : name;
}

module.exports = { generateReply };

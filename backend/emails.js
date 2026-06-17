const { classifyEmail, analyzeSentiment, scoreImportance } = require("./classifier");

/**
 * Sample emails — diverse senders, body decides where to forward
 *
 * Notice: HR sends an email but body asks IT to fix server → forwards to IT
 *         Operations sends email but body asks Procurement for parts → forwards to Procurement
 */
const rawEmails = [
  {
    id: 1,
    from: "hr.payroll@bhel.in",
    subject: "Payroll System Server Down - Cannot Process Salaries",
    body: "Sir, The payroll server has been down since morning and we cannot log in to process May salaries. The database is inaccessible. IT support has not responded to our calls. Kindly escalate to the IT team immediately so the system is restored and salary processing can begin.",
    time: "2025-05-31T06:15:00",
  },
  // IT sends email but Operations needs to act
  {
    id: 2,
    from: "it.helpdesk@bhel.in",
    subject: "Production Zone B System Restored - Operations to Resume",
    body: "Sir, We have restored the network connectivity for Production Zone B. Operations team can now resume production activities. Kindly inform the site supervisor and operations team to restart the machines and resume normal operations at the earliest.",
    time: "2025-05-31T06:45:00",
  },
  // Site supervisor sends — Procurement needs to act
  {
    id: 3,
    from: "site.supervisor@bhel-hyd.in",
    subject: "Turbine T-7 Stalled - Spare Parts Urgently Needed",
    body: "Sir, Turbine Unit T-7 installation has stalled completely. We are waiting for spare parts that were indented 3 weeks ago. Stock is not available in stores. Procurement team needs to urgently source these materials from vendor and dispatch to site. Production commissioning is delayed by 3 days already.",
    time: "2025-05-31T07:00:00",
  },
  // HR sends — Finance needs to act
  {
    id: 4,
    from: "hr.recruitment@bhel.in",
    subject: "Offer Letters Ready - Salary Band Approval Needed from Finance",
    body: "Sir, We have finalized 45 candidates for Junior Engineer positions. Offer letters are prepared. However Finance team needs to approve the salary band and release the budget allocation before we can issue the letters. Requesting Finance department to process this approval at the earliest.",
    time: "2025-05-31T07:30:00",
  },
  // Maintenance sends — Procurement must act
  {
    id: 5,
    from: "maintenance.team@bhel.in",
    subject: "Generator Unit 4 Breakdown - Spare Parts Required Urgently",
    body: "Sir, Generator Unit 4 has broken down due to bearing failure. Zone B production is completely halted. Our repair team is ready but we need spare parts immediately. Stores has confirmed zero stock. Procurement team must urgently place an order with the vendor and arrange emergency delivery. Cannot wait more than 24 hours.",
    time: "2025-05-31T08:00:00",
  },
  // Finance sends — Management must approve
  {
    id: 6,
    from: "gst.compliance@bhel.in",
    subject: "GST Filing Deadline June 10 - Budget Approval Needed",
    body: "Sir, GST return filing for May 2025 is due June 10th. All invoices are ready but we need management approval to release the tax payment of Rs. 45,00,000. Director approval is required as per company policy for amounts above Rs. 10 lakhs. Requesting urgent board approval to avoid penalty.",
    time: "2025-05-31T08:30:00",
  },
  // Operations sends — HR must act
  {
    id: 7,
    from: "production@bhel.in",
    subject: "3 Workers Absent Without Leave - HR Action Required",
    body: "Sir, Three workers from Production Unit 2 have been absent without leave for the past 5 days with no communication. This is affecting our daily output. HR department needs to initiate action as per attendance policy and contact the employees. Requesting HR to resolve this immediately.",
    time: "2025-05-31T09:00:00",
  },
  // Chairman office — Management action
  {
    id: 8,
    from: "chairman.office@bhel.in",
    subject: "Board Meeting June 3rd - Director Approval on Expansion Plan",
    body: "Sir, The Board of Directors meeting is on June 3rd at 10 AM. The Rs. 500 crore expansion plan for Hyderabad unit requires chairman and board approval. All pending action points from last meeting must be presented. Management decision on the new plant is mandatory before this date.",
    time: "2025-05-31T09:15:00",
  },
  // Audit sends — Finance must act
  {
    id: 9,
    from: "audit@bhel.in",
    subject: "Q1 Audit - Finance Documents Submission Overdue",
    body: "Sir, This is the second reminder for Q1 2025 audit. Finance team was supposed to submit all purchase orders, vendor invoices, and expense ledgers by June 1st. As of today the documents are still pending. Finance department must submit all records by June 6th or this will be escalated to the board.",
    time: "2025-05-31T09:40:00",
  },
  // Stores sends — Procurement must act
  {
    id: 10,
    from: "stores.incharge@bhel.in",
    subject: "Critical Stock Shortage - Procurement Must Act Immediately",
    body: "Sir, We are at zero stock for transformer coils and critically low on boiler gaskets. Three ongoing projects will be impacted. Procurement team must immediately float an RFQ, get quotations from vendors, and place purchase orders on priority. Material is needed at warehouse within 7 days.",
    time: "2025-05-31T10:00:00",
  },
  // Angry email — third reminder
  {
    id: 11,
    from: "production@bhel.in",
    subject: "THIRD REMINDER - IT Still Not Fixed Network in Unit 3",
    body: "Sir, This is our third reminder. The network in Production Unit 3 has been down for 5 days. IT team has not responded to any of our tickets. Production is suffering massive losses every day. This is completely unacceptable. We need IT to fix this system immediately or we will escalate to the chairman directly.",
    time: "2025-05-31T10:30:00",
  },
  // Known vendor — invoice, Finance must pay
  {
    id: 12,
    from: "vendor.mahindra@mahindra.com",
    subject: "Invoice #MH-2025-4421 Payment Overdue by 45 Days",
    body: "Dear Sir, Invoice #MH-2025-4421 for Rs. 14,50,000 against PO-BHEL-991 is overdue by 45 days. Payment was due April 15th. We have sent multiple reminders with no response from Finance. We will be forced to pause future supplies if payment approval is not processed this week.",
    time: "2025-05-31T11:00:00",
  },
  // Vendor quotation — Procurement reviews
  {
    id: 13,
    from: "supplier.abcparts@abcparts.com",
    subject: "Quotation Submitted for RFQ-2025-88 Transformer Parts",
    body: "Dear Sir, Please find our quotation for transformer components as per your RFQ-2025-88. Total value Rs. 8,75,000 inclusive of GST. Delivery 21 days from purchase order. Kindly have your procurement team review and confirm the order at the earliest as our stock is limited.",
    time: "2025-05-31T11:30:00",
  },
  // External — student inquiry
  {
    id: 14,
    from: "rahul.sharma@gmail.com",
    subject: "Inquiry About Job Openings at BHEL",
    body: "Respected Sir, I am a Mechanical Engineering graduate from NIT Trichy with 2 years of experience in power plant operations. I am very interested in joining BHEL. Could you please guide me on the current job openings and application process? I would be grateful for your guidance.",
    time: "2025-05-31T12:00:00",
  },
  // External — college visit
  {
    id: 15,
    from: "priya.hod@university.edu",
    subject: "Industrial Visit Request - 40 Final Year Students",
    body: "Dear Sir, I am writing on behalf of 40 final year Electrical Engineering students from our university requesting an industrial visit to your plant next month. We are flexible on dates in June. This would be extremely valuable for our students. Kindly advise on the approval process.",
    time: "2025-05-31T12:30:00",
  },
  // External — journalist
  {
    id: 16,
    from: "journalist@newstoday.in",
    subject: "Interview Request - BHEL Expansion Plans 2025",
    body: "Dear Sir, I am a senior journalist with News Today covering the energy and infrastructure sector. I would like to request a brief interview regarding BHEL's expansion plans and recent achievements for 2025-26. Please let me know your availability at your earliest convenience.",
    time: "2025-05-31T13:00:00",
  },
];

const emails = rawEmails.map(e => {
  const dept      = classifyEmail(e.from, e.subject, e.body);
  const sentiment = analyzeSentiment(e.subject, e.body);
  const importance= scoreImportance(e.subject, e.body, sentiment);
  return {
    ...e,
    department:     dept.name,
    forwardTo:      dept.email,
    color:          dept.color,
    matchedBy:      dept.matchedBy,
    sentiment:      sentiment.label,
    sentimentColor: sentiment.color,
    sentimentIcon:  sentiment.icon,
    importance,
    isImportant:    importance >= 30,
    status:         "pending",
    reply:          null,
    read:           false,
  };
});

module.exports = emails;

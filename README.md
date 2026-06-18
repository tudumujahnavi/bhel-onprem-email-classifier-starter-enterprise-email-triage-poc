# BHEL Mail Manager - On-Prem Email Classifier

**Proof-of-concept developed during BHEL IT Informatics training.** 100% on-premise automatic email forwarding system for ~7,000 emails/day.

**No API key. No internet. No third-party services. 100% free.** Runs entirely on BHEL's internal LAN.

## Why On-Premise?
Cloud AI tools like ChatGPT/Gemini are blocked by BHEL security policy. Manual routing causes delays and SLA breaches for IT staff.

## Tech Stack
- **Frontend**: React.js dashboard 
- **Backend**: Node.js + Express REST API
- **NLP Engine**: Custom JavaScript rule-based classifier - no Python, no external ML APIs
- **Deployment**: 100% on-premise, LAN-only, air-gapped compatible

## How to Run
### Prerequisite
Install Node.js from https://nodejs.org (click the green LTS button)
After installing, restart your laptop.

### Terminal 1 - Backend
cd backend
npm install
node server.js

You will see:
Server running at http://localhost:5000
12 emails loaded and classified

### Terminal 2 - Frontend  
cd frontend
npm install
npm start

Browser opens at http://localhost:3000

## How The Routing Works
1. Email arrives with sender ID (e.g. it.helpdesk@bhel.in)
2. System reads sender ID and matches to department instantly
3. Reads keywords in subject/body as backup
4. Auto-generates draft reply for IT staff

## BHEL Compliance Notes
Built specifically for BHEL's "No Cloud AI" security policy. All processing on-premise. No data leaves internal network. No telemetry or external connections. Source code auditable.

**Status**: POC complete. Ready for BHEL UAT environment deployment.

# BHEL On-Prem Email Classifier & Dashboard

> Proof-of-concept developed during BHEL IT Informatics training. 
> 100% on-premise email triage system for 7k emails/day across 17 sectors.

## Problem
BHEL IT receives ~7,000 emails/day. Cloud AI tools like ChatGPT/Gemini are blocked by security policy. Manual routing causes delays.

## Solution
Full-stack dashboard with custom rule-based NLP engine. Zero external APIs. Runs entirely on BHEL's internal server/LAN.

**Tech Stack:**
| Layer | Technology | Why |
| --- | --- | --- |
| UI | React 18 | Fast, component-based dashboard |
| Server | Node.js + Express | Lightweight, runs on any machine |
| Email Send | Nodemailer | Sends replies via Outlook SMTP |
| Classification | Custom Rule-Based NLP | No internet, no API, on-premise |
| Sentiment | Custom keyword scoring | Free, instant, offline |
| Reply AI | Template-based generator | No API needed |
| Deployment | Localhost / LAN | Runs on BHEL's own server |

## Features
- **On-Prem Classification**: Reads email body → routes to correct department
- **Sentiment Analysis**: Detects Angry / Urgent / Concerned / Positive / Neutral  
- **Importance Scoring**: Flags high priority emails automatically
- **Reply Generator**: Drafts professional replies using templates
- **Zero Cloud**: No database, no external APIs, no data leaves the machine

## Quick Start
```bash
npm install
npm start

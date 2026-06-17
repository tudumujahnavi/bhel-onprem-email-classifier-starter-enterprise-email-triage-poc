# BHEL On-Prem Email Classifier Starter

> Proof-of-concept developed during BHEL IT Informatics training. 
> For internal handover to deploy and extend.

## Problem
BHEL IT receives ~7,000 emails/day from 17 sectors. Cloud AI tools are blocked by security policy.

## Solution
Offline Python pipeline that classifies emails by sector using TF-IDF + Logistic Regression. 
No internet access required. Runs on <2GB RAM.

## Status
Starter kit. BHEL IT Informatics may deploy and modify. All data is synthetic.

## Quick Start
pip install -r requirements.txt
python classify.py

# Security Policy

## Overview
The Lumen AI project takes the security and safety of our software and users seriously. We appreciate the contributions of security researchers and community members who help us maintain high security standards.

This document outlines our vulnerability disclosure process, response Service Level Agreements (SLAs), and security governance policies.

---

## Reporting a Vulnerability

**DO NOT create public GitHub issues, pull requests, or discussions to report security vulnerabilities.**

If you discover a security vulnerability or potential flaw in Lumen AI, please report it privately:

1. **Email Contact**: Send a detailed report to `security@lumen-editor.org` (or submit via [GitHub Private Vulnerability Reporting](https://github.com/irfan-the-og-user/lumen_editor/security/advisories/new) if enabled).
2. **Report Details**:
   - Description of the vulnerability and potential security impact.
   - Step-by-step instructions or Proof of Concept (PoC) to reproduce the issue.
   - Affected components, versions, or endpoints (e.g., edge shader engine, Vercel serverless proxy).
   - Any suggested mitigations or patches if available.

---

## Response SLAs & Timelines

We commit to handling security disclosures promptly and transparently:

| Stage | Service Level Agreement (SLA) Target |
| :--- | :--- |
| **Initial Acknowledgment** | Within **48 hours** of receiving report submission |
| **Triage & Risk Assessment** | Within **3 business days** |
| **Critical Severity Fix (CVSS 9.0–10.0)** | Patch released within **7 calendar days** |
| **High Severity Fix (CVSS 7.0–8.9)** | Patch released within **14 calendar days** |
| **Medium/Low Severity Fix (< 7.0)** | Patch released within **30 calendar days** |

You will receive periodic status updates at least once per week until the issue is resolved and a fix is deployed.

---

## Safe Harbor & Policy Guidelines

When conducting security research on Lumen AI:
- Test only against your own local instances or dedicated test environments.
- Do not attempt to access, exfiltrate, or destroy user data or system assets.
- Do not execute Denial of Service (DoS) attacks or automated brute-force scans against production serverless endpoints.
- Provide us a reasonable window to remediate identified vulnerabilities prior to public disclosure.

---

## Automated Security Governance

To maintain continuous security, Lumen AI implements:
- Automated dependency monitoring via **Dependabot**.
- Automated Static Application Security Testing (SAST) and vulnerability audits in **GitHub Actions CI**.
- Mandatory manual review and approval by Code Owners for all automated dependency PRs.

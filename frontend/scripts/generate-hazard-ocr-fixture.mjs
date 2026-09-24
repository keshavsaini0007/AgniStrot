// One-off: renders a clean paper hazard-register form and screenshots it to
// e2e/assets/hazard-form-sample.png so the OCR→hazard auto-capture path has
// realistic input. The wording is deliberate: "HAZARD REGISTER FORM" (form-type
// detection), "Severity: Critical" (deterministic likelihood×consequence
// drivers) and "safety barrier" (canonicalizes to SAFETY_BARRICADE).
// Run AFTER `npx playwright install chromium`.

import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const assets = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'e2e', 'assets');
fs.mkdirSync(assets, { recursive: true });

const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { background: #ffffff; font-family: 'Courier New', monospace; color: #000; padding: 48px; }
  .sheet { border: 2px solid #000; padding: 28px; width: 860px; }
  h1 { font-size: 32px; text-align: center; letter-spacing: 1px; margin-bottom: 18px; }
  .rule { font-size: 16px; text-align: center; margin-bottom: 24px; }
  .field { border-bottom: 1px dotted #333; margin-bottom: 22px; font-size: 20px; }
  .field label { font-weight: bold; }
  .severity { font-size: 22px; font-weight: bold; }
  .sig { margin-top: 30px; font-size: 16px; }
</style></head>
<body>
  <div class="sheet">
    <h1>HAZARD REGISTER FORM</h1>
    <p class="rule">Coal Mines Regulation 2017 &mdash; Hazard Report Record</p>
    <div class="field"><label>Hazard No: </label>HR-2026-0814</div>
    <div class="field"><label>Date: </label>2026-08-14</div>
    <div class="field"><label>Site: </label>Jharia Underground Mine</div>
    <div class="field severity"><label>Severity: </label>Critical</div>
    <div class="field"><label>Hazard: </label>Conveyor safety barrier missing at transfer point Zone A</div>
    <div class="field"><label>Reported By: </label>Priya Sharma</div>
    <p style="font-size:18px;font-weight:bold;margin-bottom:8px;">Remarks</p>
    <div class="field">Remarks: Safety barrier removed at the transfer point; exposed moving parts on the belt drive.</div>
    <div class="sig">Inspector Signature: <span style="letter-spacing:4px;">P Sharma</span></div>
  </div>
</body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1400 }, deviceScaleFactor: 1 });
await page.setContent(html);
await page.screenshot({ path: path.join(assets, 'hazard-form-sample.png') });
await browser.close();
console.log('Fixture written to', path.join(assets, 'hazard-form-sample.png'));
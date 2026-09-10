// One-off: renders a clean paper-compliance form and screenshots it to
// e2e/assets/form-sample.png so the OCR ingest path has realistic input.
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
  h1 { font-size: 30px; text-align: center; letter-spacing: 1px; margin-bottom: 20px; }
  .row { display: flex; justify-content: space-between; font-size: 18px; margin-bottom: 10px; }
  .field label { font-weight: bold; }
  .field { border-bottom: 1px dotted #333; margin-bottom: 22px; font-size: 18px; }
  table { width: 100%; border-collapse: collapse; margin: 14px 0 20px; }
  td { border: 1px solid #000; padding: 8px; font-size: 16px; width: 50%; }
  .sig { margin-top: 30px; font-size: 16px; }
</style></head>
<body>
  <div class="sheet">
    <h1>SAFETY INSPECTION FORM</h1>
    <p style="text-align:center;font-size:16px;margin-bottom:22px;">Coal Mines Regulation 2017 &mdash; Site Inspection Record</p>
    <div class="field"><label>Inspector Name: </label>Rajesh Kumar Singh</div>
    <div class="field"><label>Inspection Date: </label>2026-08-14</div>
    <div class="field"><label>Mine / Site: </label>Jharia Underground Mine</div>
    <div class="field"><label>Section: </label>Conveyor Belt Zone A</div>
    <p style="font-size:18px;font-weight:bold;margin-top:20px;">Checklist Items</p>
    <table>
      <tr><td>[X] Fire extinguishers charged and accessible</td><td>[ ] Ventilation doors operational</td></tr>
      <tr><td>[] Emergency stop pull cords functional</td><td>[X] Conveyor alignment and belt tension</td></tr>
      <tr><td>[X] Gas detector calibrated</td><td>[ ] Ladder integrity at haulage shaft</td></tr>
      <tr><td>[] PPE compliance near face area</td><td>[X] Dust suppression nozzles clear</td></tr>
    </table>
    <div class="field"><label>Remarks: </label>Conveyor belt misalignment observed on Zone A; oxygen monitor logged stable.</div>
    <div class="row"><div class="sig">Inspector Signature: <span style="letter-spacing:4px;">R K Singh</span></div></div>
  </div>
</body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1500 }, deviceScaleFactor: 1 });
await page.setContent(html);
await page.screenshot({ path: path.join(assets, 'form-sample.png') });
await browser.close();
console.log('Fixture written to', path.join(assets, 'form-sample.png'));
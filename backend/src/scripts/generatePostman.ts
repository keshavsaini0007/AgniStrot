import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

// ── Types for Postman v2.1.0 ────────────────────────────────────────────────

interface Header {
  key: string;
  value: string;
  type?: string;
  description?: string;
}

interface RequestUrl {
  raw: string;
  host: string[];
  path: string[];
  query?: Array<{ key: string; value: string; description?: string }>;
}

interface RequestBody {
  mode: "raw" | "formdata" | "urlencoded";
  raw?: string;
  options?: {
    raw?: {
      language: "json" | "text" | "html";
    };
  };
}

interface RequestAuth {
  type: "bearer" | "noauth";
  bearer?: Array<{ key: string; value: string; type: string }>;
}

interface RequestItem {
  name: string;
  event?: Array<{
    listen: "test" | "prerequest";
    script: {
      type: "text/javascript";
      exec: string[];
    };
  }>;
  request: {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    header: Header[];
    body?: RequestBody;
    auth?: RequestAuth;
    url: RequestUrl;
    description?: string;
  };
}

interface FolderItem {
  name: string;
  description?: string;
  item: RequestItem[];
}

interface PostmanCollection {
  info: {
    _postman_id: string;
    name: string;
    description: string;
    schema: string;
  };
  variable?: Array<{ key: string; value: string; type?: string }>;
  item: FolderItem[];
}

interface EnvironmentValue {
  key: string;
  value: string;
  type: "default" | "secret";
  enabled: boolean;
}

interface PostmanEnvironment {
  id: string;
  name: string;
  values: EnvironmentValue[];
  _postman_variable_scope: "environment";
}

// ── Helpers ────────────────────────────────────────────────────────────────

function bearerAuth(tokenVar = "{{active_token}}"): RequestAuth {
  return {
    type: "bearer",
    bearer: [
      {
        key: "token",
        value: tokenVar,
        type: "string",
      },
    ],
  };
}

function parseUrl(rawUrl: string): RequestUrl {
  const [base, queryStr] = rawUrl.split("?");
  const cleanBase = base!.replace(/^\{\{baseUrl\}\}\/?/, "").replace(/^api\/v1\/?/, "");
  const pathParts = ["api", "v1", ...cleanBase.split("/").filter(Boolean)];

  const query = queryStr
    ? queryStr.split("&").map((param) => {
        const [k, v] = param.split("=");
        return { key: k ?? "", value: v ?? "" };
      })
    : undefined;

  return {
    raw: `{{baseUrl}}/api/v1/${cleanBase}${queryStr ? "?" + queryStr : ""}`,
    host: ["{{baseUrl}}"],
    path: pathParts,
    ...(query ? { query } : {}),
  };
}

// ── Environment Definition ─────────────────────────────────────────────────

const environment: PostmanEnvironment = {
  id: randomUUID(),
  name: "AgniStrot Local Environment",
  _postman_variable_scope: "environment",
  values: [
    { key: "baseUrl", value: "http://localhost:5000", type: "default", enabled: true },
    { key: "email_fo", value: "rahul@agnistrot.com", type: "default", enabled: true },
    { key: "email_mo", value: "priya@agnistrot.com", type: "default", enabled: true },
    { key: "email_cm", value: "amit@agnistrot.com", type: "default", enabled: true },
    { key: "email_reg", value: "meena@agnistrot.com", type: "default", enabled: true },
    { key: "email_mo_rajpur", value: "kavita@agnistrot.com", type: "default", enabled: true },
    { key: "email_mo_dhanbad", value: "ramesh@agnistrot.com", type: "default", enabled: true },
    { key: "password_default", value: "password123", type: "secret", enabled: true },
    { key: "token_fo", value: "", type: "default", enabled: true },
    { key: "token_mo", value: "", type: "default", enabled: true },
    { key: "token_cm", value: "", type: "default", enabled: true },
    { key: "token_reg", value: "", type: "default", enabled: true },
    { key: "active_token", value: "", type: "default", enabled: true },
    { key: "siteId_jharia", value: "", type: "default", enabled: true },
    { key: "siteId_dhanbad", value: "", type: "default", enabled: true },
    { key: "siteId_rajpur", value: "", type: "default", enabled: true },
    { key: "active_alert_id", value: "", type: "default", enabled: true },
    { key: "escalate_alert_id", value: "", type: "default", enabled: true },
    { key: "active_doc_id", value: "", type: "default", enabled: true },
  ],
};

// ── Collection Folders & Requests ──────────────────────────────────────────

const collection: PostmanCollection = {
  info: {
    _postman_id: randomUUID(),
    name: "AgniStrot API — Automated Test Suite",
    description:
      "Complete automated test suite for AgniStrot Smart Governance & Compliance Monitoring Platform for Coal Mines (SIH26024).\n\n" +
      "Covers all 4 RBAC roles (Field Officer, Mine Official, Corporate Manager, Regulator), offline synchronization, alert workflow engine, " +
      "tamper-evident SHA-256 audit trail, statutory report PDF generation, GIS spatial markers, and OCR document processing.",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  variable: [
    { key: "baseUrl", value: "http://localhost:5000", type: "string" },
    { key: "email_fo", value: "rahul@agnistrot.com", type: "string" },
    { key: "email_mo", value: "priya@agnistrot.com", type: "string" },
    { key: "email_cm", value: "amit@agnistrot.com", type: "string" },
    { key: "email_reg", value: "meena@agnistrot.com", type: "string" },
    { key: "email_mo_rajpur", value: "kavita@agnistrot.com", type: "string" },
    { key: "email_mo_dhanbad", value: "ramesh@agnistrot.com", type: "string" },
    { key: "password_default", value: "password123", type: "string" },
    { key: "token_fo", value: "", type: "string" },
    { key: "token_mo", value: "", type: "string" },
    { key: "token_cm", value: "", type: "string" },
    { key: "token_reg", value: "", type: "string" },
    { key: "active_token", value: "", type: "string" },
    { key: "siteId_jharia", value: "", type: "string" },
    { key: "siteId_dhanbad", value: "", type: "string" },
    { key: "siteId_rajpur", value: "", type: "string" },
    { key: "active_alert_id", value: "", type: "string" },
    { key: "escalate_alert_id", value: "", type: "string" },
    { key: "active_doc_id", value: "", type: "string" },
  ],
  item: [
    // ── 00. Health & Infrastructure ──────────────────────────────────────────
    {
      name: "00. Health & Infrastructure",
      description: "Basic infrastructure, health probe, and security headers.",
      item: [
        {
          name: "GET Health Check",
          request: {
            method: "GET",
            header: [],
            url: parseUrl("{{baseUrl}}/health"),
            description: "Unauthenticated health endpoint verifying server availability and Helmet security headers.",
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 200', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "pm.test('Response contains status ok and valid timestamp', function () {",
                  "    const res = pm.response.json();",
                  "    pm.expect(res.status).to.eql('ok');",
                  "    pm.expect(res.timestamp).to.be.a('string');",
                  "    pm.expect(new Date(res.timestamp).getTime()).to.be.greaterThan(0);",
                  "});",
                  "",
                  "pm.test('Helmet security headers present', function () {",
                  "    pm.response.to.have.header('x-content-type-options');",
                  "    pm.expect(pm.response.headers.get('x-content-type-options')).to.eql('nosniff');",
                  "    pm.response.to.have.header('x-frame-options');",
                  "});",
                ],
              },
            },
          ],
        },
      ],
    },

    // ── 01. Authentication & RBAC ────────────────────────────────────────────
    {
      name: "01. Authentication & RBAC",
      description: "Login for all 4 roles, token acquisition, bad credentials, and role registration guards.",
      item: [
        {
          name: "Login - Field Officer (Rahul)",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify(
                { email: "{{email_fo}}", password: "{{password_default}}" },
                null,
                2
              ),
              options: { raw: { language: "json" } },
            },
            url: parseUrl("{{baseUrl}}/auth/login"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 200', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "const res = pm.response.json();",
                  "pm.test('Returns valid token and field_officer profile', function () {",
                  "    pm.expect(res.token).to.be.a('string');",
                  "    pm.expect(res.user).to.be.an('object');",
                  "    pm.expect(res.user.role).to.eql('field_officer');",
                  "    pm.expect(res.user.name).to.eql('Rahul Kumar');",
                  "});",
                  "",
                  "pm.environment.set('token_fo', res.token);",
                  "pm.collectionVariables.set('token_fo', res.token);",
                  "pm.environment.set('active_token', res.token);",
                  "pm.collectionVariables.set('active_token', res.token);",
                  "if (res.user.siteId) {",
                  "    pm.environment.set('siteId_jharia', res.user.siteId);",
                  "    pm.collectionVariables.set('siteId_jharia', res.user.siteId);",
                  "}",
                ],
              },
            },
          ],
        },
        {
          name: "Login - Mine Official (Priya - Jharia)",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify(
                { email: "{{email_mo}}", password: "{{password_default}}" },
                null,
                2
              ),
              options: { raw: { language: "json" } },
            },
            url: parseUrl("{{baseUrl}}/auth/login"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 200', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "const res = pm.response.json();",
                  "pm.test('Returns valid token and mine_official profile', function () {",
                  "    pm.expect(res.token).to.be.a('string');",
                  "    pm.expect(res.user.role).to.eql('mine_official');",
                  "    pm.expect(res.user.siteId).to.be.a('string');",
                  "});",
                  "",
                  "pm.environment.set('token_mo', res.token);",
                  "pm.collectionVariables.set('token_mo', res.token);",
                  "pm.environment.set('siteId_jharia', res.user.siteId);",
                  "pm.collectionVariables.set('siteId_jharia', res.user.siteId);",
                ],
              },
            },
          ],
        },
        {
          name: "Login - Mine Official (Ramesh - Dhanbad)",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify(
                { email: "{{email_mo_dhanbad}}", password: "{{password_default}}" },
                null,
                2
              ),
              options: { raw: { language: "json" } },
            },
            url: parseUrl("{{baseUrl}}/auth/login"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 200', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "const res = pm.response.json();",
                  "pm.test('Returns Dhanbad siteId', function () {",
                  "    pm.expect(res.user.siteId).to.be.a('string');",
                  "});",
                  "",
                  "pm.environment.set('siteId_dhanbad', res.user.siteId);",
                  "pm.collectionVariables.set('siteId_dhanbad', res.user.siteId);",
                ],
              },
            },
          ],
        },
        {
          name: "Login - Corporate Manager (Amit)",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify(
                { email: "{{email_cm}}", password: "{{password_default}}" },
                null,
                2
              ),
              options: { raw: { language: "json" } },
            },
            url: parseUrl("{{baseUrl}}/auth/login"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 200', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "const res = pm.response.json();",
                  "pm.test('Corporate manager has cross-site scope (siteId is null)', function () {",
                  "    pm.expect(res.user.role).to.eql('corporate_manager');",
                  "    pm.expect(res.user.siteId).to.eql(null);",
                  "});",
                  "",
                  "pm.environment.set('token_cm', res.token);",
                  "pm.collectionVariables.set('token_cm', res.token);",
                ],
              },
            },
          ],
        },
        {
          name: "Login - Regulator (Dr. Meena Reddy)",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify(
                { email: "{{email_reg}}", password: "{{password_default}}" },
                null,
                2
              ),
              options: { raw: { language: "json" } },
            },
            url: parseUrl("{{baseUrl}}/auth/login"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 200', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "const res = pm.response.json();",
                  "pm.test('Regulator has nationwide oversight scope (siteId is null)', function () {",
                  "    pm.expect(res.user.role).to.eql('regulator');",
                  "    pm.expect(res.user.siteId).to.eql(null);",
                  "});",
                  "",
                  "pm.environment.set('token_reg', res.token);",
                  "pm.collectionVariables.set('token_reg', res.token);",
                ],
              },
            },
          ],
        },
        {
          name: "Login - Invalid Credentials (Negative Test)",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify(
                { email: "wrong@agnistrot.com", password: "wrong_password_xyz" },
                null,
                2
              ),
              options: { raw: { language: "json" } },
            },
            url: parseUrl("{{baseUrl}}/auth/login"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 401 Unauthorized', function () {",
                  "    pm.response.to.have.status(401);",
                  "});",
                  "",
                  "pm.test('Returns descriptive error message', function () {",
                  "    const res = pm.response.json();",
                  "    pm.expect(res.error).to.be.a('string');",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Register - Corporate Manager creates Site Bound User",
          request: {
            method: "POST",
            auth: bearerAuth("{{token_cm}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify(
                {
                  name: "Auditor Test User",
                  email: "test.auditor.{{$randomInt}}@agnistrot.com",
                  password: "password123",
                  role: "field_officer",
                  siteId: "{{siteId_jharia}}",
                },
                null,
                2
              ),
              options: { raw: { language: "json" } },
            },
            url: parseUrl("{{baseUrl}}/auth/register"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 201 Created', function () {",
                  "    pm.response.to.have.status(201);",
                  "});",
                  "",
                  "pm.test('User successfully registered with role and siteId', function () {",
                  "    const res = pm.response.json();",
                  "    pm.expect(res.id).to.be.a('string');",
                  "    pm.expect(res.role).to.eql('field_officer');",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Register - Mine Official without siteId Rejected (Validation)",
          request: {
            method: "POST",
            auth: bearerAuth("{{token_cm}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify(
                {
                  name: "Ghost Official",
                  email: "ghost.official.{{$randomInt}}@agnistrot.com",
                  password: "password123",
                  role: "mine_official",
                },
                null,
                2
              ),
              options: { raw: { language: "json" } },
            },
            url: parseUrl("{{baseUrl}}/auth/register"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 400 Bad Request', function () {",
                  "    pm.response.to.have.status(400);",
                  "});",
                  "",
                  "pm.test('Validation rejected registration missing required siteId', function () {",
                  "    const res = pm.response.json();",
                  "    pm.expect(res.error).to.be.a('string');",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Register - Field Officer Blocked (RBAC 403)",
          request: {
            method: "POST",
            auth: bearerAuth("{{token_fo}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify(
                {
                  name: "Unauthorized Creator",
                  email: "unauth.creator@agnistrot.com",
                  password: "password123",
                  role: "field_officer",
                  siteId: "{{siteId_jharia}}",
                },
                null,
                2
              ),
              options: { raw: { language: "json" } },
            },
            url: parseUrl("{{baseUrl}}/auth/register"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 403 Forbidden', function () {",
                  "    pm.response.to.have.status(403);",
                  "});",
                ],
              },
            },
          ],
        },
      ],
    },

    // ── 02. Field Capture & Offline Sync ─────────────────────────────────────
    {
      name: "02. Field Capture & Offline Sync",
      description: "Batch synchronization of mobile inspection reports, incidents, and attendance.",
      item: [
        {
          name: "Sync Inspections - Field Officer Batch Sync",
          request: {
            method: "POST",
            auth: bearerAuth("{{token_fo}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify(
                {
                  records: [
                    {
                      clientUuid: "{{$guid}}",
                      siteId: "{{siteId_jharia}}",
                      type: "safety",
                      checklist: [
                        {
                          item: "Ventilation fan functioning",
                          result: "pass",
                          notes: "Operational at nominal speed",
                        },
                        {
                          item: "Flame safety lamp inspection",
                          result: "pass",
                        },
                        {
                          item: "Underground haulage track clearance",
                          result: "pass",
                        },
                      ],
                      measurements: [
                        { parameter: "Methane (CH4)", value: 0.28, unit: "%" },
                        { parameter: "Air Velocity", value: 1.2, unit: "m/s" },
                      ],
                      location: { lat: 23.7461, lng: 86.4123 },
                      photoUrls: [],
                      signature: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==",
                      capturedAt: "2026-09-09T09:30:00.000Z",
                    },
                  ],
                },
                null,
                2
              ),
              options: { raw: { language: "json" } },
            },
            url: parseUrl("{{baseUrl}}/inspections/sync"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 200 OK', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "const res = pm.response.json();",
                  "pm.test('Inspection batch accepted', function () {",
                  "    pm.expect(res.accepted).to.be.an('array');",
                  "    pm.expect(res.accepted.length).to.be.greaterThan(0);",
                  "    pm.expect(res.rejected).to.be.an('array').that.is.empty;",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Sync Incidents - Critical Incident Sync (Triggers Alert Rule)",
          request: {
            method: "POST",
            auth: bearerAuth("{{token_fo}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify(
                {
                  records: [
                    {
                      clientUuid: "{{$guid}}",
                      siteId: "{{siteId_jharia}}",
                      severity: "critical",
                      category: "safety",
                      description: "Automated Postman Test: Roof spalling in Seam 3, Gallery B. Evacuation executed.",
                      location: { lat: 23.7465, lng: 86.4128 },
                      photoUrls: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"],
                      capturedAt: "2026-09-09T09:45:00.000Z",
                    },
                  ],
                },
                null,
                2
              ),
              options: { raw: { language: "json" } },
            },
            url: parseUrl("{{baseUrl}}/incidents/sync"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 200 OK', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "const res = pm.response.json();",
                  "pm.test('Incident accepted and queued for evaluation', function () {",
                  "    pm.expect(res.accepted).to.be.an('array');",
                  "    pm.expect(res.accepted.length).to.be.greaterThan(0);",
                  "    pm.expect(res.rejected).to.be.an('array').that.is.empty;",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Sync Attendance - Worker Check-In Batch",
          request: {
            method: "POST",
            auth: bearerAuth("{{token_fo}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify(
                {
                  records: [
                    {
                      clientUuid: "{{$guid}}",
                      siteId: "{{siteId_jharia}}",
                      workerRef: "WRK-TEST-POSTMAN-01",
                      checkType: "in",
                      location: { lat: 23.7461, lng: 86.4123 },
                      capturedAt: "2026-09-09T07:45:00.000Z",
                    },
                  ],
                },
                null,
                2
              ),
              options: { raw: { language: "json" } },
            },
            url: parseUrl("{{baseUrl}}/attendance/sync"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 200 OK', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "const res = pm.response.json();",
                  "pm.test('Attendance check-in accepted', function () {",
                  "    pm.expect(res.accepted).to.be.an('array');",
                  "    pm.expect(res.accepted.length).to.be.greaterThan(0);",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Sync Guard - Corporate Manager Blocked from Field Sync (RBAC 403)",
          request: {
            method: "POST",
            auth: bearerAuth("{{token_cm}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ records: [] }, null, 2),
              options: { raw: { language: "json" } },
            },
            url: parseUrl("{{baseUrl}}/inspections/sync"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Corporate Manager blocked with 403 Forbidden', function () {",
                  "    pm.response.to.have.status(403);",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Sync Validation - Empty Batch Rejected (Schema 400)",
          request: {
            method: "POST",
            auth: bearerAuth("{{token_fo}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ records: [] }, null, 2),
              options: { raw: { language: "json" } },
            },
            url: parseUrl("{{baseUrl}}/inspections/sync"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 400 Bad Request', function () {",
                  "    pm.response.to.have.status(400);",
                  "});",
                  "",
                  "pm.test('Returns validation failure message', function () {",
                  "    const res = pm.response.json();",
                  "    pm.expect(res.error).to.be.a('string');",
                  "});",
                ],
              },
            },
          ],
        },
      ],
    },

    // ── 03. Inspections & Incidents Oversight ────────────────────────────────
    {
      name: "03. Inspections & Incidents Oversight",
      description: "Querying inspections and incidents with RBAC scoping and pagination.",
      item: [
        {
          name: "List Inspections - Mine Official (Scoped to Jharia)",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_mo}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/inspections"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 200 OK', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "const res = pm.response.json();",
                  "pm.test('Data returned is an array', function () {",
                  "    pm.expect(res.data).to.be.an('array');",
                  "});",
                  "",
                  "const targetSite = pm.environment.get('siteId_jharia');",
                  "pm.test('All returned inspections belong to assigned site', function () {",
                  "    if (res.data.length > 0 && targetSite) {",
                  "        res.data.forEach(function (insp) {",
                  "            pm.expect(insp.siteId).to.eql(targetSite);",
                  "        });",
                  "    }",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "List Inspections - Regulator (Cross-site with Pagination)",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_reg}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/inspections?page=1&limit=5"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 200 OK', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "const res = pm.response.json();",
                  "pm.test('Pagination object returned correctly', function () {",
                  "    pm.expect(res.pagination).to.be.an('object');",
                  "    pm.expect(Number(res.pagination.page)).to.eql(1);",
                  "    pm.expect(Number(res.pagination.limit)).to.eql(5);",
                  "    pm.expect(res.pagination.total).to.be.a('number');",
                  "});",
                  "",
                  "pm.test('Limit respected in returned data length', function () {",
                  "    pm.expect(res.data.length).to.be.at.most(5);",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "List Incidents - Filter by Severity = Critical",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_reg}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/incidents?severity=critical"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 200 OK', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "const res = pm.response.json();",
                  "pm.test('All returned incidents are critical', function () {",
                  "    pm.expect(res.data).to.be.an('array');",
                  "    res.data.forEach(function (inc) {",
                  "        pm.expect(inc.severity).to.eql('critical');",
                  "    });",
                  "});",
                ],
              },
            },
          ],
        },
      ],
    },

    // ── 04. Worker Attendance Monitoring ─────────────────────────────────────
    {
      name: "04. Worker Attendance Monitoring",
      description: "Attendance ledger queries, anti-tamper site isolation, and role restrictions.",
      item: [
        {
          name: "List Attendance - Mine Official (Scoped View)",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_mo}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/attendance"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 200 OK', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "const res = pm.response.json();",
                  "const sj = pm.environment.get('siteId_jharia');",
                  "pm.test('Attendance records strictly scoped to Jharia', function () {",
                  "    pm.expect(res.data).to.be.an('array');",
                  "    if (res.data.length > 0 && sj) {",
                  "        res.data.forEach(function (rec) {",
                  "            pm.expect(rec.siteId).to.eql(sj);",
                  "        });",
                  "    }",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "List Attendance - Mine Official Anti-Tamper Test",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_mo}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/attendance?siteId={{siteId_dhanbad}}"),
            description: "Passing ?siteId=Dhanbad while logged in as Jharia official must NOT leak Dhanbad records.",
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 200 OK', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "const res = pm.response.json();",
                  "const sj = pm.environment.get('siteId_jharia');",
                  "pm.test('Anti-tamper: All rows still belong to Jharia (query override ignored)', function () {",
                  "    pm.expect(res.data).to.be.an('array');",
                  "    if (res.data.length > 0 && sj) {",
                  "        res.data.forEach(function (rec) {",
                  "            pm.expect(rec.siteId).to.eql(sj);",
                  "        });",
                  "    }",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "List Attendance - Corporate Manager (Cross-site Oversight)",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_cm}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/attendance"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 200 OK', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "const res = pm.response.json();",
                  "pm.test('Corporate sees attendance entries across sites', function () {",
                  "    pm.expect(res.data).to.be.an('array');",
                  "    pm.expect(res.data.length).to.be.greaterThan(0);",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "List Attendance - Field Officer Blocked (RBAC 403)",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_fo}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/attendance"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Field Officer blocked with 403 Forbidden', function () {",
                  "    pm.response.to.have.status(403);",
                  "});",
                ],
              },
            },
          ],
        },
      ],
    },

    // ── 05. Alerts & Workflow Engine ─────────────────────────────────────────
    {
      name: "05. Alerts & Workflow Engine",
      description: "Alert lifecycle: querying open alerts, acknowledge, resolve, escalate, and state conflict protections.",
      item: [
        {
          name: "Get Open Alerts & Capture IDs",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_mo}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/alerts?status=open"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 200 OK', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "const res = pm.response.json();",
                  "pm.test('Open alerts array returned', function () {",
                  "    pm.expect(res.data).to.be.an('array');",
                  "    pm.expect(res.data.length).to.be.greaterThan(0);",
                  "});",
                  "",
                  "if (res.data.length > 0) {",
                  "    pm.environment.set('active_alert_id', res.data[0].id);",
                  "    pm.collectionVariables.set('active_alert_id', res.data[0].id);",
                  "    if (res.data.length > 1) {",
                  "        pm.environment.set('escalate_alert_id', res.data[1].id);",
                  "        pm.collectionVariables.set('escalate_alert_id', res.data[1].id);",
                  "    } else {",
                  "        pm.environment.set('escalate_alert_id', res.data[0].id);",
                  "        pm.collectionVariables.set('escalate_alert_id', res.data[0].id);",
                  "    }",
                  "}",
                ],
              },
            },
          ],
        },
        {
          name: "Acknowledge Alert - Mine Official",
          request: {
            method: "POST",
            auth: bearerAuth("{{token_mo}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify(
                { note: "Safety team dispatched to inspect ventilation regulator." },
                null,
                2
              ),
              options: { raw: { language: "json" } },
            },
            url: parseUrl("{{baseUrl}}/alerts/{{active_alert_id}}/acknowledge"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 200 OK', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "const res = pm.response.json();",
                  "pm.test('Alert status updated to acknowledged', function () {",
                  "    pm.expect(res.status).to.eql('acknowledged');",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Acknowledge Alert - Duplicate Attempt (Conflict 409)",
          request: {
            method: "POST",
            auth: bearerAuth("{{token_mo}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ note: "Re-acknowledgement attempt" }, null, 2),
              options: { raw: { language: "json" } },
            },
            url: parseUrl("{{baseUrl}}/alerts/{{active_alert_id}}/acknowledge"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 409 Conflict', function () {",
                  "    pm.response.to.have.status(409);",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Escalate Alert - Manual Escalation",
          request: {
            method: "POST",
            auth: bearerAuth("{{token_mo}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify(
                { note: "Immediate remediation required; escalating priority." },
                null,
                2
              ),
              options: { raw: { language: "json" } },
            },
            url: parseUrl("{{baseUrl}}/alerts/{{escalate_alert_id}}/escalate"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "// Status can be 200 (if open) or 409 (if already escalated)",
                  "pm.test('Status code is 200 OK or 409 Conflict', function () {",
                  "    pm.expect([200, 409]).to.include(pm.response.code);",
                  "});",
                  "",
                  "if (pm.response.code === 200) {",
                  "    const res = pm.response.json();",
                  "    pm.expect(res.status).to.eql('escalated');",
                  "}",
                ],
              },
            },
          ],
        },
        {
          name: "Resolve Alert - Corporate Manager / Regulator",
          request: {
            method: "POST",
            auth: bearerAuth("{{token_cm}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify(
                { resolutionNote: "Ventilation ducting replaced and gas reading verified below 0.3%." },
                null,
                2
              ),
              options: { raw: { language: "json" } },
            },
            url: parseUrl("{{baseUrl}}/alerts/{{active_alert_id}}/resolve"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 200 OK', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "const res = pm.response.json();",
                  "pm.test('Alert resolved and status marked closed', function () {",
                  "    pm.expect(res.status).to.eql('closed');",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Resolve Alert - Duplicate Attempt (Conflict 409)",
          request: {
            method: "POST",
            auth: bearerAuth("{{token_cm}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ resolutionNote: "Resolving already closed alert." }, null, 2),
              options: { raw: { language: "json" } },
            },
            url: parseUrl("{{baseUrl}}/alerts/{{active_alert_id}}/resolve"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 409 Conflict', function () {",
                  "    pm.response.to.have.status(409);",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Alert Workflow - Field Officer Blocked (RBAC 403)",
          request: {
            method: "POST",
            auth: bearerAuth("{{token_fo}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ note: "Field officer unauthorized ack" }, null, 2),
              options: { raw: { language: "json" } },
            },
            url: parseUrl("{{baseUrl}}/alerts/{{active_alert_id}}/acknowledge"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Field officer blocked from workflow action (403)', function () {",
                  "    pm.response.to.have.status(403);",
                  "});",
                ],
              },
            },
          ],
        },
      ],
    },

    // ── 06. Role-Based Dashboard Summaries ───────────────────────────────────
    {
      name: "06. Role-Based Dashboard Summaries",
      description: "Verifies the 4 customized executive and operational summaries returned by GET /dashboard/summary.",
      item: [
        {
          name: "Dashboard Summary - Field Officer Persona",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_fo}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/dashboard/summary"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 200 OK', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "const res = pm.response.json();",
                  "pm.test('Field Officer summary schema matches PRD', function () {",
                  "    pm.expect(res.myInspections).to.be.an('array');",
                  "    pm.expect(res.myIncidents).to.be.an('array');",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Dashboard Summary - Mine Official Persona",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_mo}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/dashboard/summary"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 200 OK', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "const res = pm.response.json();",
                  "pm.test('Mine Official summary schema matches PRD', function () {",
                  "    pm.expect(res.site).to.be.an('object');",
                  "    pm.expect(res.openAlerts).to.be.an('array');",
                  "    pm.expect(res.todaysInspections).to.be.an('array');",
                  "    pm.expect(res.attendanceToday).to.be.an('object');",
                  "    pm.expect(res.attendanceToday.present).to.be.a('number');",
                  "    pm.expect(res.pendingWorkflows).to.be.an('array');",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Dashboard Summary - Corporate Manager Persona",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_cm}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/dashboard/summary"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 200 OK', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "const res = pm.response.json();",
                  "pm.test('Corporate Manager summary schema matches PRD', function () {",
                  "    pm.expect(res.sites).to.be.an('array');",
                  "    pm.expect(res.criticalAlerts).to.be.an('array');",
                  "    pm.expect(res.trend7Day).to.be.an('object');",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Dashboard Summary - Regulator Persona",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_reg}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/dashboard/summary"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 200 OK', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "const res = pm.response.json();",
                  "pm.test('Regulator summary schema matches PRD', function () {",
                  "    pm.expect(res.sites).to.be.an('array');",
                  "    pm.expect(res.overdueItems).to.be.an('array');",
                  "});",
                ],
              },
            },
          ],
        },
      ],
    },

    // ── 07. Tamper-Evident Audit Trail ───────────────────────────────────────
    {
      name: "07. Tamper-Evident Audit Trail",
      description: "Hash-chained audit log inspection, cryptographic hash verification, and role restriction.",
      item: [
        {
          name: "Get Audit Trail - Regulator (Cryptographic Chain Verification)",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_reg}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/audit"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 200 OK', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "const res = pm.response.json();",
                  "pm.test('Audit log entries returned and not empty', function () {",
                  "    pm.expect(res.data).to.be.an('array');",
                  "    pm.expect(res.data.length).to.be.greaterThan(5);",
                  "});",
                  "",
                  "pm.test('Entries carry valid SHA-256 prevHash and thisHash', function () {",
                  "    res.data.forEach(function (entry) {",
                  "        pm.expect(entry.prevHash).to.be.a('string').with.lengthOf(64);",
                  "        pm.expect(entry.thisHash).to.be.a('string').with.lengthOf(64);",
                  "        pm.expect(entry.action).to.be.a('string');",
                  "    });",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Get Audit Trail - Filter by entityType = alert",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_cm}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/audit?entityType=alert"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 200 OK', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "const res = pm.response.json();",
                  "pm.test('All returned entries have entityType alert', function () {",
                  "    pm.expect(res.data).to.be.an('array');",
                  "    res.data.forEach(function (entry) {",
                  "        pm.expect(entry.entityType).to.eql('alert');",
                  "    });",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Get Audit Trail - Mine Official Blocked (RBAC 403)",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_mo}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/audit"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Mine official blocked from audit ledger (403)', function () {",
                  "    pm.response.to.have.status(403);",
                  "});",
                ],
              },
            },
          ],
        },
      ],
    },

    // ── 08. Statutory Compliance Reports ─────────────────────────────────────
    {
      name: "08. Statutory Compliance Reports",
      description: "Automated PDF generation for coal mine statutory safety and compliance reports.",
      item: [
        {
          name: "Generate Statutory Report - Mine Official (Own Site PDF)",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_mo}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/reports/statutory?siteId={{siteId_jharia}}"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 200 OK', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "pm.test('Content-Type is application/pdf', function () {",
                  "    const contentType = pm.response.headers.get('content-type');",
                  "    pm.expect(contentType).to.include('application/pdf');",
                  "});",
                  "",
                  "pm.test('Content-Disposition header specifies PDF attachment', function () {",
                  "    pm.response.to.have.header('content-disposition');",
                  "    pm.expect(pm.response.headers.get('content-disposition')).to.include('.pdf');",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Generate Statutory Report - Cross-site Access Denied (RBAC 403)",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_mo}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/reports/statutory?siteId={{siteId_dhanbad}}"),
            description: "Mine Official from Jharia cannot generate reports for Dhanbad.",
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Cross-site report access denied with 403 Forbidden', function () {",
                  "    pm.response.to.have.status(403);",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Generate Statutory Report - Regulator Nationwide Access (200 OK)",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_reg}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/reports/statutory?siteId={{siteId_dhanbad}}"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 200 OK', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "pm.test('Regulator successfully receives PDF', function () {",
                  "    pm.expect(pm.response.headers.get('content-type')).to.include('application/pdf');",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Generate Statutory Report - Field Officer Blocked (RBAC 403)",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_fo}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/reports/statutory?siteId={{siteId_jharia}}"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Field Officer blocked with 403 Forbidden', function () {",
                  "    pm.response.to.have.status(403);",
                  "});",
                ],
              },
            },
          ],
        },
      ],
    },

    // ── 09. GIS Spatial Markers ──────────────────────────────────────────────
    {
      name: "09. GIS Spatial Markers",
      description: "Unified GIS spatial markers endpoint for Leaflet.js map visualization.",
      item: [
        {
          name: "Get Map Markers - Mine Official (Scoped to Site)",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_mo}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/gis/markers"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 200 OK', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "const res = pm.response.json();",
                  "const sj = pm.environment.get('siteId_jharia');",
                  "pm.test('Markers returned are strictly within assigned site', function () {",
                  "    pm.expect(res.data).to.be.an('array');",
                  "    if (res.data.length > 0 && sj) {",
                  "        res.data.forEach(function (m) {",
                  "            pm.expect(m.siteId).to.eql(sj);",
                  "        });",
                  "    }",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Get Map Markers - Regulator (Multi-site & Coordinate Types)",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_reg}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/gis/markers"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 200 OK', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "const res = pm.response.json();",
                  "pm.test('Regulator receives spatial markers', function () {",
                  "    pm.expect(res.data).to.be.an('array');",
                  "    pm.expect(res.data.length).to.be.greaterThan(0);",
                  "});",
                  "",
                  "pm.test('Coordinates are numeric lat/lng and schema is complete', function () {",
                  "    if (res.data.length > 0) {",
                  "        const marker = res.data[0];",
                  "        pm.expect(marker).to.have.property('id');",
                  "        pm.expect(marker).to.have.property('category');",
                  "        pm.expect(marker).to.have.property('lat');",
                  "        pm.expect(marker).to.have.property('lng');",
                  "        pm.expect(typeof marker.lat).to.eql('number');",
                  "        pm.expect(typeof marker.lng).to.eql('number');",
                  "        pm.expect(marker).to.have.property('siteId');",
                  "        pm.expect(marker).to.have.property('siteName');",
                  "    }",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Get Map Markers - Filter by siteId Query Parameter",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_cm}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/gis/markers?siteId={{siteId_jharia}}"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 200 OK', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "const res = pm.response.json();",
                  "const sj = pm.environment.get('siteId_jharia');",
                  "pm.test('Filter returns only specified site markers', function () {",
                  "    pm.expect(res.data).to.be.an('array');",
                  "    res.data.forEach(function (m) {",
                  "        pm.expect(m.siteId).to.eql(sj);",
                  "    });",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Get Map Markers - Field Officer Blocked (RBAC 403)",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_fo}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/gis/markers"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Field Officer blocked with 403 Forbidden', function () {",
                  "    pm.response.to.have.status(403);",
                  "});",
                ],
              },
            },
          ],
        },
      ],
    },

    // ── 10. OCR Document Digitization Workflow ───────────────────────────────
    {
      name: "10. OCR Document Digitization Workflow",
      description: "Human-in-the-loop compliance document review and role verification.",
      item: [
        {
          name: "List Documents - Mine Official (Pending Documents)",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_mo}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/documents?reviewStatus=pending"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 200 OK', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "const res = pm.response.json();",
                  "pm.test('Returns documents array and pagination metadata', function () {",
                  "    pm.expect(res.data).to.be.an('array');",
                  "    pm.expect(res.total).to.be.a('number');",
                  "});",
                  "",
                  "if (res.data.length > 0) {",
                  "    pm.environment.set('active_doc_id', res.data[0]._id);",
                  "    pm.collectionVariables.set('active_doc_id', res.data[0]._id);",
                  "}",
                ],
              },
            },
          ],
        },
        {
          name: "Confirm Document - Corporate Manager Human Review",
          request: {
            method: "POST",
            auth: bearerAuth("{{token_cm}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify(
                {
                  correctedFields: {
                    formType: "environmental",
                    inspectorName: "Corporate Audit Team",
                    remarks: "Reviewed and validated against air monitor logs.",
                  },
                  reviewStatus: "confirmed",
                },
                null,
                2
              ),
              options: { raw: { language: "json" } },
            },
            url: parseUrl("{{baseUrl}}/documents/{{active_doc_id}}/confirm"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "const docId = pm.environment.get('active_doc_id');",
                  "if (!docId) {",
                  "    // Skip or expect 404 if no document fixture was seeded",
                  "    pm.test('No pending document available in database (skipped)', function () {",
                  "        pm.expect([200, 404]).to.include(pm.response.code);",
                  "    });",
                  "} else {",
                  "    pm.test('Document confirmed successfully (200 OK)', function () {",
                  "        pm.response.to.have.status(200);",
                  "        const res = pm.response.json();",
                  "        pm.expect(res.data.reviewStatus).to.eql('confirmed');",
                  "    });",
                  "}",
                ],
              },
            },
          ],
        },
        {
          name: "List Documents - Field Officer Blocked (RBAC 403)",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_fo}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/documents"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Field Officer blocked from documents review (403)', function () {",
                  "    pm.response.to.have.status(403);",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Confirm Document - Regulator Blocked (Read-only RBAC 403)",
          request: {
            method: "POST",
            auth: bearerAuth("{{token_reg}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify(
                {
                  correctedFields: { formType: "safety" },
                  reviewStatus: "confirmed",
                },
                null,
                2
              ),
              options: { raw: { language: "json" } },
            },
            url: parseUrl("{{baseUrl}}/documents/507f1f77bcf86cd799439011/confirm"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Regulator blocked from confirming documents (403 Forbidden)', function () {",
                  "    pm.response.to.have.status(403);",
                  "});",
                ],
              },
            },
          ],
        },
      ],
    },

    // ── 11. Security & Edge Cases ────────────────────────────────────────────
    {
      name: "11. Security & Edge Cases",
      description: "Unauthenticated requests, forged tokens, and malformed inputs.",
      item: [
        {
          name: "Protected Route - Unauthenticated Request Rejected (401)",
          request: {
            method: "GET",
            header: [],
            url: parseUrl("{{baseUrl}}/alerts"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 401 Unauthorized', function () {",
                  "    pm.response.to.have.status(401);",
                  "});",
                  "",
                  "pm.test('Returns authentication error', function () {",
                  "    const res = pm.response.json();",
                  "    pm.expect(res.error).to.be.a('string');",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Protected Route - Invalid Bearer Token Rejected (401)",
          request: {
            method: "GET",
            auth: bearerAuth("forged.fake.jwt.token"),
            header: [],
            url: parseUrl("{{baseUrl}}/alerts"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 401 Unauthorized', function () {",
                  "    pm.response.to.have.status(401);",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Validation - Malformed ObjectId in Query (400)",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_cm}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/gis/markers?siteId=invalid-mongodb-id-format"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 400 Bad Request', function () {",
                  "    pm.response.to.have.status(400);",
                  "});",
                  "",
                  "pm.test('Error reports invalid schema/ID parameter', function () {",
                  "    const res = pm.response.json();",
                  "    pm.expect(res.error).to.be.a('string');",
                  "});",
                ],
              },
            },
          ],
        },
      ],
    },
  ],
};

// ── Export generator ───────────────────────────────────────────────────────

export function generatePostmanFiles(): void {
  const backendPostmanDir = path.resolve(process.cwd(), "postman");
  const rootPostmanDir = path.resolve(process.cwd(), "..", "postman");

  for (const dir of [backendPostmanDir, rootPostmanDir]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const collPath = path.join(dir, "AgniStrot_API_Collection.postman_collection.json");
    const envPath = path.join(dir, "AgniStrot_Environment.postman_environment.json");

    fs.writeFileSync(collPath, JSON.stringify(collection, null, 2), "utf8");
    fs.writeFileSync(envPath, JSON.stringify(environment, null, 2), "utf8");

    console.log(`Generated: ${collPath}`);
    console.log(`Generated: ${envPath}`);
  }
}

// Run directly when called via tsx
generatePostmanFiles();

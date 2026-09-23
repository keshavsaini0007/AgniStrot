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
    { key: "manage_user_id", value: "", type: "default", enabled: true },
    { key: "manage_probe_email", value: "", type: "default", enabled: true },
    { key: "manage_token", value: "", type: "default", enabled: true },
    { key: "self_user_id", value: "", type: "default", enabled: true },
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
    { key: "manage_user_id", value: "", type: "string" },
    { key: "manage_probe_email", value: "", type: "string" },
    { key: "manage_token", value: "", type: "string" },
    { key: "self_user_id", value: "", type: "string" },
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
          name: "List Attendance - Field Officer Site-Scoped (200)",
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
                  "pm.test('Field Officer sees attendance scoped to their site', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "const res = pm.response.json();",
                  "pm.test('Field Officer attendance list is a non-empty array', function () {",
                  "    pm.expect(res.data).to.be.an('array');",
                  "    pm.expect(res.data.length).to.be.greaterThan(0);",
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
                  "    pm.environment.set('active_doc_id', res.data[0].id);",
                  "    pm.collectionVariables.set('active_doc_id', res.data[0].id);",
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
    {
      name: "12. Hazard Register & Control Effectiveness",
      description:
        "Feature 06 — deterministic 5x5 risk matrix (likelihood x consequence), hierarchy-of-controls effectiveness engine, and control lifecycle (plan -> implement -> assess -> close).",
      item: [
        {
          name: "Register Hazard - Corporate (Risk Matrix Computed Server-Side)",
          request: {
            method: "POST",
            auth: bearerAuth("{{token_cm}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                siteId: "{{siteId_jharia}}",
                title: "Crusher belt drive coupling guard damage",
                description: "Recurring damage to the coupling guard at the crusher transfer point",
                likelihood: 4,
                consequence: 3,
              }),
            },
            url: parseUrl("{{baseUrl}}/hazards"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Register hazard returns 201', function () {",
                  "    pm.response.to.have.status(201);",
                  "});",
                  "",
                  "pm.test('Risk matrix computed server-side (4x3 -> high/12)', function () {",
                  "    const data = pm.response.json().data;",
                  "    pm.expect(data.riskScore).to.eql(12);",
                  "    pm.expect(data.riskLevel).to.eql('high');",
                  "    pm.expect(data.status).to.eql('open');",
                  "    pm.expect(data.category).to.be.a('string');",
                  "    pm.collectionVariables.set('hazard_id', data.id);",
                  "    pm.collectionVariables.set('hazard_category', data.category);",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Register Hazard - Validation Rejected (400)",
          request: {
            method: "POST",
            auth: bearerAuth("{{token_cm}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                siteId: "{{siteId_jharia}}",
                title: "Bad likelihood probe",
                description: "likelihood must be 1-5",
                likelihood: 0,
                consequence: 3,
              }),
            },
            url: parseUrl("{{baseUrl}}/hazards"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Out-of-range likelihood -> 400', function () {",
                  "    pm.response.to.have.status(400);",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Register Hazard - Field Officer Blocked (RBAC 403)",
          request: {
            method: "POST",
            auth: bearerAuth("{{token_fo}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                siteId: "{{siteId_jharia}}",
                title: "Fence jump probe",
                description: "field officer must not register hazards",
                likelihood: 2,
                consequence: 2,
              }),
            },
            url: parseUrl("{{baseUrl}}/hazards"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Field officer registration blocked -> 403', function () {",
                  "    pm.response.to.have.status(403);",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Register Hazard - Regulator Read-Only (RBAC 403)",
          request: {
            method: "POST",
            auth: bearerAuth("{{token_reg}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                siteId: "{{siteId_jharia}}",
                title: "Oversight probe",
                description: "regulator is read-only oversight",
                likelihood: 2,
                consequence: 2,
              }),
            },
            url: parseUrl("{{baseUrl}}/hazards"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Regulator registration blocked -> 403', function () {",
                  "    pm.response.to.have.status(403);",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "List Hazards - Corporate (All Sites)",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_cm}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/hazards"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('List hazards returns 200 with rows', function () {",
                  "    pm.response.to.have.status(200);",
                  "    const res = pm.response.json();",
                  "    pm.expect(res.data).to.be.an('array');",
                  "    pm.expect(res.total).to.be.a('number');",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Hazard Dashboard - Regulator (Read-Only Overview)",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_reg}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/hazards/dashboard"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Dashboard returns 200 with counts', function () {",
                  "    pm.response.to.have.status(200);",
                  "    const d = pm.response.json().data;",
                  "    pm.expect(d.total).to.be.a('number');",
                  "    pm.expect(d.open).to.be.a('number');",
                  "    pm.expect(d.mitigating).to.be.a('number');",
                  "    pm.expect(d.controlled).to.be.a('number');",
                  "    pm.expect(d.closed).to.be.a('number');",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Add Control Measure (Engineering)",
          request: {
            method: "POST",
            auth: bearerAuth("{{token_cm}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                description: "Bolt-down heavy-duty coupling guard with interlock switch",
                controlType: "engineering",
              }),
            },
            url: parseUrl("{{baseUrl}}/hazards/{{hazard_id}}/controls"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Add control returns 201', function () {",
                  "    pm.response.to.have.status(201);",
                  "    const controls = pm.response.json().data.controls;",
                  "    const added = controls[controls.length - 1];",
                  "    pm.expect(added.implemented).to.eql(false);",
                  "    pm.collectionVariables.set('hazard_control_id', added.id);",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Implement Control (-> Mitigating)",
          request: {
            method: "POST",
            auth: bearerAuth("{{token_cm}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/hazards/{{hazard_id}}/controls/{{hazard_control_id}}/implement"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Implement control -> 200 mitigating', function () {",
                  "    pm.response.to.have.status(200);",
                  "    pm.expect(pm.response.json().data.status).to.eql('mitigating');",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Assess Control Effectiveness (Deterministic Engine)",
          request: {
            method: "POST",
            auth: bearerAuth("{{token_cm}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/hazards/{{hazard_id}}/effectiveness"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Assess effectiveness -> 200 with derived verdict', function () {",
                  "    pm.response.to.have.status(200);",
                  "    const data = pm.response.json().data;",
                  "    pm.expect(data.effectiveness.status).to.be.oneOf(['effective', 'partially_effective', 'ineffective']);",
                  "    pm.expect(data.effectiveness.residualRiskScore).to.be.a('number');",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Close Hazard - Not Yet Controlled Rejected (409)",
          request: {
            method: "POST",
            auth: bearerAuth("{{token_cm}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ closureNote: "premature close probe" }),
            },
            url: parseUrl("{{baseUrl}}/hazards/{{hazard_id}}/close"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Close before controlled -> 409', function () {",
                  "    pm.response.to.have.status(409);",
                  "});",
                ],
              },
            },
          ],
        },
      ],
    },

    // ── 13. Admin User Management ─────────────────────────────────────────
    {
      name: "13. Admin User Management",
      description:
        "Feature 07 — corporate re-roles / re-sites / deactivates other users. Changes apply to live sessions immediately (auth claims are re-read from the DB): deactivation blocks login AND revokes an issued token. Self-edit, missing site on a site-scoped role, invalid roles, and non-corporate writers are rejected.",
      item: [
        {
          name: "List Users - Corporate Directory (Real Status)",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_cm}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/users"),
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
                  "pm.test('Rows carry real status and never expose passwords', function () {",
                  "    pm.expect(res.data).to.be.an('array');",
                  "    res.data.forEach(function (u) {",
                  "        pm.expect(['active', 'inactive']).to.include(u.status);",
                  "    });",
                  "    const raw = JSON.stringify(res.data);",
                  "    pm.expect(raw.indexOf('passwordHash') === -1).to.eql(true);",
                  "});",
                  "",
                  "// Capture the corporate manager's own id for the self-edit guard.",
                  "const self = res.data.filter(function (u) { return u.email === pm.environment.get('email_cm'); })[0];",
                  "if (self) {",
                  "    pm.environment.set('self_user_id', self.id);",
                  "    pm.collectionVariables.set('self_user_id', self.id);",
                  "}",
                ],
              },
            },
          ],
        },
        {
          name: "Register Probe - Mine Official @ Jharia",
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 201', function () {",
                  "    pm.response.to.have.status(201);",
                  "});",
                  "",
                  "const res = pm.response.json();",
                  "pm.test('Probe registered with role and binding', function () {",
                  "    pm.expect(res.id).to.be.a('string');",
                  "    pm.expect(res.role).to.eql('mine_official');",
                  "});",
                  "",
                  "pm.environment.set('manage_user_id', res.id);",
                  "pm.collectionVariables.set('manage_user_id', res.id);",
                  "pm.environment.set('manage_probe_email', res.email);",
                  "pm.collectionVariables.set('manage_probe_email', res.email);",
                ],
              },
            },
          ],
          request: {
            method: "POST",
            auth: bearerAuth("{{token_cm}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                name: "Manage Probe Officer",
                email: "manage.probe.{{$randomInt}}@agnistrot.com",
                password: "password123",
                role: "mine_official",
                siteId: "{{siteId_jharia}}",
              }),
            },
            url: parseUrl("{{baseUrl}}/auth/register"),
          },
        },
        {
          name: "Login Probe - Mine Official (Token Issued)",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify(
                { email: "{{manage_probe_email}}", password: "password123" },
                null,
                2
              ),
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
                  "pm.test('Probe token carries mine_official', function () {",
                  "    pm.expect(res.user.role).to.eql('mine_official');",
                  "});",
                  "",
                  "pm.environment.set('manage_token', res.token);",
                  "pm.collectionVariables.set('manage_token', res.token);",
                ],
              },
            },
          ],
        },
        {
          name: "Mine Official Blocked from /users (RBAC 403)",
          request: {
            method: "GET",
            auth: bearerAuth("{{manage_token}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/users"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Mine official denied with 403', function () {",
                  "    pm.response.to.have.status(403);",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Re-role Probe to Corporate Manager (site cleared)",
          request: {
            method: "PATCH",
            auth: bearerAuth("{{token_cm}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ role: "corporate_manager" }, null, 2),
            },
            url: parseUrl("{{baseUrl}}/users/{{manage_user_id}}"),
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
                  "pm.test('Role applied and site cleared', function () {",
                  "    pm.expect(res.role).to.eql('corporate_manager');",
                  "    pm.expect(res.siteId).to.eql(null);",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Same Token Now Lists /users (live role change)",
          request: {
            method: "GET",
            auth: bearerAuth("{{manage_token}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/users"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Pre-issued token honored new role -> 200', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Deactivate Probe (status inactive)",
          request: {
            method: "PATCH",
            auth: bearerAuth("{{token_cm}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ status: "inactive" }, null, 2),
            },
            url: parseUrl("{{baseUrl}}/users/{{manage_user_id}}"),
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
                  "pm.test('Row flips to inactive', function () {",
                  "    pm.expect(pm.response.json().status).to.eql('inactive');",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Deactivation Revokes Live Session (401)",
          request: {
            method: "GET",
            auth: bearerAuth("{{manage_token}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/users"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Issued token now rejected -> 401', function () {",
                  "    pm.response.to.have.status(401);",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Deactivated User Cannot Login (403)",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify(
                { email: "{{manage_probe_email}}", password: "password123" },
                null,
                2
              ),
            },
            url: parseUrl("{{baseUrl}}/auth/login"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Deactivated login blocked with 403', function () {",
                  "    pm.response.to.have.status(403);",
                  "});",
                  "",
                  "pm.test('Error names deactivation', function () {",
                  "    const res = pm.response.json();",
                  "    pm.expect(res.error.toLowerCase()).to.include('deactivated');",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Reactivate Probe (status active)",
          request: {
            method: "PATCH",
            auth: bearerAuth("{{token_cm}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ status: "active" }, null, 2),
            },
            url: parseUrl("{{baseUrl}}/users/{{manage_user_id}}"),
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
                  "pm.test('Row flips back to active', function () {",
                  "    pm.expect(pm.response.json().status).to.eql('active');",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Self-Edit Guard (400)",
          request: {
            method: "PATCH",
            auth: bearerAuth("{{token_cm}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ status: "inactive" }, null, 2),
            },
            url: parseUrl("{{baseUrl}}/users/{{self_user_id}}"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Self-edit rejected with 400', function () {",
                  "    pm.response.to.have.status(400);",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Regulator Cannot Manage Users (403)",
          request: {
            method: "PATCH",
            auth: bearerAuth("{{token_reg}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ status: "inactive" }, null, 2),
            },
            url: parseUrl("{{baseUrl}}/users/{{manage_user_id}}"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Regulator blocked with 403', function () {",
                  "    pm.response.to.have.status(403);",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Site-Scoped Role Without siteId (400)",
          request: {
            method: "PATCH",
            auth: bearerAuth("{{token_cm}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ role: "mine_official" }, null, 2),
            },
            url: parseUrl("{{baseUrl}}/users/{{manage_user_id}}"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Missing site binding rejected with 400', function () {",
                  "    pm.response.to.have.status(400);",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Directory Filter - role=corporate_manager",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_cm}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/users?role=corporate_manager"),
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
                  "pm.test('Every row is a corporate_manager', function () {",
                  "    res.data.forEach(function (u) {",
                  "        pm.expect(u.role).to.eql('corporate_manager');",
                  "    });",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Directory Filter - status=inactive (tolerant)",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_cm}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/users?status=inactive"),
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
                  "pm.test('Every row is inactive', function () {",
                  "    res.data.forEach(function (u) {",
                  "        pm.expect(u.status).to.eql('inactive');",
                  "    });",
                  "});",
                ],
              },
            },
          ],
        },
      ],
    },
    {
      name: "14. Corrective Action Close-out Loop",
      description:
        "Feature 08 — a persistent close-out record turns the derived corrective feed into a real loop: the mine official (own site) or corporate manager submits fix evidence (status becomes 'verified'), then the corporate manager approves (terminal 'closed') or rejects (sender may resubmit). The chain resolves a fresh open alert, submits the close-out, approves it, and confirms the derived status on the detail feed. Runs on the freshly-seeded DB, so assertions are exact; RBAC negatives close the folder.",
      item: [
        {
          name: "Capture Open Alert - Mine Official @ Jharia",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_mo}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/alerts"),
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
                  "pm.test('Captures an alert id for the close-out loop', function () {",
                  "    const rows = res.data || [];",
                  "    const open = rows.filter(function (a) { return a.status !== 'closed'; })[0];",
                  "    pm.expect(open).to.be.an('object');",
                  "    pm.expect(open.id).to.be.a('string');",
                  "    pm.environment.set('ca_id', open.id);",
                  "    pm.collectionVariables.set('ca_id', open.id);",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Resolve Alert (Corporate, Any Site)",
          request: {
            method: "POST",
            auth: bearerAuth("{{token_cm}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ resolutionNote: "Close-out loop probe — fixed on site." }, null, 2),
            },
            url: parseUrl("{{baseUrl}}/alerts/{{ca_id}}/resolve"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Resolve succeeds (200) or is already closed (409)', function () {",
                  "    pm.expect([200, 409]).to.include(pm.response.code);",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Submit Close-out - Mine Official (Own Site)",
          request: {
            method: "POST",
            auth: bearerAuth("{{token_mo}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify(
                {
                  recommendation: "Installed a locked guard rail along the haul road.",
                  effectiveness: "Two consecutive weekly inspections passed with zero findings.",
                  evidenceNote: "Inspection checklist in the register, week 32.",
                },
                null,
                2
              ),
            },
            url: parseUrl("{{baseUrl}}/corrective-actions/{{ca_id}}/close-out"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 201', function () {",
                  "    pm.response.to.have.status(201);",
                  "});",
                  "",
                  "const res = pm.response.json();",
                  "pm.test('Close-out record created as submitted', function () {",
                  "    pm.expect(res.data.status).to.eql('submitted');",
                  "    pm.expect(res.data.recommendation).to.be.a('string');",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Detail Feed Shows Verified (Close-out Submitted)",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_mo}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/corrective-actions/{{ca_id}}"),
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
                  "pm.test('Derived status is verified with closeout evidence', function () {",
                  "    pm.expect(res.data.status).to.eql('verified');",
                  "    pm.expect(res.data.closeout).to.be.an('object');",
                  "    pm.expect(res.data.closeout.status).to.eql('submitted');",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Approve Close-out (Corporate Manager)",
          request: {
            method: "POST",
            auth: bearerAuth("{{token_cm}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ reviewNote: "Evidence checks out — closing out." }, null, 2),
            },
            url: parseUrl("{{baseUrl}}/corrective-actions/{{ca_id}}/approve"),
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
                  "pm.test('Close-out is approved', function () {",
                  "    pm.expect(res.data.status).to.eql('approved');",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Detail Feed Shows Terminal Closed After Approval",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_cm}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/corrective-actions/{{ca_id}}"),
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
                  "pm.test('Derived status is closed with approved closeout', function () {",
                  "    pm.expect(res.data.status).to.eql('closed');",
                  "    pm.expect(res.data.closeout.status).to.eql('approved');",
                  "    pm.expect(res.data.closeout.reviewedBy).to.be.a('string');",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "RBAC: Field Officer Submit Blocked",
          request: {
            method: "POST",
            auth: bearerAuth("{{token_fo}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify(
                { recommendation: "Not authorised to submit.", effectiveness: "Not authorised to submit." },
                null,
                2
              ),
            },
            url: parseUrl("{{baseUrl}}/corrective-actions/{{ca_id}}/close-out"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Field officer denied with 403', function () {",
                  "    pm.response.to.have.status(403);",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "RBAC: Mine Official Approve Blocked",
          request: {
            method: "POST",
            auth: bearerAuth("{{token_mo}}"),
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ reviewNote: "Not corporate." }, null, 2),
            },
            url: parseUrl("{{baseUrl}}/corrective-actions/{{ca_id}}/approve"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Mine official denied with 403', function () {",
                  "    pm.response.to.have.status(403);",
                  "});",
                ],
              },
            },
          ],
        },
      ],
    },
    {
      name: "15. Register CSV Export",
      description:
        "Feature 09 — register export as CSV with attachment headers (Content-Type: text/csv, Content-Disposition: attachment, UTF-8 BOM). Corporate manager downloads the full user register; attendance export is role-scoped (mine_official sees only own-site rows). RBAC negatives close the folder.",
      item: [
        {
          name: "Export Users CSV - Corporate Manager",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_cm}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/exports/users.csv"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Status code is 200 with text/csv', function () {",
                  "    pm.response.to.have.status(200);",
                  "    pm.expect(pm.response.headers.get('content-type')).to.include('text/csv');",
                  "});",
                  "pm.test('Attachment disposition + filename', function () {",
                  "    const cd = pm.response.headers.get('content-disposition') || '';",
                  "    pm.expect(cd).to.include('attachment');",
                  "    pm.expect(cd).to.include('users-register.csv');",
                  "});",
                  "pm.test('Body has header row + seeded email', function () {",
                  "    const txt = pm.response.text();",
                  "    pm.expect(txt).to.include('Name,Email,Role,Site,Status,Created');",
                  "    pm.expect(txt).to.include('amit@agnistrot.com');",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Export Users CSV - Field Officer Denied (403)",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_fo}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/exports/users.csv"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Field officer denied with 403', function () {",
                  "    pm.response.to.have.status(403);",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Export Users CSV - Regulator Denied (403)",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_reg}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/exports/users.csv"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Regulator denied with 403', function () {",
                  "    pm.response.to.have.status(403);",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Export Attendance CSV - Mine Official (Own Site)",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_mo}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/exports/attendance.csv"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Mine official gets scoped attendance CSV', function () {",
                  "    pm.response.to.have.status(200);",
                  "    const cd = pm.response.headers.get('content-disposition') || '';",
                  "    pm.expect(cd).to.include('attendance-register.csv');",
                  "    pm.expect(pm.response.text()).to.include('Site ID,Site,Worker,Check Type,Captured At,Synced At');",
                  "});",
                ],
              },
            },
          ],
        },
        {
          name: "Export Attendance CSV - Corporate Date Window",
          request: {
            method: "GET",
            auth: bearerAuth("{{token_cm}}"),
            header: [],
            url: parseUrl("{{baseUrl}}/exports/attendance.csv?from=2026-01-01T00:00:00.000Z&to=2031-01-01T00:00:00.000Z"),
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test('Corporate windowed export is a CSV with rows', function () {",
                  "    pm.response.to.have.status(200);",
                  "    pm.expect(pm.response.headers.get('content-type')).to.include('text/csv');",
                  "    const txt = pm.response.text();",
                  "    pm.expect(txt).to.include('Site ID,Site,Worker');",
                  "    pm.expect(txt.split('\\r\\n').length).to.be.above(2);",
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

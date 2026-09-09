import "dotenv/config";
import { spawn, execSync, type ChildProcess } from "node:child_process";
import net from "node:net";
import { request as httpRequest } from "node:http";
import path from "node:path";
import newman from "newman";
import Document from "../models/Document.js";
import Site from "../models/Site.js";
import connectDB from "../config/db.js";
import mongoose from "mongoose";

const PORT = 5000;
const HOST = "127.0.0.1";
const ROOT = process.cwd();

function killPort(port: number): void {
  if (process.platform !== "win32") return;
  try {
    const out = execSync(`netstat -ano -p tcp | findstr ":${port}" | findstr LISTENING`).toString();
    const pids = new Set(
      out.split(/\r?\n/).map((l) => l.trim().split(/\s+/).pop()).filter(Boolean)
    );
    for (const pid of pids) {
      try { execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" }); } catch { /* ignore */ }
    }
  } catch { /* nothing listening */ }
}

function startServer(): ChildProcess {
  const sp = spawn("npx", ["tsx", "src/server.ts"], {
    cwd: ROOT,
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  return sp;
}

function stopServer(sp: ChildProcess): void {
  try {
    if (process.platform === "win32") execSync(`taskkill /PID ${sp.pid} /T /F`, { stdio: "ignore" });
    else sp.kill("SIGTERM");
  } catch {
    try { sp.kill(); } catch { /* ignore */ }
  }
}

function portOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = net.connect({ port, host: "127.0.0.1" });
    sock.once("connect", () => { sock.destroy(); resolve(true); });
    sock.once("error", () => resolve(false));
  });
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function waitForServer(port: number, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await portOpen(port)) {
      try {
        const ok = await new Promise<boolean>((resolve) => {
          const req = httpRequest({ host: HOST, port, path: "/api/v1/health", method: "GET" }, (res) => {
            resolve(res.statusCode === 200);
          });
          req.on("error", () => resolve(false));
          req.end();
        });
        if (ok) return;
      } catch { /* wait */ }
    }
    await sleep(500);
  }
  throw new Error(`Server did not become healthy on port ${port}`);
}

async function prepareFixtures(): Promise<void> {
  console.log("--> Seeding canonical database...");
  execSync("npm run seed", { cwd: ROOT, stdio: "inherit" });

  await connectDB();
  // Ensure a pending document fixture exists for OCR document review test
  const jharia = await Site.findOne({ name: "Jharia Underground Mine" });
  if (jharia) {
    await Document.deleteMany({ sourceImageUrl: "https://example.com/postman-test-form.jpg" });
    await Document.create({
      siteId: jharia._id,
      sourceImageUrl: "https://example.com/postman-test-form.jpg",
      extractedFields: {
        formType: "safety",
        date: new Date().toISOString().split("T")[0],
        inspectorName: "Rahul Kumar",
        checklistItems: [{ item: "Ventilation fan functioning", result: "pass" }],
        remarks: "Seeded for Postman automated testing",
      },
      confidence: 0.94,
      reviewStatus: "pending",
    });
    console.log("--> Seeded pending document fixture for OCR tests.");
  }
  await mongoose.disconnect();
}

async function run(): Promise<void> {
  let serverProcess: ChildProcess | null = null;
  const isRunning = await portOpen(PORT);

  try {
    await prepareFixtures();

    if (!isRunning) {
      console.log(`--> Starting backend server on port ${PORT}...`);
      serverProcess = startServer();
      await waitForServer(PORT);
      console.log("--> Backend server ready.");
    } else {
      console.log(`--> Existing server detected on port ${PORT}. Reusing server.`);
    }

    const collectionPath = path.resolve(ROOT, "postman/AgniStrot_API_Collection.postman_collection.json");
    const environmentPath = path.resolve(ROOT, "postman/AgniStrot_Environment.postman_environment.json");

    console.log("\n=======================================================");
    console.log("       STARTING NEWMAN POSTMAN TEST EXECUTION          ");
    console.log("=======================================================\n");

    const summary = await new Promise<newman.NewmanRunSummary>((resolve, reject) => {
      newman.run(
        {
          collection: collectionPath,
          environment: environmentPath,
          reporters: ["cli"],
          reporter: {
            cli: {
              noSummary: false,
              noFailures: false,
            },
          },
        },
        (err, summary) => {
          if (err) return reject(err);
          resolve(summary);
        }
      );
    });

    const failures = summary.run.failures.length;
    const totalAssertions = summary.run.stats.assertions.total ?? 0;
    const failedAssertions = summary.run.stats.assertions.failed ?? 0;

    console.log("\n=======================================================");
    console.log(` POSTMAN TEST REPORT: ${totalAssertions - failedAssertions}/${totalAssertions} Assertions Passed`);
    console.log(` Failures: ${failures}`);
    console.log("=======================================================\n");

    if (failures > 0) {
      process.exit(1);
    }
  } finally {
    if (serverProcess) {
      console.log("--> Shutting down test server process...");
      stopServer(serverProcess);
    }
  }
}

run().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});

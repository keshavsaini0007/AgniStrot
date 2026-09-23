import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { Types } from "mongoose";
import type { JwtPayload } from "../types/index.js";
import { verifyToken } from "../middleware/auth.js";
import User from "../models/User.js";

// ── Socket.io layer ─────────────────────────────────────────────────────────
// Live push for the alert/workflow engine:
//   - Handshake auth: JWT from socket handshake (client: io(url, { auth: { token } }))
//   - Rooms: each user joins "role:<role>" and, when site-scoped, "site:<siteId>"
//   - Events:
//       alert:new       → site room + corporate_manager + regulator rooms
//       alert:escalated → same targets (the mine_official is in the site room)

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.use(async (socket, next) => {
    const authToken =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.auth?.authorization as string | undefined)
        ?.replace(/^Bearer\s+/i, "");

    const user = authToken ? verifyToken(authToken) : null;
    if (!user) return next(new Error("Unauthorized"));

    // Live deactivation gate (feature 07): a deactivated account's handshake is
    // rejected even with a still-valid JWT. Non-leaky — same message as a bad
    // token, so account state is never disclosed to the wire.
    try {
      const active = await User.exists({ _id: new Types.ObjectId(user.id), isActive: true });
      if (!active) return next(new Error("Unauthorized"));
    } catch {
      return next(new Error("Unauthorized"));
    }

    socket.data.user = user;
    next();
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as JwtPayload;
    socket.join(`role:${user.role}`);
    if (user.siteId) socket.join(`site:${user.siteId}`);
  });

  return io;
}

// ── Emit helper — engines call this; no engine imports this module the other way ──

export function emitAlertEvent(
  event: "alert:new" | "alert:escalated",
  siteId: string,
  data: Record<string, unknown>
): void {
  if (!io) return;
  io.to(`site:${siteId}`).to("role:corporate_manager").to("role:regulator").emit(event, data);
}

// ── Record-sync events ──────────────────────────────────────────────────────
// Pushed when the mobile app syncs new field records. Target rooms mirror
// alert targeting: the site where the record was captured + corporate/regulator.
//   inspection:new  → inspection synced from the field
//   incident:new    → incident reported from the field
//   attendance:new  → attendance check-in/out synced

export type RecordSource = "inspection" | "incident" | "attendance";

export function emitRecordEvent(
  source: RecordSource,
  siteId: string,
  data: Record<string, unknown>
): void {
  if (!io) return;
  io.to(`site:${siteId}`).to("role:corporate_manager").to("role:regulator").emit(`${source}:new`, data);
}
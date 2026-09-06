import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import type { JwtPayload } from "../types/index.js";
import { verifyToken } from "../middleware/auth.js";

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

  io.use((socket, next) => {
    const authToken =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.auth?.authorization as string | undefined)
        ?.replace(/^Bearer\s+/i, "");

    const user = authToken ? verifyToken(authToken) : null;
    if (!user) return next(new Error("Unauthorized"));

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
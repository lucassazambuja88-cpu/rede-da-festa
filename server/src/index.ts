import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { adminDb } from "./firebaseAdmin.js";
import { closeExpiredEvents } from "./services/eventLifecycleService.js";
import { generateEventQr } from "./services/qrService.js";

dotenv.config();

const app = express();
const port = Number(process.env.SERVER_PORT ?? 4000);
const appBaseUrl = process.env.SERVER_APP_BASE_URL ?? "http://localhost:5173";

app.use(cors());
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ ok: true, service: "rede-da-festa-server" });
});

app.post("/api/events/:eventId/qr", async (request, response) => {
  const { eventId } = request.params;
  const { code } = request.body as { code?: string };

  if (!code) {
    response.status(400).json({ message: "O codigo do evento e obrigatorio para gerar o QR Code." });
    return;
  }

  const result = await generateEventQr(appBaseUrl, eventId, code);
  response.json(result);
});

app.get("/api/events/:eventId/metrics", async (request, response) => {
  const { eventId } = request.params;

  const [participants, messages, reports] = await Promise.all([
    adminDb.collection("eventParticipants").where("eventId", "==", eventId).count().get(),
    adminDb.collection("messages").where("eventId", "==", eventId).count().get(),
    adminDb.collection("reports").where("eventId", "==", eventId).count().get(),
  ]);

  response.json({
    participants: participants.data().count,
    messages: messages.data().count,
    reports: reports.data().count,
  });
});

app.post("/api/events/close-expired", async (_request, response) => {
  await closeExpiredEvents();
  response.json({ ok: true });
});

app.listen(port, () => {
  console.log(`Rede da Festa server running on http://localhost:${port}`);
});

import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin.js";

export async function closeExpiredEvents() {
  const now = Timestamp.now();
  const snapshot = await adminDb
    .collection("events")
    .where("isActive", "==", true)
    .where("endsAt", "<=", now)
    .get();

  await Promise.all(
    snapshot.docs.map(async (entry) => {
      await entry.ref.update({
        isActive: false,
        updatedAt: Timestamp.now(),
      });

      const participantSnapshot = await adminDb
        .collection("eventParticipants")
        .where("eventId", "==", entry.id)
        .where("visible", "==", true)
        .get();

      await Promise.all(
        participantSnapshot.docs.map((participant) =>
          participant.ref.update({
            visible: false,
            eventClosedAt: Timestamp.now(),
          }),
        ),
      );
    }),
  );
}

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { buildEntryPath, buildEntryUrl, generateEventCode } from "@/services/eventCode";
import { EventItem, EventParticipant, OrganizerMetric, Profile } from "@/types";

function mapTimestamp(value: unknown) {
  return value instanceof Timestamp ? value.toDate().toISOString() : String(value ?? "");
}

function mapEvent(entry: { id: string; data: () => Record<string, unknown> }) {
  const data = entry.data();
  return {
    id: entry.id,
    ...data,
    entryPath: String(data.entryPath ?? buildEntryPath(String(data.code ?? ""))),
    entryUrl: String(data.entryUrl ?? buildEntryUrl(String(data.code ?? ""))),
    startsAt: mapTimestamp(data.startsAt),
    endsAt: mapTimestamp(data.endsAt),
  } as EventItem;
}

export function getEventStatus(event: EventItem | null) {
  if (!event) {
    return { label: "Evento", isLive: false, isEnded: false, hasStarted: false };
  }

  const now = Date.now();
  const startsAt = new Date(event.startsAt).getTime();
  const endsAt = new Date(event.endsAt).getTime();

  if (!event.isActive || now > endsAt) {
    return { label: "Encerrado", isLive: false, isEnded: true, hasStarted: true };
  }

  if (now < startsAt) {
    return { label: "Aguardando inicio", isLive: false, isEnded: false, hasStarted: false };
  }

  return { label: "Ao vivo agora", isLive: true, isEnded: false, hasStarted: true };
}

export async function listEvents() {
  const eventQuery = query(collection(db, "events"), orderBy("startsAt", "asc"));
  const snapshot = await getDocs(eventQuery);

  return snapshot.docs.map(mapEvent);
}

export async function listPublicEvents() {
  const events = await listEvents();
  return events.map((event) => ({
    ...event,
    code: "",
    entryPath: "",
    entryUrl: "",
    qrPayload: "",
  }));
}

export async function listOrganizerEvents(ownerId: string) {
  const events = await listEvents();
  return events.filter((event) => event.ownerId === ownerId);
}

export async function getEventById(eventId: string) {
  const snapshot = await getDoc(doc(db, "events", eventId));
  if (!snapshot.exists()) {
    return null;
  }

  return mapEvent({
    id: snapshot.id,
    data: () => snapshot.data(),
  });
}

export async function getEventParticipant(eventId: string, userId: string) {
  const snapshot = await getDoc(doc(db, "eventParticipants", `${eventId}_${userId}`));
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  return {
    id: snapshot.id,
    eventId: String(data.eventId ?? eventId),
    userId: String(data.userId ?? userId),
    checkedInAt: mapTimestamp(data.checkedInAt),
    visible: Boolean(data.visible),
    profile: data.profileSnapshot as Profile,
  } satisfies EventParticipant;
}

async function ensureUniqueEventCode() {
  let nextCode = generateEventCode();
  let exists = true;

  while (exists) {
    const snapshot = await getDocs(query(collection(db, "events"), where("code", "==", nextCode)));
    exists = snapshot.size > 0;
    if (exists) {
      nextCode = generateEventCode();
    }
  }

  return nextCode;
}

export async function createEvent(
  event: Omit<EventItem, "id" | "isActive" | "code" | "entryPath" | "entryUrl" | "ownerId">,
) {
  if (!auth.currentUser) {
    throw new Error("Voce precisa estar logado para criar um evento.");
  }

  const code = await ensureUniqueEventCode();
  const entryPath = buildEntryPath(code);
  const entryUrl = buildEntryUrl(code);

  const docRef = await addDoc(collection(db, "events"), {
    ...event,
    ownerId: auth.currentUser.uid,
    code,
    entryPath,
    entryUrl,
    qrPayload: entryUrl,
    startsAt: Timestamp.fromDate(new Date(event.startsAt)),
    endsAt: Timestamp.fromDate(new Date(event.endsAt)),
    isActive: true,
    checkInEnabled: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    ...event,
    ownerId: auth.currentUser.uid,
    code,
    entryPath,
    entryUrl,
    qrPayload: entryUrl,
    isActive: true,
    checkInEnabled: false,
  } as EventItem;
}

export async function updateEventStatus(eventId: string, isActive: boolean) {
  await updateDoc(doc(db, "events", eventId), {
    isActive,
    updatedAt: serverTimestamp(),
  });
}

export async function setEventCheckInEnabled(eventId: string, checkInEnabled: boolean) {
  await updateDoc(doc(db, "events", eventId), {
    checkInEnabled,
    updatedAt: serverTimestamp(),
  });
}

export async function checkInToEvent(eventId: string, userId: string, code: string, profile: Profile) {
  const event = await getEventById(eventId);
  if (!event) {
    throw new Error("Evento nao encontrado.");
  }
  if (event.code !== code) {
    throw new Error("Codigo invalido. Confira o codigo entregue na bilheteria.");
  }
  const status = getEventStatus(event);
  if (!status.hasStarted) {
    throw new Error("Entrada ainda nao liberada. O acesso sera aberto no horario do evento.");
  }
  if (status.isEnded) {
    throw new Error("Evento encerrado.");
  }
  if (!event.checkInEnabled) {
    throw new Error("Entrada ainda nao liberada pelo organizador.");
  }

  if (!profile.photoUrl) {
    throw new Error("Voce precisa cadastrar uma foto de rosto antes de entrar no evento.");
  }

  const participantRef = doc(db, "eventParticipants", `${eventId}_${userId}`);
  const existingParticipant = await getDoc(participantRef);

  if (existingParticipant.exists() && existingParticipant.data().visible === true) {
    throw new Error("Voce ja esta neste evento.");
  }

  try {
    await setDoc(participantRef, {
      eventId,
      userId,
      checkedInAt: serverTimestamp(),
      visible: true,
      profileSnapshot: profile,
      eventCode: code,
    }, { merge: true });
  } catch (error) {
    const firebaseCode = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (firebaseCode.includes("permission-denied")) {
      throw new Error("A entrada foi bloqueada pelas regras do evento. Confira se a entrada foi liberada pelo organizador e se as regras mais recentes do Firebase foram publicadas.");
    }
    throw error;
  }

  return "Voce entrou na festa";
}

export async function findEventByCode(code: string) {
  const normalizedCode = code.trim().toUpperCase();
  const snapshot = await getDocs(query(collection(db, "events"), where("code", "==", normalizedCode)));

  if (!snapshot.docs.length) {
    return null;
  }

  const entry = snapshot.docs[0];
  return mapEvent({
    id: entry.id,
    data: () => entry.data(),
  });
}

export async function checkInWithEventCode(code: string, userId: string, profile: Profile) {
  const event = await findEventByCode(code);
  if (!event) {
    throw new Error("Evento nao encontrado.");
  }

  const message = await checkInToEvent(event.id, userId, event.code, profile);
  return { event, message };
}

export async function leaveEvent(eventId: string, userId: string) {
  await setDoc(doc(db, "eventParticipants", `${eventId}_${userId}`), {
    visible: false,
    leftAt: serverTimestamp(),
  }, { merge: true });
}

export async function isUserVisibleInEvent(eventId: string, userId: string) {
  const snapshot = await getDoc(doc(db, "eventParticipants", `${eventId}_${userId}`));
  return snapshot.exists() && snapshot.data().visible === true;
}

export function subscribeToParticipants(
  eventId: string,
  callback: (participants: EventParticipant[]) => void,
  onError?: (message: string) => void,
) {
  const participantsQuery = query(
    collection(db, "eventParticipants"),
    where("eventId", "==", eventId),
    where("visible", "==", true),
  );

  return onSnapshot(
    participantsQuery,
    (snapshot) => {
      const participants = snapshot.docs.map((entry) => {
        const data = entry.data();
        return {
          id: entry.id,
          eventId: data.eventId,
          userId: data.userId,
          checkedInAt: mapTimestamp(data.checkedInAt),
          visible: data.visible,
          profile: data.profileSnapshot as Profile,
        } satisfies EventParticipant;
      });

      callback(participants);
    },
    () => {
      onError?.("Nao foi possivel atualizar a lista de presentes.");
    },
  );
}

export async function getOrganizerMetrics(eventId: string): Promise<OrganizerMetric> {
  const [participants, conversations, reports] = await Promise.all([
    getDocs(query(collection(db, "eventParticipants"), where("eventId", "==", eventId))),
    getDocs(query(collection(db, "conversations"), where("eventId", "==", eventId))),
    getDocs(query(collection(db, "reports"), where("eventId", "==", eventId))),
  ]);

  return {
    participants: participants.size,
    messages: conversations.size,
    reports: reports.size,
  };
}

export async function closeExpiredEvent(event: EventItem) {
  if (new Date(event.endsAt).getTime() > Date.now() || !event.isActive) {
    return;
  }

  await updateEventStatus(event.id, false);

  const participants = await getDocs(
    query(collection(db, "eventParticipants"), where("eventId", "==", event.id), where("visible", "==", true)),
  );

  await Promise.all(
    participants.docs.map((entry) =>
      updateDoc(doc(db, "eventParticipants", entry.id), {
        visible: false,
        eventClosedAt: serverTimestamp(),
      }),
    ),
  );
}

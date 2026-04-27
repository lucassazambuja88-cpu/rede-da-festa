import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getProfile } from "@/services/profileService";
import { ChatMessage, Conversation, Profile } from "@/types";

function mapTimestamp(value: unknown) {
  return value instanceof Timestamp ? value.toDate().toISOString() : String(value ?? "");
}

function pickConversationProfile(profile: Profile | null) {
  return {
    displayName: profile?.displayName ?? "Participante",
    photoUrl: profile?.photoUrl ?? "",
  };
}

function mapConversation(entry: { id: string; data: () => Record<string, unknown> }) {
  const data = entry.data();
  const rawLastMessage = data.lastMessage as Record<string, unknown> | null | undefined;

  return {
    id: entry.id,
    eventId: String(data.eventId ?? ""),
    participants: (data.participants ?? {}) as Record<string, boolean>,
    participantProfiles: (data.participantProfiles ?? {}) as Conversation["participantProfiles"],
    lastMessage: rawLastMessage
      ? {
          from: String(rawLastMessage.from ?? ""),
          text: String(rawLastMessage.text ?? ""),
          timestamp: mapTimestamp(rawLastMessage.timestamp),
        }
      : null,
    updatedAt: mapTimestamp(data.updatedAt),
    closedAt: data.closedAt ? mapTimestamp(data.closedAt) : null,
  } satisfies Conversation;
}

export async function getOrCreateConversation(
  eventId: string,
  currentUserId: string,
  targetUserId: string,
  options?: {
    currentProfile?: Profile | null;
    targetProfile?: Profile | null;
  },
) {
  try {
    const conversationQuery = query(
      collection(db, "conversations"),
      where("eventId", "==", eventId),
      where(`participants.${currentUserId}`, "==", true),
      where(`participants.${targetUserId}`, "==", true),
      limit(1),
    );

    const existing = await getDocs(conversationQuery);
    if (!existing.empty) {
      return mapConversation({
        id: existing.docs[0].id,
        data: () => existing.docs[0].data(),
      });
    }

    const currentProfile = options?.currentProfile ?? (await getProfile(currentUserId));
    const targetProfile = options?.targetProfile ?? (await getProfile(targetUserId));
    const conversationRef = doc(collection(db, "conversations"));

    await setDoc(conversationRef, {
      eventId,
      participants: {
        [currentUserId]: true,
        [targetUserId]: true,
      },
      participantProfiles: {
        [currentUserId]: pickConversationProfile(currentProfile),
        [targetUserId]: pickConversationProfile(targetProfile),
      },
      lastMessage: null,
      updatedAt: serverTimestamp(),
    });

    return {
      id: conversationRef.id,
      eventId,
      participants: {
        [currentUserId]: true,
        [targetUserId]: true,
      },
      participantProfiles: {
        [currentUserId]: pickConversationProfile(currentProfile),
        [targetUserId]: pickConversationProfile(targetProfile),
      },
      lastMessage: null,
      updatedAt: new Date().toISOString(),
      closedAt: null,
    } satisfies Conversation;
  } catch (error) {
    const firebaseCode = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (firebaseCode.includes("permission-denied")) {
      throw new Error("A conversa foi bloqueada pelas regras do Firebase. Confirme se os dois usuarios ainda estao presentes no mesmo evento e se as regras mais recentes foram publicadas.");
    }
    throw error;
  }
}

export async function listUserConversations(userId: string): Promise<Conversation[]> {
  try {
    const snapshot = await getDocs(
      query(collection(db, "conversations"), where(`participants.${userId}`, "==", true)),
    );

    return snapshot.docs
      .map((entry) => mapConversation({ id: entry.id, data: () => entry.data() }))
      .sort((left, right) => {
        const leftTime = left.lastMessage?.timestamp ? new Date(left.lastMessage.timestamp).getTime() : 0;
        const rightTime = right.lastMessage?.timestamp ? new Date(right.lastMessage.timestamp).getTime() : 0;
        return rightTime - leftTime;
      });
  } catch (error) {
    const firebaseCode = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (firebaseCode.includes("permission-denied")) {
      throw new Error("Suas conversas nao puderam ser carregadas pelas regras do Firebase.");
    }
    throw error;
  }
}

export function subscribeToMessages(
  conversationId: string,
  onUpdate: (messages: ChatMessage[]) => void,
  onError?: (message: string) => void,
) {
  const messagesQuery = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("timestamp", "asc"),
  );

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      const messages = snapshot.docs.map((entry) => {
        const data = entry.data();
        return {
          id: entry.id,
          from: String(data.from ?? ""),
          text: String(data.text ?? ""),
          timestamp: mapTimestamp(data.timestamp),
          flagged: Boolean(data.flagged ?? false),
        } satisfies ChatMessage;
      });

      onUpdate(messages);
    },
    (error) => {
      const firebaseCode = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      if (firebaseCode.includes("permission-denied")) {
        onError?.("As mensagens foram bloqueadas pelas regras do Firebase.");
        return;
      }
      onError?.("Nao foi possivel atualizar as mensagens em tempo real.");
    },
  );
}

export async function sendMessage(conversationId: string, from: string, text: string, flagged?: boolean) {
  try {
    await addDoc(collection(db, "conversations", conversationId, "messages"), {
      from,
      text,
      flagged: Boolean(flagged),
      timestamp: serverTimestamp(),
    });

    await setDoc(
      doc(db, "conversations", conversationId),
      {
        lastMessage: {
          from,
          text,
          timestamp: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch {
    throw new Error("Nao foi possivel enviar a mensagem. Tente novamente.");
  }
}

export async function getConversation(conversationId: string) {
  const snapshot = await getDoc(doc(db, "conversations", conversationId));
  if (!snapshot.exists()) {
    return null;
  }

  return mapConversation({
    id: snapshot.id,
    data: () => snapshot.data(),
  });
}

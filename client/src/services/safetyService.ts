import {
  addDoc,
  collection,
  doc,
  getDocs,
  getDoc,
  increment,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const REPORT_SUSPECT_THRESHOLD = 5;

export async function blockUser(blockerId: string, blockedId: string) {
  await setDoc(doc(db, "blocks", `${blockerId}_${blockedId}`), {
    blockerId,
    blockedId,
    createdAt: serverTimestamp(),
  });
}

export async function hasBlockBetween(userA: string, userB: string) {
  const [first, second] = await Promise.all([
    getDocs(
      query(collection(db, "blocks"), where("blockerId", "==", userA), where("blockedId", "==", userB)),
    ),
    getDocs(
      query(collection(db, "blocks"), where("blockerId", "==", userB), where("blockedId", "==", userA)),
    ),
  ]);

  return first.size > 0 || second.size > 0;
}

export async function listBlockedUserIds(userId: string) {
  const [blockedByMe, blockedMe] = await Promise.all([
    getDocs(query(collection(db, "blocks"), where("blockerId", "==", userId))),
    getDocs(query(collection(db, "blocks"), where("blockedId", "==", userId))),
  ]);

  return new Set<string>([
    ...blockedByMe.docs.map((entry) => String(entry.data().blockedId)),
    ...blockedMe.docs.map((entry) => String(entry.data().blockerId)),
  ]);
}

export async function reportUser(params: {
  eventId: string;
  reporterId: string;
  reportedId: string;
  reason: string;
}) {
  await addDoc(collection(db, "reports"), {
    ...params,
    createdAt: serverTimestamp(),
    status: "open",
  });

  const profileRef = doc(db, "profiles", params.reportedId);
  const snapshot = await getDoc(profileRef);
  const nextCount = Number(snapshot.data()?.reportCount ?? 0) + 1;

  await updateDoc(profileRef, {
    reportCount: increment(1),
    isSuspect: nextCount >= REPORT_SUSPECT_THRESHOLD,
    updatedAt: serverTimestamp(),
  });
}

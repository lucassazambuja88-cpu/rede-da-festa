import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Profile, UserRole } from "@/types";

function mapProfile(entry: { id: string; data: () => Record<string, unknown> }): Profile {
  const data = entry.data();
  return {
    id: entry.id,
    email: String(data.email ?? ""),
    displayName: String(data.displayName ?? ""),
    age: Number(data.age ?? 18),
    gender: (data.gender ?? "prefiro-nao-dizer") as Profile["gender"],
    preference: (data.preference ?? "todos") as Profile["preference"],
    bio: String(data.bio ?? ""),
    photoUrl: String(data.photoUrl ?? ""),
    photoBase64: String(data.photoBase64 ?? ""),
    secondPhotoUrl: String(data.secondPhotoUrl ?? ""),
    secondPhotoBase64: String(data.secondPhotoBase64 ?? ""),
    role: (data.role ?? "user") as UserRole,
    organizerStatus: (data.organizerStatus ?? "none") as Profile["organizerStatus"],
    organizerApprovedAt: String(data.organizerApprovedAt ?? ""),
    reportCount: Number(data.reportCount ?? 0),
    isSuspect: Boolean(data.isSuspect ?? false),
    isBanned: Boolean(data.isBanned ?? false),
    blockedUserIds: Array.isArray(data.blockedUserIds) ? (data.blockedUserIds as string[]) : [],
  };
}

export async function findProfileByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const directSnapshot = await getDocs(
    query(collection(db, "profiles"), where("email", "==", email.trim()), limit(1)),
  );

  const snapshot = directSnapshot.empty
    ? await getDocs(query(collection(db, "profiles"), where("email", "==", normalized), limit(1)))
    : directSnapshot;

  if (snapshot.empty) {
    return null;
  }

  const entry = snapshot.docs[0];
  return mapProfile({ id: entry.id, data: () => entry.data() });
}

export async function setUserRole(userId: string, role: UserRole) {
  await setDoc(
    doc(db, "profiles", userId),
    {
      role,
      organizerStatus: role === "organizer" ? "approved" : "none",
      organizerApprovedAt: role === "organizer" ? serverTimestamp() : "",
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function setUserBan(userId: string, isBanned: boolean) {
  await updateDoc(doc(db, "profiles", userId), {
    isBanned,
    updatedAt: serverTimestamp(),
  });
}

export async function listFlaggedProfiles() {
  const snapshot = await getDocs(
    query(collection(db, "profiles"), where("isSuspect", "==", true)),
  );

  return snapshot.docs.map((entry) => mapProfile({ id: entry.id, data: () => entry.data() }));
}

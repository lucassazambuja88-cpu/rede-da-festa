import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { OrganizerRequest, Profile } from "@/types";

function mapTimestamp(value: unknown) {
  return value instanceof Timestamp ? value.toDate().toISOString() : String(value ?? "");
}

function mapRequest(entry: { id: string; data: () => Record<string, unknown> }) {
  const data = entry.data();
  return {
    id: entry.id,
    userId: String(data.userId ?? ""),
    requesterName: String(data.requesterName ?? ""),
    requesterEmail: String(data.requesterEmail ?? ""),
    venueName: String(data.venueName ?? ""),
    city: String(data.city ?? ""),
    notes: String(data.notes ?? ""),
    status: (data.status ?? "pending") as OrganizerRequest["status"],
    createdAt: mapTimestamp(data.createdAt),
    reviewedAt: mapTimestamp(data.reviewedAt),
    reviewedBy: String(data.reviewedBy ?? ""),
  } satisfies OrganizerRequest;
}

export async function getMyOrganizerRequest(userId: string) {
  const snapshot = await getDocs(query(collection(db, "organizerRequests"), where("userId", "==", userId)));

  const sorted = snapshot.docs.sort((left, right) => {
    const leftTime = left.data().createdAt instanceof Timestamp ? left.data().createdAt.toDate().getTime() : 0;
    const rightTime = right.data().createdAt instanceof Timestamp ? right.data().createdAt.toDate().getTime() : 0;
    return rightTime - leftTime;
  });

  return sorted.length === 0
    ? null
    : mapRequest({
        id: sorted[0].id,
        data: () => sorted[0].data(),
      });
}

export async function submitOrganizerRequest(params: {
  profile: Profile;
  venueName: string;
  city: string;
  notes: string;
}) {
  const existing = await getMyOrganizerRequest(params.profile.id);
  if (existing && existing.status === "pending") {
    throw new Error("Voce ja tem uma solicitacao pendente.");
  }

  await addDoc(collection(db, "organizerRequests"), {
    userId: params.profile.id,
    requesterName: params.profile.displayName,
    requesterEmail: params.profile.email,
    venueName: params.venueName,
    city: params.city,
    notes: params.notes,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await setDoc(
    doc(db, "profiles", params.profile.id),
    {
      organizerStatus: "pending",
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function listOrganizerRequests() {
  const snapshot = await getDocs(query(collection(db, "organizerRequests"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((entry) =>
    mapRequest({
      id: entry.id,
      data: () => entry.data(),
    }),
  );
}

export async function approveOrganizerRequest(request: OrganizerRequest, adminUserId: string) {
  await updateDoc(doc(db, "organizerRequests", request.id), {
    status: "approved",
    reviewedAt: serverTimestamp(),
    reviewedBy: adminUserId,
    updatedAt: serverTimestamp(),
  });

  await setDoc(
    doc(db, "profiles", request.userId),
    {
      role: "organizer",
      organizerStatus: "approved",
      organizerApprovedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function rejectOrganizerRequest(request: OrganizerRequest, adminUserId: string) {
  await updateDoc(doc(db, "organizerRequests", request.id), {
    status: "rejected",
    reviewedAt: serverTimestamp(),
    reviewedBy: adminUserId,
    updatedAt: serverTimestamp(),
  });

  await setDoc(
    doc(db, "profiles", request.userId),
    {
      role: "user",
      organizerStatus: "rejected",
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

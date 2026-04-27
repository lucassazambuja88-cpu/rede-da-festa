import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Profile } from "@/types";

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_DIMENSION = 500;
const OUTPUT_QUALITY = 0.76;
const OUTPUT_TYPE = "image/jpeg";
const MAX_BASE64_LENGTH = 900_000;

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Nao foi possivel ler a imagem escolhida."));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Nao foi possivel processar a imagem escolhida."));
    image.src = dataUrl;
  });
}

async function resizeAndCompressImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Escolha um arquivo de imagem valido.");
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("A imagem original esta muito grande. Use um arquivo de ate 2 MB.");
  }

  const originalDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(originalDataUrl);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Nao foi possivel preparar a imagem no navegador.");
  }

  context.drawImage(image, 0, 0, width, height);
  const compressedDataUrl = canvas.toDataURL(OUTPUT_TYPE, OUTPUT_QUALITY);

  if (!compressedDataUrl.startsWith("data:image/")) {
    throw new Error("Falha ao compactar a imagem.");
  }

  if (compressedDataUrl.length > MAX_BASE64_LENGTH) {
    throw new Error("A imagem final ainda ficou grande demais para salvar. Tente outra foto mais leve.");
  }

  return compressedDataUrl;
}

function mapProfile(userId: string, data: Record<string, unknown>): Profile {
  const photoBase64 = String(data.photoBase64 ?? "");
  const photoUrl = String(data.photoUrl ?? "") || photoBase64;
  const secondPhotoBase64 = String(data.secondPhotoBase64 ?? "");
  const secondPhotoUrl = String(data.secondPhotoUrl ?? "") || secondPhotoBase64;

  return {
    id: userId,
    email: String(data.email ?? ""),
    displayName: String(data.displayName ?? ""),
    age: Number(data.age ?? 18),
    gender: (data.gender ?? "prefiro-nao-dizer") as Profile["gender"],
    preference: (data.preference ?? "todos") as Profile["preference"],
    bio: String(data.bio ?? ""),
    photoUrl,
    photoBase64,
    secondPhotoUrl,
    secondPhotoBase64,
    role: (data.role ?? "user") as Profile["role"],
    organizerStatus: (data.organizerStatus ?? "none") as Profile["organizerStatus"],
    organizerApprovedAt:
      data.organizerApprovedAt instanceof Timestamp
        ? data.organizerApprovedAt.toDate().toISOString()
        : String(data.organizerApprovedAt ?? ""),
    reportCount: Number(data.reportCount ?? 0),
    isSuspect: Boolean(data.isSuspect ?? false),
    isBanned: Boolean(data.isBanned ?? false),
    createdAt:
      data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : String(data.createdAt ?? ""),
    updatedAt:
      data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : String(data.updatedAt ?? ""),
    blockedUserIds: Array.isArray(data.blockedUserIds) ? (data.blockedUserIds as string[]) : [],
  };
}

export async function getProfile(userId: string) {
  try {
    const snapshot = await getDoc(doc(db, "profiles", userId));
    return snapshot.exists() ? mapProfile(userId, snapshot.data()) : null;
  } catch {
    throw new Error("Nao foi possivel carregar seu perfil agora. Confira a conexao e tente novamente.");
  }
}

export async function uploadProfilePhoto(userId: string, file: File, slot: "primary" | "secondary" = "primary") {
  try {
    const photoBase64 = await resizeAndCompressImage(file);

    // Futuro: troque este ponto por Firebase Storage.
    // 1. fazer upload do blob
    // 2. pegar a URL com getDownloadURL
    // 3. salvar a URL publica no Firestore
    await saveProfilePhotoUrl(userId, photoBase64, slot);

    return photoBase64;
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "Nao foi possivel preparar ou salvar sua foto. Tente uma imagem menor e mais leve.",
    );
  }
}

export async function saveProfile(userId: string, profile: Omit<Profile, "id" | "createdAt" | "updatedAt">) {
  if (!profile.photoUrl) {
    throw new Error("A foto de rosto e obrigatoria para publicar o perfil.");
  }

  try {
    const profileRef = doc(db, "profiles", userId);
    const existingProfile = await getDoc(profileRef);

    await setDoc(
      profileRef,
      {
        ...profile,
        id: userId,
        photoBase64: profile.photoBase64 ?? profile.photoUrl,
        secondPhotoBase64: profile.secondPhotoBase64 ?? profile.secondPhotoUrl ?? "",
        role: profile.role ?? existingProfile.data()?.role ?? "user",
        organizerStatus: profile.organizerStatus ?? existingProfile.data()?.organizerStatus ?? "none",
        organizerApprovedAt: profile.organizerApprovedAt ?? existingProfile.data()?.organizerApprovedAt ?? "",
        reportCount: profile.reportCount ?? existingProfile.data()?.reportCount ?? 0,
        isSuspect: profile.isSuspect ?? existingProfile.data()?.isSuspect ?? false,
        isBanned: profile.isBanned ?? existingProfile.data()?.isBanned ?? false,
        createdAt: existingProfile.exists() ? existingProfile.data()?.createdAt ?? serverTimestamp() : serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch {
    throw new Error("Nao foi possivel salvar seu perfil no Firestore. Confira as regras do Firestore e tente novamente.");
  }
}

export async function saveProfilePhotoUrl(
  userId: string,
  photoUrl: string,
  slot: "primary" | "secondary" = "primary",
) {
  if (!photoUrl) {
    throw new Error("A imagem processada ficou vazia. Tente outra foto.");
  }

  try {
    const profileRef = doc(db, "profiles", userId);
    const existingProfile = await getDoc(profileRef);

    await setDoc(
      profileRef,
      {
        id: userId,
        email: existingProfile.data()?.email ?? "",
        displayName: existingProfile.data()?.displayName ?? "",
        age: existingProfile.data()?.age ?? 18,
        gender: existingProfile.data()?.gender ?? "prefiro-nao-dizer",
        preference: existingProfile.data()?.preference ?? "todos",
        bio: existingProfile.data()?.bio ?? "",
        photoUrl: slot === "primary" ? photoUrl : existingProfile.data()?.photoUrl ?? "",
        photoBase64: slot === "primary" ? photoUrl : existingProfile.data()?.photoBase64 ?? "",
        secondPhotoUrl: slot === "secondary" ? photoUrl : existingProfile.data()?.secondPhotoUrl ?? "",
        secondPhotoBase64: slot === "secondary" ? photoUrl : existingProfile.data()?.secondPhotoBase64 ?? "",
        role: existingProfile.data()?.role ?? "user",
        organizerStatus: existingProfile.data()?.organizerStatus ?? "none",
        organizerApprovedAt: existingProfile.data()?.organizerApprovedAt ?? "",
        reportCount: existingProfile.data()?.reportCount ?? 0,
        isSuspect: existingProfile.data()?.isSuspect ?? false,
        isBanned: existingProfile.data()?.isBanned ?? false,
        createdAt: existingProfile.exists() ? existingProfile.data()?.createdAt ?? serverTimestamp() : serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch {
    throw new Error("A imagem foi preparada, mas nao foi possivel gravar no Firestore. Confira as regras da colecao profiles.");
  }
}

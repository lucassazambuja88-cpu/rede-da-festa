import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { addDoc, collection, doc, getDocs, getFirestore, query, serverTimestamp, setDoc, Timestamp, where } from "firebase/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDir = path.resolve(__dirname, "..");

function parseEnvFile(contents) {
  return Object.fromEntries(
    contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

async function loadFirebaseConfig() {
  const envPath = path.join(clientDir, ".env");
  const raw = await fs.readFile(envPath, "utf8");
  const env = parseEnvFile(raw);

  return {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };
}

function createEventCode() {
  return `TESTE${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function createProfile(index, role = "user") {
  const primaryPhoto = `data:image/svg+xml;base64,${Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="625"><rect width="100%" height="100%" fill="#1f1b2d"/><circle cx="250" cy="190" r="100" fill="#f2d6c9"/><rect x="95" y="320" width="310" height="220" rx="48" fill="#8e44ad"/><text x="250" y="585" font-size="32" text-anchor="middle" fill="white">Perfil ${index}</text></svg>`,
  ).toString("base64")}`;
  const secondPhoto = `data:image/svg+xml;base64,${Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="625"><rect width="100%" height="100%" fill="#251f39"/><rect x="70" y="90" width="360" height="445" rx="44" fill="#ff0066"/><text x="250" y="330" font-size="36" text-anchor="middle" fill="white">Foto ${index}</text></svg>`,
  ).toString("base64")}`;

  return {
    displayName: role === "organizer" ? "Organizador Teste" : `Pessoa Teste ${index}`,
    age: role === "organizer" ? 30 : 20 + index,
    gender: index % 2 === 0 ? "mulher" : "homem",
    preference: "todos",
    bio:
      role === "organizer"
        ? "Perfil de organizador criado para validar o fluxo da Rede da Festa."
        : `Perfil de teste ${index} criado para validar visita ao perfil e conversa privada dentro do evento.`,
    photoUrl: primaryPhoto,
    photoBase64: primaryPhoto,
    secondPhotoUrl: secondPhoto,
    secondPhotoBase64: secondPhoto,
    role,
  };
}

async function ensureUser(config, name, email, password) {
  const app = initializeApp(config, `smoke-${name}-${Date.now()}-${Math.random()}`);
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    return { app, auth, db, user: credential.user, created: true };
  } catch (error) {
    if (String(error?.code ?? "").includes("email-already-in-use")) {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      return { app, auth, db, user: credential.user, created: false };
    }
    throw error;
  }
}

async function inspectAdmins(db) {
  const snapshot = await getDocs(query(collection(db, "profiles"), where("role", "==", "admin")));
  return snapshot.docs.map((entry) => {
    const data = entry.data();
    return {
      uid: entry.id,
      email: data.email ?? "",
      displayName: data.displayName ?? "",
      organizerStatus: data.organizerStatus ?? "",
    };
  });
}

async function main() {
  const config = await loadFirebaseConfig();
  const mode = process.argv.includes("--seed") ? "seed" : "inspect";

  if (mode === "inspect") {
    const app = initializeApp(config, `inspect-${Date.now()}-${Math.random()}`);
    const db = getFirestore(app);
    const admins = await inspectAdmins(db);
    console.log(JSON.stringify({ mode, adminCount: admins.length, admins }, null, 2));
    return;
  }

  const suffix = Date.now();
  const password = "Teste123!";

  const organizerEmail = `organizer.${suffix}@rede-da-festa.test`;
  const user1Email = `user1.${suffix}@rede-da-festa.test`;
  const user2Email = `user2.${suffix}@rede-da-festa.test`;

  const organizer = await ensureUser(config, "organizer", organizerEmail, password);
  const user1 = await ensureUser(config, "user1", user1Email, password);
  const user2 = await ensureUser(config, "user2", user2Email, password);

  await setDoc(
    doc(organizer.db, "profiles", organizer.user.uid),
    {
      id: organizer.user.uid,
      email: organizerEmail,
      ...createProfile(0, "organizer"),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await setDoc(
    doc(user1.db, "profiles", user1.user.uid),
    {
      id: user1.user.uid,
      email: user1Email,
      ...createProfile(1, "user"),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await setDoc(
    doc(user2.db, "profiles", user2.user.uid),
    {
      id: user2.user.uid,
      email: user2Email,
      ...createProfile(2, "user"),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  const code = createEventCode();
  const startsAt = Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 1000));
  const endsAt = Timestamp.fromDate(new Date(Date.now() + 3 * 60 * 60 * 1000));

  const eventRef = await addDoc(collection(organizer.db, "events"), {
    name: "Evento Smoke Test",
    venueName: "Casa Piloto Rede da Festa",
    description: "Evento criado automaticamente para validar perfil, visita e conversa privada.",
    startsAt,
    endsAt,
    code,
    ownerId: organizer.user.uid,
    isActive: true,
    checkInEnabled: true,
    entryPath: `/entrar/${code}`,
    entryUrl: `http://127.0.0.1:5176/entrar/${code}`,
    qrPayload: `http://127.0.0.1:5176/entrar/${code}`,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await setDoc(
    doc(user1.db, "eventParticipants", `${eventRef.id}_${user1.user.uid}`),
    {
      eventId: eventRef.id,
      userId: user1.user.uid,
      visible: true,
      checkedInAt: serverTimestamp(),
      profileSnapshot: {
        id: user1.user.uid,
        email: user1Email,
        ...createProfile(1, "user"),
      },
    },
    { merge: true },
  );

  await setDoc(
    doc(user2.db, "eventParticipants", `${eventRef.id}_${user2.user.uid}`),
    {
      eventId: eventRef.id,
      userId: user2.user.uid,
      visible: true,
      checkedInAt: serverTimestamp(),
      profileSnapshot: {
        id: user2.user.uid,
        email: user2Email,
        ...createProfile(2, "user"),
      },
    },
    { merge: true },
  );

  const conversationRef = await addDoc(collection(user1.db, "conversations"), {
    eventId: eventRef.id,
    participants: {
      [user1.user.uid]: true,
      [user2.user.uid]: true,
    },
    participantProfiles: {
      [user1.user.uid]: {
        displayName: "Pessoa Teste 1",
        photoUrl: createProfile(1, "user").photoUrl,
      },
      [user2.user.uid]: {
        displayName: "Pessoa Teste 2",
        photoUrl: createProfile(2, "user").photoUrl,
      },
    },
    lastMessage: {
      from: user1.user.uid,
      text: "Oi, passei pelo seu perfil no evento teste.",
      timestamp: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });

  await addDoc(collection(user1.db, "conversations", conversationRef.id, "messages"), {
    from: user1.user.uid,
    text: "Oi, passei pelo seu perfil no evento teste.",
    timestamp: serverTimestamp(),
    flagged: false,
  });

  await addDoc(collection(user2.db, "conversations", conversationRef.id, "messages"), {
    from: user2.user.uid,
    text: "Legal! Estou vendo aqui tambem.",
    timestamp: serverTimestamp(),
    flagged: false,
  });

  await signOut(organizer.auth);
  await signOut(user1.auth);
  await signOut(user2.auth);

  console.log(JSON.stringify({
    mode,
    organizer: { email: organizerEmail, password, uid: organizer.user.uid },
    user1: { email: user1Email, password, uid: user1.user.uid },
    user2: { email: user2Email, password, uid: user2.user.uid },
    event: { id: eventRef.id, code },
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

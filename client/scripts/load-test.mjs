import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDir = path.resolve(__dirname, "..");
const PASSWORD = "Teste123!";
const ORGANIZER_EMAIL = "organizer.1777171738807@rede-da-festa.test";
const ORGANIZER_PASSWORD = "Teste123!";

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

function getArg(flag, fallback = "") {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function getNumberArg(flag, fallback) {
  const value = Number(getArg(flag, String(fallback)));
  return Number.isFinite(value) ? value : fallback;
}

function createEventCode(prefix) {
  return `${prefix}${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function createProfile(index) {
  const primaryPhoto = `data:image/svg+xml;base64,${Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="625"><rect width="100%" height="100%" fill="#16131f"/><circle cx="250" cy="190" r="100" fill="#f2d6c9"/><rect x="95" y="320" width="310" height="220" rx="48" fill="#8e44ad"/><text x="250" y="585" font-size="28" text-anchor="middle" fill="white">Load ${index}</text></svg>`,
  ).toString("base64")}`;

  return {
    displayName: `Load User ${index + 1}`,
    age: 20 + (index % 12),
    gender: index % 2 === 0 ? "mulher" : "homem",
    preference: "todos",
    bio: `Perfil de carga ${index + 1} para testar eventos e conversas da Rede da Festa.`,
    photoUrl: primaryPhoto,
    photoBase64: primaryPhoto,
    secondPhotoUrl: "",
    secondPhotoBase64: "",
    role: "user",
    organizerStatus: "none",
    reportCount: 0,
    isSuspect: false,
    isBanned: false,
  };
}

async function withRetry(label, fn, retries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
  throw lastError ?? new Error(`Falha em ${label}`);
}

async function signInApp(config, email, password, namePrefix) {
  const app = initializeApp(config, `${namePrefix}-${Date.now()}-${Math.random()}`);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const credential = await withRetry(`signIn:${email}`, () => signInWithEmailAndPassword(auth, email, password), 4);
  return { app, auth, db, user: credential.user };
}

async function ensureUser(config, email, password, profileData) {
  const app = initializeApp(config, `ensure-${email}-${Date.now()}-${Math.random()}`);
  const auth = getAuth(app);
  const db = getFirestore(app);

  let user;
  try {
    const created = await withRetry(`createUser:${email}`, () => createUserWithEmailAndPassword(auth, email, password), 3);
    user = created.user;
  } catch (error) {
    try {
      const existing = await withRetry(`signInFallback:${email}`, () => signInWithEmailAndPassword(auth, email, password), 4);
      user = existing.user;
    } catch {
      if (!String(error?.code ?? "").includes("email-already-in-use")) {
        throw error;
      }
      const existing = await withRetry(`signInExisting:${email}`, () => signInWithEmailAndPassword(auth, email, password), 4);
      user = existing.user;
    }
  }

  await withRetry(`profileWrite:${email}`, () =>
    setDoc(
      doc(db, "profiles", user.uid),
      {
        id: user.uid,
        email,
        ...profileData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ),
  );

  await signOut(auth).catch(() => {});
  return { uid: user.uid, email };
}

async function ensureOrganizerEvent(config, label) {
  const organizer = await signInApp(config, ORGANIZER_EMAIL, ORGANIZER_PASSWORD, "organizer-load");
  try {
    const code = createEventCode(label);
    const startsAt = Timestamp.fromDate(new Date(Date.now() - 10 * 60 * 1000));
    const endsAt = Timestamp.fromDate(new Date(Date.now() + 6 * 60 * 60 * 1000));

    const eventRef = await withRetry(`eventCreate:${label}`, () =>
      addDoc(collection(organizer.db, "events"), {
        name: `Load Test ${label}`,
        venueName: "Casa Load Test",
        description: `Evento automatizado para carga ${label}.`,
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
      }),
    );

    return { eventId: eventRef.id, code, ownerId: organizer.user.uid };
  } finally {
    await signOut(organizer.auth).catch(() => {});
  }
}

async function checkInUser(config, eventId, code, email, password) {
  const session = await signInApp(config, email, password, "checkin");
  try {
    const profileSnap = await getDoc(doc(session.db, "profiles", session.user.uid));
    const profile = profileSnap.data();
    await withRetry(`checkIn:${email}`, () =>
      setDoc(
        doc(session.db, "eventParticipants", `${eventId}_${session.user.uid}`),
        {
          eventId,
          userId: session.user.uid,
          checkedInAt: serverTimestamp(),
          visible: true,
          profileSnapshot: profile,
          eventCode: code,
        },
        { merge: true },
      ),
    );
    return { uid: session.user.uid, email };
  } finally {
    await signOut(session.auth).catch(() => {});
  }
}

async function getConversationId(db, eventId, currentUserId, targetUserId) {
  const snapshot = await getDocs(
    query(
      collection(db, "conversations"),
      where("eventId", "==", eventId),
      where(`participants.${currentUserId}`, "==", true),
      where(`participants.${targetUserId}`, "==", true),
      limit(1),
    ),
  );
  return snapshot.empty ? null : snapshot.docs[0].id;
}

async function ensureConversationWithMessage(config, eventId, fromUser, targetUser, messageIndex) {
  const session = await signInApp(config, fromUser.email, PASSWORD, "conversation");
  try {
    const [currentProfileSnap, targetProfileSnap] = await Promise.all([
      getDoc(doc(session.db, "profiles", session.user.uid)),
      getDoc(doc(session.db, "profiles", targetUser.uid)),
    ]);

    const currentProfile = currentProfileSnap.data();
    const targetProfile = targetProfileSnap.data();

    let conversationId = await getConversationId(session.db, eventId, session.user.uid, targetUser.uid);

    if (!conversationId) {
      const conversationRef = doc(collection(session.db, "conversations"));
      conversationId = conversationRef.id;
      await withRetry(`conversationCreate:${fromUser.email}`, () =>
        setDoc(conversationRef, {
          eventId,
          participants: {
            [session.user.uid]: true,
            [targetUser.uid]: true,
          },
          participantProfiles: {
            [session.user.uid]: {
              displayName: currentProfile?.displayName ?? fromUser.email,
              photoUrl: currentProfile?.photoUrl ?? "",
            },
            [targetUser.uid]: {
              displayName: targetProfile?.displayName ?? targetUser.email,
              photoUrl: targetProfile?.photoUrl ?? "",
            },
          },
          lastMessage: null,
          updatedAt: serverTimestamp(),
        }),
      );
    }

    const text = `Load ${messageIndex}: oi de ${currentProfile?.displayName ?? fromUser.email} para ${targetProfile?.displayName ?? targetUser.email}`;

    await withRetry(`messageCreate:${fromUser.email}`, () =>
      addDoc(collection(session.db, "conversations", conversationId, "messages"), {
        from: session.user.uid,
        text,
        flagged: false,
        timestamp: serverTimestamp(),
      }),
    );

    await withRetry(`conversationUpdate:${fromUser.email}`, () =>
      setDoc(
        doc(session.db, "conversations", conversationId),
        {
          lastMessage: {
            from: session.user.uid,
            text,
            timestamp: serverTimestamp(),
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
    );

    return true;
  } finally {
    await signOut(session.auth).catch(() => {});
  }
}

async function runStage(config, count, linksPerUser) {
  const startedAt = Date.now();
  const label = getArg("--label", `L${count}`);
  const startIndex = getNumberArg("--offset", 0);
  const providedEventId = getArg("--eventId");
  const providedCode = getArg("--code");
  const prepareOnly = hasFlag("--prepare-only");
  const reuseOnly = hasFlag("--reuse-existing-users");
  const prepareDelayMs = getNumberArg("--prepare-delay-ms", 150);
  const checkInDelayMs = getNumberArg("--checkin-delay-ms", 100);
  const conversationDelayMs = getNumberArg("--conversation-delay-ms", 50);
  const event = providedEventId && providedCode
    ? { eventId: providedEventId, code: providedCode, ownerId: "reused" }
    : await ensureOrganizerEvent(config, label);

  const users = [];
  const metrics = {
    count,
    event,
    usersPrepared: 0,
    userCreateErrors: 0,
    checkInsOk: 0,
    checkInErrors: 0,
    conversationsOk: 0,
    conversationErrors: 0,
    durationMs: 0,
    sampleErrors: [],
  };

  for (let i = 0; i < count; i += 1) {
    const numericIndex = startIndex + i;
    const email = `load.${label.toLowerCase()}.${String(numericIndex + 1).padStart(3, "0")}@rede-da-festa.test`;
    try {
      if (reuseOnly) {
        const session = await signInApp(config, email, PASSWORD, "reuse");
        users.push({ uid: session.user.uid, email });
        await signOut(session.auth).catch(() => {});
      } else {
        const user = await ensureUser(config, email, PASSWORD, createProfile(numericIndex));
        users.push(user);
      }
      metrics.usersPrepared += 1;
    } catch (error) {
      metrics.userCreateErrors += 1;
      if (metrics.sampleErrors.length < 5) {
        metrics.sampleErrors.push({
          stage: reuseOnly ? "reuseUser" : "ensureUser",
          email,
          message: String(error?.code ?? error?.message ?? error),
        });
      }
    }
    await new Promise((resolve) => setTimeout(resolve, prepareDelayMs));
  }

  if (prepareOnly) {
    metrics.durationMs = Date.now() - startedAt;
    return metrics;
  }

  for (const user of users) {
    try {
      await checkInUser(config, event.eventId, event.code, user.email, PASSWORD);
      metrics.checkInsOk += 1;
    } catch (error) {
      metrics.checkInErrors += 1;
      if (metrics.sampleErrors.length < 5) {
        metrics.sampleErrors.push({
          stage: "checkIn",
          email: user.email,
          message: String(error?.code ?? error?.message ?? error),
        });
      }
    }
    await new Promise((resolve) => setTimeout(resolve, checkInDelayMs));
  }

  let messageIndex = 0;
  for (let i = 0; i < users.length; i += 1) {
    for (let offset = 1; offset <= linksPerUser; offset += 1) {
      const target = users[(i + offset) % users.length];
      if (!target || target.uid === users[i].uid) {
        continue;
      }
      try {
        await ensureConversationWithMessage(config, event.eventId, users[i], target, ++messageIndex);
        metrics.conversationsOk += 1;
      } catch (error) {
        metrics.conversationErrors += 1;
        if (metrics.sampleErrors.length < 5) {
          metrics.sampleErrors.push({
            stage: "conversation",
            email: users[i].email,
            target: target.email,
            message: String(error?.code ?? error?.message ?? error),
          });
        }
      }
      await new Promise((resolve) => setTimeout(resolve, conversationDelayMs));
    }
  }

  metrics.durationMs = Date.now() - startedAt;
  return metrics;
}

async function main() {
  const config = await loadFirebaseConfig();
  const stages = (getArg("--stages", "20,50,100"))
    .split(",")
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isFinite(entry) && entry > 0);
  const linksPerUser = Number(getArg("--links", "3"));

  const results = [];

  for (const stage of stages) {
    const result = await runStage(config, stage, linksPerUser);
    results.push(result);
    console.log(JSON.stringify(result, null, 2));
  }

  console.log(JSON.stringify({ stages: results }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

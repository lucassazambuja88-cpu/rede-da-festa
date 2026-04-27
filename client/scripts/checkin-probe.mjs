import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";

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

function getArg(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : "";
}

function mapTimestamp(value) {
  return value instanceof Timestamp ? value.toDate().toISOString() : String(value ?? "");
}

async function main() {
  const email = getArg("--email");
  const password = getArg("--password");
  const code = getArg("--code").trim().toUpperCase();

  if (!email || !password || !code) {
    console.error("Uso: node client/scripts/checkin-probe.mjs --email EMAIL --password SENHA --code CODIGO");
    process.exit(1);
  }

  const config = await loadFirebaseConfig();
  const app = initializeApp(config, `checkin-probe-${Date.now()}`);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const result = {
    email,
    code,
    signedIn: false,
    profileLoaded: false,
    eventFound: false,
    event: null,
    participantWrite: "not-started",
  };

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    result.signedIn = true;

    const profileSnap = await getDoc(doc(db, "profiles", credential.user.uid));
    if (!profileSnap.exists()) {
      throw new Error("Perfil nao encontrado.");
    }
    result.profileLoaded = true;
    const profile = profileSnap.data();

    const eventSnap = await getDocs(query(collection(db, "events"), where("code", "==", code)));
    if (eventSnap.empty) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    const eventDoc = eventSnap.docs[0];
    const event = eventDoc.data();
    result.eventFound = true;
    result.event = {
      id: eventDoc.id,
      ownerId: event.ownerId ?? "",
      isActive: event.isActive ?? null,
      checkInEnabled: event.checkInEnabled ?? null,
      startsAt: mapTimestamp(event.startsAt),
      endsAt: mapTimestamp(event.endsAt),
    };

    try {
      await setDoc(
        doc(db, "eventParticipants", `${eventDoc.id}_${credential.user.uid}`),
        {
          eventId: eventDoc.id,
          userId: credential.user.uid,
          checkedInAt: serverTimestamp(),
          visible: true,
          profileSnapshot: profile,
          eventCode: code,
        },
        { merge: true },
      );
      result.participantWrite = "allowed";
    } catch (error) {
      result.participantWrite = String(error?.code ?? error?.message ?? "permission-denied");
    }
  } finally {
    await signOut(auth).catch(() => {});
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

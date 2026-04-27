import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import {
  getAuth,
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

async function main() {
  const email = getArg("--email");
  const password = getArg("--password");

  if (!email || !password) {
    console.error("Uso: node client/scripts/rules-probe.mjs --email EMAIL --password SENHA");
    process.exit(1);
  }

  const config = await loadFirebaseConfig();
  const app = initializeApp(config, `rules-probe-${Date.now()}`);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const result = {
    email,
    signedIn: false,
    role: "",
    ownProfileRead: false,
    eventsRead: false,
    organizerRequestsRead: "not-tested",
    adminPanelDataRead: "not-tested",
    eventCreateAttempt: "not-tested",
  };

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    result.signedIn = true;

    const profileSnap = await getDoc(doc(db, "profiles", credential.user.uid));
    result.ownProfileRead = profileSnap.exists();
    result.role = String(profileSnap.data()?.role ?? "user");

    await getDocs(query(collection(db, "events"), limit(5)));
    result.eventsRead = true;

    try {
      await getDocs(query(collection(db, "organizerRequests"), limit(5)));
      result.organizerRequestsRead = "allowed";
    } catch (error) {
      result.organizerRequestsRead = String(error?.code ?? error?.message ?? "blocked");
    }

    try {
      await addDoc(collection(db, "events"), {
        name: "DIAG - IGNORAR",
        venueName: "Diagnostico",
        description: "Teste automatico de regras",
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 60 * 60 * 1000),
        code: `DIAG${Date.now()}`,
        ownerId: credential.user.uid,
        isActive: true,
        checkInEnabled: false,
        entryPath: "/entrar/DIAG",
        entryUrl: "http://localhost/entrar/DIAG",
        qrPayload: "http://localhost/entrar/DIAG",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      result.eventCreateAttempt = "allowed";
    } catch (error) {
      result.eventCreateAttempt = String(error?.code ?? error?.message ?? "blocked");
    }

    if (result.role === "admin") {
      try {
        await getDocs(query(collection(db, "organizerRequests"), limit(20)));
        result.adminPanelDataRead = "allowed";
      } catch (error) {
        result.adminPanelDataRead = String(error?.code ?? error?.message ?? "blocked");
      }
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

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, collection, getDocs, orderBy, query, limit, Timestamp } from "firebase/firestore";

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
  if (!email || !password) {
    console.error("Uso: node client/scripts/events-inspect.mjs --email EMAIL --password SENHA");
    process.exit(1);
  }

  const config = await loadFirebaseConfig();
  const app = initializeApp(config, `events-inspect-${Date.now()}`);
  const auth = getAuth(app);
  const db = getFirestore(app);

  await signInWithEmailAndPassword(auth, email, password);

  const snapshot = await getDocs(query(collection(db, "events"), orderBy("startsAt", "desc"), limit(20)));
  const events = snapshot.docs.map((entry) => {
    const data = entry.data();
    return {
      id: entry.id,
      name: data.name ?? "",
      venueName: data.venueName ?? "",
      ownerId: data.ownerId ?? "",
      code: data.code ?? "",
      isActive: data.isActive ?? null,
      checkInEnabled: data.checkInEnabled ?? null,
      startsAt: mapTimestamp(data.startsAt),
      endsAt: mapTimestamp(data.endsAt),
    };
  });

  console.log(JSON.stringify(events, null, 2));
  await signOut(auth).catch(() => {});
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

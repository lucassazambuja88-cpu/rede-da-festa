export function generateEventCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";

  for (let index = 0; index < 6; index += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return `FESTA${suffix}`;
}

export function buildEntryPath(code: string) {
  return `/entrar/${code}`;
}

export function buildEntryUrl(code: string) {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${buildEntryPath(code)}`;
  }

  return buildEntryPath(code);
}

import QRCode from "qrcode";

export async function generateEventQr(baseUrl: string, eventId: string, code: string) {
  // Esse link e usado pela tela de check-in para preencher o codigo automaticamente.
  const payload = `${baseUrl}/check-in/${eventId}?code=${encodeURIComponent(code)}`;
  const svg = await QRCode.toString(payload, {
    margin: 1,
    type: "svg",
    width: 256,
    color: {
      dark: "#121212",
      light: "#ffffff",
    },
  });

  return { payload, svg };
}

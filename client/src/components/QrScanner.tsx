import { useEffect, useRef, useState } from "react";

type Props = {
  onDetected: (value: string) => void;
};

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorCtor;
  }
}

export function QrScanner({ onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let interval: number | null = null;

    async function start() {
      if (!window.BarcodeDetector) {
        setError("Seu navegador nao oferece leitura nativa de QR Code. Use o codigo da bilheteria se preferir.");
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        interval = window.setInterval(async () => {
          if (!videoRef.current) {
            return;
          }

          const [result] = await detector.detect(videoRef.current);
          if (result?.rawValue) {
            onDetected(result.rawValue);
          }
        }, 900);
      } catch {
        setError("Nao foi possivel abrir a camera. Confira as permissoes ou use o codigo manual.");
      }
    }

    void start();

    return () => {
      if (interval) {
        window.clearInterval(interval);
      }

      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onDetected]);

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
      <p className="mb-3 text-sm text-white/72">
        Aponte a camera para o QR Code do evento. Se nao funcionar, use o codigo entregue na entrada.
      </p>
      {error ? <p className="mb-3 text-sm text-amber-300">{error}</p> : null}
      <video className="min-h-[240px] w-full rounded-2xl bg-black/60 object-cover" ref={videoRef} muted playsInline />
    </div>
  );
}


import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QrCode, Ticket } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { QrScanner } from "@/components/QrScanner";
import { useAuth } from "@/context/AuthContext";
import { setCurrentEventId } from "@/services/currentEventStorage";
import { checkInWithEventCode, findEventByCode, getEventStatus } from "@/services/eventService";
import { EventItem } from "@/types";

export function CheckInPage() {
  const { codigo } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [mode, setMode] = useState<"scanner" | "codigo">("codigo");
  const [code, setCode] = useState((codigo ?? searchParams.get("code") ?? "").toUpperCase());
  const [event, setEvent] = useState<EventItem | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const autoCheckInRef = useRef(false);

  const normalizedCode = useMemo(() => code.trim().toUpperCase(), [code]);

  const resolveEventPreview = useCallback(async () => {
    if (!normalizedCode) {
      setEvent(null);
      return;
    }

    const foundEvent = await findEventByCode(normalizedCode);
    setEvent(foundEvent);
  }, [normalizedCode]);

  useEffect(() => {
    void resolveEventPreview();
  }, [resolveEventPreview]);

  useEffect(() => {
    if (!codigo || !user || !profile || autoCheckInRef.current) {
      return;
    }

    autoCheckInRef.current = true;
    void doCheckIn(codigo);
  }, [codigo, profile, user]);

  async function doCheckIn(nextCode?: string) {
    const finalCode = (nextCode ?? normalizedCode).trim().toUpperCase();

    if (!finalCode) {
      setError("Digite um codigo do evento ou escaneie o QR Code.");
      return;
    }

    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/entrar/${finalCode}`)}`);
      return;
    }

    if (!profile) {
      navigate(`/perfil?redirect=${encodeURIComponent(`/entrar/${finalCode}`)}`);
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const result = await checkInWithEventCode(finalCode, user.uid, profile);
      setCurrentEventId(result.event.id);
      setMessage(result.message);
      navigate(`/evento/${result.event.id}`, {
        replace: true,
        state: {
          notice: result.message,
        },
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Nao foi possivel entrar na festa.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(eventForm: FormEvent<HTMLFormElement>) {
    eventForm.preventDefault();
    void doCheckIn();
  }

  function handleDetected(value: string) {
    try {
      const parsed = new URL(value);
      const routeSegments = parsed.pathname.split("/").filter(Boolean);
      const routeCode = routeSegments[routeSegments.length - 1] ?? "";
      const queryCode = parsed.searchParams.get("code") ?? "";
      const resolvedCode = (routeCode || queryCode || value).toUpperCase();
      setCode(resolvedCode);
      void doCheckIn(resolvedCode);
    } catch {
      const fallbackCode = value.trim().toUpperCase();
      setCode(fallbackCode);
      void doCheckIn(fallbackCode);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="glass-panel rounded-[32px] p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent-pink">Entrar em uma festa</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{event?.name ?? "Ativar sua presenca"}</h1>
          <p className="mt-3 text-sm leading-6 text-white/68">
            O QR Code e o codigo do evento servem apenas para ativar sua presenca na festa. Eles nao criam conta nem fazem login.
          </p>

          <div className="mt-6 flex rounded-full bg-white/4 p-1">
            <button
              className={`min-h-11 flex-1 rounded-full px-4 text-sm font-semibold ${mode === "scanner" ? "bg-white text-base-950" : "text-white/72"}`}
              onClick={() => setMode("scanner")}
              type="button"
            >
              <span className="flex items-center justify-center gap-2">
                <QrCode className="h-4 w-4" />
                Escanear QR Code
              </span>
            </button>
            <button
              className={`min-h-11 flex-1 rounded-full px-4 text-sm font-semibold ${mode === "codigo" ? "bg-white text-base-950" : "text-white/72"}`}
              onClick={() => setMode("codigo")}
              type="button"
            >
              <span className="flex items-center justify-center gap-2">
                <Ticket className="h-4 w-4" />
                Digitar codigo
              </span>
            </button>
          </div>

          {mode === "codigo" ? (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label>
                <span className="mb-2 block text-sm font-medium text-white/84">Codigo do evento</span>
                <input
                  className="min-h-11 w-full rounded-2xl border border-white/10 bg-base-800 px-4 text-white"
                  onChange={(entry) => setCode(entry.target.value.toUpperCase())}
                  placeholder="Exemplo: FESTA123"
                  value={code}
                />
              </label>

              {event ? (
                <div className="rounded-[24px] border border-white/10 bg-white/4 p-4 text-sm text-white/76">
                  <p className="font-semibold text-white">{event.name}</p>
                  <p className="mt-1">{event.venueName}</p>
                  <p className="mt-2">Inicio: {new Date(event.startsAt).toLocaleString("pt-BR")}</p>
                  <p>Fim: {new Date(event.endsAt).toLocaleString("pt-BR")}</p>
                  <p className="mt-2 font-semibold text-white/84">Status: {getEventStatus(event).label}</p>
                  <p className="mt-1">
                    {event.checkInEnabled
                      ? "Entrada liberada pelo organizador."
                      : "Entrada ainda nao liberada pelo organizador."}
                  </p>
                </div>
              ) : null}

              <button
                className="min-h-11 w-full rounded-full bg-gradient-to-r from-accent-purple to-accent-pink px-5 text-sm font-semibold text-white disabled:opacity-50"
                disabled={loading}
                type="submit"
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>
          ) : (
            <div className="mt-6">
              <QrScanner onDetected={handleDetected} />
            </div>
          )}

          {message ? <p className="mt-4 rounded-2xl bg-emerald-500/12 px-4 py-3 text-sm text-emerald-200">{message}</p> : null}
          {error ? <p className="mt-4 rounded-2xl bg-rose-500/12 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
        </section>

        <section className="glass-panel rounded-[32px] p-6">
          <h2 className="text-xl font-semibold text-white">Como funciona</h2>
          <div className="mt-4 space-y-4 text-sm leading-6 text-white/70">
            <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
              <p className="font-semibold text-white">1. Crie sua conta</p>
              <p>Seu perfil e permanente e fica pronto para qualquer festa parceira.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
              <p className="font-semibold text-white">2. Escaneie ou digite o codigo</p>
              <p>Isso apenas ativa sua presenca no evento atual. Nao substitui login.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
              <p className="font-semibold text-white">3. Entre na sala da festa</p>
              <p>So quem estiver presente no mesmo evento enxerga voce e pode conversar.</p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

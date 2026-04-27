import { FormEvent, useEffect, useState } from "react";
import { Copy, Download, Printer, Store } from "lucide-react";
import QRCode from "react-qr-code";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import {
  createEvent,
  getEventStatus,
  getOrganizerMetrics,
  listOrganizerEvents,
  setEventCheckInEnabled,
} from "@/services/eventService";
import { EventItem, OrganizerMetric } from "@/types";

type MetricsMap = Record<string, OrganizerMetric>;

export function OrganizerDashboardPage() {
  const { user, profile } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [metrics, setMetrics] = useState<MetricsMap>({});
  const [name, setName] = useState("");
  const [venueName, setVenueName] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    if (!user) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const organizerEvents = await listOrganizerEvents(user.uid);
      setEvents(organizerEvents);

      if (organizerEvents.length > 0) {
        const resolvedMetrics = await Promise.all(
          organizerEvents.map(async (event) => [event.id, await getOrganizerMetrics(event.id)] as const),
        );
        setMetrics(Object.fromEntries(resolvedMetrics));
      } else {
        setMetrics({});
      }
    } catch {
      setError("Nao foi possivel carregar seu painel de eventos agora.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) {
      return;
    }
    void refresh();
  }, [user?.uid]);

  async function handleCreateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      return;
    }

    setError("");
    setNotice("");

    try {
      const createdEvent = await createEvent({
        name,
        venueName,
        description,
        startsAt,
        endsAt,
        coverImage: "",
      });

      setNotice(`Evento criado com sucesso. Codigo gerado: ${createdEvent.code}`);
      setName("");
      setVenueName("");
      setDescription("");
      setStartsAt("");
      setEndsAt("");
      await refresh();
    } catch {
      setError("Nao foi possivel criar o evento agora.");
    }
  }

  function downloadQr(event: EventItem) {
    const svg = document.getElementById(`qr-${event.id}`)?.querySelector("svg");
    if (!svg) {
      return;
    }

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.code}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function printQr(event: EventItem) {
    const svg = document.getElementById(`qr-${event.id}`)?.innerHTML;
    if (!svg) {
      return;
    }

    const popup = window.open("", "_blank", "width=640,height=800");
    if (!popup) {
      return;
    }

    popup.document.write(`
      <html>
        <head><title>${event.name} - QR Code</title></head>
        <body style="font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;">
          <h1>${event.name}</h1>
          <p>Codigo: ${event.code}</p>
          <div style="width:320px;height:320px;">${svg}</div>
          <p>${event.entryUrl ?? ""}</p>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  async function toggleRelease(event: EventItem) {
    const status = getEventStatus(event);
    if (!status.hasStarted) {
      setNotice("Esse evento ainda nao comecou. A liberacao so faz sentido no horario da festa.");
      return;
    }

    try {
      await setEventCheckInEnabled(event.id, !event.checkInEnabled);
      setNotice(event.checkInEnabled ? "Entrada pausada pelo organizador." : "Entrada liberada pelo organizador.");
      await refresh();
    } catch {
      setError("Nao foi possivel alterar a liberacao da entrada agora.");
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="glass-panel rounded-[32px] p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent-pink">Modo organizador</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Painel da casa e dos eventos</h1>
          <p className="mt-3 text-sm leading-6 text-white/68">
            Esse painel e exclusivo para casas noturnas, produtores e equipes aprovadas. Aqui voce cria eventos, gera o QR Code da noite e decide a hora de liberar a entrada.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/72">
            <span className="rounded-full border border-white/12 px-4 py-2">role: {profile?.role ?? "organizer"}</span>
            <span className="rounded-full border border-white/12 px-4 py-2">
              status organizador: {profile?.organizerStatus ?? "approved"}
            </span>
          </div>

          {notice ? <p className="mt-4 rounded-2xl bg-white/6 px-4 py-3 text-sm text-white/78">{notice}</p> : null}
          {error ? <p className="mt-4 rounded-2xl bg-rose-500/12 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
          {loading ? <p className="mt-4 text-sm text-white/62">Carregando painel do organizador...</p> : null}
        </section>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="glass-panel rounded-[32px] p-6">
            <div className="flex items-center gap-3">
              <Store className="h-5 w-5 text-accent-pink" />
              <h2 className="text-2xl font-semibold text-white">Criar novo evento</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/68">
              O codigo e o QR Code nascem aqui, mas o check-in so fica realmente valido quando voce liberar a entrada no horario da festa.
            </p>

            <form className="mt-6 grid gap-4" onSubmit={handleCreateEvent}>
              <label>
                <span className="mb-2 block text-sm font-medium text-white/84">Nome do evento</span>
                <input className="min-h-11 w-full rounded-2xl border border-white/10 bg-base-800 px-4 text-white" onChange={(event) => setName(event.target.value)} value={name} />
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-white/84">Casa noturna</span>
                <input className="min-h-11 w-full rounded-2xl border border-white/10 bg-base-800 px-4 text-white" onChange={(event) => setVenueName(event.target.value)} value={venueName} />
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-white/84">Descricao da festa</span>
                <textarea className="min-h-28 w-full rounded-[24px] border border-white/10 bg-base-800 px-4 py-3 text-white" onChange={(event) => setDescription(event.target.value)} value={description} />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-medium text-white/84">Inicio</span>
                  <input className="min-h-11 w-full rounded-2xl border border-white/10 bg-base-800 px-4 text-white" onChange={(event) => setStartsAt(event.target.value)} type="datetime-local" value={startsAt} />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-white/84">Fim</span>
                  <input className="min-h-11 w-full rounded-2xl border border-white/10 bg-base-800 px-4 text-white" onChange={(event) => setEndsAt(event.target.value)} type="datetime-local" value={endsAt} />
                </label>
              </div>
              <button className="min-h-11 rounded-full bg-gradient-to-r from-accent-purple to-accent-pink px-5 text-sm font-semibold text-white" type="submit">
                Criar evento e gerar codigo
              </button>
            </form>
          </section>

          <section className="space-y-5">
            {events.map((event) => (
              <article className="glass-panel rounded-[32px] p-6" key={event.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">{event.name}</h2>
                    <p className="mt-2 text-sm text-white/62">{event.venueName}</p>
                  </div>
                  <div className="rounded-full bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200">
                    {getEventStatus(event).label}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">Participantes</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{metrics[event.id]?.participants ?? 0}</p>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">Conversas</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{metrics[event.id]?.messages ?? 0}</p>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">Denuncias</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{metrics[event.id]?.reports ?? 0}</p>
                  </div>
                </div>

                <div className="mt-5 rounded-[24px] border border-white/10 bg-base-800 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">Codigo de entrada</p>
                      <p className="mt-1 text-lg tracking-[0.22em] text-accent-pink">{event.code}</p>
                      <p className="mt-2 text-sm text-white/56">{event.entryUrl}</p>
                      <p className="mt-2 text-sm font-semibold text-white/76">
                        {event.checkInEnabled ? "Entrada liberada" : "Entrada ainda nao liberada"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/12 px-4 text-sm font-semibold text-white/84"
                        onClick={() => void toggleRelease(event)}
                        type="button"
                      >
                        {event.checkInEnabled ? "Fechar entrada" : "Liberar entrada"}
                      </button>
                      <button
                        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/12 px-4 text-sm font-semibold text-white/84"
                        onClick={() => navigator.clipboard.writeText(event.code)}
                        type="button"
                      >
                        <Copy className="h-4 w-4" />
                        Copiar codigo
                      </button>
                      <button
                        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/12 px-4 text-sm font-semibold text-white/84"
                        onClick={() => downloadQr(event)}
                        type="button"
                      >
                        <Download className="h-4 w-4" />
                        Baixar QR
                      </button>
                      <button
                        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/12 px-4 text-sm font-semibold text-white/84"
                        onClick={() => printQr(event)}
                        type="button"
                      >
                        <Printer className="h-4 w-4" />
                        Imprimir
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-[300px_1fr]">
                    <div className="rounded-[24px] bg-white p-5" id={`qr-${event.id}`}>
                      <QRCode size={260} value={event.entryUrl ?? event.entryPath ?? event.code} />
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
                      <p className="text-sm font-semibold text-white">Como usar esse QR Code</p>
                      <p className="mt-2 text-sm leading-6 text-white/68">
                        Exiba esse QR Code na entrada, no telao ou em material impresso. Ele nao cria conta nem faz login: ele apenas leva a pessoa para a tela de entrar na festa e ativa a presenca no evento.
                      </p>
                      <p className="mt-4 text-sm font-semibold text-white">Link embutido</p>
                      <p className="mt-2 break-all text-sm leading-6 text-white/68">{event.entryUrl}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}

            {events.length === 0 && !loading ? (
              <div className="glass-panel rounded-[32px] p-6 text-sm leading-6 text-white/66">
                Nenhum evento criado ainda. Assim que voce criar a primeira festa, esse painel vira seu centro de operacao.
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

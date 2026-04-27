import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { EventCard } from "@/components/EventCard";
import { useAuth } from "@/context/AuthContext";
import { getCurrentEventId } from "@/services/currentEventStorage";
import { getEventById, isUserVisibleInEvent, listPublicEvents } from "@/services/eventService";
import { EventItem } from "@/types";

export function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [activeEvent, setActiveEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const data = await listPublicEvents();
      setEvents(data);

      const currentEventId = getCurrentEventId();
      if (user?.uid && currentEventId) {
        const [event, visible] = await Promise.all([
          getEventById(currentEventId),
          isUserVisibleInEvent(currentEventId, user.uid),
        ]);
        setActiveEvent(visible ? event : null);
      } else {
        setActiveEvent(null);
      }

      setLoading(false);
    })();
  }, [user?.uid]);

  return (
    <AppShell>
      <section className="glass-panel rounded-[32px] p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent-pink">Eventos disponiveis</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Veja os proximos eventos e entre quando chegar na festa</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-accent-purple to-accent-pink px-5 text-sm font-semibold text-white"
              to="/entrar"
            >
              Entrar em uma festa
            </Link>
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-white/10 bg-white/4 p-4 text-sm leading-6 text-white/68">
          Seu perfil fica pronto antes da festa. O codigo ou QR Code so serve para ativar sua presenca quando voce chegar ao evento.
        </div>

        {activeEvent ? (
          <div className="mt-5 rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">Voce esta dentro de uma festa</p>
            <h2 className="mt-2 text-xl font-semibold text-white">{activeEvent.name}</h2>
            <p className="mt-2 text-sm text-white/72">Sua presenca esta ativa agora. Abra a sala para ver quem esta no evento e iniciar conversas privadas.</p>
            <Link
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-base-950"
              to={`/evento/${activeEvent.id}`}
            >
              Abrir sala do evento
            </Link>
          </div>
        ) : null}

        {loading ? <p className="mt-6 text-white/70">Carregando eventos...</p> : null}

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {events.map((event) => (
            <EventCard event={event} key={event.id} canOpenRoom={activeEvent?.id === event.id} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}

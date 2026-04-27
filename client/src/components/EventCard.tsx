import { Link } from "react-router-dom";
import { EventItem } from "@/types";
import { useEventStatus } from "@/hooks/useEventStatus";

type Props = {
  event: EventItem;
  canOpenRoom?: boolean;
};

export function EventCard({ event, canOpenRoom = false }: Props) {
  const status = useEventStatus(event);

  return (
    <article className="glass-panel neon-border rounded-[28px] p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/50">{event.venueName}</p>
          <h3 className="mt-1 text-2xl font-semibold text-white">{event.name}</h3>
        </div>
        <span
          className={`rounded-full px-3 py-2 text-xs font-semibold ${
            status.isLive ? "bg-emerald-500/18 text-emerald-200" : status.hasEnded ? "bg-white/8 text-white/65" : "bg-accent-purple/20 text-white"
          }`}
        >
          {status.isLive ? "Ao vivo agora" : status.hasEnded ? "Encerrado" : "Em breve"}
        </span>
      </div>
      <p className="mb-4 text-sm leading-6 text-white/72">{event.description}</p>
      <div className="grid gap-2 text-sm text-white/70">
        <p>Inicio: {new Date(event.startsAt).toLocaleString("pt-BR")}</p>
        <p>Fim: {new Date(event.endsAt).toLocaleString("pt-BR")}</p>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-accent-purple to-accent-pink px-5 text-sm font-semibold text-white"
          to="/entrar"
        >
          Entrar em uma festa
        </Link>
        <span className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/12 px-5 text-sm font-semibold text-white/58">
          Codigo e QR Code sao divulgados pelo organizador na festa
        </span>
        {canOpenRoom ? (
          <Link className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/12 px-5 text-sm font-semibold text-white/88" to={`/evento/${event.id}`}>
            Abrir sala
          </Link>
        ) : null}
      </div>
    </article>
  );
}

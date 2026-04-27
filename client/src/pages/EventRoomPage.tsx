import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { ParticipantCard } from "@/components/ParticipantCard";
import { useAuth } from "@/context/AuthContext";
import { clearCurrentEventId, setCurrentEventId } from "@/services/currentEventStorage";
import { closeExpiredEvent, getEventById, getEventParticipant, getEventStatus, leaveEvent, subscribeToParticipants } from "@/services/eventService";
import { blockUser, listBlockedUserIds, reportUser } from "@/services/safetyService";
import { EventItem, EventParticipant } from "@/types";

export function EventRoomPage() {
  const { eventId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [viewerIsInside, setViewerIsInside] = useState(false);
  const [notice, setNotice] = useState((location.state as { notice?: string } | null)?.notice ?? "");
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!eventId) {
      return;
    }

    let active = true;

    void (async () => {
      try {
        setLoading(true);
        setError("");
        const foundEvent = await getEventById(eventId);
        if (!active) {
          return;
        }
        setEvent(foundEvent);
        setCurrentEventId(eventId);
        if (foundEvent) {
          await closeExpiredEvent(foundEvent);
        }
        if (foundEvent && user?.uid) {
          const participant = await getEventParticipant(eventId, user.uid);
          if (!active) {
            return;
          }
          setViewerIsInside(Boolean(participant?.visible));
        } else if (active) {
          setViewerIsInside(false);
        }
      } catch {
        if (active) {
          setError("Nao foi possivel carregar a sala do evento.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [eventId, user?.uid]);

  useEffect(() => {
    if (!eventId || !viewerIsInside) {
      setParticipants([]);
      return;
    }

    return subscribeToParticipants(eventId, setParticipants, setError);
  }, [eventId, viewerIsInside]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;

    void (async () => {
      const blocked = await listBlockedUserIds(user.uid);
      if (active) {
        setBlockedUserIds(blocked);
      }
    })();

    return () => {
      active = false;
    };
  }, [user]);

  const status = getEventStatus(event);

  const visibleParticipants = useMemo(() => {
    return participants.filter((participant) => {
      if (participant.userId === user?.uid) {
        return false;
      }
      if (blockedUserIds.has(participant.userId)) {
        return false;
      }
      return true;
    });
  }, [blockedUserIds, participants, user?.uid]);

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="glass-panel rounded-[32px] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent-pink">Sala do evento</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">{event?.name ?? "Evento"}</h1>
              <p className="mt-2 text-sm text-white/62">{event?.venueName ?? ""}</p>
            </div>
            <span
              className={`rounded-full px-3 py-2 text-xs font-semibold ${
                status.isLive ? "bg-emerald-500/20 text-emerald-200" : status.isEnded ? "bg-white/8 text-white/62" : "bg-amber-500/18 text-amber-200"
              }`}
            >
              {status.label}
            </span>
          </div>

          <p className="mt-4 text-sm leading-6 text-white/68">
            {viewerIsInside
              ? "Voce esta dentro da festa virtual deste evento. Aqui aparecem os perfis de quem fez check-in e esta presente agora."
              : "Voce ainda nao esta dentro desta festa. O acesso so aparece para quem fez check-in pelo QR Code ou codigo do evento."}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <div className="min-h-11 rounded-full border border-white/12 px-4 py-3 text-sm font-semibold text-white/84">
              {viewerIsInside ? `${participants.filter((participant) => participant.visible).length} pessoas presentes` : "Presenca nao ativada"}
            </div>
            {viewerIsInside ? (
              <button
                className="min-h-11 rounded-full border border-white/12 px-4 text-sm font-semibold text-white/84"
                onClick={() => {
                  if (eventId && user) {
                    void leaveEvent(eventId, user.uid);
                    clearCurrentEventId();
                    navigate("/eventos");
                  }
                }}
                type="button"
              >
                Sair do evento
              </button>
            ) : (
              <button
                className="min-h-11 rounded-full bg-gradient-to-r from-accent-purple to-accent-pink px-4 text-sm font-semibold text-white"
                onClick={() => navigate("/entrar")}
                type="button"
              >
                Entrar com QR Code ou codigo
              </button>
            )}
          </div>

          {notice ? <p className="mt-4 rounded-2xl bg-white/6 px-4 py-3 text-sm text-white/78">{notice}</p> : null}
          {error ? <p className="mt-4 rounded-2xl bg-rose-500/12 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
        </section>

        {loading ? <div className="rounded-[24px] border border-dashed border-white/12 p-4 text-sm text-white/60">Carregando sala do evento...</div> : null}

        <section className="space-y-4">
          {!loading && !viewerIsInside ? (
            <div className="rounded-[24px] border border-dashed border-white/12 p-5 text-sm leading-6 text-white/68">
              Seu perfil so fica visivel aqui depois do check-in. Entre na festa pelo QR Code mostrado pela organizacao ou digitando o codigo recebido na entrada.
            </div>
          ) : null}

          {viewerIsInside ? (
            <div className="rounded-[24px] border border-white/8 bg-white/4 p-4 text-sm leading-6 text-white/70">
              Primeiro voce visita o perfil. Se curtir a pessoa, entra no perfil dela e inicia a conversa privada por la.
            </div>
          ) : null}

          {!loading && viewerIsInside && visibleParticipants.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/12 p-4 text-sm text-white/60">
              Ainda nao ha outras pessoas visiveis neste evento.
            </div>
          ) : null}

          {visibleParticipants.map((participant) => (
            <ParticipantCard
              key={participant.id}
              onBlock={(blockedId) => {
                if (!user) {
                  return;
                }
                void blockUser(user.uid, blockedId);
                setBlockedUserIds((current) => new Set([...current, blockedId]));
                setNotice("Usuario bloqueado. Novas mensagens foram desabilitadas.");
              }}
              onReport={(reportedId) => {
                if (!user || !eventId) {
                  return;
                }
                void reportUser({
                  eventId,
                  reporterId: user.uid,
                  reportedId,
                  reason: "Denuncia iniciada pelo participante na sala do evento.",
                });
                setNotice("Denuncia enviada. A organizacao podera revisar esse registro.");
              }}
              onView={(targetUserId) => navigate(`/perfil/${targetUserId}`)}
              participant={participant}
            />
          ))}
        </section>
      </div>
    </AppShell>
  );
}

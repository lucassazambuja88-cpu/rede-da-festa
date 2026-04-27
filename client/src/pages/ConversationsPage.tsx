import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { ChatPanel } from "@/components/ChatPanel";
import { useAuth } from "@/context/AuthContext";
import { listUserConversations } from "@/services/chatService";
import { getCurrentEventId, setCurrentEventId } from "@/services/currentEventStorage";
import { getEventById, getEventParticipant, getEventStatus } from "@/services/eventService";
import { getProfile } from "@/services/profileService";
import { Conversation, EventItem, EventParticipant } from "@/types";

function formatTime(value?: string | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ConversationsPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { participantId } = useParams();
  const [searchParams] = useSearchParams();
  const [selectedParticipant, setSelectedParticipant] = useState<EventParticipant | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [participantMap, setParticipantMap] = useState<Record<string, EventParticipant>>({});
  const [event, setEvent] = useState<EventItem | null>(null);
  const [eventId, setEventId] = useState(searchParams.get("eventId") ?? getCurrentEventId());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const currentUserId = user?.uid ?? "";

  useEffect(() => {
    const nextEventId = searchParams.get("eventId") ?? getCurrentEventId();
    if (nextEventId) {
      setEventId(nextEventId);
      setCurrentEventId(nextEventId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    let active = true;

    async function loadConversations() {
      try {
        setLoading(true);
        setError("");
        const data = await listUserConversations(currentUserId);
        if (active) {
          setConversations(data);
        }
      } catch (nextError) {
        if (active) {
          setError(nextError instanceof Error ? nextError.message : "Nao foi possivel carregar suas conversas.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadConversations();
    const interval = window.setInterval(() => {
      void loadConversations();
    }, 4000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!eventId) {
      setEvent(null);
      return;
    }

    void (async () => {
      try {
        setEvent(await getEventById(eventId));
      } catch {
        setError("Nao foi possivel carregar o evento desta conversa.");
      }
    })();
  }, [eventId]);

  useEffect(() => {
    const targetUserId = participantId ?? searchParams.get("with");
    if (!currentUserId || !targetUserId || !eventId) {
      return;
    }

    let active = true;

    void (async () => {
      try {
        const [selfParticipant, targetParticipant, targetProfile] = await Promise.all([
          getEventParticipant(eventId, currentUserId),
          getEventParticipant(eventId, targetUserId),
          getProfile(targetUserId),
        ]);

        if (!active || !selfParticipant?.visible || !targetParticipant?.visible || !targetProfile) {
          if (active) {
            setError("Essa conversa so fica disponivel quando os dois estiverem presentes no mesmo evento.");
          }
          return;
        }

        const participant = {
          id: `${eventId}_${targetUserId}`,
          eventId,
          userId: targetUserId,
          checkedInAt: targetParticipant.checkedInAt,
          visible: true,
          profile: targetProfile,
        } satisfies EventParticipant;

        setSelectedParticipant(participant);
        setParticipantMap((current) => ({
          ...current,
          [targetUserId]: participant,
        }));
      } catch {
        if (active) {
          setError("Nao foi possivel abrir a conversa.");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [currentUserId, eventId, participantId, profile, searchParams]);

  const hydratedConversations = useMemo(() => {
    return conversations.map((conversation) => {
      const otherUserId = Object.keys(conversation.participants).find((entry) => entry !== currentUserId) ?? "";
      const liveParticipant = participantMap[otherUserId];
      const savedProfile = conversation.participantProfiles?.[otherUserId];
      const otherName = liveParticipant?.profile.displayName ?? savedProfile?.displayName ?? "Participante";
      const otherPhoto = liveParticipant?.profile.photoUrl ?? savedProfile?.photoUrl ?? "";
      const preview = conversation.lastMessage?.text ?? "Toque para abrir a conversa.";
      const sentByMe = conversation.lastMessage?.from === currentUserId;

      return {
        conversation,
        otherUserId,
        isSelected: selectedParticipant?.userId === otherUserId,
        profile: {
          displayName: otherName,
          photoUrl: otherPhoto,
        },
        preview: sentByMe ? `Voce: ${preview}` : preview,
      };
    });
  }, [conversations, currentUserId, participantMap, selectedParticipant?.userId]);

  const status = getEventStatus(event);

  return (
    <AppShell>
      <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[#17131f] shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
          <header className="border-b border-white/8 bg-gradient-to-r from-accent-purple/25 via-transparent to-accent-pink/20 px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-pink">Conversas</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">
              {event ? `Sua festa em mensagens` : "Inbox da noite"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-white/68">
              Um lugar mais claro para ver quem chamou, com quem voce falou e onde a conversa continua.
            </p>
            {event ? (
              <div className="mt-3 inline-flex rounded-full border border-white/10 bg-white/6 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/74">
                {event.name} | {status.label}
              </div>
            ) : null}
          </header>

          <div className="scroll-dark max-h-[720px] space-y-2 overflow-y-auto p-3">
            {loading ? <div className="rounded-[24px] border border-dashed border-white/12 p-4 text-sm text-white/62">Carregando conversas...</div> : null}
            {error ? <div className="rounded-[24px] bg-rose-500/12 p-4 text-sm text-rose-200">{error}</div> : null}
            {!loading && hydratedConversations.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-white/12 p-4 text-sm text-white/62">
                Ainda nao ha conversas. Visite um perfil dentro da festa e inicie a primeira.
              </div>
            ) : null}

            {hydratedConversations.map((item) => (
              <button
                className={`flex min-h-11 w-full items-center gap-3 rounded-[26px] border px-3 py-3 text-left transition ${
                  item.isSelected
                    ? "border-accent-pink/40 bg-gradient-to-r from-accent-purple/18 to-accent-pink/18 shadow-[0_12px_40px_rgba(255,0,102,0.12)]"
                    : "border-white/8 bg-white/4 hover:bg-white/8"
                }`}
                key={item.conversation.id}
                onClick={() => {
                  const nextEventId = item.conversation.eventId ?? eventId;
                  if (nextEventId) {
                    setEventId(nextEventId);
                    setCurrentEventId(nextEventId);
                  }

                  navigate(`/conversas/${item.otherUserId}`);

                  const liveParticipant = participantMap[item.otherUserId];
                  if (liveParticipant) {
                    setSelectedParticipant(liveParticipant);
                    return;
                  }

                  void (async () => {
                    const targetProfile = await getProfile(item.otherUserId);
                    if (!targetProfile) {
                      return;
                    }
                    const participant = {
                      id: `${nextEventId}_${item.otherUserId}`,
                      eventId: nextEventId ?? "",
                      userId: item.otherUserId,
                      checkedInAt: new Date().toISOString(),
                      visible: true,
                      profile: targetProfile,
                    } satisfies EventParticipant;
                    setParticipantMap((current) => ({ ...current, [item.otherUserId]: participant }));
                    setSelectedParticipant(participant);
                  })();
                }}
                type="button"
              >
                <div className="relative shrink-0">
                  {item.profile.photoUrl ? (
                    <img alt={item.profile.displayName} className="h-16 w-16 rounded-[22px] object-cover ring-1 ring-white/10" src={item.profile.photoUrl} />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-white/8 text-xs text-white/65">Sem foto</div>
                  )}
                  <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[#17131f] bg-emerald-400" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-white">{item.profile.displayName}</p>
                    <p className="text-xs font-medium text-white/44">{formatTime(item.conversation.lastMessage?.timestamp)}</p>
                  </div>
                  <p className="mt-1 truncate text-sm text-white/64">{item.preview}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <ChatPanel
          currentUserId={currentUserId}
          currentProfile={profile}
          eventClosed={status.isEnded}
          eventId={eventId}
          selectedParticipant={selectedParticipant}
        />
      </div>
    </AppShell>
  );
}

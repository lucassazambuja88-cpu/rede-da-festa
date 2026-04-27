import { FormEvent, useEffect, useMemo, useState } from "react";
import { SendHorizonal } from "lucide-react";
import { ChatMessage, EventParticipant, Profile } from "@/types";
import { getOrCreateConversation, sendMessage, subscribeToMessages } from "@/services/chatService";
import { isUserVisibleInEvent } from "@/services/eventService";
import { hasBlockBetween } from "@/services/safetyService";
import { runModeration } from "@/services/moderation";

type Props = {
  eventId: string;
  currentUserId: string;
  currentProfile?: Profile | null;
  selectedParticipant: EventParticipant | null;
  eventClosed: boolean;
};

function formatTime(value?: string) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatPanel({ eventId, currentUserId, currentProfile, selectedParticipant, eventClosed }: Props) {
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [canMessage, setCanMessage] = useState(false);
  const [conversationReady, setConversationReady] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedParticipant || !currentUserId || !eventId) {
      setMessages([]);
      setConversationId("");
      setCanMessage(false);
      setConversationReady(false);
      setLoadingConversation(false);
      setBlocked(false);
      setError("");
      return;
    }

    let unsubscribe: (() => void) | undefined;
    let active = true;

    void (async () => {
      try {
        setLoadingConversation(true);
        setError("");
        setConversationReady(false);

        const blockState = await hasBlockBetween(currentUserId, selectedParticipant.userId);
        if (!active) {
          return;
        }
        setBlocked(blockState);

        const [selfVisible, targetVisible] = await Promise.all([
          isUserVisibleInEvent(eventId, currentUserId),
          isUserVisibleInEvent(eventId, selectedParticipant.userId),
        ]);
        if (!active) {
          return;
        }

        const conversation = await getOrCreateConversation(eventId, currentUserId, selectedParticipant.userId, {
          currentProfile,
          targetProfile: selectedParticipant.profile,
        });
        if (!active) {
          return;
        }

        setConversationId(conversation.id);
        setCanMessage(selfVisible && targetVisible && !blockState && !eventClosed);
        setConversationReady(true);
        unsubscribe = subscribeToMessages(conversation.id, setMessages, setError);
      } catch (nextError) {
        if (!active) {
          return;
        }
        setError(nextError instanceof Error ? nextError.message : "Nao foi possivel abrir a conversa.");
      } finally {
        if (active) {
          setLoadingConversation(false);
        }
      }
    })();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [currentProfile, currentUserId, eventClosed, eventId, selectedParticipant]);

  const title = useMemo(() => {
    if (!selectedParticipant) {
      return "Escolha uma pessoa para conversar";
    }

    return selectedParticipant.profile.displayName;
  }, [selectedParticipant]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedParticipant || !draft.trim() || eventClosed || blocked || !canMessage || !conversationReady) {
      return;
    }

    const moderation = runModeration(draft);
    setNotice(moderation.warning);
    setError("");

    try {
      await sendMessage(conversationId, currentUserId, draft.trim(), moderation.flagged);
      setDraft("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Nao foi possivel enviar a mensagem.");
    }
  }

  return (
    <section className="flex h-[720px] flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#15111c] shadow-[0_24px_90px_rgba(0,0,0,0.4)]">
      <header className="border-b border-white/8 bg-gradient-to-r from-accent-purple/20 via-transparent to-accent-pink/20 px-5 py-4">
        {selectedParticipant ? (
          <div className="flex items-center gap-4">
            {selectedParticipant.profile.photoUrl ? (
              <img
                alt={selectedParticipant.profile.displayName}
                className="h-14 w-14 rounded-[20px] object-cover ring-1 ring-white/10"
                src={selectedParticipant.profile.photoUrl}
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-white/8 text-xs text-white/60">
                Sem foto
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-pink">Conversa privada</p>
              <h2 className="mt-1 text-xl font-semibold text-white">{title}</h2>
              <p className="mt-1 text-sm text-white/64">
                Voce esta falando com {selectedParticipant.profile.displayName}. As mensagens rolam so enquanto os dois estiverem no mesmo evento.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-pink">Conversa privada</p>
            <h2 className="mt-1 text-xl font-semibold text-white">{title}</h2>
            <p className="mt-1 text-sm text-white/64">Escolha uma pessoa da lista para abrir o chat da festa.</p>
          </div>
        )}

        {eventClosed ? <p className="mt-3 text-sm text-amber-300">Este evento foi encerrado. As conversas estao em modo leitura.</p> : null}
        {blocked ? <p className="mt-3 text-sm text-rose-300">Essa conversa foi bloqueada por motivos de seguranca.</p> : null}
        {!eventClosed && !blocked && !canMessage && selectedParticipant ? (
          <p className="mt-3 text-sm text-amber-300">Essa conversa so aceita novas mensagens enquanto os dois estiverem presentes no mesmo evento.</p>
        ) : null}
      </header>

      <div className="scroll-dark flex-1 space-y-4 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(142,68,173,0.16),transparent_30%),linear-gradient(180deg,#15111c_0%,#120f17_100%)] px-5 py-5">
        {loadingConversation ? (
          <div className="rounded-2xl border border-dashed border-white/12 p-4 text-sm text-white/60">
            Abrindo conversa...
          </div>
        ) : null}
        {error ? <div className="rounded-2xl bg-rose-500/12 p-4 text-sm text-rose-200">{error}</div> : null}
        {!loadingConversation && messages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/12 p-4 text-sm text-white/60">
            Ainda nao ha mensagens. Comece com algo leve, educado e respeitoso.
          </div>
        ) : null}

        {messages.map((message) => {
          const own = message.from === currentUserId;
          return (
            <div className={`flex ${own ? "justify-end" : "justify-start"}`} key={message.id}>
              <div className={`max-w-[82%] ${own ? "items-end" : "items-start"} flex flex-col gap-1`}>
                <p className={`px-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${own ? "text-accent-pink" : "text-white/46"}`}>
                  {own ? "Voce" : selectedParticipant?.profile.displayName ?? "Participante"}
                </p>
                <div
                  className={`rounded-[28px] px-4 py-3 text-sm leading-6 shadow-[0_12px_34px_rgba(0,0,0,0.22)] ${
                    own
                      ? "rounded-br-[10px] bg-gradient-to-r from-accent-purple to-accent-pink text-white"
                      : "rounded-bl-[10px] border border-white/10 bg-white/8 text-white/90"
                  }`}
                >
                  <p>{message.text}</p>
                  <div className={`mt-2 flex items-center gap-2 text-[11px] ${own ? "text-white/75" : "text-white/46"}`}>
                    <span>{formatTime(message.timestamp)}</span>
                    {message.flagged ? <span>• moderacao</span> : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form className="border-t border-white/8 bg-[#130f18] p-4" onSubmit={handleSubmit}>
        {notice ? <p className="mb-2 text-sm text-amber-300">{notice}</p> : null}
        <div className="flex items-end gap-3">
          <textarea
            className="min-h-24 flex-1 rounded-[24px] border border-white/10 bg-base-800 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent-pink/50 focus:outline-none"
            disabled={!selectedParticipant || eventClosed || blocked || !canMessage || !conversationReady || loadingConversation}
            maxLength={400}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={selectedParticipant ? `Mensagem para ${selectedParticipant.profile.displayName}` : "Escolha uma pessoa para conversar"}
            value={draft}
          />
          <button
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-gradient-to-r from-accent-purple to-accent-pink px-4 font-semibold text-white shadow-[0_10px_35px_rgba(255,0,102,0.28)] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!selectedParticipant || !draft.trim() || eventClosed || blocked || !canMessage || !conversationReady || loadingConversation}
            type="submit"
          >
            <SendHorizonal className="h-5 w-5" />
          </button>
        </div>
      </form>
    </section>
  );
}

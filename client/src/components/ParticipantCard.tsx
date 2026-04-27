import { Eye, Flag, ShieldBan } from "lucide-react";
import { EventParticipant } from "@/types";

type Props = {
  participant: EventParticipant;
  onBlock: (userId: string) => void;
  onReport: (userId: string) => void;
  onView?: (userId: string) => void;
};

export function ParticipantCard({ participant, onBlock, onReport, onView }: Props) {
  return (
    <article className="glass-panel rounded-[28px] border border-white/8 p-4">
      <div className="flex gap-4">
        <img
          alt={`Foto de ${participant.profile.displayName}`}
          className="h-24 w-24 cursor-pointer rounded-2xl object-cover"
          onClick={() => onView?.(participant.userId)}
          src={participant.profile.photoUrl}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="truncate text-lg font-semibold text-white">
              {participant.profile.displayName}, {participant.profile.age}
            </h3>
            <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-200">
              No evento
            </span>
          </div>
          <p className="mt-1 text-sm text-white/62">
            {participant.profile.gender} | busca {participant.profile.preference}
          </p>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/78">{participant.profile.bio}</p>
          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/42">
            Visite o perfil para ver mais fotos e decidir se quer iniciar conversa.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-accent-purple to-accent-pink px-4 text-sm font-semibold text-white"
          onClick={() => onView?.(participant.userId)}
          type="button"
        >
          <Eye className="h-4 w-4" />
          Visitar perfil
        </button>
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/12 px-4 text-sm font-semibold text-white/84"
          onClick={() => onBlock(participant.userId)}
          type="button"
        >
          <ShieldBan className="h-4 w-4" />
          Bloquear
        </button>
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/12 px-4 text-sm font-semibold text-white/84"
          onClick={() => onReport(participant.userId)}
          type="button"
        >
          <Flag className="h-4 w-4" />
          Denunciar
        </button>
      </div>
    </article>
  );
}

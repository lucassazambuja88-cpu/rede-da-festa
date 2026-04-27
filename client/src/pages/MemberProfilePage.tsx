import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { getCurrentEventId } from "@/services/currentEventStorage";
import { isUserVisibleInEvent } from "@/services/eventService";
import { getProfile } from "@/services/profileService";
import { Profile } from "@/types";

export function MemberProfilePage() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [canChat, setCanChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!uid) {
      return;
    }

    let active = true;

    void (async () => {
      try {
        setLoading(true);
        setError("");
        const foundProfile = await getProfile(uid);
        const eventId = getCurrentEventId();
        const visible = user?.uid && uid && eventId
          ? await Promise.all([
              isUserVisibleInEvent(eventId, user.uid),
              isUserVisibleInEvent(eventId, uid),
            ]).then(([selfVisible, targetVisible]) => selfVisible && targetVisible)
          : false;

        if (active) {
          setProfile(foundProfile);
          setCanChat(visible);
        }
      } catch {
        if (active) {
          setError("Nao foi possivel carregar este perfil.");
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
  }, [uid, user?.uid]);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <section className="glass-panel rounded-[32px] p-6">
          {loading ? <p className="text-sm text-white/62">Carregando perfil...</p> : null}
          {error ? <p className="rounded-2xl bg-rose-500/12 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
          {profile ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                <img
                  alt={`Foto principal de ${profile.displayName}`}
                  className="aspect-[4/5] w-full rounded-[28px] object-cover"
                  src={profile.photoUrl}
                />
                {profile.secondPhotoUrl ? (
                  <img
                    alt={`Segunda foto de ${profile.displayName}`}
                    className="aspect-[4/5] w-full rounded-[28px] object-cover"
                    src={profile.secondPhotoUrl}
                  />
                ) : (
                  <div className="flex aspect-[4/5] items-center justify-center rounded-[28px] border border-dashed border-white/12 bg-white/4 px-6 text-center text-sm leading-6 text-white/52">
                    Essa pessoa ainda nao adicionou uma segunda foto.
                  </div>
                )}
              </div>

              <div>
                <h1 className="text-3xl font-semibold text-white">{profile.displayName}</h1>
                <p className="mt-2 text-sm text-white/60">
                  {profile.age} anos | {profile.gender}
                </p>
                <p className="mt-4 rounded-[24px] border border-white/10 bg-white/4 p-4 text-sm leading-6 text-white/72">
                  {profile.bio || "Sem bio cadastrada."}
                </p>
              </div>

              {user?.uid !== uid ? (
                <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
                  <p className="text-sm leading-6 text-white/70">
                    Gostou do perfil? Se os dois estiverem presentes no mesmo evento, voce pode iniciar uma conversa privada agora.
                  </p>
                  <button
                    className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-accent-purple to-accent-pink px-5 text-sm font-semibold text-white disabled:opacity-40"
                    disabled={!canChat}
                    onClick={() => navigate(`/conversas/${uid}`)}
                    type="button"
                  >
                    {canChat ? "Iniciar conversa privada" : "Conversa liberada apenas para quem esta no mesmo evento"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}

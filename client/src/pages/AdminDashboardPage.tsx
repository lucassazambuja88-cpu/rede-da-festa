import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Store, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { findProfileByEmail, listFlaggedProfiles, setUserBan, setUserRole } from "@/services/adminService";
import { getOrganizerMetrics, listEvents } from "@/services/eventService";
import { EventItem, OrganizerMetric, Profile } from "@/types";

type MetricsMap = Record<string, OrganizerMetric>;

export function AdminDashboardPage() {
  const [email, setEmail] = useState("");
  const [foundProfile, setFoundProfile] = useState<Profile | null>(null);
  const [flaggedProfiles, setFlaggedProfiles] = useState<Profile[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [metrics, setMetrics] = useState<MetricsMap>({});
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");

    try {
      const [allEvents, suspects] = await Promise.all([listEvents(), listFlaggedProfiles()]);
      setEvents(allEvents);
      setFlaggedProfiles(suspects);

      if (allEvents.length > 0) {
        const resolvedMetrics = await Promise.all(
          allEvents.map(async (event) => [event.id, await getOrganizerMetrics(event.id)] as const),
        );
        setMetrics(Object.fromEntries(resolvedMetrics));
      } else {
        setMetrics({});
      }
    } catch {
      setError("Nao foi possivel carregar o painel admin agora.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearching(true);
    setNotice("");
    setError("");
    setFoundProfile(null);

    try {
      const result = await findProfileByEmail(email);
      if (!result) {
        setError("Nenhum usuario encontrado com esse e-mail.");
        return;
      }
      setFoundProfile(result);
    } catch {
      setError("Nao foi possivel buscar esse e-mail agora.");
    } finally {
      setSearching(false);
    }
  }

  async function handleRoleChange(userId: string, role: "admin" | "organizer" | "user") {
    setNotice("");
    setError("");

    try {
      await setUserRole(userId, role);
      setNotice(
        role === "admin"
          ? "Usuario promovido para admin."
          : role === "organizer"
            ? "Usuario promovido para organizer."
            : "Organizer removido. Usuario voltou para user.",
      );
      if (foundProfile?.id === userId) {
        setFoundProfile({ ...foundProfile, role, organizerStatus: role === "organizer" ? "approved" : "none" });
      }
      await refresh();
    } catch {
      setError("Nao foi possivel alterar essa role agora.");
    }
  }

  async function handleBan(userId: string, isBanned: boolean) {
    setNotice("");
    setError("");

    try {
      await setUserBan(userId, isBanned);
      setNotice(isBanned ? "Usuario banido com sucesso." : "Banimento removido com sucesso.");
      if (foundProfile?.id === userId) {
        setFoundProfile({ ...foundProfile, isBanned });
      }
      await refresh();
    } catch {
      setError("Nao foi possivel atualizar o banimento agora.");
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="glass-panel rounded-[32px] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent-pink">Modo admin</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">Controle total da plataforma</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/68">
                Aqui ficam voce, seus socios e as pessoas de confianca. O admin controla roles, organizadores, usuarios denunciados e a operacao inteira da Rede da Festa.
              </p>
            </div>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-accent-purple to-accent-pink px-5 text-sm font-semibold text-white"
              to="/organizador"
            >
              Criar evento como admin
            </Link>
          </div>

          {notice ? <p className="mt-4 rounded-2xl bg-white/6 px-4 py-3 text-sm text-white/78">{notice}</p> : null}
          {error ? <p className="mt-4 rounded-2xl bg-rose-500/12 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <article className="glass-panel rounded-[32px] p-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-accent-pink" />
              <h2 className="text-2xl font-semibold text-white">Gerenciar por e-mail</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/68">
              Cole o e-mail de qualquer conta para tornar organizer, remover organizer, banir usuario ou desfazer banimento.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSearch}>
              <label>
                <span className="mb-2 block text-sm font-medium text-white/84">Digite o e-mail do usuario</span>
                <input
                  className="min-h-11 w-full rounded-2xl border border-white/10 bg-base-800 px-4 text-white"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="usuario@exemplo.com"
                  type="email"
                  value={email}
                />
              </label>
              <button
                className="min-h-11 rounded-full bg-gradient-to-r from-accent-purple to-accent-pink px-5 text-sm font-semibold text-white disabled:opacity-50"
                disabled={searching}
                type="submit"
              >
                {searching ? "Buscando..." : "Buscar usuario"}
              </button>
            </form>

            {foundProfile ? (
              <div className="mt-6 rounded-[28px] border border-white/10 bg-white/4 p-5">
                <p className="text-lg font-semibold text-white">{foundProfile.displayName}</p>
                <p className="mt-1 text-sm text-white/62">{foundProfile.email}</p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/72">
                  <span className="rounded-full border border-white/12 px-4 py-2">role: {foundProfile.role}</span>
                  <span className="rounded-full border border-white/12 px-4 py-2">reports: {foundProfile.reportCount ?? 0}</span>
                  <span className="rounded-full border border-white/12 px-4 py-2">
                    status: {foundProfile.isBanned ? "banido" : foundProfile.isSuspect ? "suspeito" : "ok"}
                  </span>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    className="min-h-11 rounded-full border border-white/12 px-5 text-sm font-semibold text-white/84"
                    onClick={() => void handleRoleChange(foundProfile.id, "admin")}
                    type="button"
                  >
                    Tornar admin
                  </button>
                  <button
                    className="min-h-11 rounded-full bg-gradient-to-r from-accent-purple to-accent-pink px-5 text-sm font-semibold text-white"
                    onClick={() => void handleRoleChange(foundProfile.id, "organizer")}
                    type="button"
                  >
                    Tornar organizador
                  </button>
                  <button
                    className="min-h-11 rounded-full border border-white/12 px-5 text-sm font-semibold text-white/84"
                    onClick={() => void handleRoleChange(foundProfile.id, "user")}
                    type="button"
                  >
                    Remover organizador
                  </button>
                  <button
                    className="min-h-11 rounded-full border border-rose-400/25 bg-rose-500/10 px-5 text-sm font-semibold text-rose-200"
                    onClick={() => void handleBan(foundProfile.id, !foundProfile.isBanned)}
                    type="button"
                  >
                    {foundProfile.isBanned ? "Desbanir usuario" : "Banir usuario"}
                  </button>
                </div>
              </div>
            ) : null}
          </article>

          <article className="glass-panel rounded-[32px] p-6">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-accent-pink" />
              <h2 className="text-2xl font-semibold text-white">Usuarios denunciados</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/68">
              Quando um perfil acumula muitas denuncias, ele fica marcado como suspeito e aparece aqui para revisao manual.
            </p>

            <div className="mt-5 space-y-4">
              {loading ? <p className="text-sm text-white/60">Carregando moderacao...</p> : null}
              {!loading && flaggedProfiles.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-white/12 p-4 text-sm text-white/60">
                  Nenhum usuario suspeito no momento.
                </div>
              ) : null}

              {flaggedProfiles.map((profile) => (
                <div className="rounded-[24px] border border-white/10 bg-white/4 p-4" key={profile.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-white">{profile.displayName}</p>
                      <p className="mt-1 text-sm text-white/62">{profile.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-white/70">
                      <span className="rounded-full border border-white/12 px-3 py-2">reports: {profile.reportCount ?? 0}</span>
                      <span className="rounded-full border border-white/12 px-3 py-2">
                        {profile.isBanned ? "banido" : "suspeito"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      className="min-h-11 rounded-full border border-rose-400/25 bg-rose-500/10 px-5 text-sm font-semibold text-rose-200"
                      onClick={() => void handleBan(profile.id, true)}
                      type="button"
                    >
                      Banir usuario
                    </button>
                    {profile.role === "organizer" ? (
                      <button
                        className="min-h-11 rounded-full border border-white/12 px-5 text-sm font-semibold text-white/84"
                        onClick={() => void handleRoleChange(profile.id, "user")}
                        type="button"
                      >
                        Remover organizer
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="glass-panel rounded-[32px] p-6">
          <div className="flex items-center gap-3">
            <Store className="h-5 w-5 text-accent-pink" />
            <h2 className="text-2xl font-semibold text-white">Metricas globais</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-white/68">
            O organizer ve apenas os proprios eventos. O admin ve a operacao inteira.
          </p>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {events.map((event) => (
              <article className="rounded-[24px] border border-white/10 bg-white/4 p-4" key={event.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{event.name}</h3>
                    <p className="mt-1 text-sm text-white/62">{event.venueName}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">ownerId: {event.ownerId}</p>
                  </div>
                  <span className="rounded-full border border-white/12 px-3 py-2 text-xs text-white/72">{event.code}</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-[20px] border border-white/10 bg-base-800 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/42">Pessoas</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{metrics[event.id]?.participants ?? 0}</p>
                  </div>
                  <div className="rounded-[20px] border border-white/10 bg-base-800 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/42">Conversas</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{metrics[event.id]?.messages ?? 0}</p>
                  </div>
                  <div className="rounded-[20px] border border-white/10 bg-base-800 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/42">Denuncias</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{metrics[event.id]?.reports ?? 0}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

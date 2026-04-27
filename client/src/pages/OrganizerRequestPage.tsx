import { FormEvent, useEffect, useState } from "react";
import { ShieldCheck, Store } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { getMyOrganizerRequest, submitOrganizerRequest } from "@/services/organizerService";
import { OrganizerRequest } from "@/types";

export function OrganizerRequestPage() {
  const { profile, refreshProfile } = useAuth();
  const [requestVenueName, setRequestVenueName] = useState("");
  const [requestCity, setRequestCity] = useState("");
  const [requestNotes, setRequestNotes] = useState("");
  const [myRequest, setMyRequest] = useState<OrganizerRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    if (!profile) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const requestData = await getMyOrganizerRequest(profile.id);
      setMyRequest(requestData);
    } catch {
      setError("Nao foi possivel carregar sua solicitacao agora.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!profile) {
      return;
    }
    void refresh();
  }, [profile?.id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) {
      return;
    }

    setNotice("");
    setError("");

    try {
      await submitOrganizerRequest({
        profile,
        venueName: requestVenueName,
        city: requestCity,
        notes: requestNotes,
      });
      await refreshProfile();
      await refresh();
      setNotice("Solicitacao enviada. Um admin precisa aprovar seu acesso de organizador.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Nao foi possivel enviar sua solicitacao.");
    }
  }

  return (
    <AppShell>
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="glass-panel rounded-[32px] p-6">
          <div className="flex items-center gap-3">
            <Store className="h-5 w-5 text-accent-pink" />
            <h1 className="text-2xl font-semibold text-white">Solicitar modo organizador</h1>
          </div>
          <p className="mt-3 text-sm leading-6 text-white/68">
            Essa area e para donos de eventos, casas noturnas e equipes autorizadas. O acesso ao painel de eventos so e liberado apos aprovacao do admin.
          </p>

          {loading ? <p className="mt-4 text-sm text-white/62">Carregando sua solicitacao...</p> : null}
          {notice ? <p className="mt-4 rounded-2xl bg-white/6 px-4 py-3 text-sm text-white/78">{notice}</p> : null}
          {error ? <p className="mt-4 rounded-2xl bg-rose-500/12 px-4 py-3 text-sm text-rose-200">{error}</p> : null}

          {myRequest?.status === "pending" ? (
            <div className="mt-5 rounded-[24px] border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
              Sua solicitacao esta em analise. Assim que um admin aprovar, seu perfil vira organizador automaticamente.
            </div>
          ) : null}

          {myRequest?.status === "rejected" ? (
            <div className="mt-5 rounded-[24px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
              Sua ultima solicitacao foi recusada. Voce pode enviar uma nova com mais contexto sobre a casa ou evento.
            </div>
          ) : null}

          {myRequest?.status !== "pending" ? (
            <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
              <label>
                <span className="mb-2 block text-sm font-medium text-white/84">Nome da casa ou comunidade</span>
                <input
                  className="min-h-11 w-full rounded-2xl border border-white/10 bg-base-800 px-4 text-white"
                  onChange={(event) => setRequestVenueName(event.target.value)}
                  value={requestVenueName}
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-white/84">Cidade</span>
                <input
                  className="min-h-11 w-full rounded-2xl border border-white/10 bg-base-800 px-4 text-white"
                  onChange={(event) => setRequestCity(event.target.value)}
                  value={requestCity}
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-white/84">Contexto da operacao</span>
                <textarea
                  className="min-h-28 w-full rounded-[24px] border border-white/10 bg-base-800 px-4 py-3 text-white"
                  onChange={(event) => setRequestNotes(event.target.value)}
                  placeholder="Explique se voce opera casa noturna, evento itinerante, label ou comunidade."
                  value={requestNotes}
                />
              </label>
              <button
                className="min-h-11 rounded-full bg-gradient-to-r from-accent-purple to-accent-pink px-5 text-sm font-semibold text-white"
                type="submit"
              >
                Enviar para aprovacao
              </button>
            </form>
          ) : null}
        </article>

        <article className="glass-panel rounded-[32px] p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-accent-pink" />
            <h2 className="text-2xl font-semibold text-white">Como os modos funcionam</h2>
          </div>
          <div className="mt-5 space-y-4 text-sm leading-6 text-white/68">
            <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
              <p className="font-semibold text-white">Usuario comum</p>
              <p>Cria perfil, entra em festas, visita perfis e conversa com pessoas presentes.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
              <p className="font-semibold text-white">Organizador</p>
              <p>Cria eventos, gera codigos, imprime QR Codes e controla a liberacao da entrada.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
              <p className="font-semibold text-white">Admin</p>
              <p>Valida organizadores, protege o produto e garante que so casas autorizadas operem eventos.</p>
            </div>
          </div>
        </article>
      </div>
    </AppShell>
  );
}

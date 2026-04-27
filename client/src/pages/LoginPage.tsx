import { FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { signIn, signUp } from "@/services/authService";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"login" | "cadastro">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (mode === "cadastro") {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      navigate(searchParams.get("redirect") ?? "/perfil");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Nao foi possivel acessar agora.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="glass-panel rounded-[32px] p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent-pink">Rede da Festa</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">Crie seu perfil antes da festa e entre na rede quando chegar ao evento.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/72">
            Seu perfil fica pronto no app. No evento, o QR Code ou codigo liberado pela organizacao ativa sua presenca e abre a sala com as pessoas que estao ali.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-white/4 p-5">
              <h2 className="text-lg font-semibold text-white">Antes da festa</h2>
              <p className="mt-2 text-sm leading-6 text-white/66">
                Monte seu perfil com foto de rosto e bio curta. Assim voce chega na festa com tudo pronto para entrar rapido.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/4 p-5">
              <h2 className="text-lg font-semibold text-white">Dentro do evento</h2>
              <p className="mt-2 text-sm leading-6 text-white/66">
                A sala mostra apenas quem fez check-in. Voce abre perfis, inicia conversas privadas e acompanha suas conversas depois.
              </p>
            </div>
          </div>
        </section>

        <section className="glass-panel rounded-[32px] p-8">
          <div className="flex rounded-full bg-white/4 p-1">
            <button
              className={`min-h-11 flex-1 rounded-full px-4 text-sm font-semibold ${mode === "login" ? "bg-white text-base-950" : "text-white/72"}`}
              onClick={() => setMode("login")}
              type="button"
            >
              Entrar
            </button>
            <button
              className={`min-h-11 flex-1 rounded-full px-4 text-sm font-semibold ${mode === "cadastro" ? "bg-white text-base-950" : "text-white/72"}`}
              onClick={() => setMode("cadastro")}
              type="button"
            >
              Criar conta
            </button>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white/84">E-mail</span>
              <input
                className="min-h-11 w-full rounded-2xl border border-white/10 bg-base-800 px-4 text-white placeholder:text-white/42"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@exemplo.com"
                type="email"
                value={email}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white/84">Senha</span>
              <input
                className="min-h-11 w-full rounded-2xl border border-white/10 bg-base-800 px-4 text-white placeholder:text-white/42"
                minLength={6}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimo de 6 caracteres"
                type="password"
                value={password}
              />
            </label>

            {error ? <p className="rounded-2xl bg-rose-500/12 px-4 py-3 text-sm text-rose-200">{error}</p> : null}

            <button
              className="min-h-11 w-full rounded-full bg-gradient-to-r from-accent-purple to-accent-pink px-5 text-sm font-semibold text-white disabled:opacity-50"
              disabled={loading}
              type="submit"
            >
              {loading ? "Entrando..." : mode === "cadastro" ? "Criar conta" : "Entrar na sua conta"}
            </button>
          </form>

          <p className="mt-4 text-sm leading-6 text-white/58">
            Dica: depois de criar a conta, complete o perfil com uma foto de rosto clara. Sem foto, seu perfil nao entra na rede do evento.
          </p>
        </section>
      </div>
    </AppShell>
  );
}

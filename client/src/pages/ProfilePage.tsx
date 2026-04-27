import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { saveProfile, uploadProfilePhoto } from "@/services/profileService";
import { GenderOption } from "@/types";

const genderOptions: Array<GenderOption | "todos"> = ["mulher", "homem", "nao-binario", "prefiro-nao-dizer", "todos"];

export function ProfilePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [age, setAge] = useState(profile?.age ? String(profile.age) : "");
  const [gender, setGender] = useState<GenderOption>(profile?.gender ?? "prefiro-nao-dizer");
  const [preference, setPreference] = useState<GenderOption | "todos">(profile?.preference ?? "todos");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [photoUrl, setPhotoUrl] = useState(profile?.photoUrl ?? "");
  const [secondPhotoUrl, setSecondPhotoUrl] = useState(profile?.secondPhotoUrl ?? "");
  const [photoUploadingSlot, setPhotoUploadingSlot] = useState<"primary" | "secondary" | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile) {
      return;
    }

    setDisplayName(profile.displayName);
    setAge(String(profile.age));
    setGender(profile.gender);
    setPreference(profile.preference);
    setBio(profile.bio);
    setPhotoUrl(profile.photoUrl);
    setSecondPhotoUrl(profile.secondPhotoUrl ?? "");
  }, [profile]);

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>, slot: "primary" | "secondary") {
    if (!user || !event.target.files?.[0]) {
      return;
    }

    setPhotoUploadingSlot(slot);
    setMessage(slot === "primary" ? "Enviando sua foto de rosto..." : "Enviando sua segunda foto...");
    setError("");

    try {
      const url = await uploadProfilePhoto(user.uid, event.target.files[0], slot);
      if (slot === "primary") {
        setPhotoUrl(url);
      } else {
        setSecondPhotoUrl(url);
      }
      await refreshProfile();
      setMessage(slot === "primary" ? "Foto principal enviada e salva com sucesso." : "Segunda foto enviada e salva com sucesso.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Nao foi possivel enviar sua foto.");
    } finally {
      setPhotoUploadingSlot(null);
      event.target.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      await saveProfile(user.uid, {
        email: user.email ?? "",
        displayName,
        age: Number(age),
        gender,
        preference,
        bio,
        photoUrl,
        secondPhotoUrl,
        role: profile?.role ?? "user",
        organizerStatus: profile?.organizerStatus ?? "none",
        organizerApprovedAt: profile?.organizerApprovedAt ?? "",
      });
      await refreshProfile();
      setMessage("Perfil salvo com sucesso. Agora voce pode entrar em eventos e aparecer na rede.");
      if (searchParams.get("redirect")) {
        navigate(searchParams.get("redirect") ?? "/eventos");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Nao foi possivel salvar o perfil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="glass-panel rounded-[32px] p-6">
          <h1 className="text-2xl font-semibold text-white">Seu perfil unico</h1>
          <p className="mt-3 text-sm leading-6 text-white/68">
            Este perfil acompanha voce em qualquer casa parceira. Ele so aparece quando voce faz check-in em um evento ativo.
          </p>

          <div className="mt-6 rounded-[28px] border border-white/10 bg-white/4 p-4">
            {photoUrl ? (
              <img alt="Foto de rosto do perfil" className="aspect-[4/5] w-full rounded-[24px] object-cover" src={photoUrl} />
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center rounded-[24px] border border-dashed border-white/12 bg-base-800 text-center text-sm text-white/55">
                Carregue uma foto de rosto nitida. Sem foto, o perfil nao pode ser exibido.
              </div>
            )}
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium text-white/84">Foto de rosto obrigatoria</span>
            <input
              accept="image/*"
              className="block w-full text-sm text-white/72 file:mr-4 file:min-h-11 file:rounded-full file:border-0 file:bg-white file:px-4 file:font-semibold file:text-base-950"
              disabled={photoUploadingSlot !== null}
              onChange={(event) => void handlePhotoChange(event, "primary")}
              type="file"
            />
          </label>
          <p className="mt-2 text-sm text-white/56">
            Use uma foto frontal, clara e recente. Isso reduz fraudes e facilita a identificacao na rede do evento.
          </p>
          <div className="mt-6 rounded-[28px] border border-white/10 bg-white/4 p-4">
            {secondPhotoUrl ? (
              <img alt="Segunda foto do perfil" className="aspect-[4/5] w-full rounded-[24px] object-cover" src={secondPhotoUrl} />
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center rounded-[24px] border border-dashed border-white/12 bg-base-800 text-center text-sm text-white/55">
                Adicione uma segunda foto opcional para mostrar melhor seu estilo.
              </div>
            )}
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium text-white/84">Segunda foto opcional</span>
            <input
              accept="image/*"
              className="block w-full text-sm text-white/72 file:mr-4 file:min-h-11 file:rounded-full file:border-0 file:bg-white file:px-4 file:font-semibold file:text-base-950"
              disabled={photoUploadingSlot !== null}
              onChange={(event) => void handlePhotoChange(event, "secondary")}
              type="file"
            />
          </label>
          <p className="mt-2 text-sm text-white/56">
            Pode ser uma foto de corpo inteiro, look da festa ou outro registro social.
          </p>
          {photoUploadingSlot ? <p className="mt-3 text-sm text-accent-pink">Upload em andamento. Aguarde a confirmacao.</p> : null}
        </aside>

        <section className="glass-panel rounded-[32px] p-6">
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <div className="grid gap-5 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-white/84">Nome ou apelido</span>
                <input
                  className="min-h-11 w-full rounded-2xl border border-white/10 bg-base-800 px-4 text-white"
                  maxLength={40}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Como voce quer aparecer?"
                  value={displayName}
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-white/84">Idade</span>
                <input
                  className="min-h-11 w-full rounded-2xl border border-white/10 bg-base-800 px-4 text-white"
                  min={18}
                  onChange={(event) => setAge(event.target.value)}
                  placeholder="18"
                  type="number"
                  value={age}
                />
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-medium text-white/84">Genero</span>
                <select
                  className="min-h-11 w-full rounded-2xl border border-white/10 bg-base-800 px-4 text-white"
                  onChange={(event) => setGender(event.target.value as GenderOption)}
                  value={gender}
                >
                  {genderOptions.filter((option) => option !== "todos").map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-white/84">Preferencia de genero</span>
                <select
                  className="min-h-11 w-full rounded-2xl border border-white/10 bg-base-800 px-4 text-white"
                  onChange={(event) => setPreference(event.target.value as GenderOption | "todos")}
                  value={preference}
                >
                  {genderOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              <span className="mb-2 block text-sm font-medium text-white/84">Bio curta</span>
              <textarea
                className="min-h-32 w-full rounded-[24px] border border-white/10 bg-base-800 px-4 py-3 text-white"
                maxLength={180}
                onChange={(event) => setBio(event.target.value)}
                placeholder="Exemplo: Curto musica eletronica, conversar facil e prefiro ambientes animados."
                value={bio}
              />
            </label>

            <div className="rounded-[24px] border border-white/10 bg-white/4 p-4 text-sm leading-6 text-white/68">
              Seu perfil fica invisivel fora do evento. Dentro da festa, as pessoas visitam seu perfil primeiro e depois decidem se iniciam uma conversa privada.
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/4 p-4 text-sm leading-6 text-white/68">
              Modo atual: <span className="font-semibold text-white">{profile?.role ?? "user"}</span>
              {profile?.organizerStatus && profile.organizerStatus !== "none" ? (
                <span className="ml-2 text-white/78">| status organizador: {profile.organizerStatus}</span>
              ) : null}
            </div>

            {message ? <p className="rounded-2xl bg-white/6 px-4 py-3 text-sm text-white/78">{message}</p> : null}
            {error ? <p className="rounded-2xl bg-rose-500/12 px-4 py-3 text-sm text-rose-200">{error}</p> : null}

            <button
              className="min-h-11 rounded-full bg-gradient-to-r from-accent-purple to-accent-pink px-5 text-sm font-semibold text-white disabled:opacity-50"
              disabled={saving || photoUploadingSlot !== null}
              type="submit"
            >
              {saving ? "Salvando..." : "Salvar perfil"}
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}

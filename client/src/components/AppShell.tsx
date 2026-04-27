import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { CalendarDays, LayoutDashboard, LogOut, MessageCircle, PartyPopper, UserRound } from "lucide-react";
import { logout } from "@/services/authService";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/context/AuthContext";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, role } = useAuth();

  return (
    <div className="min-h-screen bg-base-950 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-base-900/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-purple to-accent-pink shadow-glow">
              <PartyPopper className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/70">Rede da Festa</p>
              <p className="text-xs text-white/55">A rede privada que nasce quando a festa comeca.</p>
            </div>
          </Link>
          {user ? (
            <nav className="hidden items-center gap-2 md:flex">
              <NavLink className="rounded-full px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/6" to="/eventos">
                <span className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Eventos
                </span>
              </NavLink>
              <NavLink className="rounded-full px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/6" to="/conversas">
                <span className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Conversas
                </span>
              </NavLink>
              <NavLink className="rounded-full px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/6" to="/perfil">
                <span className="flex items-center gap-2">
                  <UserRound className="h-4 w-4" />
                  Perfil
                </span>
              </NavLink>
              {role === "organizer" ? (
                <NavLink className="rounded-full px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/6" to="/organizador">
                  <span className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Organizador
                  </span>
                </NavLink>
              ) : null}
              {role === "admin" ? (
                <NavLink className="rounded-full px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/6" to="/admin">
                  <span className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Admin
                  </span>
                </NavLink>
              ) : null}
              <button
                className="flex min-h-11 items-center gap-2 rounded-full bg-white/6 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                onClick={() => logout()}
                type="button"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </nav>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-8">{children}</main>
      {user ? <BottomNav /> : null}
    </div>
  );
}

import { CalendarDays, LayoutDashboard, MessageCircle, UserRound } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function BottomNav() {
  const { role } = useAuth();

  const items = [
    { icon: CalendarDays, label: "Proximos", to: "/eventos" },
    { icon: MessageCircle, label: "Conversas", to: "/conversas" },
    { icon: UserRound, label: "Perfil", to: "/perfil" },
  ];

  if (role === "organizer") {
    items.push({ icon: LayoutDashboard, label: "Organizador", to: "/organizador" });
  }

  if (role === "admin") {
    items.push({ icon: LayoutDashboard, label: "Admin", to: "/admin" });
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-base-900/95 px-3 py-2 backdrop-blur md:hidden">
      <div className={`grid gap-2 ${items.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
        {items.map((item) => (
          <NavLink
            end={item.to === "/eventos"}
            className={({ isActive }) =>
              `flex min-h-11 flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-medium ${
                isActive ? "bg-white text-base-950" : "text-white/72"
              }`
            }
            key={item.label}
            to={item.to}
          >
            <item.icon className="mb-1 h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

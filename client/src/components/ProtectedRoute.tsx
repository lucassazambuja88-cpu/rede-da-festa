import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types";

type Props = {
  children: ReactElement;
  allowedRoles?: UserRole[];
};

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, loading, role } = useAuth();

  if (loading) {
    return <div className="p-8 text-center text-white/70">Carregando sua rede...</div>;
  }

  if (!user) {
    return <Navigate replace to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate replace to="/eventos" />;
  }

  return children;
}

import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { EventsPage } from "@/pages/EventsPage";
import { AdminDashboardPage } from "@/pages/AdminDashboardPage";
import { CheckInPage } from "@/pages/CheckInPage";
import { ConversationsPage } from "@/pages/ConversationsPage";
import { EventRoomPage } from "@/pages/EventRoomPage";
import { LoginPage } from "@/pages/LoginPage";
import { MemberProfilePage } from "@/pages/MemberProfilePage";
import { OrganizerDashboardPage } from "@/pages/OrganizerDashboardPage";
import { ProfilePage } from "@/pages/ProfilePage";

function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-8 text-center text-white/70">Carregando sua rede...</div>;
  }

  return <Navigate replace to={user ? "/eventos" : "/login"} />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<LoginPage />} path="/login" />
      <Route
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
        path="/perfil"
      />
      <Route
        element={
          <ProtectedRoute>
            <MemberProfilePage />
          </ProtectedRoute>
        }
        path="/perfil/:uid"
      />
      <Route
        element={
          <ProtectedRoute>
            <EventsPage />
          </ProtectedRoute>
        }
        path="/eventos"
      />
      <Route element={<CheckInPage />} path="/entrar" />
      <Route element={<CheckInPage />} path="/entrar/:codigo" />
      <Route
        element={
          <ProtectedRoute>
            <EventRoomPage />
          </ProtectedRoute>
        }
        path="/evento/:eventId"
      />
      <Route
        element={
          <ProtectedRoute>
            <ConversationsPage />
          </ProtectedRoute>
        }
        path="/conversas"
      />
      <Route
        element={
          <ProtectedRoute>
            <ConversationsPage />
          </ProtectedRoute>
        }
        path="/conversas/:participantId"
      />
      <Route
        element={
          <ProtectedRoute allowedRoles={["organizer", "admin"]}>
            <OrganizerDashboardPage />
          </ProtectedRoute>
        }
        path="/organizador"
      />
      <Route
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
        path="/admin"
      />
      <Route element={<HomeRedirect />} path="/" />
      <Route element={<HomeRedirect />} path="*" />
    </Routes>
  );
}

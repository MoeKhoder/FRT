import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MapView from "./pages/MapView";
import Members from "./pages/Members";
import MemberProfile from "./pages/MemberProfile";
import MemberPrintView from "./pages/MemberPrintView";
import IDCardPrintView from "./pages/IDCardPrintView";
import Missions from "./pages/Missions";
import Inventory from "./pages/Inventory";
import Hazards from "./pages/Hazards";
import Facilities from "./pages/Facilities";
import Announcements from "./pages/Announcements";
import AnnouncementPrintView from "./pages/AnnouncementPrintView";
import WarningsOverview from "./pages/WarningsOverview";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import AuditLog from "./pages/AuditLog";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

      <Route
        path="/members/:id/print"
        element={
          <ProtectedRoute feature="members">
            <MemberPrintView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/members/:id/id-card"
        element={
          <ProtectedRoute feature="members">
            <IDCardPrintView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/announcements/:id/print"
        element={
          <ProtectedRoute feature="announcements">
            <AnnouncementPrintView />
          </ProtectedRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route
          path="/map"
          element={
            <ProtectedRoute feature="map">
              <MapView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/members"
          element={
            <ProtectedRoute feature="members">
              <Members />
            </ProtectedRoute>
          }
        />
        <Route
          path="/members/:id"
          element={
            <ProtectedRoute feature="members">
              <MemberProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/missions"
          element={
            <ProtectedRoute feature="missions">
              <Missions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <ProtectedRoute feature="inventory">
              <Inventory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hazards"
          element={
            <ProtectedRoute feature="hazards">
              <Hazards />
            </ProtectedRoute>
          }
        />
        <Route
          path="/facilities"
          element={
            <ProtectedRoute feature="facilities">
              <Facilities />
            </ProtectedRoute>
          }
        />
        <Route
          path="/announcements"
          element={
            <ProtectedRoute feature="announcements">
              <Announcements />
            </ProtectedRoute>
          }
        />
        <Route
          path="/warnings-overview"
          element={
            <ProtectedRoute roles={["IT", "Administrator"]} feature="members">
              <WarningsOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute feature="reports">
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute roles={["IT"]}>
              <Users />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit"
          element={
            <ProtectedRoute roles={["IT"]}>
              <AuditLog />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute roles={["IT"]}>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

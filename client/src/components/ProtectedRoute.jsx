import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "./ui/Primitives";
import { can } from "../utils/permissions";

export default function ProtectedRoute({ children, roles, feature }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const roleOk = !roles || roles.includes(user.role);
  const featureOk = !feature || can(user, feature, "view");

  if (!roleOk || !featureOk) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 text-center px-4">
        <h2 className="text-xl font-bold text-rescue-400">غير مصرح بالوصول</h2>
        <p className="text-mist-400">لا تملك الصلاحية اللازمة لعرض هذه الصفحة.</p>
      </div>
    );
  }

  return children;
}

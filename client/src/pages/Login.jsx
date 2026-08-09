import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { FiLock, FiUser, FiEye, FiEyeOff } from "react-icons/fi";
import "leaflet/dist/leaflet.css";
import "../utils/leafletSetup";
import { createDotIcon } from "../utils/leafletSetup";
import { useAuth } from "../context/AuthContext";
import { Button, Input } from "../components/ui/Primitives";

const LEBANON_CENTER = [33.9, 35.86];
const AL_JOUMEH = [34.25, 35.83];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "تعذر تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-night-950 relative overflow-hidden px-4">
      {/* Background: a real, non-interactive map of Lebanon, dimmed for text contrast.
          z-0 here is required: Leaflet's internal panes use hardcoded z-index
          values (600-700+) that would otherwise paint on top of the form. */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={LEBANON_CENTER}
          zoom={8}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          boxZoom={false}
          keyboard={false}
          touchZoom={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <Marker position={AL_JOUMEH} icon={createDotIcon("rescue", 16)} />
        </MapContainer>
        <div className="absolute inset-0 bg-gradient-to-b from-night-950/80 via-night-950/85 to-night-950/95" />
        <span className="absolute bottom-1.5 left-2 text-[10px] text-mist-400/50">
          © OpenStreetMap contributors © CARTO
        </span>
      </div>

      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-rescue-500/20 blur-3xl pointer-events-none z-[1]" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-safe-500/10 blur-3xl pointer-events-none z-[1]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-8 text-center">
          <img
            src="/frt-logo.jpeg"
            alt="فريق المستجيب الأول - الجومة"
            className="w-28 h-28 rounded-2xl object-cover mb-4 ring-1 ring-rescue-500/30 shadow-lg shadow-rescue-500/10"
          />
          <h1 className="text-2xl font-extrabold text-mist-100">فريق المستجيب الأول</h1>
          <p className="text-mist-400 mt-1">الجومة</p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-night-700 bg-night-800/80 backdrop-blur-md p-6 shadow-2xl"
        >
          <div className="pulse-line mb-6 rounded-full" />
          <h2 className="text-lg font-bold text-mist-100 mb-1">تسجيل الدخول</h2>
          <p className="text-sm text-mist-400 mb-5">أدخل بيانات الاعتماد للوصول إلى النظام</p>

          <div className="flex flex-col gap-4">
            <div className="relative">
              <FiUser className="absolute top-[38px] right-3 text-mist-400" size={16} />
              <Input
                label="اسم المستخدم"
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pr-9"
                placeholder="اسم المستخدم"
              />
            </div>
            <div className="relative">
              <FiLock className="absolute top-[38px] right-3 text-mist-400" size={16} />
              <Input
                label="كلمة المرور"
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-9 pl-9"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute top-[38px] left-3 text-mist-400"
                tabIndex={-1}
              >
                {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-rescue-500/40 bg-rescue-500/10 px-3 py-2 text-sm text-rescue-400">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full mt-6">
            {loading ? "جارٍ الدخول..." : "دخول"}
          </Button>
        </form>

        <p className="text-center text-xs text-mist-400 mt-6">
          الوصول مقيّد لأفراد الفريق المصرح لهم فقط
        </p>
        <div className="flex items-center justify-center gap-2 mt-4 opacity-70">
          <img src="/joumeh-union-logo.jpeg" alt="اتحاد بلديات الجومة" className="w-6 h-6 rounded object-contain bg-white" />
          <span className="text-xs text-mist-400">بالشراكة مع اتحاد بلديات الجومة</span>
        </div>
      </div>
    </div>
  );
}

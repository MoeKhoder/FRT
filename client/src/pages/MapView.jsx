import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
  GeoJSON,
  useMap,
  useMapEvents,
} from "react-leaflet";
import * as turf from "@turf/turf";
import "leaflet/dist/leaflet.css";
import "../utils/leafletSetup";
import { createDotIcon } from "../utils/leafletSetup";
import {
  FiSearch, FiCrosshair, FiMaximize, FiMinimize, FiDownload, FiUpload,
  FiActivity, FiX, FiAlertTriangle, FiHome, FiFlag, FiUsers, FiPackage, FiThermometer,
} from "react-icons/fi";
import api from "../services/api";
import { Button, Input, Select, Textarea, Card, Spinner } from "../components/ui/Primitives";
import { Modal } from "../components/ui/Modal";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { can } from "../utils/permissions";

const DEFAULT_CENTER = [34.25, 35.83]; // Al Joumeh area, north Lebanon
const HAZARD_TYPES = ["فيضان", "حريق", "انفجار", "انهيار مبنى", "حالة طبية طارئة", "تسرب كيميائي", "حادث سير", "أخرى"];
const FACILITY_TYPES = ["مستشفى", "مركز إطفاء", "مركز شرطة", "ملجأ", "نقطة إخلاء", "مركز قيادة", "مصدر مياه", "منطقة هبوط", "أخرى"];

function normalizeVillage(v) {
  return String(v || "").trim().toLowerCase();
}

function MapClickHandler({ mode, onMeasureClick, onAddClick }) {
  useMapEvents({
    click(e) {
      if (mode === "measure") onMeasureClick(e.latlng);
      else if (mode === "add") onAddClick(e.latlng);
    },
  });
  return null;
}

function FlyTo({ position, zoom = 14 }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);
  return null;
}

function FullscreenButton() {
  const map = useMap();
  const [isFull, setIsFull] = useState(false);
  useEffect(() => {
    const handler = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);
  const toggle = () => {
    const el = map.getContainer();
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen();
  };
  return (
    <button
      onClick={toggle}
      className="absolute bottom-4 left-4 z-[400] bg-night-800 text-mist-100 rounded-lg p-2.5 shadow-lg border border-night-600 hover:bg-night-700 [body.light_&]:bg-white [body.light_&]:border-mist-300 [body.light_&]:text-night-900"
      title="ملء الشاشة"
    >
      {isFull ? <FiMinimize size={16} /> : <FiMaximize size={16} />}
    </button>
  );
}

const LAYER_DEFS = [
  { key: "missions", label: "المهام", icon: FiFlag, color: "rescue" },
  { key: "members", label: "الأعضاء", icon: FiUsers, color: "blue" },
  { key: "inventory", label: "المخزون", icon: FiPackage, color: "amber" },
  { key: "facilities", label: "المرافق", icon: FiHome, color: "safe" },
  { key: "hazards", label: "المخاطر", icon: FiAlertTriangle, color: "rescue" },
  { key: "heatmap", label: "كثافة الاستبيان (حسب القرية)", icon: FiThermometer, color: "purple" },
];

export default function MapView() {
  const { user } = useAuth();
  const { push } = useToast();
  const canAddHazard = can(user, "hazards", "manage");
  const canAddFacility = can(user, "facilities", "manage");
  const canWrite = canAddHazard || canAddFacility;
  const fileInput = useRef(null);

  const [basemap, setBasemap] = useState("dark");
  const [layers, setLayers] = useState({
    missions: true, members: false, inventory: false, facilities: true, hazards: true, heatmap: false,
  });

  const [missions, setMissions] = useState([]);
  const [members, setMembers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [hazards, setHazards] = useState([]);
  const [villages, setVillages] = useState([]);
  const [surveyResponses, setSurveyResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [flyTarget, setFlyTarget] = useState(null);
  const [myLocation, setMyLocation] = useState(null);

  const [mode, setMode] = useState(null); // null | 'measure' | 'add'
  const [measurePoints, setMeasurePoints] = useState([]);
  const [addType, setAddType] = useState(canAddHazard ? "hazard" : "facility");
  const [quickAddPoint, setQuickAddPoint] = useState(null);
  const [quickAddForm, setQuickAddForm] = useState({});
  const [savingQuickAdd, setSavingQuickAdd] = useState(false);

  const [importedGeo, setImportedGeo] = useState(null);

  const loadAll = () => {
    setLoading(true);
    Promise.allSettled([
      api.get("/missions"), api.get("/members"), api.get("/inventory"),
      api.get("/facilities"), api.get("/hazards"), api.get("/geo/villages"),
      api.get("/surveys"),
    ])
      .then(([mi, me, inv, fac, haz, vil, sur]) => {
        const val = (r) => (r.status === "fulfilled" ? r.value.data : []);
        setMissions(val(mi)); setMembers(val(me)); setInventory(val(inv));
        setFacilities(val(fac)); setHazards(val(haz)); setVillages(val(vil));
        setSurveyResponses(val(sur));
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    loadAll();
  }, []);

  const toggleLayer = (key) => setLayers((l) => ({ ...l, [key]: !l[key] }));

  const search = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      const res = await api.get("/geo/search", { params: { q: query } });
      setSearchResults(res.data);
    } catch (err) {
      push(err.response?.data?.error || "تعذر البحث", "error");
    }
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      push("المتصفح لا يدعم تحديد الموقع", "error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = [pos.coords.latitude, pos.coords.longitude];
        setMyLocation(p);
        setFlyTarget(p);
      },
      () => push("تعذر الحصول على موقعك الحالي", "error"),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

  const measureDistanceKm = useMemo(() => {
    if (measurePoints.length < 2) return 0;
    const line = turf.lineString(measurePoints.map((p) => [p[1], p[0]]));
    return turf.length(line, { units: "kilometers" });
  }, [measurePoints]);

  const handleMeasureClick = (latlng) => {
    setMeasurePoints((pts) => [...pts, [latlng.lat, latlng.lng]]);
  };

  const handleAddClick = (latlng) => {
    setQuickAddPoint(latlng);
    setQuickAddForm(
      addType === "hazard"
        ? { type: HAZARD_TYPES[0], severity: "متوسطة", status: "نشط", description: "", radiusMeters: 200, riskScore: 3, date: new Date().toISOString().slice(0, 10) }
        : { name: "", type: FACILITY_TYPES[0], notes: "" }
    );
  };

  const saveQuickAdd = async () => {
    setSavingQuickAdd(true);
    try {
      const payload = { ...quickAddForm, lat: quickAddPoint.lat, lng: quickAddPoint.lng };
      if (addType === "hazard") {
        await api.post("/hazards", payload);
        push("تم تسجيل الخطر", "success");
      } else {
        if (!payload.name) {
          push("يرجى إدخال اسم المرفق", "error");
          setSavingQuickAdd(false);
          return;
        }
        await api.post("/facilities", payload);
        push("تمت إضافة المرفق", "success");
      }
      setQuickAddPoint(null);
      setMode(null);
      loadAll();
    } catch (err) {
      push(err.response?.data?.error || "تعذر الحفظ", "error");
    } finally {
      setSavingQuickAdd(false);
    }
  };

  const exportGeoJSON = () => {
    const features = [];
    if (layers.missions) {
      missions.filter((m) => m.lat != null).forEach((m) =>
        features.push({ type: "Feature", geometry: { type: "Point", coordinates: [m.lng, m.lat] }, properties: { layer: "mission", name: m.missionName, status: m.status } })
      );
    }
    if (layers.facilities) {
      facilities.filter((f) => f.lat != null).forEach((f) =>
        features.push({ type: "Feature", geometry: { type: "Point", coordinates: [f.lng, f.lat] }, properties: { layer: "facility", name: f.name, type: f.type } })
      );
    }
    if (layers.hazards) {
      hazards.filter((h) => h.lat != null).forEach((h) =>
        features.push({ type: "Feature", geometry: { type: "Point", coordinates: [h.lng, h.lat] }, properties: { layer: "hazard", type: h.type, severity: h.severity, status: h.status } })
      );
    }
    if (features.length === 0) {
      push("لا توجد عناصر مرئية على الطبقات المفعّلة للتصدير", "error");
      return;
    }
    const fc = { type: "FeatureCollection", features };
    const blob = new Blob([JSON.stringify(fc, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `frt-map-export-${Date.now()}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setImportedGeo(parsed);
      push("تم تحميل الطبقة (عرض مؤقت لهذه الجلسة فقط)", "success");
    } catch (err) {
      push("تعذر قراءة ملف GeoJSON", "error");
    }
  };

  // village heatmap data: match survey responses to geocoded village coordinates
  const heatmapPoints = useMemo(() => {
    if (!layers.heatmap) return [];
    const byVillage = new Map();
    surveyResponses.forEach((r) => {
      const key = normalizeVillage(r.village);
      if (!key) return;
      if (!byVillage.has(key)) byVillage.set(key, { total: 0, approved: 0, label: r.village });
      const entry = byVillage.get(key);
      entry.total += 1;
      if (r.approved) entry.approved += 1;
    });
    const points = [];
    for (const [key, stats] of byVillage.entries()) {
      const village = villages.find((v) => normalizeVillage(v.name) === key);
      if (village) points.push({ ...stats, lat: village.lat, lng: village.lng });
    }
    return points;
  }, [layers.heatmap, surveyResponses, villages]);

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-7rem)]">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">الخريطة التفاعلية</h1>
          <p className="text-mist-400 mt-1">عرض جغرافي للمهام والمخاطر والمرافق والموارد</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportGeoJSON}><FiDownload size={16} /> تصدير GeoJSON</Button>
          <Button variant="secondary" onClick={() => fileInput.current?.click()}><FiUpload size={16} /> استيراد GeoJSON</Button>
          <input ref={fileInput} type="file" accept=".geojson,.json" hidden onChange={onImportFile} />
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Sidebar controls */}
        <Card className="w-64 shrink-0 p-4 flex flex-col gap-4 overflow-y-auto hidden lg:flex">
          <div>
            <span className="text-xs font-bold text-mist-400">الخريطة الأساسية</span>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setBasemap("dark")} className={`flex-1 text-xs py-1.5 rounded-lg border ${basemap === "dark" ? "bg-rescue-500/15 border-rescue-500/40 text-rescue-400" : "border-night-600 text-mist-400 [body.light_&]:border-mist-300"}`}>داكن</button>
              <button onClick={() => setBasemap("osm")} className={`flex-1 text-xs py-1.5 rounded-lg border ${basemap === "osm" ? "bg-rescue-500/15 border-rescue-500/40 text-rescue-400" : "border-night-600 text-mist-400 [body.light_&]:border-mist-300"}`}>فاتح</button>
            </div>
          </div>

          <div>
            <span className="text-xs font-bold text-mist-400">الطبقات</span>
            <div className="flex flex-col gap-1.5 mt-2">
              {LAYER_DEFS.map((l) => (
                <label key={l.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={layers[l.key]} onChange={() => toggleLayer(l.key)} className="accent-rescue-500" />
                  <l.icon size={14} className="text-mist-400" />
                  {l.label}
                </label>
              ))}
            </div>
          </div>

          {canWrite && (
            <div>
              <span className="text-xs font-bold text-mist-400">إضافة سريعة</span>
              <div className="flex flex-col gap-2 mt-2">
                <Select value={addType} onChange={(e) => setAddType(e.target.value)}>
                  {canAddHazard && <option value="hazard">خطر</option>}
                  {canAddFacility && <option value="facility">مرفق</option>}
                </Select>
                <Button
                  variant={mode === "add" ? "primary" : "secondary"}
                  onClick={() => setMode(mode === "add" ? null : "add")}
                >
                  {mode === "add" ? "اضغط على الخريطة..." : "تفعيل وضع الإضافة"}
                </Button>
              </div>
            </div>
          )}

          <div>
            <span className="text-xs font-bold text-mist-400">قياس المسافة</span>
            <div className="flex flex-col gap-2 mt-2">
              <Button
                variant={mode === "measure" ? "primary" : "secondary"}
                onClick={() => {
                  setMode(mode === "measure" ? null : "measure");
                  setMeasurePoints([]);
                }}
              >
                <FiActivity size={16} /> {mode === "measure" ? "إنهاء القياس" : "بدء القياس"}
              </Button>
              {measurePoints.length > 1 && (
                <div className="text-xs text-mist-400">
                  المسافة: <span className="num font-bold text-mist-100">{measureDistanceKm.toFixed(2)} كم</span>
                </div>
              )}
              {measurePoints.length > 0 && (
                <button onClick={() => setMeasurePoints([])} className="text-xs text-rescue-400 hover:underline">مسح النقاط</button>
              )}
            </div>
          </div>
        </Card>

        {/* Map */}
        <div className="flex-1 relative z-0 rounded-xl overflow-hidden border border-night-700 [body.light_&]:border-mist-200">
          {loading && (
            <div className="absolute inset-0 z-[500] flex items-center justify-center bg-night-900/60">
              <Spinner size={32} />
            </div>
          )}

          {/* search box */}
          <div className="absolute top-3 right-3 z-[400] w-72 max-w-[80vw]">
            <form onSubmit={search} className="flex gap-1.5">
              <Input
                placeholder="بحث عن موقع..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="bg-night-800/95 backdrop-blur"
              />
              <Button type="submit" variant="secondary"><FiSearch size={16} /></Button>
            </form>
            {searchResults.length > 0 && (
              <div className="mt-1.5 rounded-lg border border-night-600 bg-night-800/95 backdrop-blur divide-y divide-night-700 max-h-40 overflow-y-auto [body.light_&]:bg-white/95 [body.light_&]:border-mist-300 [body.light_&]:divide-mist-200">
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setFlyTarget([r.lat, r.lng]);
                      setSearchResults([]);
                      setQuery(r.displayName);
                    }}
                    className="block w-full text-start px-3 py-2 text-xs hover:bg-night-700/50 [body.light_&]:hover:bg-mist-100"
                  >
                    {r.displayName}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={locateMe}
            className="absolute top-3 left-3 z-[400] bg-night-800 text-mist-100 rounded-lg p-2.5 shadow-lg border border-night-600 hover:bg-night-700 [body.light_&]:bg-white [body.light_&]:border-mist-300 [body.light_&]:text-night-900"
            title="حدد موقعي الحالي"
          >
            <FiCrosshair size={16} />
          </button>

          {mode && (
            <div className="absolute bottom-4 right-3 z-[400] bg-rescue-500/90 text-white text-xs rounded-lg px-3 py-2 shadow-lg flex items-center gap-2">
              {mode === "measure" ? "اضغط على الخريطة لإضافة نقاط قياس" : "اضغط على الخريطة لتحديد الموقع"}
              <button onClick={() => setMode(null)}><FiX size={14} /></button>
            </div>
          )}

          <MapContainer center={DEFAULT_CENTER} zoom={11} style={{ height: "100%", width: "100%" }} zoomControl={false}>
            {basemap === "dark" ? (
              <TileLayer
                attribution='&copy; OpenStreetMap &copy; CARTO'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
            ) : (
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            )}

            <MapClickHandler mode={mode} onMeasureClick={handleMeasureClick} onAddClick={handleAddClick} />
            <FlyTo position={flyTarget} />
            <FullscreenButton />

            {myLocation && (
              <Marker position={myLocation} icon={createDotIcon("blue", 22)}>
                <Popup>موقعك الحالي</Popup>
              </Marker>
            )}

            {measurePoints.length > 0 && <Polyline positions={measurePoints} color="#d80a17" weight={3} dashArray="6 6" />}
            {measurePoints.map((p, i) => (
              <Marker key={i} position={p} icon={createDotIcon("rescue", 14)} />
            ))}

            {quickAddPoint && <Marker position={quickAddPoint} icon={createDotIcon(addType === "hazard" ? "rescue" : "safe", 24)} />}

            {layers.missions && missions.filter((m) => m.lat != null).map((m) => (
              <Marker key={m.id} position={[m.lat, m.lng]} icon={createDotIcon("rescue", 26)}>
                <Popup>
                  <div className="font-bold">{m.missionName}</div>
                  <div className="text-xs">{m.status} · {m.priority}</div>
                </Popup>
              </Marker>
            ))}

            {layers.members && members.filter((m) => m.lat != null).map((m) => (
              <Marker key={m.id} position={[m.lat, m.lng]} icon={createDotIcon("blue", 20)}>
                <Popup>
                  <div className="font-bold">{m.firstName} {m.lastName}</div>
                  <div className="text-xs">{m.rank} · {m.status}</div>
                </Popup>
              </Marker>
            ))}

            {layers.inventory && inventory.filter((i) => i.lat != null).map((i) => (
              <Marker key={i.id} position={[i.lat, i.lng]} icon={createDotIcon("amber", 20)}>
                <Popup>
                  <div className="font-bold">{i.name}</div>
                  <div className="text-xs">{i.category} · {i.status}</div>
                </Popup>
              </Marker>
            ))}

            {layers.facilities && facilities.filter((f) => f.lat != null).map((f) => (
              <Marker key={f.id} position={[f.lat, f.lng]} icon={createDotIcon("safe", 22)}>
                <Popup>
                  <div className="font-bold">{f.name}</div>
                  <div className="text-xs">{f.type}</div>
                  {f.notes && <div className="text-xs mt-1">{f.notes}</div>}
                </Popup>
              </Marker>
            ))}

            {layers.hazards && hazards.filter((h) => h.lat != null).map((h) => (
              <div key={h.id}>
                <Circle center={[h.lat, h.lng]} radius={h.radiusMeters || 200} pathOptions={{ color: "#d80a17", fillOpacity: 0.15 }} />
                <Marker position={[h.lat, h.lng]} icon={createDotIcon("rescue", 24)}>
                  <Popup>
                    <div className="font-bold">{h.type}</div>
                    <div className="text-xs">{h.severity} · {h.status}</div>
                    {h.description && <div className="text-xs mt-1">{h.description}</div>}
                  </Popup>
                </Marker>
              </div>
            ))}

            {layers.heatmap && heatmapPoints.map((p, i) => {
              const ratio = p.total ? p.approved / p.total : 0;
              const color = ratio >= 0.66 ? "#109441" : ratio >= 0.33 ? "#f4a300" : "#d80a17";
              return (
                <Circle
                  key={i}
                  center={[p.lat, p.lng]}
                  radius={300 + p.total * 150}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.35, weight: 1 }}
                >
                  <Popup>
                    <div className="font-bold">{p.label}</div>
                    <div className="text-xs">{p.total} رد · {p.approved} موافقة ({Math.round(ratio * 100)}%)</div>
                  </Popup>
                </Circle>
              );
            })}

            {importedGeo && <GeoJSON data={importedGeo} />}
          </MapContainer>
        </div>
      </div>

      <Modal open={!!quickAddPoint} onClose={() => setQuickAddPoint(null)} title={addType === "hazard" ? "تسجيل خطر سريع" : "إضافة مرفق سريع"}>
        {addType === "hazard" ? (
          <div className="flex flex-col gap-3">
            <Select label="النوع" value={quickAddForm.type} onChange={(e) => setQuickAddForm({ ...quickAddForm, type: e.target.value })}>
              {HAZARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
            <Select label="الخطورة" value={quickAddForm.severity} onChange={(e) => setQuickAddForm({ ...quickAddForm, severity: e.target.value })}>
              <option value="منخفضة">منخفضة</option>
              <option value="متوسطة">متوسطة</option>
              <option value="عالية">عالية</option>
              <option value="حرجة">حرجة</option>
            </Select>
            <Textarea label="الوصف" rows={2} value={quickAddForm.description} onChange={(e) => setQuickAddForm({ ...quickAddForm, description: e.target.value })} />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Input label="الاسم" required value={quickAddForm.name} onChange={(e) => setQuickAddForm({ ...quickAddForm, name: e.target.value })} />
            <Select label="النوع" value={quickAddForm.type} onChange={(e) => setQuickAddForm({ ...quickAddForm, type: e.target.value })}>
              {FACILITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setQuickAddPoint(null)}>إلغاء</Button>
          <Button onClick={saveQuickAdd} disabled={savingQuickAdd}>حفظ</Button>
        </div>
      </Modal>
    </div>
  );
}

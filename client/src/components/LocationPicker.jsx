import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import { FiSearch, FiMapPin } from "react-icons/fi";
import "leaflet/dist/leaflet.css";
import "../utils/leafletSetup";
import { createDotIcon } from "../utils/leafletSetup";
import { Modal } from "./ui/Modal";
import { Button, Input } from "./ui/Primitives";
import api from "../services/api";

const DEFAULT_CENTER = [34.25, 35.83]; // Al Joumeh area, north Lebanon

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyTo({ position }) {
  const map = useMap();
  if (position) map.flyTo(position, 14);
  return null;
}

export default function LocationPicker({ open, onClose, onConfirm, initialLat, initialLng, title = "تحديد الموقع على الخريطة" }) {
  const [point, setPoint] = useState(
    initialLat && initialLng ? [Number(initialLat), Number(initialLng)] : null
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);

  const search = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await api.get("/geo/search", { params: { q: query } });
      setResults(res.data);
    } catch (err) {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const pickResult = (r) => {
    setPoint([r.lat, r.lng]);
    setFlyTarget([r.lat, r.lng]);
    setResults([]);
    setQuery(r.displayName);
  };

  const confirm = () => {
    if (point) onConfirm(point[0], point[1]);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={title} wide>
      <div className="flex flex-col gap-3">
        <form onSubmit={search} className="flex gap-2">
          <Input
            placeholder="ابحث عن مكان (اسم قرية، شارع...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="secondary" disabled={searching}>
            <FiSearch size={16} />
          </Button>
        </form>

        {results.length > 0 && (
          <div className="rounded-lg border border-night-600 divide-y divide-night-700 max-h-32 overflow-y-auto [body.light_&]:border-mist-300 [body.light_&]:divide-mist-200">
            {results.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => pickResult(r)}
                className="block w-full text-start px-3 py-2 text-sm hover:bg-night-700/50 [body.light_&]:hover:bg-mist-100"
              >
                {r.displayName}
              </button>
            ))}
          </div>
        )}

        <div className="h-80 rounded-lg overflow-hidden border border-night-600 [body.light_&]:border-mist-300">
          <MapContainer center={point || DEFAULT_CENTER} zoom={point ? 14 : 11} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickHandler onPick={(lat, lng) => setPoint([lat, lng])} />
            <FlyTo position={flyTarget} />
            {point && <Marker position={point} icon={createDotIcon("rescue", 30)} />}
          </MapContainer>
        </div>

        <div className="flex items-center justify-between text-sm text-mist-400">
          <span className="flex items-center gap-1.5">
            <FiMapPin size={14} />
            {point ? (
              <span className="num">{point[0].toFixed(5)}, {point[1].toFixed(5)}</span>
            ) : (
              "اضغط على الخريطة لتحديد الموقع"
            )}
          </span>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button onClick={confirm} disabled={!point}>تأكيد الموقع</Button>
        </div>
      </div>
    </Modal>
  );
}

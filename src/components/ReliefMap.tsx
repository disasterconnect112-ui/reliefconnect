import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapPoint = { lat: number; lng: number; kind: "request" | "volunteer" | "ngo" | "shelter" | "camp"; label: string };

const COLORS: Record<MapPoint["kind"], string> = {
  request: "#dc2626",
  volunteer: "#16a34a",
  ngo: "#2563eb",
  shelter: "#9333ea",
  camp: "#ea580c",
};

export default function ReliefMap({ points, height = 480 }: { points: MapPoint[]; height?: number }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current).setView([20.5, 78.9], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current || !layer.current) return;
    layer.current.clearLayers();
    const valid = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    valid.forEach((p) =>
      L.circleMarker([p.lat, p.lng], { radius: 9, color: "#fff", weight: 2, fillColor: COLORS[p.kind], fillOpacity: 0.95 })
        .bindPopup(p.label)
        .addTo(layer.current!),
    );
    if (valid.length) map.current.fitBounds(L.latLngBounds(valid.map((p) => [p.lat, p.lng])), { maxZoom: 13, padding: [30, 30] });
  }, [points]);

  return <div ref={el} style={{ height }} className="w-full overflow-hidden rounded-xl border" />;
}

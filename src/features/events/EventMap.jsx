import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const markerColors = {
  venue: "#3457f5",
  parking: "#f59e0b",
  entrance: "#10a88f",
  room: "#8b5cf6",
  food: "#ef4444",
  help: "#0ea5e9",
  other: "#667085",
};

export function EventMap({ event, markers = [] }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;

    const map = L.map(containerRef.current, {
      attributionControl: true,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 20,
    }).addTo(map);

    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    const points = buildMapPoints(event, markers);

    if (points.length === 0) {
      map.setView([39.8283, -98.5795], 3);
      return;
    }

    for (const point of points) {
      const marker = L.marker([point.latitude, point.longitude], {
        icon: createMarkerIcon(point.marker_type),
      }).bindPopup(
        `<strong>${escapeHtml(point.label)}</strong>${point.description ? `<br>${escapeHtml(point.description)}` : ""}${point.floor ? `<br>Floor ${escapeHtml(point.floor)}` : ""}`,
      );

      marker.addTo(layer);
    }

    const bounds = L.latLngBounds(points.map((point) => [point.latitude, point.longitude]));
    map.fitBounds(bounds.pad(0.18), { maxZoom: 18 });
  }, [event, markers]);

  return <div className="event-osm-map" ref={containerRef} />;
}

function buildMapPoints(event, markers) {
  const points = markers
    .filter((marker) => marker.latitude && marker.longitude)
    .map((marker) => ({
      ...marker,
      latitude: Number(marker.latitude),
      longitude: Number(marker.longitude),
    }));

  if (event?.latitude && event?.longitude) {
    points.unshift({
      id: "venue",
      label: event.location_name || "Venue",
      description: event.address || "",
      marker_type: "venue",
      latitude: Number(event.latitude),
      longitude: Number(event.longitude),
    });
  }

  return points;
}

function createMarkerIcon(type) {
  const color = markerColors[type] || markerColors.other;

  return L.divIcon({
    className: "event-map-pin",
    html: `<span style="background:${color}"></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -22],
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

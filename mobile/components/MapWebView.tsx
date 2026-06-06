import { WebView } from "react-native-webview";
import { useMemo } from "react";
import { Report } from "../utils/types";
import { CATEGORY_COLORS } from "../utils/theme";

// Renders a Leaflet map inside a WebView (avoids react-native-maps / dev-build).
export default function MapWebView({ reports }: { reports: Report[] }) {
  const html = useMemo(() => {
    const markers = reports
      .filter((r) => typeof r.lat === "number" && typeof r.lng === "number")
      .map((r) => ({
        lat: r.lat,
        lng: r.lng,
        s: r.severity_score ?? 5,
        c: r.is_sos ? "#c0392b" : CATEGORY_COLORS[r.category] ?? "#888",
        t: `${r.sub_type} · sev ${r.severity_score ?? "?"} · ${r.status}`,
        sos: r.is_sos,
      }));

    return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{height:100%;margin:0}</style>
</head><body><div id="map"></div><script>
var map = L.map('map').setView([24.8607, 67.0011], 11);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19}).addTo(map);
var data = ${JSON.stringify(markers)};
data.forEach(function(m){
  L.circleMarker([m.lat, m.lng], {
    radius: Math.max(6, m.s * 1.4),
    color: m.c, fillColor: m.c, fillOpacity: 0.6, weight: m.sos ? 3 : 1
  }).addTo(map).bindPopup(m.t);
});
</script></body></html>`;
  }, [reports]);

  return (
    <WebView
      originWhitelist={["*"]}
      source={{ html }}
      style={{ flex: 1 }}
      javaScriptEnabled
      domStorageEnabled
    />
  );
}

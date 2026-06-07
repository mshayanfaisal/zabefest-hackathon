import { WebView } from "react-native-webview";
import { useMemo } from "react";
import { Report } from "../utils/types";
import { CATEGORY_COLORS } from "../utils/theme";

// Renders a Leaflet map inside a WebView (avoids react-native-maps / dev-build).
export default function MapWebView({ reports, onPinTap }: { reports: Report[], onPinTap?: (report: any) => void }) {
  const html = useMemo(() => {
    const markers = reports
      .filter((r) => typeof r.lat === "number" && typeof r.lng === "number")
      .map((r) => {
        const isEmergency = r.is_sos || r.is_fire || (r.severity_score ?? 0) >= 8;
        return {
          lat: r.lat,
          lng: r.lng,
          s: r.severity_score ?? 5,
          c: isEmergency ? "230, 57, 70" : "59, 130, 246",
          hex: isEmergency ? "#E63946" : "#3B82F6",
          t: `${r.sub_type} · sev ${r.severity_score ?? "?"} · ${r.status}`,
          sos: r.is_sos || r.is_fire,
        };
      });

    return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
html,body,#map{height:100%;margin:0;background-color:#F3F4F6;}
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(var(--rgb), 0.7); }
  70% { box-shadow: 0 0 0 14px rgba(var(--rgb), 0); }
  100% { box-shadow: 0 0 0 0 rgba(var(--rgb), 0); }
}
.pulse-marker {
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
</style>
</head><body><div id="map"></div><script>
var map = L.map('map', { zoomControl: false }).setView([24.8607, 67.0011], 12);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {maxZoom: 19, attribution: '&copy; CartoDB'}).addTo(map);
var data = ${JSON.stringify(markers)};
  data.forEach(function(m){
    var size = m.sos ? 18 : 14;
    var icon = L.divIcon({
      className: 'custom-div-icon',
      html: '<div class="pulse-marker" style="width:' + size + 'px;height:' + size + 'px;background-color:' + m.hex + ';--rgb:' + m.c + ';animation: pulse ' + (m.sos ? '1.2s' : '2.5s') + ' infinite;"></div>',
      iconSize: [size, size],
      iconAnchor: [size/2, size/2]
    });
    var marker = L.marker([m.lat, m.lng], { icon: icon }).addTo(map);
    
    marker.on('click', function() {
      window.ReactNativeWebView.postMessage(JSON.stringify(m));
    });
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
      onMessage={(event) => {
        if (onPinTap) {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            onPinTap(data);
          } catch (e) {}
        }
      }}
    />
  );
}

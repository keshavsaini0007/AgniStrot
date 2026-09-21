import { Platform, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { BorderRadius } from '@/constants/theme';

export interface MapPoint {
  key?: string;
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
}

interface LocationMapProps {
  points: MapPoint[];
  height?: number;
  zoomEnabled?: boolean;
  scrollEnabled?: boolean;
  onMarkerPress?: (point: MapPoint) => void;
}

const DEFAULT_ZOOM = 14;

function toSafeJson(value: MapPoint[]): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function buildHtml(points: MapPoint[], zoomEnabled: boolean, scrollEnabled: boolean): string {
  const serialized = toSafeJson(points);
  const zoom = String(zoomEnabled);
  const scroll = String(scrollEnabled);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body { margin: 0; padding: 0; height: 100%; }
  #map { position: absolute; inset: 0; background: #e8ecee; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var points = ${serialized};
  var zoomEnabled = ${zoom};
  var scrollEnabled = ${scroll};

  var map = L.map('map', {
    dragging: scrollEnabled,
    touchZoom: zoomEnabled,
    scrollWheelZoom: zoomEnabled,
    doubleClickZoom: zoomEnabled,
    zoomControl: true,
  });

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  if (points.length === 0) {
    map.setView([0, 0], 2);
  } else if (points.length === 1) {
    map.setView([points[0].latitude, points[0].longitude], ${DEFAULT_ZOOM});
  } else {
    map.fitBounds(points.map(function (p) { return [p.latitude, p.longitude]; }), { padding: [28, 28] });
  }

  points.forEach(function (p) {
    var marker = L.marker([p.latitude, p.longitude]).addTo(map);
    if (p.title || p.description) {
      var html = '<div style="font-family:sans-serif;font-size:12px;line-height:1.4;min-width:140px">';
      if (p.title) html += '<b>' + escapeHtml(p.title) + '</b>';
      if (p.title && p.description) html += '<br/>';
      if (p.description) html += escapeHtml(p.description);
      html += '</div>';
      marker.bindPopup(html);
    }
    marker.on('click', function () {
      if (window.ReactNativeWebView && p.key) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerPress', key: p.key }));
      }
    });
  });

  document.addEventListener('click', function (e) {
    var link = e.target && e.target.closest ? e.target.closest('a') : null;
    if (link) {
      e.preventDefault();
    }
  });
</script>
</body>
</html>`;
}

export function LocationMap({
  points,
  height = 240,
  zoomEnabled = true,
  scrollEnabled = true,
  onMarkerPress,
}: LocationMapProps) {
  if (Platform.OS === 'web') return null;

  const html = buildHtml(points, zoomEnabled, scrollEnabled);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type !== 'markerPress' || !data.key) return;
      const point = points.find((p) => p.key === data.key);
      if (point && onMarkerPress) onMarkerPress(point);
    } catch {
      // ignore malformed messages
    }
  };

  return (
    <View style={[styles.container, { height, borderRadius: BorderRadius.lg }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
        bounces={false}
        overScrollMode="never"
        setSupportMultipleWindows={false}
        onMessage={handleMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e8ecee',
  },
});
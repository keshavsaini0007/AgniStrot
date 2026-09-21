import { Platform, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { BorderRadius } from '@/constants/theme';
import type { NearbyPlace } from '@/services/nearbyPlaces';

interface MyLocationMapProps {
  latitude: number;
  longitude: number;
  accuracy?: number;
  places?: NearbyPlace[];
  height?: number;
  onPlacePress?: (place: NearbyPlace) => void;
}

function escapeScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function buildHtml(
  latitude: number,
  longitude: number,
  accuracy: number,
  places: NearbyPlace[],
  interactive: boolean,
): string {
  const lat = Number(latitude.toFixed(6));
  const lng = Number(longitude.toFixed(6));
  const radius = Math.max(Math.round(accuracy || 30), 1);
  const serializedPlaces = escapeScript(places);

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
  .user-icon .dot {
    width: 18px; height: 18px; border-radius: 50%;
    background: #1a73e8; border: 3px solid #ffffff;
    box-shadow: 0 0 0 2px rgba(26,115,232,0.4), 0 2px 6px rgba(0,0,0,0.3);
  }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var userPos = L.latLng(${lat}, ${lng});
  var places = ${serializedPlaces};
  var interactive = ${interactive};

  var map = L.map('map');

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  L.circle(userPos, {
    radius: ${radius},
    color: '#1a73e8',
    weight: 1,
    fillColor: '#1a73e8',
    fillOpacity: 0.10,
  }).addTo(map);

  L.marker(userPos, {
    icon: L.divIcon({
      className: 'user-icon',
      html: '<div class="dot"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    }),
    title: 'You',
  }).addTo(map);

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  places.forEach(function (place, index) {
    var marker = L.marker([place.latitude, place.longitude], { title: place.name }).addTo(map);
    var popup =
      '<div style="font-family:sans-serif;font-size:12px;line-height:1.4;min-width:150px">' +
      '<b>' + escapeHtml(place.name) + '</b>' +
      (place.category ? '<br/><span style="color:#666">' + escapeHtml(place.category) + '</span>' : '') +
      '</div>';
    marker.bindPopup(popup);
    if (interactive && window.ReactNativeWebView) {
      marker.on('click', function () {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'placePress', index: index }));
      });
    }
  });

  if (places.length > 0) {
    var latLngs = places.map(function (p) { return L.latLng(p.latitude, p.longitude); });
    latLngs.push(userPos);
    map.fitBounds(latLngs, { padding: [28, 28], maxZoom: 15 });
  } else {
    map.setView(userPos, 15);
  }

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

export function MyLocationMap({
  latitude,
  longitude,
  accuracy,
  places = [],
  height = 300,
  onPlacePress,
}: MyLocationMapProps) {
  if (Platform.OS === 'web') return null;

  const interactive = !!onPlacePress;
  const html = buildHtml(latitude, longitude, accuracy ?? 30, places, interactive);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type !== 'placePress' || typeof data.index !== 'number') return;
      const place = places[data.index];
      if (place && onPlacePress) onPlacePress(place);
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
export interface NearbyPlace {
  name: string;
  latitude: number;
  longitude: number;
  category: string;
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

const CATEGORY_KEYS = ['tourism', 'historic', 'amenity', 'shop', 'leisure'] as const;

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function titleCase(value: string): string {
  return value
    .split('_')
    .join(' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface OverpassElement {
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
}

export async function fetchNearbyPlaces(
  latitude: number,
  longitude: number,
  options?: { radiusMeters?: number; limit?: number },
): Promise<NearbyPlace[]> {
  const radius = options?.radiusMeters ?? 3000;
  const limit = options?.limit ?? 40;
  const lat = Number(latitude.toFixed(6));
  const lng = Number(longitude.toFixed(6));

  const query = `[out:json][timeout:25];
(
  node["tourism"]["name"](around:${radius},${lat},${lng});
  node["historic"]["name"](around:${radius},${lat},${lng});
  node["amenity"]["name"](around:${radius},${lat},${lng});
  node["shop"]["name"](around:${radius},${lat},${lng});
  node["leisure"]["name"](around:${radius},${lat},${lng});
);
out body ${limit};`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Overpass API error ${response.status}`);
    }
    const json = (await response.json()) as { elements?: OverpassElement[] };

    const places = (json.elements ?? [])
      .filter(
        (e): e is OverpassElement & { lat: number; lon: number; tags: Record<string, string> } =>
          typeof e.lat === 'number' && typeof e.lon === 'number' && !!e.tags?.name,
      )
      .map((e) => {
        const matchedKey = CATEGORY_KEYS.find((k) => e.tags[k] != null);
        const rawCategory = matchedKey ? e.tags[matchedKey] : '';
        return {
          name: e.tags.name,
          latitude: e.lat,
          longitude: e.lon,
          category: rawCategory ? titleCase(rawCategory) : titleCase(matchedKey ?? 'place'),
        };
      })
      .sort(
        (a, b) =>
          distanceMeters(latitude, longitude, a.latitude, a.longitude) -
          distanceMeters(latitude, longitude, b.latitude, b.longitude),
      )
      .slice(0, limit);

    return places;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Nearby places request timed out.');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
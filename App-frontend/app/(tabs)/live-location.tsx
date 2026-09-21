import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useTheme } from '@/hooks/use-theme';
import { Card, Button, PngIcon, Badge, LoadingState } from '@/components/ui';
import { MyLocationMap } from '@/components/MyLocationMap';
import { AppNavbar } from '@/components/AppNavbar';
import {
  fetchNearbyPlaces,
  formatDistance,
  distanceMeters,
  type NearbyPlace,
} from '@/services/nearbyPlaces';
import { FontSize, Spacing } from '@/constants/theme';

interface Coordinate {
  latitude: number;
  longitude: number;
}

type LocationStatus = 'loading' | 'granted' | 'denied' | 'error';
type PlacesStatus = 'idle' | 'loading' | 'ready' | 'error';

export default function LiveLocationScreen() {
  const theme = useTheme();

  const [coords, setCoords] = useState<Coordinate | null>(null);
  const [baseCoords, setBaseCoords] = useState<Coordinate | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [status, setStatus] = useState<LocationStatus>('loading');
  const [retry, setRetry] = useState(0);

  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [placesStatus, setPlacesStatus] = useState<PlacesStatus>('idle');
  const [selectedPlace, setSelectedPlace] = useState<NearbyPlace | null>(null);
  const baseRef = useRef<Coordinate | null>(null);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      try {
        const { status: permission } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (permission !== 'granted') {
          setStatus('denied');
          return;
        }
        setStatus('granted');

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 5,
            timeInterval: 3000,
          },
          (position) => {
            const next: Coordinate = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            setCoords(next);
            if (position.coords.accuracy != null) {
              setAccuracy(Math.round(position.coords.accuracy));
            }
            if (!baseRef.current) {
              baseRef.current = next;
              setBaseCoords(next);
              setPlacesStatus('loading');
            }
          },
        );
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [retry]);

  useEffect(() => {
    if (!baseCoords) return;
    let cancelled = false;

    (async () => {
      try {
        const list = await fetchNearbyPlaces(baseCoords.latitude, baseCoords.longitude);
        if (cancelled) return;
        setPlaces(list);
        setPlacesStatus('ready');
      } catch {
        if (!cancelled) setPlacesStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [baseCoords]);

  const refreshPlaces = () => {
    if (!coords) return;
    setPlacesStatus('loading');
    fetchNearbyPlaces(coords.latitude, coords.longitude)
      .then((list) => {
        setPlaces(list);
        setPlacesStatus('ready');
      })
      .catch(() => setPlacesStatus('error'));
  };

  const handleRetry = () => {
    baseRef.current = null;
    setStatus('loading');
    setCoords(null);
    setBaseCoords(null);
    setAccuracy(null);
    setPlaces([]);
    setPlacesStatus('idle');
    setRetry((n) => n + 1);
  };

  const renderBody = () => {
    if (status === 'loading') {
      return <LoadingState message="Getting your exact location..." />;
    }

    if (status === 'denied') {
      return (
        <Card style={styles.messageCard}>
          <PngIcon name="location" size={28} />
          <Text style={[styles.messageTitle, { color: theme.text }]}>Location permission required</Text>
          <Text style={[styles.messageText, { color: theme.textSecondary }]}>
            Allow location access to see your live position, coordinates and nearby popular places.
          </Text>
          <Button title="Open Settings" onPress={() => Linking.openSettings()} />
        </Card>
      );
    }

    if (status === 'error') {
      return (
        <Card style={styles.messageCard}>
          <PngIcon name="location" size={28} />
          <Text style={[styles.messageTitle, { color: theme.text }]}>Could not determine your location</Text>
          <Text style={[styles.messageText, { color: theme.textSecondary }]}>
            Make sure location services are enabled and try again.
          </Text>
          <Button title="Retry" onPress={handleRetry} />
        </Card>
      );
    }

    if (!coords) {
      return <LoadingState message="Getting your exact location..." />;
    }

    return (
      <>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Live Location</Text>
          <Badge label="Live" color={theme.success} />
        </View>

        <Card style={styles.mapCard}>
          <MyLocationMap
            latitude={coords.latitude}
            longitude={coords.longitude}
            accuracy={accuracy ?? undefined}
            places={places}
            height={300}
            onPlacePress={(place) => setSelectedPlace(place)}
          />
        </Card>

        <Card style={styles.coordsCard}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>MY COORDINATES</Text>
          <View style={styles.coordRow}>
            <Text style={[styles.coordLabel, { color: theme.textSecondary }]}>Latitude</Text>
            <Text style={[styles.coordValue, { color: theme.text }]}>{coords.latitude.toFixed(6)}</Text>
          </View>
          <View style={styles.coordRow}>
            <Text style={[styles.coordLabel, { color: theme.textSecondary }]}>Longitude</Text>
            <Text style={[styles.coordValue, { color: theme.text }]}>{coords.longitude.toFixed(6)}</Text>
          </View>
          <View style={styles.coordRow}>
            <Text style={[styles.coordLabel, { color: theme.textSecondary }]}>Accuracy</Text>
            <Text style={[styles.coordValue, { color: theme.text }]}>
              {accuracy != null ? `${accuracy} m` : '—'}
            </Text>
          </View>
        </Card>

        <Card style={styles.placesCard}>
          <View style={styles.placesHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>NEARBY POPULAR PLACES</Text>
            <Pressable
              onPress={() => refreshPlaces()}
              hitSlop={8}
              disabled={placesStatus === 'loading'}
              accessibilityRole="button"
              accessibilityLabel="Refresh nearby places"
            >
              <PngIcon name="sync" size={18} />
            </Pressable>
          </View>

          {placesStatus === 'loading' && (
            <ActivityIndicator color={theme.primary} style={styles.placesLoading} />
          )}

          {placesStatus === 'error' && (
            <View style={styles.placesEmpty}>
              <Text style={[styles.placesText, { color: theme.textSecondary }]}>
                Could not load nearby places.
              </Text>
              <Button
                title="Retry"
                variant="secondary"
                onPress={() => refreshPlaces()}
              />
            </View>
          )}

          {placesStatus === 'ready' && places.length === 0 && (
            <Text style={[styles.placesText, { color: theme.textSecondary }]}>
              No popular places found nearby.
            </Text>
          )}

          {placesStatus === 'ready' && places.length > 0 && (
            <View style={styles.placesList}>
              {places.map((place, index) => {
                const distance = distanceMeters(
                  coords.latitude,
                  coords.longitude,
                  place.latitude,
                  place.longitude,
                );
                const selected = selectedPlace?.name === place.name;
                return (
                  <Pressable
                    key={`${place.name}-${place.latitude}-${place.longitude}`}
                    onPress={() => setSelectedPlace(place)}
                    style={({ pressed }) => [
                      styles.placeRow,
                      index < places.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: 1 },
                      pressed && { backgroundColor: theme.surfaceElevated },
                    ]}
                  >
                    <View style={[styles.placeIcon, { backgroundColor: selected ? theme.primaryLight : theme.surfaceElevated }]}>
                      <PngIcon name="star" size={16} />
                    </View>
                    <View style={styles.placeInfo}>
                      <Text style={[styles.placeName, { color: theme.text }]} numberOfLines={1}>
                        {place.name}
                      </Text>
                      <Text style={[styles.placeCategory, { color: theme.textMuted }]} numberOfLines={1}>
                        {place.category}
                      </Text>
                    </View>
                    <Text style={[styles.placeDistance, { color: theme.textSecondary }]}>
                      {formatDistance(distance)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </Card>
      </>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <AppNavbar />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {renderBody()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
    paddingBottom: Spacing.twelve,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: { fontSize: FontSize.xxl, fontWeight: '700' },
  messageCard: {
    alignItems: 'center',
    paddingVertical: Spacing.eight,
    gap: Spacing.three,
  },
  messageTitle: { fontSize: FontSize.lg, fontWeight: '600' },
  messageText: { fontSize: FontSize.md, textAlign: 'center' },
  mapCard: { padding: Spacing.two },
  coordsCard: { gap: Spacing.two },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  coordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  coordLabel: { fontSize: FontSize.md },
  coordValue: { fontSize: FontSize.md, fontFamily: 'monospace', fontWeight: '600' },
  placesCard: { gap: Spacing.two },
  placesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  placesLoading: { paddingVertical: Spacing.four },
  placesEmpty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  placesText: { fontSize: FontSize.md },
  placesList: {},
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  placeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeInfo: { flex: 1, gap: 2 },
  placeName: { fontSize: FontSize.md, fontWeight: '500' },
  placeCategory: { fontSize: FontSize.xs },
  placeDistance: { fontSize: FontSize.sm, fontWeight: '600' },
});
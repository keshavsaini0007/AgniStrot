import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const emptySubscribe = () => () => {};

/**
 * To support static rendering, this value needs to be re-calculated on the
 * client side for web. Hydration is detected without a setState-in-effect
 * (linter-clean via useSyncExternalStore): the server/static snapshot is
 * "not hydrated" so the first paint is deterministic ('light'), and the
 * client snapshot is "hydrated" so subsequent renders use the real scheme.
 */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const colorScheme = useRNColorScheme();

  return hasHydrated ? colorScheme : 'light';
}
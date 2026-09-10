import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'agnistrot.apiUrl.v2';

export const getApiUrlOverride = async (): Promise<string | null> =>
  AsyncStorage.getItem(KEY);

export const setApiUrlOverride = async (url: string): Promise<void> => {
  await AsyncStorage.setItem(KEY, url);
};

export const clearApiUrlOverride = async (): Promise<void> => {
  await AsyncStorage.removeItem(KEY);
};
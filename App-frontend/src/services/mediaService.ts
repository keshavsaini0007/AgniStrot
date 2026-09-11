import { mediaApiRepository } from '@/repositories';
import type { MediaFile } from '@/repositories/api/mediaApiRepository';

export const mediaService = {
  upload: async (file: MediaFile): Promise<string> => {
    return await mediaApiRepository.upload(file);
  },
};
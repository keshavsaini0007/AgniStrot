import { apiClient } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import { handleApiError } from '@/api/errors';

export interface MediaFile {
  uri: string;
  name?: string;
  type?: string;
}

export interface UploadResult {
  url: string;
}

export const mediaApiRepository = {
  upload: async (file: MediaFile): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name ?? 'photo.jpg',
        type: file.type ?? 'image/jpeg',
      } as unknown as Blob);

      const res = await apiClient.post<UploadResult>(endpoints.media.upload, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.url;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
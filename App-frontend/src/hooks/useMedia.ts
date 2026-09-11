import { useMutation } from '@tanstack/react-query';
import type { MediaFile } from '@/repositories/api/mediaApiRepository';
import { mediaService } from '@/services/mediaService';

export const useMediaUpload = () => {
  return useMutation({
    mutationFn: (file: MediaFile) => mediaService.upload(file),
  });
};
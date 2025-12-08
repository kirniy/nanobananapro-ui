'use client';

import { useCallback, useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UploadedImage } from '@/lib/types';

interface ImageUploadProps {
  images: UploadedImage[];
  setImages: (images: UploadedImage[]) => void;
  maxImages?: number;
}

export function ImageUpload({ images, setImages, maxImages = 14 }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList) => {
      const newImages: UploadedImage[] = [];
      const remainingSlots = maxImages - images.length;

      for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        // Create preview URL
        const preview = URL.createObjectURL(file);

        // Convert to base64
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            // Remove data URL prefix to get just base64
            const base64Data = result.split(',')[1];
            resolve(base64Data);
          };
          reader.readAsDataURL(file);
        });

        newImages.push({
          id: `${Date.now()}-${i}`,
          file,
          preview,
          base64,
          mimeType: file.type,
        });
      }

      setImages([...images, ...newImages]);
    },
    [images, setImages, maxImages]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      const files: File[] = [];

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        const dataTransfer = new DataTransfer();
        files.forEach((f) => dataTransfer.items.add(f));
        handleFiles(dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const removeImage = useCallback(
    (id: string) => {
      const imageToRemove = images.find((img) => img.id === id);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      setImages(images.filter((img) => img.id !== id));
    },
    [images, setImages]
  );

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 p-2 border-t border-border">
      {images.map((image) => (
        <div key={image.id} className="relative group">
          <img
            src={image.preview}
            alt="Upload preview"
            className="h-16 w-16 object-cover rounded-md border border-border"
          />
          <button
            onClick={() => removeImage(image.id)}
            className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      {images.length < maxImages && (
        <button
          onClick={() => inputRef.current?.click()}
          className="h-16 w-16 rounded-md border border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
        >
          <ImagePlus className="h-5 w-5" />
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
    </div>
  );
}

interface ImageUploadButtonProps {
  onClick: () => void;
  disabled?: boolean;
  count: number;
  maxImages?: number;
}

export function ImageUploadButton({ onClick, disabled, count, maxImages = 14 }: ImageUploadButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled || count >= maxImages}
      className="shrink-0"
      title={`Add reference images (${count}/${maxImages})`}
    >
      <ImagePlus className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center">
          {count}
        </span>
      )}
    </Button>
  );
}

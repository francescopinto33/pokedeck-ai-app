export const MAX_CARD_PHOTO_COUNT = 3;
export const MAX_CARD_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

const supportedPhotoTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type CardPhotoFile = {
  name: string;
  size: number;
  type: string;
};

export function validateCardPhotoFiles(files: CardPhotoFile[]) {
  const errors: string[] = [];

  if (files.length === 0) {
    errors.push("Wähle mindestens ein Kartenfoto aus.");
  }

  if (files.length > MAX_CARD_PHOTO_COUNT) {
    errors.push(`Wähle höchstens ${MAX_CARD_PHOTO_COUNT} Kartenfotos gleichzeitig aus.`);
  }

  for (const file of files) {
    if (!supportedPhotoTypes.has(file.type)) {
      errors.push(`${file.name}: Bitte nutze JPG, PNG oder WebP.`);
      continue;
    }

    if (file.size > MAX_CARD_PHOTO_SIZE_BYTES) {
      errors.push(`${file.name}: Das Bild darf höchstens 5 MB groß sein.`);
    }
  }

  return errors;
}

export function isSupportedCardPhotoType(type: string) {
  return supportedPhotoTypes.has(type);
}

const AVATAR_SIZE = 256;

/**
 * Turns an uploaded photo into a small square JPEG data URL (centre crop, 256 px),
 * small enough to store with the profile instead of in a file bucket.
 */
export async function avatarDataUrl(file: File, size = AVATAR_SIZE): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Pick an image file.');
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('Could not read that image.');
  });
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process that image.');
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.85);
}

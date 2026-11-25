// Thu nhỏ và nén ảnh truyện sang WebP ngay trên trình duyệt trước khi tải lên Supabase.
// Ảnh chụp/vẽ thường 2–5 MB; sau khi nén còn khoảng 150–300 KB mà vẫn nét trên màn hình.
const MAX_SIDE = 1600;
const QUALITY = 0.82;

export async function compressStoryImage(file) {
  // GIF có thể là ảnh động: giữ nguyên để không mất chuyển động.
  if (!file || file.type === 'image/gif' || typeof createImageBitmap !== 'function') return file;
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', QUALITY));
    // Trình duyệt không hỗ trợ WebP sẽ trả PNG hoặc null; khi đó, hoặc khi ảnh không nhỏ đi, giữ file gốc.
    if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return file;
    const name = `${file.name.replace(/\.[^.]+$/, '') || 'story-image'}.webp`;
    return new File([blob], name, { type: 'image/webp' });
  } catch {
    return file;
  } finally {
    bitmap?.close?.();
  }
}

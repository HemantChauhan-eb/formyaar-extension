// Client-side photo/signature prep for the PAN application — crops to the
// exact NSDL-required pixel dimensions and compresses under the required
// file size. Runs entirely in the browser; nothing is uploaded anywhere.
//
// NSDL's own spec text (from the Personal Details page):
//   Photo:     JPEG, 200 DPI, 3.5 x 2.5 cm, max 50kb
//   Signature: JPEG, 200 DPI, 2 x 4.5 cm, max 50kb
// Interpreted as photo = 2.5cm wide x 3.5cm tall (portrait headshot, the
// standard Indian ID-photo size) and signature = 4.5cm wide x 2cm tall
// (landscape strip) — the site's text doesn't label which number is width
// vs height. Pixel values below are cm * 200dpi / 2.54.

export interface ImageSpec {
  kind: "photo" | "signature";
  label: string;
  /** NSDL's own spec text, shown verbatim so it matches what the site says */
  siteSpecText: string;
  widthPx: number;
  heightPx: number;
  maxBytes: number;
}

export const PHOTO_SPEC: ImageSpec = {
  kind: "photo",
  label: "Photo",
  siteSpecText: "3.5×2.5cm, ≤50KB",
  widthPx: 197, // 2.5cm @ 200dpi
  heightPx: 276, // 3.5cm @ 200dpi
  maxBytes: 50 * 1024,
};

export const SIGNATURE_SPEC: ImageSpec = {
  kind: "signature",
  label: "Signature",
  siteSpecText: "2×4.5cm, ≤50KB",
  widthPx: 354, // 4.5cm @ 200dpi
  heightPx: 157, // 2cm @ 200dpi
  maxBytes: 50 * 1024,
};

export interface ProcessedImage {
  blob: Blob;
  width: number;
  height: number;
  sizeBytes: number;
  /** true if we hit the quality floor and the file is still over maxBytes */
  overBudget: boolean;
}

function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("JPEG encode failed"))),
      "image/jpeg",
      quality,
    );
  });
}

// Steps quality down until the blob fits maxBytes, or gives up at a quality
// floor low enough that further reduction would look bad rather than help.
async function compressToTarget(
  canvas: HTMLCanvasElement,
  maxBytes: number,
): Promise<{ blob: Blob; overBudget: boolean }> {
  const QUALITY_FLOOR = 0.35;
  let quality = 0.92;
  let blob = await canvasToJpegBlob(canvas, quality);
  while (blob.size > maxBytes && quality > QUALITY_FLOOR) {
    quality -= 0.08;
    blob = await canvasToJpegBlob(canvas, quality);
  }
  return { blob, overBudget: blob.size > maxBytes };
}

// Center-crop-to-cover: scales the source image up/down so it fills the
// target box completely, then crops whatever overhangs — keeps the subject
// centered without distorting its aspect ratio.
export async function processImageToSpec(
  file: File,
  spec: ImageSpec,
): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = spec.widthPx;
    canvas.height = spec.heightPx;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");

    const scale = Math.max(
      spec.widthPx / bitmap.width,
      spec.heightPx / bitmap.height,
    );
    const drawW = bitmap.width * scale;
    const drawH = bitmap.height * scale;
    const offsetX = (spec.widthPx - drawW) / 2;
    const offsetY = (spec.heightPx - drawH) / 2;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, spec.widthPx, spec.heightPx);
    ctx.drawImage(bitmap, offsetX, offsetY, drawW, drawH);

    const { blob, overBudget } = await compressToTarget(canvas, spec.maxBytes);
    return {
      blob,
      width: spec.widthPx,
      height: spec.heightPx,
      sizeBytes: blob.size,
      overBudget,
    };
  } finally {
    bitmap.close();
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatKb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)}KB`;
}

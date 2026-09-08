export interface ReferenceCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Crop is expressed in original reference pixels; reject partial/out-of-bounds selections. */
export function validateReferenceCrop(
  crop: ReferenceCrop,
  width: number,
  height: number,
): ReferenceCrop {
  if (
    ![crop.x, crop.y, crop.width, crop.height, width, height].every(Number.isFinite) ||
    crop.x < 0 ||
    crop.y < 0 ||
    crop.width <= 0 ||
    crop.height <= 0 ||
    crop.x + crop.width > width ||
    crop.y + crop.height > height
  ) {
    throw new Error("切り抜き範囲は元画像の内側で、幅・高さを 0 より大きくしてください。");
  }
  return { ...crop };
}

/** Contain the selected reference region without changing its aspect ratio. */
export function fitReferenceCrop(
  crop: ReferenceCrop,
  width: number,
  height: number,
): ReferenceCrop {
  const scale = Math.min(width / crop.width, height / crop.height);
  return {
    x: (width - crop.width * scale) / 2,
    y: (height - crop.height * scale) / 2,
    width: crop.width * scale,
    height: crop.height * scale,
  };
}

export function normalizePreviewSettings(value: unknown): {
  zoom: number;
  fit: boolean;
  mode: string;
  opacity: number;
  crop: ReferenceCrop | null;
} {
  const defaults = { zoom: 100, fit: true, mode: "side", opacity: 0.5, crop: null };
  if (typeof value !== "object" || value === null) return defaults;
  const entry = value as Record<string, unknown>;
  const zoom =
    typeof entry.zoom === "number" && Number.isFinite(entry.zoom)
      ? Math.max(25, Math.min(400, entry.zoom))
      : 100;
  // Preserve an explicit zoom from settings saved before fit mode existed.
  const fit =
    typeof entry.fit === "boolean"
      ? entry.fit
      : !(typeof entry.zoom === "number" && Number.isFinite(entry.zoom));
  const opacity =
    typeof entry.opacity === "number" && Number.isFinite(entry.opacity)
      ? Math.max(0, Math.min(1, entry.opacity))
      : 0.5;
  const mode =
    typeof entry.mode === "string" && ["side", "overlay", "difference", "art"].includes(entry.mode)
      ? entry.mode
      : "side";
  let crop: ReferenceCrop | null = null;
  if (typeof entry.crop === "object" && entry.crop !== null) {
    const c = entry.crop as Record<string, unknown>;
    if (
      [c.x, c.y, c.width, c.height].every((v) => typeof v === "number" && Number.isFinite(v)) &&
      Number(c.x) >= 0 &&
      Number(c.y) >= 0 &&
      Number(c.width) > 0 &&
      Number(c.height) > 0
    ) {
      crop = { x: Number(c.x), y: Number(c.y), width: Number(c.width), height: Number(c.height) };
    }
  }
  return { zoom, fit, mode, opacity, crop };
}

export function previewCanvasLayout(
  width: number,
  height: number,
  zoom: number,
  fit: boolean,
  viewportWidth: number,
  viewportHeight: number,
  pixelRatio = 1,
): {
  zoom: number;
  cssWidth: number;
  cssHeight: number;
  rasterWidth: number;
  rasterHeight: number;
} {
  // Fit can be below the manual 25% minimum so even a narrow window shows the entire work.
  const effectiveZoom = fit
    ? Math.min(Math.max(1, viewportWidth) / width, Math.max(1, viewportHeight) / height, 4) * 100
    : zoom;
  const scale = Math.min(
    Math.max(1, (effectiveZoom / 100) * pixelRatio),
    4096 / width,
    4096 / height,
  );
  return {
    zoom: effectiveZoom,
    cssWidth: (width * effectiveZoom) / 100,
    cssHeight: (height * effectiveZoom) / 100,
    rasterWidth: Math.max(1, Math.round(width * scale)),
    rasterHeight: Math.max(1, Math.round(height * scale)),
  };
}

/** Only these five query keys are accepted by the local render API. */
export function detailRenderUrl(
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number,
): string {
  return (
    "/render.png?" +
    new URLSearchParams({
      x: String(x),
      y: String(y),
      width: String(width),
      height: String(height),
      scale: String(scale),
    }).toString()
  );
}

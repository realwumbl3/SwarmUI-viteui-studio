export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Mask extent (tight) and padding extent (crop region sent to model). UI displays padding. */
export interface CanvasBounds {
  mask: Bounds | null;
  padding: Bounds | null;
}

export type GenerationMode = 'txt2img' | 'img2img' | 'inpaint'

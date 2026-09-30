import { useWindowDimensions } from 'react-native';

// Every Guftagu screen is drawn on the "iPhone 17" frame in Figma (402 x 874).
// Screens are laid out with the Figma pixel values verbatim and scaled by the
// ratio between the real screen width and DESIGN_WIDTH, so the result is
// proportionally identical to the design on any device width.
export const DESIGN_WIDTH = 402;
export const DESIGN_HEIGHT = 874;

export type DesignScale = {
  /** Multiplier from Figma pixels to device points. */
  ratio: number;
  /** Converts a Figma pixel value to device points. */
  px: (value: number) => number;
};

export function useDesignScale(): DesignScale {
  const { width } = useWindowDimensions();
  const ratio = width / DESIGN_WIDTH;
  return { ratio, px: (value: number) => value * ratio };
}

// Adjust the threshold value to control the tilt effect
const threshold = 12;

export interface Tilt {
  x: number;
  y: number;
}

/**
 * Calculates the tilt values based on mouse event and element.
 * @param e MouseEvent
 * @returns Tilt object with x and y values
 */
export function calculateTilt(e: MouseEvent): Tilt {
  const target = e.currentTarget as HTMLElement;
  const { left, top, width, height } = target.getBoundingClientRect();
  const x = (e.clientX - left) / width - 0.5;
  const y = (e.clientY - top) / height - 0.5;
  return {
    x: y * -threshold,
    y: x * threshold,
  };
}

/**
 * Returns the default tilt (no tilt).
 * @returns Tilt object with x: 0, y: 0
 */
export function getDefaultTilt(): Tilt {
  return { x: 0, y: 0 };
}
// Theme system that follows the daylight cycle
// Always keeps white text for legibility
// Uses dark gradient backgrounds with subtle color undertones
// Night (8pm-6am): pure black (no change)
// Day periods: dark backgrounds with subtle warm/cool color hints

interface ThemeColors {
  gradientTop: string;
  gradientBottom: string;
  foreground: string;
  borderColor: string;
}

// All backgrounds stay dark (low lightness) so white text is always readable
// We just tint the darkness with subtle color undertones
interface ColorStop {
  h: number; // hue
  s: number; // saturation (keep low for subtlety)
  l: number; // lightness (keep low for readability)
}

function col(h: number, s: number, l: number): ColorStop {
  return { h, s, l };
}

function colToString(c: ColorStop): string {
  return `hsl(${Math.round(c.h)}, ${Math.round(c.s)}%, ${Math.round(c.l)}%)`;
}

function lerpColor(a: ColorStop, b: ColorStop, t: number): ColorStop {
  let dh = b.h - a.h;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;

  return {
    h: (a.h + dh * t + 360) % 360,
    s: a.s + (b.s - a.s) * t,
    l: a.l + (b.l - a.l) * t,
  };
}

interface ThemeKeyframe {
  hour: number;
  top: ColorStop;    // gradient top color
  bottom: ColorStop; // gradient bottom color
}

// All backgrounds are dark (lightness 0-12%) with subtle saturation
const KEYFRAMES: ThemeKeyframe[] = [
  // Night - pure black
  { hour: 0,    top: col(0, 0, 0),     bottom: col(0, 0, 0) },
  // Still pure black
  { hour: 5.5,  top: col(0, 0, 0),     bottom: col(0, 0, 0) },
  // Early dawn - very subtle deep blue/indigo at bottom
  { hour: 6,    top: col(230, 15, 2),  bottom: col(250, 25, 8) },
  // Dawn - subtle warm undertone rising from bottom
  { hour: 7,    top: col(230, 20, 4),  bottom: col(25, 35, 12) },
  // Morning - subtle warm blue
  { hour: 8,    top: col(210, 25, 6),  bottom: col(200, 30, 12) },
  // Late morning - lighter blue tint
  { hour: 10,   top: col(210, 30, 7),  bottom: col(205, 35, 14) },
  // Midday - subtle sky blue, brightest point of the day
  { hour: 12,   top: col(210, 35, 8),  bottom: col(200, 40, 15) },
  // Early afternoon - still bright
  { hour: 14,   top: col(210, 30, 7),  bottom: col(200, 35, 14) },
  // Afternoon - warming up, golden undertones
  { hour: 16,   top: col(200, 20, 5),  bottom: col(35, 35, 12) },
  // Evening - sunset warmth, orange/amber at bottom
  { hour: 17.5, top: col(250, 20, 5),  bottom: col(15, 40, 12) },
  // Late evening - deep purple/magenta undertones
  { hour: 19,   top: col(270, 25, 5),  bottom: col(280, 30, 10) },
  // Transition back to black
  { hour: 20,   top: col(0, 0, 0),     bottom: col(0, 0, 0) },
  // Night
  { hour: 24,   top: col(0, 0, 0),     bottom: col(0, 0, 0) },
];

function getThemeForTime(hour: number, minute: number): ThemeColors {
  const time = hour + minute / 60;

  let lower = KEYFRAMES[0];
  let upper = KEYFRAMES[KEYFRAMES.length - 1];

  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    if (time >= KEYFRAMES[i].hour && time < KEYFRAMES[i + 1].hour) {
      lower = KEYFRAMES[i];
      upper = KEYFRAMES[i + 1];
      break;
    }
  }

  const range = upper.hour - lower.hour;
  const t = range === 0 ? 0 : (time - lower.hour) / range;

  const top = lerpColor(lower.top, upper.top, t);
  const bottom = lerpColor(lower.bottom, upper.bottom, t);

  return {
    gradientTop: colToString(top),
    gradientBottom: colToString(bottom),
    foreground: 'white',
    borderColor: 'rgba(255, 255, 255, 0.6)',
  };
}

function applyThemeColors(theme: ThemeColors): void {
  const root = document.documentElement;
  root.style.setProperty('--foreground', theme.foreground);
  root.style.setProperty('--background', `linear-gradient(to bottom, ${theme.gradientTop}, ${theme.gradientBottom})`);
  root.style.setProperty('--border-color', theme.borderColor);
}

export function applyTheme(): void {
  const now = new Date();
  const theme = getThemeForTime(now.getHours(), now.getMinutes());
  applyThemeColors(theme);
}

/** Apply theme for a specific hour (0-24, supports decimals e.g. 7.5 = 7:30am) */
export function previewThemeAtHour(hour: number): void {
  // Stop the auto-updater so it doesn't override preview
  if (themeInterval) {
    clearInterval(themeInterval);
    themeInterval = null;
  }
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const theme = getThemeForTime(h, m);
  applyThemeColors(theme);
}

let themeInterval: ReturnType<typeof setInterval> | null = null;

// Expose preview function globally immediately so preview.html can use it
(window as any).previewThemeAtHour = previewThemeAtHour;
(window as any).resumeTheme = () => {
  applyTheme();
  if (!themeInterval) {
    themeInterval = setInterval(applyTheme, 60000);
  }
};

export function startThemeUpdater(): void {
  applyTheme();
  themeInterval = setInterval(applyTheme, 60000);
}

// Theme system that follows the daylight cycle
// Night (8pm-6am): black/white
// Dawn (6am-8am): deep indigo → warm peach
// Morning (8am-11am): light warm sky
// Midday (11am-2pm): bright sky blue
// Afternoon (2pm-5pm): warm golden sky
// Evening (5pm-8pm): sunset orange → deep purple

interface ThemeColors {
  background: string;
  foreground: string;
  borderColor: string;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

function hsl(h: number, s: number, l: number): HSL {
  return { h, s, l };
}

function hslToString(c: HSL): string {
  return `hsl(${Math.round(c.h)}, ${Math.round(c.s)}%, ${Math.round(c.l)}%)`;
}

function lerpHSL(a: HSL, b: HSL, t: number): HSL {
  // Handle hue wrapping (take shortest path around the circle)
  let dh = b.h - a.h;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;

  return {
    h: (a.h + dh * t + 360) % 360,
    s: a.s + (b.s - a.s) * t,
    l: a.l + (b.l - a.l) * t,
  };
}

// Define keyframes: [hour, background HSL, foreground HSL, border HSL]
interface ThemeKeyframe {
  hour: number;
  bg: HSL;
  fg: HSL;
  border: HSL;
}

const KEYFRAMES: ThemeKeyframe[] = [
  // Night (solid black)
  { hour: 0,  bg: hsl(0, 0, 0),     fg: hsl(0, 0, 100),   border: hsl(0, 0, 100) },
  // Still night at 5:59
  { hour: 5.5,bg: hsl(0, 0, 0),     fg: hsl(0, 0, 100),   border: hsl(0, 0, 100) },
  // Dawn begins - deep indigo/blue
  { hour: 6,  bg: hsl(240, 40, 15), fg: hsl(40, 80, 90),   border: hsl(40, 60, 80) },
  // Dawn mid - warming up, peach sky
  { hour: 7,  bg: hsl(25, 60, 40),  fg: hsl(0, 0, 95),     border: hsl(0, 0, 85) },
  // Morning - light warm sky
  { hour: 8,  bg: hsl(200, 55, 60), fg: hsl(220, 50, 12),  border: hsl(220, 40, 30) },
  // Late morning - brighter
  { hour: 10, bg: hsl(205, 65, 70), fg: hsl(220, 50, 12),  border: hsl(220, 40, 30) },
  // Midday - bright sky blue
  { hour: 12, bg: hsl(210, 70, 75), fg: hsl(220, 50, 12),  border: hsl(220, 40, 25) },
  // Early afternoon
  { hour: 14, bg: hsl(205, 60, 70), fg: hsl(220, 50, 12),  border: hsl(220, 40, 30) },
  // Afternoon - warm golden
  { hour: 16, bg: hsl(35, 65, 60),  fg: hsl(30, 60, 10),   border: hsl(30, 50, 25) },
  // Evening - sunset orange
  { hour: 17.5, bg: hsl(20, 70, 45), fg: hsl(0, 0, 95),    border: hsl(0, 0, 80) },
  // Late evening - deep purple/red
  { hour: 19, bg: hsl(280, 40, 20), fg: hsl(0, 0, 95),     border: hsl(0, 0, 75) },
  // Transition to night
  { hour: 20, bg: hsl(0, 0, 0),     fg: hsl(0, 0, 100),    border: hsl(0, 0, 100) },
  // Night
  { hour: 24, bg: hsl(0, 0, 0),     fg: hsl(0, 0, 100),    border: hsl(0, 0, 100) },
];

function getThemeForTime(hour: number, minute: number): ThemeColors {
  const time = hour + minute / 60;

  // Find the two keyframes to interpolate between
  let lower = KEYFRAMES[0];
  let upper = KEYFRAMES[KEYFRAMES.length - 1];

  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    if (time >= KEYFRAMES[i].hour && time < KEYFRAMES[i + 1].hour) {
      lower = KEYFRAMES[i];
      upper = KEYFRAMES[i + 1];
      break;
    }
  }

  // Calculate interpolation factor
  const range = upper.hour - lower.hour;
  const t = range === 0 ? 0 : (time - lower.hour) / range;

  const bg = lerpHSL(lower.bg, upper.bg, t);
  const fg = lerpHSL(lower.fg, upper.fg, t);
  const border = lerpHSL(lower.border, upper.border, t);

  return {
    background: hslToString(bg),
    foreground: hslToString(fg),
    borderColor: hslToString(border),
  };
}

export function applyTheme(): void {
  const now = new Date();
  const theme = getThemeForTime(now.getHours(), now.getMinutes());
  const root = document.documentElement;

  root.style.setProperty('--foreground', theme.foreground);
  root.style.setProperty('--background', theme.background);
  root.style.setProperty('--border-color', theme.borderColor);
}

export function startThemeUpdater(): void {
  // Apply immediately
  applyTheme();
  // Update every 60 seconds
  setInterval(applyTheme, 60000);
}

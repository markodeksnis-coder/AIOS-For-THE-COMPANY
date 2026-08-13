// Personal display preferences — theme, font size, accent color, and
// sidebar department order. Client-only (localStorage): there's no auth
// yet (see brain/README.md), so these aren't per-account, just per-browser.

export type Theme = "light" | "dark" | "system";
export type FontSize = "sm" | "md" | "lg";

export const FONT_SIZE_PX: Record<FontSize, number> = { sm: 14, md: 16, lg: 18 };
export const FONT_SIZE_LABELS: Record<FontSize, string> = {
  sm: "Small",
  md: "Medium",
  lg: "Large",
};

type AccentTokens = { accent: string; accentStrong: string; accentWash: string };

export const ACCENT_PRESETS: {
  id: string;
  label: string;
  swatch: string;
  light: AccentTokens;
  dark: AccentTokens;
}[] = [
  {
    id: "indigo",
    label: "Indigo",
    swatch: "#4A55C4",
    light: { accent: "#4A55C4", accentStrong: "#383F9E", accentWash: "#EEEFFA" },
    dark: { accent: "#8890EE", accentStrong: "#A2A9F3", accentWash: "#21243A" },
  },
  {
    id: "blue",
    label: "Blue",
    swatch: "#3568D4",
    light: { accent: "#3568D4", accentStrong: "#2850AD", accentWash: "#EAF0FC" },
    dark: { accent: "#7FA6F2", accentStrong: "#9DBBF5", accentWash: "#1B2740" },
  },
  {
    id: "teal",
    label: "Teal",
    swatch: "#1F8A82",
    light: { accent: "#1F8A82", accentStrong: "#166F68", accentWash: "#E5F5F3" },
    dark: { accent: "#5FCFC4", accentStrong: "#83DAD1", accentWash: "#173330" },
  },
  {
    id: "violet",
    label: "Violet",
    swatch: "#6E4FC9",
    light: { accent: "#6E4FC9", accentStrong: "#573CA6", accentWash: "#F1ECFB" },
    dark: { accent: "#AE97F0", accentStrong: "#C3B0F5", accentWash: "#251C3D" },
  },
  {
    id: "slate",
    label: "Slate",
    swatch: "#4A5568",
    light: { accent: "#4A5568", accentStrong: "#38414F", accentWash: "#EBEDF0" },
    dark: { accent: "#A2ACBB", accentStrong: "#BCC4D0", accentWash: "#242830" },
  },
];

export interface Settings {
  theme: Theme;
  fontSize: FontSize;
  accent: string; // ACCENT_PRESETS id
  departmentOrder: string[] | null; // department slugs, in display order; null = default
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  fontSize: "md",
  accent: "indigo",
  departmentOrder: null,
};

const STORAGE_KEY = "company-os-settings";
export const SETTINGS_CHANGED_EVENT = "company-os-settings-changed";

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  applySettings(settings);
  window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT, { detail: settings }));
}

/** Pushes theme/font/accent onto <html> as attributes + inline CSS vars. Safe to call repeatedly. */
export function applySettings(settings: Settings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (settings.theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", settings.theme);
  }

  root.style.fontSize = `${FONT_SIZE_PX[settings.fontSize]}px`;

  const preset = ACCENT_PRESETS.find((p) => p.id === settings.accent) ?? ACCENT_PRESETS[0];
  const prefersDark =
    settings.theme === "dark" ||
    (settings.theme === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  const tokens = prefersDark ? preset.dark : preset.light;
  root.style.setProperty("--accent", tokens.accent);
  root.style.setProperty("--accent-strong", tokens.accentStrong);
  root.style.setProperty("--accent-wash", tokens.accentWash);
}

/** The exact same logic as applySettings, as a string, for a pre-hydration <script> tag (avoids theme flash). */
export const THEME_SCRIPT = `
(function () {
  try {
    var raw = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
    var s = raw ? JSON.parse(raw) : {};
    var theme = s.theme || "system";
    var fontSize = s.fontSize || "md";
    var accent = s.accent || "indigo";
    var fontPx = { sm: 14, md: 16, lg: 18 }[fontSize] || 16;
    var root = document.documentElement;
    if (theme !== "system") root.setAttribute("data-theme", theme);
    root.style.fontSize = fontPx + "px";
    var presets = ${JSON.stringify(
      Object.fromEntries(ACCENT_PRESETS.map((p) => [p.id, { light: p.light, dark: p.dark }]))
    )};
    var preset = presets[accent] || presets.indigo;
    var prefersDark = theme === "dark" || (theme === "system" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    var tokens = prefersDark ? preset.dark : preset.light;
    root.style.setProperty("--accent", tokens.accent);
    root.style.setProperty("--accent-strong", tokens.accentStrong);
    root.style.setProperty("--accent-wash", tokens.accentWash);
  } catch (e) {}
})();
`;

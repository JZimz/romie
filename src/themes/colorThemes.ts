export interface PrimaryPalette {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

export interface SurfacePalette {
  0: string;
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

export interface ThemeColors {
  primary: PrimaryPalette;
  surface: SurfacePalette;
}

export interface ColorTheme {
  id: string;
  label: string;
  description: string;
  /** The mode this theme is designed for (used for UI hints) */
  preferredMode: 'dark' | 'light';
  dark: ThemeColors;
  light: ThemeColors;
}

export const DEFAULT_THEME_ID = 'default';

function cssVarsFromColors(colors: ThemeColors): string {
  const { primary: p, surface: s } = colors;
  return [
    `--p-primary-50: ${p[50]};`,
    `--p-primary-100: ${p[100]};`,
    `--p-primary-200: ${p[200]};`,
    `--p-primary-300: ${p[300]};`,
    `--p-primary-400: ${p[400]};`,
    `--p-primary-500: ${p[500]};`,
    `--p-primary-600: ${p[600]};`,
    `--p-primary-700: ${p[700]};`,
    `--p-primary-800: ${p[800]};`,
    `--p-primary-900: ${p[900]};`,
    `--p-primary-950: ${p[950]};`,
    `--p-surface-0: ${s[0]};`,
    `--p-surface-50: ${s[50]};`,
    `--p-surface-100: ${s[100]};`,
    `--p-surface-200: ${s[200]};`,
    `--p-surface-300: ${s[300]};`,
    `--p-surface-400: ${s[400]};`,
    `--p-surface-500: ${s[500]};`,
    `--p-surface-600: ${s[600]};`,
    `--p-surface-700: ${s[700]};`,
    `--p-surface-800: ${s[800]};`,
    `--p-surface-900: ${s[900]};`,
    `--p-surface-950: ${s[950]};`,
  ].join('\n    ');
}

const STYLE_ELEMENT_ID = 'romie-color-theme';

export function applyColorThemes(lightThemeId: string, darkThemeId: string): void {
  const isDefaultLight = !lightThemeId || lightThemeId === DEFAULT_THEME_ID;
  const isDefaultDark = !darkThemeId || darkThemeId === DEFAULT_THEME_ID;

  if (isDefaultLight && isDefaultDark) {
    document.getElementById(STYLE_ELEMENT_ID)?.remove();
    return;
  }

  let el = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ELEMENT_ID;
    document.head.appendChild(el);
  }

  const parts: string[] = [];

  if (!isDefaultLight) {
    const theme = colorThemes.find((t) => t.id === lightThemeId);
    if (theme) {
      parts.push(`@media (prefers-color-scheme: light) {\n  :root {\n    ${cssVarsFromColors(theme.light)}\n  }\n}`);
    }
  }

  if (!isDefaultDark) {
    const theme = colorThemes.find((t) => t.id === darkThemeId);
    if (theme) {
      parts.push(`@media (prefers-color-scheme: dark) {\n  :root {\n    ${cssVarsFromColors(theme.dark)}\n  }\n}`);
    }
  }

  el.textContent = parts.join('\n\n');
}

export function getThemeById(id: string): ColorTheme | undefined {
  return colorThemes.find((t) => t.id === id);
}

// ─── Blue primary shared by One Dark Pro (same hue in light and dark) ───────
const oneDarkPrimary: PrimaryPalette = {
  50: '#eef6fd',
  100: '#d3e9f8',
  200: '#a7d3f2',
  300: '#7bbdec',
  400: '#61afef',
  500: '#3d96d8',
  600: '#2a7dba',
  700: '#1e639a',
  800: '#154c78',
  900: '#0d3758',
  950: '#07243b',
};

// ─── Neutral light surfaces (reused by dark-only themes for light mode) ──────
const neutralLightSurface: SurfacePalette = {
  0: '#ffffff',
  50: '#f8f9fa',
  100: '#f1f3f5',
  200: '#e9ecef',
  300: '#dee2e6',
  400: '#ced4da',
  500: '#adb5bd',
  600: '#6c757d',
  700: '#495057',
  800: '#343a40',
  900: '#212529',
  950: '#0d1117',
};

export const colorThemes: ColorTheme[] = [
  // ── 1. One Dark Pro ─────────────────────────────────────────────────────────
  {
    id: 'one-dark-pro',
    label: 'One Dark Pro',
    description: "Atom's iconic dark theme",
    preferredMode: 'dark',
    dark: {
      primary: oneDarkPrimary,
      surface: {
        0: '#21252b',
        50: '#282c34',
        100: '#2d3139',
        200: '#353a43',
        300: '#3d4451',
        400: '#4a5263',
        500: '#636d83',
        600: '#828da1',
        700: '#9faab9',
        800: '#bdc6d3',
        900: '#d8e0e8',
        950: '#f0f3f7',
      },
    },
    light: {
      primary: oneDarkPrimary,
      surface: neutralLightSurface,
    },
  },

  // ── 2. Dracula ──────────────────────────────────────────────────────────────
  {
    id: 'dracula',
    label: 'Dracula',
    description: 'Dark theme with vibrant purple accents',
    preferredMode: 'dark',
    dark: {
      primary: {
        50: '#f8f0ff',
        100: '#eeddff',
        200: '#d6b6ff',
        300: '#c49eff',
        400: '#bd93f9',
        500: '#a87be8',
        600: '#9062d3',
        700: '#7649bd',
        800: '#5c32a3',
        900: '#461f87',
        950: '#2c1069',
      },
      surface: {
        0: '#1e1f29',
        50: '#282a36',
        100: '#2f3047',
        200: '#373959',
        300: '#44475a',
        400: '#4f5372',
        500: '#6272a4',
        600: '#7d8bb7',
        700: '#9ba4c9',
        800: '#bec4d8',
        900: '#dde1ee',
        950: '#f2f3f8',
      },
    },
    light: {
      primary: {
        50: '#f8f0ff',
        100: '#eeddff',
        200: '#d6b6ff',
        300: '#c49eff',
        400: '#bd93f9',
        500: '#a87be8',
        600: '#9062d3',
        700: '#7649bd',
        800: '#5c32a3',
        900: '#461f87',
        950: '#2c1069',
      },
      surface: neutralLightSurface,
    },
  },

  // ── 3. GitHub ───────────────────────────────────────────────────────────────
  {
    id: 'github',
    label: 'GitHub',
    description: "GitHub's official light & dark theme",
    preferredMode: 'light',
    dark: {
      primary: {
        50: '#ddf4ff',
        100: '#b6e3ff',
        200: '#80ccff',
        300: '#54aeff',
        400: '#58a6ff',
        500: '#388bfd',
        600: '#1f6feb',
        700: '#1158c7',
        800: '#0d419d',
        900: '#0c2d6b',
        950: '#051d4d',
      },
      surface: {
        0: '#0d1117',
        50: '#161b22',
        100: '#21262d',
        200: '#2d333b',
        300: '#373e47',
        400: '#444c56',
        500: '#545d68',
        600: '#768390',
        700: '#909dab',
        800: '#adbac7',
        900: '#cdd9e5',
        950: '#e6edf3',
      },
    },
    light: {
      primary: {
        50: '#ddf4ff',
        100: '#b6e3ff',
        200: '#80ccff',
        300: '#54aeff',
        400: '#218bff',
        500: '#0969da',
        600: '#0550ae',
        700: '#033d8b',
        800: '#0a3069',
        900: '#002155',
        950: '#001a48',
      },
      surface: {
        0: '#ffffff',
        50: '#f6f8fa',
        100: '#f0f3f7',
        200: '#eaeef2',
        300: '#d0d7de',
        400: '#afb8c1',
        500: '#8c959f',
        600: '#6e7781',
        700: '#57606a',
        800: '#424a53',
        900: '#32383f',
        950: '#24292f',
      },
    },
  },

  // ── 4. Nord ─────────────────────────────────────────────────────────────────
  {
    id: 'nord',
    label: 'Nord',
    description: 'Arctic, north-bluish clean aesthetic',
    preferredMode: 'dark',
    dark: {
      primary: {
        50: '#ecf2f8',
        100: '#d1e0ef',
        200: '#a3c2df',
        300: '#79a5cf',
        400: '#5e81ac',
        500: '#4d6d96',
        600: '#3b5a80',
        700: '#2c486a',
        800: '#1f3756',
        900: '#152843',
        950: '#0c1a2e',
      },
      surface: {
        0: '#2e3440',
        50: '#3b4252',
        100: '#434c5e',
        200: '#4c566a',
        300: '#5c6476',
        400: '#6d7488',
        500: '#7e869c',
        600: '#9199ae',
        700: '#a9b0c2',
        800: '#c7ccda',
        900: '#dde2ec',
        950: '#eef0f5',
      },
    },
    light: {
      primary: {
        50: '#ecf2f8',
        100: '#d1e0ef',
        200: '#a3c2df',
        300: '#79a5cf',
        400: '#5e81ac',
        500: '#4d6d96',
        600: '#3b5a80',
        700: '#2c486a',
        800: '#1f3756',
        900: '#152843',
        950: '#0c1a2e',
      },
      surface: {
        0: '#eceff4',
        50: '#e5e9f0',
        100: '#d8dee9',
        200: '#c9cfde',
        300: '#b5bcd2',
        400: '#9ba5bc',
        500: '#7d8ea8',
        600: '#607694',
        700: '#4a5f80',
        800: '#384a6c',
        900: '#2a3856',
        950: '#1e293f',
      },
    },
  },

  // ── 5. Monokai Pro ──────────────────────────────────────────────────────────
  {
    id: 'monokai-pro',
    label: 'Monokai Pro',
    description: 'Warm dark theme with vibrant accents',
    preferredMode: 'dark',
    dark: {
      primary: {
        50: '#fff4ef',
        100: '#ffe1ce',
        200: '#ffc49e',
        300: '#ffa66d',
        400: '#fc9867',
        500: '#f07f4e',
        600: '#da6437',
        700: '#be4a22',
        800: '#9f3413',
        900: '#7f2009',
        950: '#5c0f03',
      },
      surface: {
        0: '#221f22',
        50: '#2d2a2e',
        100: '#353235',
        200: '#3e3b3f',
        300: '#49464a',
        400: '#59555a',
        500: '#6e6a6f',
        600: '#8d898e',
        700: '#aba7ac',
        800: '#c7c4c8',
        900: '#e0dee1',
        950: '#f5f4f6',
      },
    },
    light: {
      primary: {
        50: '#fff4ef',
        100: '#ffe1ce',
        200: '#ffc49e',
        300: '#ffa66d',
        400: '#fc9867',
        500: '#f07f4e',
        600: '#da6437',
        700: '#be4a22',
        800: '#9f3413',
        900: '#7f2009',
        950: '#5c0f03',
      },
      surface: {
        0: '#fafafa',
        50: '#f4f4f4',
        100: '#ebebeb',
        200: '#dcdcdc',
        300: '#c8c8c8',
        400: '#b0b0b0',
        500: '#929292',
        600: '#747474',
        700: '#595959',
        800: '#3f3f3f',
        900: '#2a2a2a',
        950: '#1a1a1a',
      },
    },
  },

  // ── 6. Catppuccin Mocha ─────────────────────────────────────────────────────
  {
    id: 'catppuccin-mocha',
    label: 'Catppuccin Mocha',
    description: 'Soothing pastel dark theme',
    preferredMode: 'dark',
    dark: {
      primary: {
        50: '#f9f5ff',
        100: '#f0e4fe',
        200: '#e2ccfd',
        300: '#d4b3fb',
        400: '#cba6f7',
        500: '#b88de3',
        600: '#a375cc',
        700: '#8a5cb5',
        800: '#70439a',
        900: '#562e7f',
        950: '#3c1962',
      },
      surface: {
        0: '#1e1e2e',
        50: '#181825',
        100: '#313244',
        200: '#45475a',
        300: '#585b70',
        400: '#6c7086',
        500: '#7f849c',
        600: '#9399b2',
        700: '#a6adc8',
        800: '#bac2de',
        900: '#cdd6f4',
        950: '#e6ecff',
      },
    },
    light: {
      // Catppuccin Latte — the official light variant
      primary: {
        50: '#f5ecff',
        100: '#e9d3fe',
        200: '#d4a8fd',
        300: '#be7dfc',
        400: '#a855f7',
        500: '#8839ef',
        600: '#7c3aed',
        700: '#6d28d9',
        800: '#5b21b6',
        900: '#4c1d95',
        950: '#3b0764',
      },
      surface: {
        0: '#eff1f5',
        50: '#e6e9ef',
        100: '#dce0e8',
        200: '#ccd0da',
        300: '#bcc0cc',
        400: '#acb0be',
        500: '#9ca0b0',
        600: '#8c8fa1',
        700: '#7c7f93',
        800: '#6c6f85',
        900: '#5c5f77',
        950: '#4c4f69',
      },
    },
  },
];

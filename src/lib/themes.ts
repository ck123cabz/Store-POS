export interface ColorTheme {
  id: string
  name: string
  description: string
  /** Representative colors for the picker UI [primary, accent, background] */
  preview: {
    light: [string, string, string]
    dark: [string, string, string]
  }
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: "default",
    name: "Slate",
    description: "Cool blue-gray, minimal and clean",
    preview: {
      light: ["oklch(0.205 0.015 265)", "oklch(0.965 0.003 265)", "oklch(0.985 0.002 265)"],
      dark: ["oklch(0.93 0.005 265)", "oklch(0.21 0.01 265)", "oklch(0.13 0.01 265)"],
    },
  },
  {
    id: "kodama-grove",
    name: "Kodama Grove",
    description: "Earthy greens and warm browns",
    preview: {
      light: ["oklch(0.6657 0.105 118.91)", "oklch(0.836 0.071 90.33)", "oklch(0.880 0.053 91.79)"],
      dark: ["oklch(0.676 0.057 132.45)", "oklch(0.654 0.072 90.76)", "oklch(0.330 0.021 88.07)"],
    },
  },
  {
    id: "cosmic-night",
    name: "Cosmic Night",
    description: "Deep indigo and vivid purple",
    preview: {
      light: ["oklch(0.542 0.179 288.03)", "oklch(0.922 0.037 262.14)", "oklch(0.973 0.013 286.15)"],
      dark: ["oklch(0.716 0.160 290.40)", "oklch(0.335 0.083 280.97)", "oklch(0.174 0.023 283.80)"],
    },
  },
  {
    id: "midnight-bloom",
    name: "Midnight Bloom",
    description: "Violet and teal with soft contrast",
    preview: {
      light: ["oklch(0.568 0.202 283.08)", "oklch(0.648 0.064 117.43)", "oklch(0.982 0 0)"],
      dark: ["oklch(0.568 0.202 283.08)", "oklch(0.675 0.141 261.34)", "oklch(0.230 0.013 264.29)"],
    },
  },
]

export const DEFAULT_COLOR_THEME = "default"

export function getThemeById(id: string): ColorTheme | undefined {
  return COLOR_THEMES.find((t) => t.id === id)
}

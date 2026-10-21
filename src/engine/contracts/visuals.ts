export interface VisualTheme {
  readonly background: string;
  readonly grid: string;
  readonly text: string;
  readonly muted: string;
  readonly accent: string;
  readonly accentMuted: string;
  readonly secondary: string;
  readonly categorical: readonly string[];
  readonly effects: Readonly<{
    recovery: string;
    recoveryStrong: string;
    flash: string;
    highlight: string;
    ghostOpacity: number;
    highlightOpacity: number;
  }>;
}

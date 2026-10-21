import { useEffect, useRef } from "react";
import type {
  SettingPreview,
  SettingsValues as GameSettingsValues,
} from "@/engine/contracts/settings";
import type { VisualTheme } from "@/engine/contracts/visuals";

interface SettingPreviewProps {
  spec: SettingPreview;
  values: GameSettingsValues;
  visuals: VisualTheme;
  reducedMotion: boolean;
  label: string;
}

export function SettingPreviewCanvas({
  spec,
  values,
  visuals,
  reducedMotion,
  label,
}: SettingPreviewProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx) {
      ctx.fillStyle = visuals.background;
      ctx.fillRect(0, 0, spec.width, spec.height);
      spec.draw(
        ctx,
        values,
        { width: spec.width, height: spec.height },
        { time: 0, mode: "auto", paused: true, visuals, reducedMotion },
      );
    }
  }, [spec, values, visuals, reducedMotion]);
  return (
    <canvas
      ref={canvas}
      className="settings-option-preview"
      width={spec.width}
      height={spec.height}
      role="img"
      aria-label={label}
    />
  );
}

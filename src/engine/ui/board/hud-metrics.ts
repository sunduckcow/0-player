import type { Metric } from "@/engine/contracts/game";
import { element, text } from "@/engine/ui/lib/dom";

export function createMetricsRenderer() {
  let metricsKey = "";
  return (allMetrics: Metric[]) => {
    const metrics = allMetrics.slice(0, 2);
    text(
      "compact-metrics",
      metrics.map((metric) => `${metric.label} ${metric.value}`).join(" · "),
    );
    const nextMetrics = JSON.stringify(metrics);
    if (nextMetrics !== metricsKey) {
      metricsKey = nextMetrics;
      element("metrics").replaceChildren(
        ...metrics.map((metric) => {
          const block = document.createElement("div");
          block.className = "metric";
          const label = document.createElement("span");
          label.textContent = metric.label;
          const value = document.createElement("strong");
          value.textContent = String(metric.value);
          block.append(label, value);
          return block;
        }),
      );
    }
  };
}

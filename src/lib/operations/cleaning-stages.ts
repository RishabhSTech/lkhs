export const CLEANING_STAGES = ["CHECKOUT", "CLEANING_REQUIRED", "CLEANING", "INSPECTION", "READY"] as const;
export type CleaningStage = (typeof CLEANING_STAGES)[number];

export const STAGE_LABEL: Record<CleaningStage, string> = {
  CHECKOUT: "Guest still there",
  CLEANING_REQUIRED: "To clean",
  CLEANING: "Cleaning",
  INSPECTION: "Needs a check",
  READY: "Ready for guests",
};

/** The one-tap action that moves a task to its next stage. */
export const NEXT_ACTION: Partial<Record<CleaningStage, { label: string; to: CleaningStage }>> = {
  CHECKOUT: { label: "Guest has left", to: "CLEANING_REQUIRED" },
  CLEANING_REQUIRED: { label: "Start cleaning", to: "CLEANING" },
  CLEANING: { label: "I've finished cleaning", to: "INSPECTION" },
  INSPECTION: { label: "All good - ready for guests", to: "READY" },
};

export function stageBadgeClass(stage: CleaningStage) {
  switch (stage) {
    case "READY":
      return "border-chart-1/25 bg-chart-1/10 text-chart-1";
    case "CLEANING":
      return "border-chart-3/25 bg-chart-3/10 text-chart-3";
    case "INSPECTION":
      return "border-chart-2/25 bg-chart-2/10 text-chart-2";
    case "CLEANING_REQUIRED":
      return "border-chart-4/25 bg-chart-4/10 text-chart-4";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

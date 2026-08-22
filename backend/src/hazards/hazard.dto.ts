import { Hazard } from './hazard.entity';
import { Report } from '../reports/report.entity';

/**
 * The wire shape the app expects. Deliberately mirrors `src/data/types.ts` in
 * the frontend so screens can consume it without a translation layer.
 */
export function toReportDto(report: Report) {
  return {
    id: report.id,
    hazardId: report.hazardId,
    photo: `/uploads/${report.photo}`,
    reportedAt: report.createdAt.toISOString(),
    reporterName: report.reporterName,
    intent: report.intent,
    ai: {
      kind: report.aiKind,
      dangerLevel: report.aiDangerLevel,
      confidence: report.aiConfidence,
      caption: report.aiCaption,
      source: report.aiSource,
    },
  };
}

export function toHazardDto(hazard: Hazard) {
  const reports = [...(hazard.reports ?? [])].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  return {
    id: hazard.id,
    coord: { lng: hazard.lng, lat: hazard.lat },
    kind: hazard.kind,
    dangerLevel: hazard.dangerLevel,
    status: hazard.status,
    streetName: hazard.streetName,
    activeWindow:
      hazard.activeWindowStart === null || hazard.activeWindowEnd === null
        ? undefined
        : { startMin: hazard.activeWindowStart, endMin: hazard.activeWindowEnd },
    reports: reports.map(toReportDto),
  };
}

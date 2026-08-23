import { LngLat, TimeWindow } from '../data/types';

/**
 * When it is actually dark enough for street lighting to matter.
 *
 * Civil twilight, not sunset: the sun sets while there is still perfectly
 * usable light, and calling that "dark" would put a warning on a road twenty
 * minutes before anyone needs it. Civil twilight ends when the sun reaches 6°
 * below the horizon, which is roughly when you stop being able to read
 * outdoors — and roughly when an unlit road becomes a problem.
 */
const CIVIL_TWILIGHT_DEG = -6;

const RAD = Math.PI / 180;
const DAY_MS = 86_400_000;
/** Days from the Unix epoch to J2000.0, the epoch the formulae are built on. */
const J2000_OFFSET_DAYS = 10957.5;

const toDays = (date: Date) => date.getTime() / DAY_MS - J2000_OFFSET_DAYS;

/**
 * Solar noon and the hour angle for a given altitude, after Meeus.
 *
 * Accurate to a minute or so, which is far finer than this is used for — the
 * question is "is it dark", not "when exactly did it get dark".
 */
function sunEvent(coord: LngLat, date: Date, altitudeDeg: number, rising: boolean): Date {
  const d = toDays(date);
  const lw = -coord.lng * RAD;

  // Mean solar noon, then corrected for the equation of centre and the
  // eccentricity of the orbit.
  const n = Math.round(d - 0.0009 - lw / (2 * Math.PI));
  const meanSolarNoon = 0.0009 + lw / (2 * Math.PI) + n;
  const meanAnomaly = (357.5291 + 0.98560028 * meanSolarNoon) * RAD;
  const centre =
    (1.9148 * Math.sin(meanAnomaly) +
      0.02 * Math.sin(2 * meanAnomaly) +
      0.0003 * Math.sin(3 * meanAnomaly)) *
    RAD;
  const eclipticLongitude = meanAnomaly + centre + 102.9372 * RAD + Math.PI;
  const solarTransit =
    2451545 +
    meanSolarNoon +
    0.0053 * Math.sin(meanAnomaly) -
    0.0069 * Math.sin(2 * eclipticLongitude);

  const declination = Math.asin(Math.sin(eclipticLongitude) * Math.sin(23.44 * RAD));
  const lat = coord.lat * RAD;

  const cosHourAngle =
    (Math.sin(altitudeDeg * RAD) - Math.sin(lat) * Math.sin(declination)) /
    (Math.cos(lat) * Math.cos(declination));

  // Beyond the polar circles the sun may never reach this altitude. Clamping
  // degrades to "all day" or "all night" rather than returning NaN.
  const hourAngle = Math.acos(Math.min(1, Math.max(-1, cosHourAngle)));
  const julian = rising ? solarTransit - hourAngle / (2 * Math.PI) : solarTransit + hourAngle / (2 * Math.PI);

  return new Date((julian - 2451545 + J2000_OFFSET_DAYS) * DAY_MS);
}

/** The end of civil twilight — when an unlit road starts to matter. */
export function civilDusk(coord: LngLat, date: Date): Date {
  return sunEvent(coord, date, CIVIL_TWILIGHT_DEG, false);
}

/** The start of civil twilight next morning — when it stops mattering. */
export function civilDawn(coord: LngLat, date: Date): Date {
  return sunEvent(coord, date, CIVIL_TWILIGHT_DEG, true);
}

/**
 * Local minutes past midnight.
 *
 * Reads the clock the rider is looking at, which is right so long as they and
 * the hazard share a timezone — true of every hazard they can ride to, and the
 * only case this is asked about.
 */
const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes();

/**
 * Darkness as one of the app's existing time windows, so an unlit hazard can
 * be checked by exactly the same rule as a construction site with set hours.
 * Wraps past midnight, which `isWithinWindow` already handles.
 */
export function nightWindowFor(coord: LngLat, date: Date): TimeWindow {
  return {
    startMin: minutesOf(civilDusk(coord, date)),
    endMin: minutesOf(civilDawn(coord, date)),
  };
}

/** Whether it is dark at this place at this moment. */
export function isAfterDark(coord: LngLat, at: Date): boolean {
  const { startMin, endMin } = nightWindowFor(coord, at);
  const minutes = minutesOf(at);
  return startMin <= endMin
    ? minutes >= startMin && minutes < endMin
    : minutes >= startMin || minutes < endMin;
}

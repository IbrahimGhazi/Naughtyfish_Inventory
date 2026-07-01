/**
 * Pakistan map geography — a dependency-free inline-SVG map.
 *
 * Border ring is [lng, lat] tracing the national boundary (western arc from a
 * real GeoJSON, southern coast + eastern India border simplified). Cities carry
 * real lat/long. `project()` uses an equirectangular projection with a cos(midLat)
 * width correction so relative city positions look right. GPS lat/long later
 * plugs straight into project().
 */

export interface City {
  name: string;
  lng: number;
  lat: number;
  region: "north" | "south";
}

/** Cities we ship to/from. `region` matches the app's North/South split. */
export const CITIES: City[] = [
  { name: "Karachi", lng: 67.01, lat: 24.86, region: "south" },
  { name: "Hyderabad", lng: 68.37, lat: 25.39, region: "south" },
  { name: "Gwadar", lng: 62.33, lat: 25.13, region: "south" },
  { name: "Sukkur", lng: 68.86, lat: 27.7, region: "south" },
  { name: "Quetta", lng: 66.98, lat: 30.18, region: "north" },
  { name: "Multan", lng: 71.47, lat: 30.2, region: "north" },
  { name: "Faisalabad", lng: 73.08, lat: 31.42, region: "north" },
  { name: "Lahore", lng: 74.34, lat: 31.55, region: "north" },
  { name: "Islamabad", lng: 73.05, lat: 33.68, region: "north" },
  { name: "Rawalpindi", lng: 73.04, lat: 33.6, region: "north" },
  { name: "Peshawar", lng: 71.58, lat: 34.01, region: "north" },
];

export const CITY_NAMES = CITIES.map((c) => c.name);

export function cityByName(name: string | null | undefined): City | undefined {
  if (!name) return undefined;
  return CITIES.find((c) => c.name.toLowerCase() === name.toLowerCase());
}

/** National boundary ring as [lng, lat]. Simplified but recognizable. */
export const PAKISTAN_BORDER: [number, number][] = [
  // Western arc (Afghanistan/Iran border), north → south, from real GeoJSON.
  [74.685, 37.086], [74.05, 36.83], [73.61, 36.9], [73.06, 36.88], [72.7, 36.84],
  [72.19, 36.71], [71.92, 36.52], [71.65, 36.48], [71.31, 36.17], [71.2, 36.04],
  [71.47, 35.82], [71.55, 35.69], [71.65, 35.45], [71.54, 35.3], [71.19, 34.75],
  [71.05, 34.43], [71.13, 34.17], [70.86, 33.97], [70.42, 33.97], [69.9, 34.04],
  [69.86, 33.97], [69.96, 33.76], [70.13, 33.66], [70.17, 33.52], [70.32, 33.4],
  [70.07, 33.22], [69.87, 33.09], [69.5, 33.03], [69.5, 32.89], [69.44, 32.65],
  [69.38, 32.56], [69.15, 31.78], [68.79, 31.63], [68.44, 31.76], [68.06, 31.72],
  [67.79, 31.56], [67.65, 31.53], [67.63, 31.41], [67.27, 31.2], [67.03, 31.24],
  [66.95, 31.31], [66.69, 31.08], [66.28, 30.58], [66.34, 30.32], [66.24, 30.08],
  [66.37, 29.97], [66.27, 29.86],
  // South-west to the Makran coast.
  [65.5, 29.2], [64.5, 29.55], [64.1, 29.39], [63.55, 29.48], [62.8, 28.9],
  [62.4, 28.3], [62.8, 27.5], [63.25, 26.8], [63.19, 26.05], [62.4, 25.6],
  [61.7, 25.28], [61.6, 25.2],
  // Arabian Sea coast, west → east to Karachi and the Indus delta.
  [62.2, 25.15], [63.5, 25.23], [64.6, 25.28], [65.5, 25.4], [66.5, 25.1],
  [66.7, 24.87], [67.45, 24.05], [68.0, 23.7], [68.75, 24.2],
  // Eastern (India) border, south → north through Thar and Punjab.
  [69.6, 24.3], [70.1, 24.6], [70.67, 25.7], [71.04, 27.86], [70.58, 28.02],
  [70.13, 28.02], [72.2, 29.5], [73.0, 29.9], [73.35, 30.1], [74.2, 30.85],
  [74.6, 31.5], [74.6, 31.9], [75.28, 32.27], [74.65, 32.76], [74.2, 33.5],
  // Kashmir / far north, back to the start.
  [74.05, 34.3], [73.75, 34.55], [74.2, 34.76], [75.0, 34.65], [75.8, 34.5],
  [76.2, 35.0], [76.85, 35.5], [77.05, 35.9], [76.5, 36.4], [75.9, 36.6],
  [75.1, 36.9], [74.685, 37.086],
];

export const MAP_W = 1000;
export const MAP_H = 920;
const PAD = 44;

const lngs = PAKISTAN_BORDER.map((p) => p[0]);
const lats = PAKISTAN_BORDER.map((p) => p[1]);
const MIN_LNG = Math.min(...lngs);
const MAX_LNG = Math.max(...lngs);
const MIN_LAT = Math.min(...lats);
const MAX_LAT = Math.max(...lats);
const MID_LAT = (MIN_LAT + MAX_LAT) / 2;
const KX = Math.cos((MID_LAT * Math.PI) / 180); // longitude compression at this latitude

const geoW = (MAX_LNG - MIN_LNG) * KX;
const geoH = MAX_LAT - MIN_LAT;
const availW = MAP_W - 2 * PAD;
const availH = MAP_H - 2 * PAD;
const SCALE = Math.min(availW / geoW, availH / geoH);
const offX = PAD + (availW - geoW * SCALE) / 2;
const offY = PAD + (availH - geoH * SCALE) / 2;

/** Project [lng, lat] into the MAP_W×MAP_H SVG viewBox. */
export function project(lng: number, lat: number): { x: number; y: number } {
  return {
    x: offX + (lng - MIN_LNG) * KX * SCALE,
    y: offY + (MAX_LAT - lat) * SCALE,
  };
}

/** SVG path `d` for the national boundary (closed). */
export function borderPath(): string {
  return (
    PAKISTAN_BORDER.map(([lng, lat], i) => {
      const { x, y } = project(lng, lat);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ") + " Z"
  );
}

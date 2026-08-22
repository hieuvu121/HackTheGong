import { ImageSourcePropType } from 'react-native';

const construction = require('../../assets/hazards/construction.jpg');
const pothole = require('../../assets/hazards/pothole.jpg');
const debris = require('../../assets/hazards/debris.jpg');
const unlit = require('../../assets/hazards/unlit.jpg');

/** Offline photographs for seeded demo reports. Uploaded reports still use their API URL. */
export const DEMO_PHOTOS: Record<string, ImageSourcePropType> = {
  'construction-a': construction,
  'construction-b': construction,
  'unlit-a': unlit,
  'pothole-a': pothole,
  'pothole-b': pothole,
  'pothole-patched': pothole,
  'pothole-fixed': pothole,
  'highway-a': unlit,
  'debris-a': debris,
};

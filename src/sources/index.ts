import { nyOpenData } from './ny-open-data.ts';
import type { Source } from './types.ts';

/** Which adapter supplies each game. */
export const sources: Record<string, Source> = {
  'us-powerball': nyOpenData,
  'us-mega-millions': nyOpenData,
};

import {isolateFluidApi} from '../server/fluid-preview.js';
import {makeMailingConcertsSyncHandler} from '../server/ontrack-concerts.js';
export const config={maxDuration:300};
export default isolateFluidApi(makeMailingConcertsSyncHandler());

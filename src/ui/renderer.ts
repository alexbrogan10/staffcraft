import { VexFlowRenderer, type NotationRenderer } from '../notation';

/** The notation renderer the app uses. Swap the implementation here. */
export const renderer: NotationRenderer = new VexFlowRenderer();

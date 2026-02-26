import { RenderBundle } from '../RenderBundle';

export {};

declare module '../RenderPass'
{
    export interface RenderPassObjectMap
    {
        RenderBundle: RenderBundle;
    }
}

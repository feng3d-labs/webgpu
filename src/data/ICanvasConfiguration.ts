import { IGPUCanvasConfiguration } from "./IGPUCanvasConfiguration";

/**
 * @see IGPUCanvasConfiguration
 */
export interface ICanvasConfiguration extends Omit<IGPUCanvasConfiguration, "format">
{
    /**
     * The format that textures returned by {@link GPUCanvasContext#getCurrentTexture} will have.
     * Must be one of the Supported context formats.
     *
     * 默认 `navigator.gpu.getPreferredCanvasFormat()` 。
     */
    format?: GPUTextureFormat;

    /**
     * Determines the effect that alpha values will have on the content of textures returned by
     * {@link GPUCanvasContext#getCurrentTexture} when read, displayed, or used as an image source.
     *
     * 默认 'premultiplied' 。
     */
    alphaMode?: GPUCanvasAlphaMode;
}


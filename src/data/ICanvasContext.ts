import { IGPUCanvasContext } from '../webgpu-data-driven/data/IGPUTexture';
import { ICanvasConfiguration } from './ICanvasConfiguration';

/**
 * @see IGPUCanvasContext
 */
export interface ICanvasContext extends Omit<IGPUCanvasContext, 'configuration'>
{
    /**
     * 画布配置。
     */
    configuration?: ICanvasConfiguration;
}

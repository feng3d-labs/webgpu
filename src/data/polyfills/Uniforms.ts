import { Sampler } from '../Sampler';
import { TextureView } from '../TextureView';
import { VideoTexture } from '../VideoTexture';

export {};

declare module '../Uniforms'
{
    export interface BindingResourceTypeMap
    {
        Sampler: Sampler;
        TextureView: TextureView;
        VideoTexture: VideoTexture;
    }
}
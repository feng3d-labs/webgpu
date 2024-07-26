import { IRenderBundleObject } from './IRenderBundleObject';
import { IRenderObject } from './IRenderObject';
import { IRenderPass } from './IRenderPass';

export interface IRenderPassEncoder
{
    renderPass: IRenderPass,

    renderObjects: (IRenderObject | IRenderBundleObject)[],
}

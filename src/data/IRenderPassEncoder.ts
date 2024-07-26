import { IGPURenderPassDescriptor } from "./IGPURenderPassEncoder";
import { IRenderBundleObject } from "./IRenderBundleObject";
import { IRenderObject } from "./IRenderObject";

export interface IRenderPassEncoder
{
    renderPass: IGPURenderPassDescriptor,

    renderObjects: (IRenderObject | IRenderBundleObject)[],
}

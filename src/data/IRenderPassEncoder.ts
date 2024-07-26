import { IGPURenderObject } from "./IGPURenderObject";
import { IGPURenderPassDescriptor } from "./IGPURenderPassEncoder";
import { IRenderBundleObject } from "./IRenderBundleObject";

export interface IRenderPassEncoder
{
    renderPass: IGPURenderPassDescriptor,

    renderObjects: (IGPURenderObject | IRenderBundleObject)[],
}

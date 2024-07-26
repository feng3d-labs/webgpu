import { IGPURenderBundleObject } from "./IGPURenderBundleObject";
import { IGPURenderObject } from "./IGPURenderObject";
import { IGPURenderPassDescriptor } from "./IGPURenderPassEncoder";

export interface IRenderPassEncoder
{
    renderPass: IGPURenderPassDescriptor,

    renderObjects: (IGPURenderObject | IGPURenderBundleObject)[],
}

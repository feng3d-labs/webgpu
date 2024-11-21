import { IGPURenderOcclusionQueryObject } from "../data/IGPURenderOcclusionQueryObject";
import { IGPURenderPassFormat } from "../internal/IGPURenderPassFormat";
import { runRenderObject } from "./runRenderObject";

export function runRenderOcclusionQueryObject(device: GPUDevice, passEncoder: GPURenderPassEncoder, renderPassFormats: IGPURenderPassFormat, queryIndex: GPUSize32, renderOcclusionQueryObject: IGPURenderOcclusionQueryObject)
{
    passEncoder.beginOcclusionQuery(queryIndex);
    renderOcclusionQueryObject.renderObjects.forEach((renderObject) =>
    {
        runRenderObject(device, passEncoder, renderPassFormats, renderObject);
    });
    passEncoder.endOcclusionQuery();
}

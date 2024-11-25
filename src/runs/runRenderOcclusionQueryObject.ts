import { IGPURenderOcclusionQueryObject } from "../data/IGPURenderOcclusionQueryObject";
import { IGPURenderPassFormat } from "../internal/IGPURenderPassFormat";
import { runRenderObject } from "./runRenderObject";

export function runRenderOcclusionQueryObject(device: GPUDevice, passEncoder: GPURenderPassEncoder, renderPassFormats: IGPURenderPassFormat, renderOcclusionQueryObject: IGPURenderOcclusionQueryObject)
{
    passEncoder.beginOcclusionQuery(renderOcclusionQueryObject._queryIndex);
    renderOcclusionQueryObject.renderObjects.forEach((renderObject) =>
    {
        runRenderObject(device, passEncoder, renderPassFormats, renderObject);
    });
    passEncoder.endOcclusionQuery();
}

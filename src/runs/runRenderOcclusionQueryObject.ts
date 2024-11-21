import { IGPURenderOcclusionQueryObject } from "../data/IGPURenderOcclusionQueryObject";
import { IGPURenderPassFormat } from "../internal/IGPURenderPassFormat";
import { runRenderObject } from "./runRenderObject";

export function runRenderOcclusionQueryObject(device: GPUDevice, passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderPassFormats: IGPURenderPassFormat, renderOcclusionQueryObject: IGPURenderOcclusionQueryObject)
{
    renderOcclusionQueryObject.renderObjects.forEach((renderObject) =>
    {
        runRenderObject(device, passEncoder, renderPassFormats, renderObject);
    });
}

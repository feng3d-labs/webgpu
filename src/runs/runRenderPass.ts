import { getGPURenderPassDescriptor } from "../caches/getGPURenderPassDescriptor";
import { IGPURenderBundleObject } from "../data/IGPURenderBundleObject";
import { IGPURenderObject } from "../data/IGPURenderObject";
import { IGPURenderPass } from "../data/IGPURenderPass";
import { runRenderBundle } from "./runRenderBundle";
import { runRenderObject } from "./runRenderObject";

export function runRenderPass(device: GPUDevice, commandEncoder: GPUCommandEncoder, renderPass: IGPURenderPass)
{
    const renderPassDescriptor = getGPURenderPassDescriptor(device, renderPass.descriptor);

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

    renderPass.renderObjects?.forEach((element) =>
    {
        if ((element as IGPURenderBundleObject).renderObjects)
        {
            runRenderBundle(device, passEncoder, renderPass.descriptor, element as IGPURenderBundleObject);
        }
        else
        {
            runRenderObject(device, passEncoder, element as IGPURenderObject, renderPass.descriptor);
        }
    });

    passEncoder.end();
}

import { IGPUPipelineLayout } from "../internal/IGPUPipelineLayout";
import { getGPUBindGroupLayout } from "./getGPUBindGroupLayout";

export function getGPUPipelineLayout(device: GPUDevice, layout: IGPUPipelineLayout)
{
    const bindGroupLayouts = layout.bindGroupLayouts.map((v) =>
    {
        const gBindGroupLayout = getGPUBindGroupLayout(device, v);

        return gBindGroupLayout;
    });
    const gPipelineLayout = device.createPipelineLayout({
        bindGroupLayouts,
    });

    return gPipelineLayout;
}

import { IGPUPipelineLayoutDescriptor } from "../internal/IGPUPipelineLayoutDescriptor";
import { getGPUBindGroupLayout } from "./getGPUBindGroupLayout";

export function getGPUPipelineLayout(device: GPUDevice, layout: IGPUPipelineLayoutDescriptor)
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

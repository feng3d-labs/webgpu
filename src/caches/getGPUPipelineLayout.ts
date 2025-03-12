import { PipelineLayoutDescriptor } from "../internal/PipelineLayoutDescriptor";
import { getGPUBindGroupLayout } from "./getGPUBindGroupLayout";

export function getGPUPipelineLayout(device: GPUDevice, layout: PipelineLayoutDescriptor)
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

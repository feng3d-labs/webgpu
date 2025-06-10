export interface GDeviceContext
{
    device: GPUDevice;

    gpuCommandEncoder?: GPUCommandEncoder;

    passEncoder?: GPUComputePassEncoder
}
export class GDeviceContext
{
    device: GPUDevice

    gpuCommandEncoder?: GPUCommandEncoder;

    passEncoder?: GPUComputePassEncoder

    constructor(device: GPUDevice)
    {
        this.device = device;
    }

    static getInstance(device: GPUDevice)
    {
        let result = GDeviceContext._instanceMap.get(device);

        if (result) result;

        result = new GDeviceContext(device);

        GDeviceContext._instanceMap.set(device, result);

        return result;
    }

    private static _instanceMap = new WeakMap<GPUDevice, GDeviceContext>()
}
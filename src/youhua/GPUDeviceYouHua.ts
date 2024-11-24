((configure) =>
{
    GPUCanvasContext.prototype.configure = function (configuration: GPUCanvasConfiguration)
    {
        if (configuration.device.constructor.name !== "GPUDevice")
        {
            configuration.device = configuration.device['_device'];
            console.assert(configuration.device.constructor.name === "GPUDevice");
        }

        configure.call(this, configuration);
    };
})(GPUCanvasContext.prototype.configure);

/**
 * 优化性能
 */
export class GPUDeviceYouHua implements GPUDevice
{
    get __brand() { return this._device.__brand; }
    get features() { return this._device.features; }
    get limits() { return this._device.limits; }
    get queue() { return this._device.queue; }
    get label() { return this._device.label; }
    get lost() { return this._device.lost; }

    get onuncapturederror() { return this._device.onuncapturederror; }
    set onuncapturederror(v) { this._device.onuncapturederror = v; }

    //
    private _device: GPUDevice;

    constructor(device: GPUDevice)
    {
        this._device = device;
    }

    destroy(): undefined
    {
        return this._device.destroy();
    }
    createBuffer(descriptor: GPUBufferDescriptor): GPUBuffer
    {
        return this._device.createBuffer(descriptor);
    }
    createTexture(descriptor: GPUTextureDescriptor): GPUTexture
    {
        return this._device.createTexture(descriptor);
    }
    createSampler(descriptor?: GPUSamplerDescriptor): GPUSampler
    {
        return this._device.createSampler(descriptor);
    }
    importExternalTexture(descriptor: GPUExternalTextureDescriptor): GPUExternalTexture
    {
        return this._device.importExternalTexture(descriptor);
    }
    createBindGroupLayout(descriptor: GPUBindGroupLayoutDescriptor): GPUBindGroupLayout
    {
        return this._device.createBindGroupLayout(descriptor);
    }
    createPipelineLayout(descriptor: GPUPipelineLayoutDescriptor): GPUPipelineLayout
    {
        return this._device.createPipelineLayout(descriptor);
    }
    createBindGroup(descriptor: GPUBindGroupDescriptor): GPUBindGroup
    {
        return this._device.createBindGroup(descriptor);
    }
    createShaderModule(descriptor: GPUShaderModuleDescriptor): GPUShaderModule
    {
        return this._device.createShaderModule(descriptor);
    }
    createComputePipeline(descriptor: GPUComputePipelineDescriptor): GPUComputePipeline
    {
        return this._device.createComputePipeline(descriptor);
    }
    createRenderPipeline(descriptor: GPURenderPipelineDescriptor): GPURenderPipeline
    {
        return this._device.createRenderPipeline(descriptor);
    }
    createComputePipelineAsync(descriptor: GPUComputePipelineDescriptor): Promise<GPUComputePipeline>
    {
        return this._device.createComputePipelineAsync(descriptor);
    }
    createRenderPipelineAsync(descriptor: GPURenderPipelineDescriptor): Promise<GPURenderPipeline>
    {
        return this._device.createRenderPipelineAsync(descriptor);
    }
    createCommandEncoder(descriptor?: GPUCommandEncoderDescriptor): GPUCommandEncoder
    {
        return this._device.createCommandEncoder(descriptor);
    }
    createRenderBundleEncoder(descriptor: GPURenderBundleEncoderDescriptor): GPURenderBundleEncoder
    {
        return this._device.createRenderBundleEncoder(descriptor);
    }
    createQuerySet(descriptor: GPUQuerySetDescriptor): GPUQuerySet
    {
        return this._device.createQuerySet(descriptor);
    }
    pushErrorScope(filter: GPUErrorFilter): undefined
    {
        return this._device.pushErrorScope(filter);
    }
    popErrorScope(): Promise<GPUError | null>
    {
        return this._device.popErrorScope();
    }
    addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean): void
    {
        return this._device.addEventListener(type, callback, options);
    }
    dispatchEvent(event: Event): boolean
    {
        return this._device.dispatchEvent(event);
    }
    removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean): void
    {
        return this._device.removeEventListener(type, callback, options);
    }
}
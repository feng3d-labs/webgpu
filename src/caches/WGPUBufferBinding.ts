import { reactive } from '@feng3d/reactivity';
import { Buffer, BufferBinding, ChainMap } from '@feng3d/render-api';
import { TypeInfo } from 'wgsl_reflect';
import { ReactiveObject } from '../ReactiveObject';
import { WGPUBindGroup } from './WGPUBindGroup';
import { WGPUBuffer } from './WGPUBuffer';

export class WGPUBufferBinding extends ReactiveObject
{
    readonly gpuBufferBinding: GPUBufferBinding;

    constructor(device: GPUDevice, bufferBinding: BufferBinding, type: TypeInfo)
    {
        super();

        this._onCreate(device, bufferBinding, type);
        this._onMap(device, bufferBinding, type);
    }

    private _onCreate(device: GPUDevice, bufferBinding: BufferBinding, type: TypeInfo)
    {
        const r_this = reactive(this);
        const r_bufferBinding = reactive(bufferBinding);

        this.effect(() =>
        {
            // 监听

            r_bufferBinding?.bufferView;

            // 更新缓冲区绑定的数据。
            WGPUBindGroup.updateBufferBinding(bufferBinding, type);
            const bufferView = bufferBinding.bufferView;
            //
            const gbuffer = Buffer.fromArrayBuffer(bufferView.buffer);

            (gbuffer as any).label = gbuffer.label || (`BufferBinding ${type.name}`);
            //
            const buffer = WGPUBuffer.getInstance(device, gbuffer).gpuBuffer;

            const offset = bufferView.byteOffset;
            const size = bufferView.byteLength;

            const gpuBufferBinding: GPUBufferBinding = {
                buffer,
                offset,
                size,
            };

            r_this.gpuBufferBinding = gpuBufferBinding;
        });
    }

    private _onMap(device: GPUDevice, bufferBinding: BufferBinding, type: TypeInfo)
    {
        device.bufferBindings ??= new ChainMap();
        device.bufferBindings.set([device, bufferBinding, type], this);
        this.destroyCall(() => { device.bufferBindings.delete([device, bufferBinding, type]); });
    }

    static getInstance(device: GPUDevice, bufferBinding: BufferBinding, type: TypeInfo)
    {
        return device.bufferBindings?.get([device, bufferBinding, type]) || new WGPUBufferBinding(device, bufferBinding, type);
    }
}

declare global
{
    interface GPUDevice
    {
        bufferBindings: ChainMap<[device: GPUDevice, bufferBinding: BufferBinding, type: TypeInfo], WGPUBufferBinding>;
    }
}
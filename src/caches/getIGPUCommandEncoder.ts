import { ICommandEncoder } from "../data/ICommandEncoder";
import { IComputePassEncoder } from "../data/IComputePassEncoder";
import { ICopyBufferToBuffer } from "../data/ICopyBufferToBuffer";
import { ICopyTextureToTexture } from "../data/ICopyTextureToTexture";
import { IGPUCommandEncoder, IGPUPassEncoder } from "../data/IGPUCommandEncoder";
import { IGPUCopyBufferToBuffer } from "../data/IGPUCopyBufferToBuffer";
import { IGPUCopyTextureToTexture } from "../data/IGPUCopyTextureToTexture";
import { IRenderPassEncoder } from "../data/IRenderPassEncoder";
import { getIComputePassEncoder } from "./getIComputePassEncoder";
import { getIGPURenderPassEncoder } from "./getIGPURenderPassEncoder";
import { getIGPUTexture } from "./getIGPUTexture";

export function getIGPUCommandEncoder(device: GPUDevice, v: ICommandEncoder)
{
    const passEncoders = v.passEncoders.map((v) =>
    {
        let gpuPassEncoder: IGPUPassEncoder;
        if (isIRenderPassEncoder(v))
        {
            gpuPassEncoder = getIGPURenderPassEncoder(device, v);
        }
        else if (isIComputePassEncoder(v))
        {
            gpuPassEncoder = getIComputePassEncoder(v);
        }
        else if (isICopyTextureToTexture(v))
        {
            gpuPassEncoder = getIGPUCopyTextureToTexture(v);
        }
        else if (isICopyBufferToBuffer(v))
        {
            gpuPassEncoder = getIGPUCopyBufferToBuffer(v);
        }
        else
        {
            throw `未处理通道编码器 ${v}`;
        }

        return gpuPassEncoder;
    });

    const gpuCommandEncoder: IGPUCommandEncoder = {
        passEncoders,
    };

    return gpuCommandEncoder;
}

function isIComputePassEncoder(arg: any): arg is IComputePassEncoder
{
    return !!(arg as IComputePassEncoder).computeObjects;
}

function isIRenderPassEncoder(arg: any): arg is IRenderPassEncoder
{
    return !!(arg as IRenderPassEncoder).renderPass;
}

function isICopyTextureToTexture(arg: any): arg is ICopyTextureToTexture
{
    return !!(arg as ICopyTextureToTexture).source?.texture;
}

function isICopyBufferToBuffer(arg: any): arg is ICopyBufferToBuffer
{
    const source = (arg as ICopyBufferToBuffer).source;
    const destination = (arg as ICopyBufferToBuffer).destination;

    // 缓冲区必定给出尺寸 或者 数据。
    if (!(source.size || source.data)) return false;
    if (!(destination.size || destination.data)) return false;

    return true;
}

function getIGPUCopyTextureToTexture(v: ICopyTextureToTexture)
{
    const sourceTexture = getIGPUTexture(v.source.texture);
    const destinationTexture = getIGPUTexture(v.destination.texture);

    const gpuCopyTextureToTexture: IGPUCopyTextureToTexture = {
        ...v,
        source: { texture: sourceTexture },
        destination: { texture: destinationTexture },
    };

    return gpuCopyTextureToTexture;
}

function getIGPUCopyBufferToBuffer(v: ICopyBufferToBuffer)
{
    const source = v.source;
    const destination = v.destination;

    let { sourceOffset, destinationOffset, size } = v;

    if (sourceOffset === undefined) sourceOffset = 0;
    if (destinationOffset === undefined) destinationOffset = 0;
    if (size === undefined) size = source.size;

    const gpuCopyTextureToTexture: IGPUCopyBufferToBuffer = {
        source,
        sourceOffset,
        destination,
        destinationOffset,
        size,
    };

    return gpuCopyTextureToTexture;
}

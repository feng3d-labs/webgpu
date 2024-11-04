import { IGPUCopyBufferToBuffer } from "../data/IGPUCopyBufferToBuffer";

export function getIGPUCopyBufferToBuffer(v: IGPUCopyBufferToBuffer)
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
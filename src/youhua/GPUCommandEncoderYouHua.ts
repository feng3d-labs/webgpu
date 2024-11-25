import { GPURenderPassEncoderYouHua } from "./GPURenderPassEncoderYouHua";

export class GPUCommandEncoderYouHua implements GPUCommandEncoder
{
    get __brand() { return this._commandEncoder.__brand; }
    get label() { return this._commandEncoder.label; }
    set label(v) { this._commandEncoder.label = v; }

    private _commandEncoder: GPUCommandEncoder;

    constructor(commandEncoder: GPUCommandEncoder)
    {
        this._commandEncoder = commandEncoder;
    }

    beginRenderPass(descriptor: GPURenderPassDescriptor): GPURenderPassEncoder
    {
        const renderPassEncoder = this._commandEncoder.beginRenderPass(descriptor);

        return new GPURenderPassEncoderYouHua(renderPassEncoder);
    }

    beginComputePass(descriptor?: GPUComputePassDescriptor): GPUComputePassEncoder
    {
        return this._commandEncoder.beginComputePass(descriptor);
    }
    copyBufferToBuffer(source: GPUBuffer, sourceOffset: GPUSize64, destination: GPUBuffer, destinationOffset: GPUSize64, size: GPUSize64): undefined
    {
        return this._commandEncoder.copyBufferToBuffer(source, sourceOffset, destination, destinationOffset, size);
    }
    copyBufferToTexture(source: GPUImageCopyBuffer, destination: GPUImageCopyTexture, copySize: GPUExtent3DStrict): undefined
    {
        return this._commandEncoder.copyBufferToTexture(source, destination, copySize);
    }
    copyTextureToBuffer(source: GPUImageCopyTexture, destination: GPUImageCopyBuffer, copySize: GPUExtent3DStrict): undefined
    {
        return this._commandEncoder.copyTextureToBuffer(source, destination, copySize);
    }
    copyTextureToTexture(source: GPUImageCopyTexture, destination: GPUImageCopyTexture, copySize: GPUExtent3DStrict): undefined
    {
        return this._commandEncoder.copyTextureToTexture(source, destination, copySize);
    }
    clearBuffer(buffer: GPUBuffer, offset?: GPUSize64, size?: GPUSize64): undefined
    {
        return this._commandEncoder.clearBuffer(buffer, offset, size);
    }
    resolveQuerySet(querySet: GPUQuerySet, firstQuery: GPUSize32, queryCount: GPUSize32, destination: GPUBuffer, destinationOffset: GPUSize64): undefined
    {
        return this._commandEncoder.resolveQuerySet(querySet, firstQuery, queryCount, destination, destinationOffset);
    }
    finish(descriptor?: GPUCommandBufferDescriptor): GPUCommandBuffer
    {
        return this._commandEncoder.finish(descriptor);
    }
    pushDebugGroup(groupLabel: string): undefined
    {
        return this._commandEncoder.pushDebugGroup(groupLabel);
    }
    popDebugGroup(): undefined
    {
        return this._commandEncoder.popDebugGroup();
    }
    insertDebugMarker(markerLabel: string): undefined
    {
        return this._commandEncoder.insertDebugMarker(markerLabel);
    }
}
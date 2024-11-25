export class GPURenderPassEncoderYouHua implements GPURenderPassEncoder
{
    get __brand() { return this._renderPassEncoder.__brand; }
    get label() { return this._renderPassEncoder.label; }
    set label(v) { this._renderPassEncoder.label = v; }

    private _renderPassEncoder: GPURenderPassEncoder;

    constructor(renderPassEncoder: GPURenderPassEncoder)
    {
        this._renderPassEncoder = renderPassEncoder;
    }

    setViewport(x: number, y: number, width: number, height: number, minDepth: number, maxDepth: number): undefined
    {
        return this._renderPassEncoder.setViewport(x, y, width, height, minDepth, maxDepth);
    }
    setScissorRect(x: GPUIntegerCoordinate, y: GPUIntegerCoordinate, width: GPUIntegerCoordinate, height: GPUIntegerCoordinate): undefined
    {
        return this._renderPassEncoder.setScissorRect(x, y, width, height);
    }
    setBlendConstant(color: GPUColor): undefined
    {
        return this._renderPassEncoder.setBlendConstant(color);
    }
    setStencilReference(reference: GPUStencilValue): undefined
    {
        return this._renderPassEncoder.setStencilReference(reference);
    }
    beginOcclusionQuery(queryIndex: GPUSize32): undefined
    {
        return this._renderPassEncoder.beginOcclusionQuery(queryIndex);
    }
    endOcclusionQuery(): undefined
    {
        return this._renderPassEncoder.endOcclusionQuery();
    }
    executeBundles(bundles: Iterable<GPURenderBundle>): undefined
    {
        return this._renderPassEncoder.executeBundles(bundles);
    }
    end(): undefined
    {
        return this._renderPassEncoder.end();
    }
    pushDebugGroup(groupLabel: string): undefined
    {
        return this._renderPassEncoder.pushDebugGroup(groupLabel);
    }
    popDebugGroup(): undefined
    {
        return this._renderPassEncoder.popDebugGroup();
    }
    insertDebugMarker(markerLabel: string): undefined
    {
        return this._renderPassEncoder.insertDebugMarker(markerLabel);
    }
    setBindGroup(index: GPUIndex32, bindGroup: GPUBindGroup | null, dynamicOffsets?: Iterable<GPUBufferDynamicOffset>): undefined;
    setBindGroup(index: GPUIndex32, bindGroup: GPUBindGroup | null, dynamicOffsetsData: Uint32Array, dynamicOffsetsDataStart: GPUSize64, dynamicOffsetsDataLength: GPUSize32): undefined;
    setBindGroup(...args: any[]): undefined
    {
        return this._renderPassEncoder.setBindGroup.apply(this._renderPassEncoder, args);
    }
    setPipeline(pipeline: GPURenderPipeline): undefined
    {
        return this._renderPassEncoder.setPipeline(pipeline);
    }
    setIndexBuffer(buffer: GPUBuffer, indexFormat: GPUIndexFormat, offset?: GPUSize64, size?: GPUSize64): undefined
    {
        return this._renderPassEncoder.setIndexBuffer(buffer, indexFormat, offset, size);
    }
    setVertexBuffer(slot: GPUIndex32, buffer: GPUBuffer | null, offset?: GPUSize64, size?: GPUSize64): undefined
    {
        return this._renderPassEncoder.setVertexBuffer(slot, buffer, offset, size);
    }
    draw(vertexCount: GPUSize32, instanceCount?: GPUSize32, firstVertex?: GPUSize32, firstInstance?: GPUSize32): undefined
    {
        return this._renderPassEncoder.draw(vertexCount, instanceCount, firstVertex, firstInstance);
    }
    drawIndexed(indexCount: GPUSize32, instanceCount?: GPUSize32, firstIndex?: GPUSize32, baseVertex?: GPUSignedOffset32, firstInstance?: GPUSize32): undefined
    {
        return this._renderPassEncoder.drawIndexed(indexCount, instanceCount, firstIndex, baseVertex, firstInstance);
    }
    drawIndirect(indirectBuffer: GPUBuffer, indirectOffset: GPUSize64): undefined
    {
        return this._renderPassEncoder.drawIndirect(indirectBuffer, indirectOffset);
    }
    drawIndexedIndirect(indirectBuffer: GPUBuffer, indirectOffset: GPUSize64): undefined
    {
        return this._renderPassEncoder.drawIndexedIndirect(indirectBuffer, indirectOffset)
    }
}
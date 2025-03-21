export interface RenderObjectCache
{
    setViewport?: [x: number, y: number, width: number, height: number, minDepth: number, maxDepth: number];
    setScissorRect?: [x: GPUIntegerCoordinate, y: GPUIntegerCoordinate, width: GPUIntegerCoordinate, height: GPUIntegerCoordinate];
    setPipeline: [pipeline: GPURenderPipeline];
    setBlendConstant?: [color: GPUColor];
    setStencilReference?: [reference: GPUStencilValue];
    setBindGroup?: [index: number, bindGroup: GPUBindGroup][];
    setVertexBuffer?: [slot: GPUIndex32, buffer: GPUBuffer, offset?: GPUSize64, size?: GPUSize64][];
    setIndexBuffer?: [buffer: GPUBuffer, indexFormat: GPUIndexFormat, offset?: GPUSize64, size?: GPUSize64];
    draw?: [vertexCount: GPUSize32, instanceCount?: GPUSize32, firstVertex?: GPUSize32, firstInstance?: GPUSize32];
    drawIndexed?: [indexCount: GPUSize32, instanceCount?: GPUSize32, firstIndex?: GPUSize32, baseVertex?: GPUSignedOffset32, firstInstance?: GPUSize32];
}

export class RenderObjectCache
{
    static run(renderObjectCache: RenderObjectCache, renderPass: GPURenderPassEncoder | GPURenderBundleEncoder)
    {
        const { setViewport, setScissorRect, setPipeline, setBlendConstant, setStencilReference, setBindGroup, setVertexBuffer, setIndexBuffer, draw, drawIndexed } = renderObjectCache;

        if (setViewport && "setViewport" in renderPass)
        {
            renderPass.setViewport(...setViewport);
        }
        if (setScissorRect && "setScissorRect" in renderPass)
        {
            renderPass.setScissorRect(...setScissorRect);
        }
        renderPass.setPipeline(...setPipeline);
        if (setBlendConstant && "setBlendConstant" in renderPass)
        {
            renderPass.setBlendConstant(...setBlendConstant);
        }
        if (setStencilReference && "setStencilReference" in renderPass)
        {
            renderPass.setStencilReference(...setStencilReference);
        }
        if (setBindGroup)
        {
            for (let i = 0, len = setBindGroup.length; i < len; i++)
            {
                renderPass.setBindGroup(...setBindGroup[i]);
            }
        }
        if (setVertexBuffer)
        {
            for (let i = 0, len = setVertexBuffer.length; i < len; i++)
            {
                renderPass.setVertexBuffer(...setVertexBuffer[i]);
            }
        }
        if (setIndexBuffer)
        {
            renderPass.setIndexBuffer(...setIndexBuffer);
        }
        if (draw)
        {
            renderPass.draw(...draw);
        }
        if (drawIndexed)
        {
            renderPass.drawIndexed(...drawIndexed);
        }
    }
}
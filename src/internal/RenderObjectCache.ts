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

    static runs(renderObjectCaches: RenderObjectCache[], renderPass: GPURenderPassEncoder | GPURenderBundleEncoder)
    {
        if (renderObjectCaches.length === 0) return;

        renderObjectCaches.forEach((renderObjectCache, i) =>
        {
            const diff = RenderObjectCache.diff(renderObjectCaches[i - 1], renderObjectCache);
            RenderObjectCache.run(diff, renderPass);
        });
    }

    static diff(a: RenderObjectCache, b: RenderObjectCache)
    {
        if (!a) return b;

        const result: RenderObjectCache = {} as any;

        if (b.setViewport && (!a.setViewport || b.setViewport.some((v, i) => v !== a.setViewport[i])))
        {
            result.setViewport = b.setViewport;
        }
        if (b.setScissorRect && (!a.setScissorRect || b.setScissorRect.some((v, i) => v !== a.setScissorRect[i])))
        {
            result.setScissorRect = b.setScissorRect;
        }
        if (b.setPipeline && (!a.setPipeline || b.setPipeline.some((v, i) => v !== a.setPipeline[i])))
        {
            result.setPipeline = b.setPipeline;
        }
        if (b.setBlendConstant && (!a.setBlendConstant || b.setBlendConstant.some((v, i) => v !== a.setBlendConstant[i])))
        {
            result.setBlendConstant = b.setBlendConstant;
        }
        if (b.setStencilReference && (!a.setStencilReference || b.setStencilReference.some((v, i) => v !== a.setStencilReference[i])))
        {
            result.setStencilReference = b.setStencilReference;
        }
        result.setBindGroup = [];
        if (b.setBindGroup)
        {
            if (!a.setBindGroup)
            {
                result.setBindGroup = b.setBindGroup;
            }
            else
            {
                for (let i = 0, len = b.setBindGroup.length; i < len; i++)
                {
                    if (!a.setBindGroup[i] || b.setBindGroup[i].some((v, i) => v !== a.setBindGroup[i][i]))
                    {
                        result.setBindGroup.push(b.setBindGroup[i]);
                    }
                }
            }
        }
        result.setVertexBuffer = [];
        if (b.setVertexBuffer)
        {
            if (!a.setVertexBuffer)
            {
                result.setVertexBuffer = b.setVertexBuffer;
            }
            else
            {
                for (let i = 0, len = b.setVertexBuffer.length; i < len; i++)
                {
                    if (!a.setVertexBuffer[i] || b.setVertexBuffer[i].some((v, j) => v !== a.setVertexBuffer[i][j]))
                    {
                        result.setVertexBuffer.push(b.setVertexBuffer[i]);
                    }
                }
            }
        }
        if (b.setIndexBuffer && (!a.setIndexBuffer || b.setIndexBuffer.some((v, i) => v !== a.setIndexBuffer[i])))
        {
            result.setIndexBuffer = b.setIndexBuffer;
        }
        if (b.draw && (!a.draw || b.draw.some((v, i) => v !== a.draw[i])))
        {
            result.draw = b.draw;
        }
        if (b.drawIndexed && (!a.drawIndexed || b.drawIndexed.some((v, i) => v !== a.drawIndexed[i])))
        {
            result.drawIndexed = b.drawIndexed;
        }

        return result;
    }
}
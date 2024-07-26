import { IGPURenderObject } from 'webgpu-data-driven';

import { IRenderObject } from '../data/IRenderObject';
import { IRenderPass } from '../data/IRenderPass';
import { getIGPURenderPipeline } from './getIGPURenderPipeline';
import { getIGPUSetBindGroups } from './getIGPUSetBindGroups';
import { ChainMap } from '../utils/ChainMap';
import { getIGPUBuffer } from './getIGPUBuffer';

export function getIGPURenderObject(renderObject: IRenderObject, renderPass: IRenderPass)
{
    let iGPURenderObject = renderObjectMap.get([renderObject, renderPass]);
    if (iGPURenderObject)
    {
        return iGPURenderObject;
    }

    const { pipeline, vertexBuffers, bindingResourceInfoMap } = getIGPURenderPipeline(renderObject.pipeline, renderPass, renderObject.vertices);

    iGPURenderObject = {
        ...renderObject,
        pipeline,
    };

    iGPURenderObject.vertexBuffers = vertexBuffers;

    if (renderObject.index)
    {
        const buffer = getIGPUBuffer(renderObject.index.buffer);

        iGPURenderObject.indexBuffer = { ...renderObject.index, buffer };
    }

    // 计算 bindGroups
    const bindGroups = getIGPUSetBindGroups(pipeline, renderObject.bindingResources, bindingResourceInfoMap);

    iGPURenderObject.bindGroups = bindGroups;

    renderObjectMap.set([renderObject, renderPass], iGPURenderObject);

    return iGPURenderObject;
}
const renderObjectMap = new ChainMap<[IRenderObject, IRenderPass], IGPURenderObject>();

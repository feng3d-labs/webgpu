import { IGPURenderObject } from "../data/IGPURenderObject";
import { IGPURenderPassDescriptor } from "../data/IGPURenderPassDescriptor";
import { ChainMap } from "../utils/ChainMap";
import { getIGPURenderPipeline } from "./getIGPURenderPipeline";
import { getIGPUSetBindGroups } from "./getIGPUSetBindGroups";

export function getIGPURenderObject(device: GPUDevice, renderObject: IGPURenderObject, renderPass: IGPURenderPassDescriptor)
{
    let iGPURenderObject = renderObjectMap.get([renderObject, renderPass]);
    if (iGPURenderObject)
    {
        return iGPURenderObject;
    }

    const { pipeline, vertexBuffers, bindingResourceInfoMap } = getIGPURenderPipeline(device, renderObject.pipeline, renderPass, renderObject.vertices);

    iGPURenderObject = {
        ...renderObject,
        pipeline,
    };

    iGPURenderObject.vertexBuffers = vertexBuffers;

    // 计算 bindGroups
    const bindGroups = getIGPUSetBindGroups(pipeline, renderObject.bindingResources, bindingResourceInfoMap);

    iGPURenderObject.bindGroups = bindGroups;

    renderObjectMap.set([renderObject, renderPass], iGPURenderObject);

    return iGPURenderObject;
}
const renderObjectMap = new ChainMap<[IGPURenderObject, IGPURenderPassDescriptor], IGPURenderObject>();

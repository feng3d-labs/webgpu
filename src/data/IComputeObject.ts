import { IGPUComputeObject, IGPUComputePipeline, IGPUProgrammableStage } from 'webgpu-data-driven';
import { IBindingResources } from './IBindingResources';

export interface IComputeObject extends Omit<IGPUComputeObject, 'pipeline' | 'bindGroups'>
{
    /**
     * 计算管线。
     */
    pipeline: IComputePipeline;

    /**
     * 绑定资源。包含数值、纹理、采样、外部纹理。
     */
    bindingResources?: IBindingResources;
}

export interface IComputePipeline extends Omit<IGPUComputePipeline, 'compute'>
{
    /**
     * 计算程序。
     */
    compute: IProgrammableStage;
}

/**
 *
 */
export interface IProgrammableStage extends Omit<IGPUProgrammableStage, 'entryPoint'>
{
    /**
     * The name of the function in {@link GPUProgrammableStage#module} that this stage will use to
     * perform its work.
     *
     * 入口函数可选。默认从着色器中进行反射获取。
     */
    entryPoint?: string;
}

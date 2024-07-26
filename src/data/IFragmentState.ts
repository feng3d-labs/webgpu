import { IGPUFragmentState } from '../webgpu-data-driven/data/IGPURenderObject';

/**
 * 片段着色器阶段描述。
 *
 * {@link IGPUFragmentState}
 */
export interface IFragmentState extends Omit<IGPUFragmentState, 'entryPoint' | 'targets'>
{
    /**
     * The name of the function in {@link GPUProgrammableStage#module} that this stage will use to
     * perform its work.
     *
     * 入口函数可选。默认从着色器中进行反射获取。
     */
    entryPoint?: string;

    /**
     * A list of {@link GPUColorTargetState} defining the formats and behaviors of the color targets
     * this pipeline writes to.
     */
    targets?: IColorTargetState[];
}

/**
 * 属性 `format` 将由渲染通道中附件给出。
 */
export interface IColorTargetState extends Omit<GPUColorTargetState, 'format'>
{

}

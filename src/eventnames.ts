export const GPUQueue_submit = 'GPUQueue_submit';

export const IGPUSampler_changed = 'IGPUSampler_changed';

/**
 * 通过反应式机制更改数值来触发事件。
 */
export const webgpuEvents: {
    /**
     * 提交WebGPU前数值加一。
     *
     * 用于处理提交前需要执行的操作。
     *
     * 例如 {@link GPUCanvasContext.getCurrentTexture} 与 {@linkGPUDevice.importExternalTexture } 需要在提交前执行，检查结果是否变化。
     *
     * 注：引擎内部处理，外部无需关心。
     *
     * @private
     */
    readonly preSubmit: number;
} = {
    preSubmit: 0,
};
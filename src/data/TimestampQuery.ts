/**
 * 查询通道运行消耗时长（单位为纳秒）。
 */
export interface TimestampQuery
{
    /**
     * 是否支持该特性时将调用此回调函数。
     *
     * @param isSupports 当前WebGPU是否支持该特性。
     */
    onSupports?(isSupports: boolean): void;

    /**
     * 获得结果时将调用此回调函数。
     *
     * @param elapsedNs 通道运行消耗时长（单位为纳秒）
     */
    onQuery?(elapsedNs: number): void;
}
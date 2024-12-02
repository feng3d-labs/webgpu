/**
 * 查询通道运行消耗时长（单位为纳秒）。
 */
export interface IGPUTimestampQuery
{
    /**
     * （单位为纳秒）
     */
    elapsedNs?: number;

    /**
     * 当前WebGPU是否支持该特性。
     */
    isSupports?: boolean;
}
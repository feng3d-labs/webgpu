import { } from '@feng3d/render-api';

declare module '@feng3d/render-api'
{
    /**
     * GPU缓冲区。
     *
     * {@link GPUBufferDescriptor}
     * {@link GPUBuffer}
     */
    export interface Buffer
    {
        /**
         * 允许缓冲区使用的用途。
         *
         * 默认  GPUBufferUsage.COPY_SRC
                | GPUBufferUsage.COPY_DST
                | GPUBufferUsage.INDEX
                | GPUBufferUsage.VERTEX
                | GPUBufferUsage.UNIFORM
                | GPUBufferUsage.STORAGE
                | GPUBufferUsage.INDIRECT
                | GPUBufferUsage.QUERY_RESOLVE 。
         *
         * 除了GPU与CPU数据交换的`MAP_READ`与`MAP_WRITE`除外。
         *
         *  注：修改后将重新创建GPUBuffer。
         *
         */
        readonly usage?: GPUBufferUsageFlags;
    }

}
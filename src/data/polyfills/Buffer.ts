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
         * The allowed usages for the buffer.
         *
         * 默认  GPUBufferUsage.COPY_SRC
                | GPUBufferUsage.COPY_DST
                | GPUBufferUsage.INDEX
                | GPUBufferUsage.VERTEX
                | GPUBufferUsage.UNIFORM
                | GPUBufferUsage.STORAGE
                | GPUBufferUsage.INDIRECT
                | GPUBufferUsage.QUERY_RESOLVE 。

         *  注：修改允许缓冲区使用的用途时，会重新创建缓冲区。
         *
         */
        readonly usage?: GPUBufferUsageFlags;
    }

}
GPUBufferUsage;
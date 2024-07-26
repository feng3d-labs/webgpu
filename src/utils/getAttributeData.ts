/**
 * 从组合的顶点数据中获取指定属性数据。
 *
 * @param vertexArray 组合的顶点数据。
 * @param offset 指定顶点属性数据在单个顶点数据中的偏移。
 * @param attributeSize 单个顶点属性尺寸。
 * @param vertexSize 单个顶点数据尺寸。
 */
export function getAttributeData(vertexArray: Float32Array, offset: number, attributeSize: number, vertexSize: number)
{
    const vertexNum = vertexArray.length / vertexSize;
    const attributeArray = new (vertexArray.constructor as typeof Float32Array)(vertexNum * attributeSize);
    for (let i = 0; i < vertexNum; i++)
    {
        for (let j = 0; j < attributeSize; j++)
        {
            attributeArray[i * attributeSize + j] = vertexArray[i * vertexSize + offset + j];
        }
    }

    return attributeArray;
}

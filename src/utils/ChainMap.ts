/**
 * 链式Map。
 *
 * 多个key数组对应一个值。
 *
 * 由于键值可能是字面值也可能是对象，因此无法使用 {@link WeakMap} 来构建{@link ChainMap}，只能使用 {@link Map}。
 */
export class ChainMap<K extends Array<any>, V>
{
    private _map = new Map();

    /**
     * 获取键对应的值。
     *
     * @param keys 键。
     * @returns 值。
     */
    get(keys: K): V
    {
        let map = this._map;

        for (let i = 0, n = keys.length - 1; i < n; i++)
        {
            map = map.get(keys[i]);

            if (map === undefined) return undefined;
        }

        return map.get(keys[keys.length - 1]);
    }

    /**
     * 设置映射。
     *
     * @param keys 键。
     * @param value 值。
     */
    set(keys: K, value: V)
    {
        let map = this._map;

        for (let i = 0; i < keys.length - 1; i++)
        {
            const key = keys[i];

            if (map.has(key) === false) map.set(key, new Map());

            map = map.get(key);
        }

        map.set(keys[keys.length - 1], value);
    }

    /**
     * 删除映射。
     *
     * @param keys 键。
     * @returns 如果找到目标值且被删除返回 `true` ，否则返回 `false` 。
     */
    delete(keys: K): boolean
    {
        let map = this._map;

        for (let i = 0; i < keys.length - 1; i++)
        {
            map = map.get(keys[i]);

            if (map === undefined) return false;
        }

        return map.delete(keys[keys.length - 1]);
    }
}


import { assert, describe, it } from "vitest";
const { ok, equal, deepEqual, strictEqual } = assert;

import { ChainMap } from "../../src/utils/ChainMap";
import { ChainObjectMap } from "../../src/utils/ChainObjectMap";

describe("ChainMap", () =>
{
    it("ChainMap", () =>
    {
        const o = {};

        const map = new ChainMap<[number, boolean, string, {}], number>();
        map.set([0, true, "a", o], 1);

        let result = map.get([0, true, "a", o]);
        equal(1, result);

        map.delete([0, true, "a", o]);
        result = map.get([0, true, "a", o]);
        equal(undefined, result);
    });

    it("性能测试", () =>
    {
        const Num = 100000;
        const data = new Array(Num).fill(0).map((v, i) => ({ key0: Math.random(), key1: Math.random() < 0.5, key2: "abc"[Math.floor(Math.random() * 3)], result: i }))

        const chainMap = new ChainMap<[number, boolean, string], number>();
        console.time(`ChainMap set`);
        data.forEach((v) =>
        {
            chainMap.set([v.key0, v.key1, v.key2], v.result);
        });
        console.timeEnd(`ChainMap set`);

        console.time(`ChainMap get`);
        data.forEach((v) =>
        {
            const result = chainMap.get([v.key0, v.key1, v.key2]);
            equal(v.result, result);
        });
        console.timeEnd(`ChainMap get`);

        const chainObjectMap = new ChainObjectMap<[number, boolean, string], number>();
        console.time(`ChainObjectMap set`);
        data.forEach((v) =>
        {
            chainObjectMap.set([v.key0, v.key1, v.key2], v.result);
        });
        console.timeEnd(`ChainObjectMap set`);

        console.time(`ChainObjectMap get`);
        data.forEach((v) =>
        {
            const result = chainObjectMap.get([v.key0, v.key1, v.key2]);
            equal(v.result, result);
        });
        console.timeEnd(`ChainObjectMap get`);


        equal(1, 1);
    });
});

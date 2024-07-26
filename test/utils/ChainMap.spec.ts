import { assert, describe, it } from "vitest";
const { ok, equal, deepEqual, strictEqual } = assert;

import { ChainMap } from "../../src/utils/ChainMap";

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
});

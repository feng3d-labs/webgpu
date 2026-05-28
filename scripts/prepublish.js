import * as fs from 'fs';
import * as path from 'path';

const pkgpath = path.resolve('package.json');

let pkg = fs.readFileSync(pkgpath, 'utf8');

pkg = pkg
    // 发布到 GitHub Packages 时 scope 需要匹配仓库组织名
    .replaceAll(`"name": "@feng3d/webgpu"`, `"name": "@feng3d-labs/webgpu"`)
    //
    .replaceAll(`"types": "./src/index.ts"`, `"types": "./lib/index.d.ts"`)
    //
    .replaceAll(`"module": "./src/index.ts"`, `"module": "./dist/index.js"`)
    .replaceAll(`"main": "./src/index.ts"`, `"main": "./dist/index.umd.cjs"`)
    //
    .replaceAll(`"import": "./src/index.ts"`, `"import": "./dist/index.js"`)
    .replaceAll(`"require": "./src/index.ts"`, `"require": "./dist/index.umd.cjs"`)
;

fs.writeFileSync(pkgpath, pkg, 'utf8');


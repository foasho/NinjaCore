# @ninjagl/core ライブラリ

DEMO: https://ninja-core.vercel.app

NinjaGL のコアライブラリ

- Editor: https://github.com/foasho/NinjaGL
- Core: HERE
- API: https://github.com/foasho/NinjaApi

## 主な依存関係

- three
- @react-three/fiber
- @react-three/drei
- @react-three/xr
- @react-three/postprocessing

## Coreの説明
物理エンジンはthree-mesh-bvhで構成される。
- static: 外的移動のない静的なMesh
  - step1: OMの変更フラグ[changedBvh]を付ける(全体として)
    - staticなomがsetPosition、setRotation, setScaleで変更されたとき
    - 新しいOMが追加/削除されたとき
  - step2: useFrame内で設定されたフラグをチェック
    - フラグがTrueの場合、[regenerateMesh()](https://github.com/gkjohnson/three-mesh-bvh/blob/master/example/skinnedMesh.js#L256C10-L256C26)を実施
- moveable: 衝突によって移動するMesh
  - step1: moveablesにgrp化されたchildrenをforEachで、IDに紐づくOMを確認
  - step2: OMにorderMovedフラグをチェック
  - step3: 該当するOMのBVHMeshの衝突点とmoveableの質量(mass)

### .env のパラメータ

マルチプレイヤーや AINPCs をテストするときに利用

#### 新 Skyway

[新 Skyway の AppID とシークレットキー](https://skyway.ntt.com/ja/)

#### OpenAI-API

[OPENAI の API キー](https://platform.openai.com/api-keys)

### ShowCase の実行

```
pnpm install
pnpm dev
```

### Build & Publish

lib issue

```
npm publish
```

## ライブラリメンテナ

```
pnpm vitest
```

## その他

### Playerオブジェクト
アニメーションのキー名は以下に設定

- 静止: Idle
- 歩く: Walk
- 走る: Run
- ジャンプ: Jump


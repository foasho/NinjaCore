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

## Core の説明

物理エンジンは three-mesh-bvh で構成される。

- static: 外的移動のない静的な Mesh
  - step1: OM の変更フラグ[changedBvh]を付ける(全体として)
    - static な om が setPosition、setRotation, setScale で変更されたとき
    - 新しい OM が追加/削除されたとき
  - step2: useFrame 内で設定されたフラグをチェック
    - フラグが True の場合、[regenerateMesh()](https://github.com/gkjohnson/three-mesh-bvh/blob/master/example/skinnedMesh.js#L256C10-L256C26)を実施
- moveable: 衝突によって移動する Mesh
  - step1: moveables に grp 化された children を forEach で、ID に紐づく OM を確認
  - step2: OM に orderMoved フラグをチェック
  - step3: 該当する OM の BVHMesh の衝突点と moveable の質量(mass)

### .env のパラメータ

マルチプレイヤーや AINPCs をテストするときに利用

#### 新 Skyway

[新 Skyway の AppID とシークレットキー](https://skyway.ntt.com/ja/)

```
SKYWAY_APP_ID=
SKYWAY_APP_SECRET_KEY=
```

#### OpenAI-API

[OPENAI の API キー](https://platform.openai.com/api-keys)

```
OPENAI_API_KEY=
```

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

### Player オブジェクト

アニメーションのキー名は以下に設定

- 静止: Idle
- 歩く: Walk
- 走る: Run
- ジャンプ: Jump

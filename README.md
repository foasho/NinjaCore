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


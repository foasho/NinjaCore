import {
  Object3D,
  Vector2,
  AnimationClip,
  AnimationMixer,
  Audio,
  Vector3,
} from "three";
import { NinjaIconType } from "../uis/NinjaIcons";

/**
 * NinjaGLの基本パラメータ
 */
export interface IConfigParams {
  projectName: string; // プロジェクト名
  physics: boolean; // 物理演算を有効にするか
  dpr: undefined | number | [number, number]; // デバイスピクセル比※undefinedの場合は(window.devicePixelRatio || 1)を利用
  multi: boolean; // マルチモード
  isApi: boolean; // APIモード ※NPCの会話やMultiに必要
  isDebug?: boolean; // デバッグモード
}

/**
 * 入力系のInputパラメータ
 */
export interface IInputMovement {
  forward: number;
  backward: number;
  left: number;
  right: number;
  jump: boolean;
  dash: boolean;
  action: boolean;
  speed: number;
  prevDrag: Vector2 | null;
  curDrag: Vector2 | null;
  pressedKeys: string[];
  angleAxis: [number, number];
}

/**
 * Canvas上に表示されるもの
 */
export interface IObjectManagement {
  id: string;
  name?: string;
  type:
    | "three"
    | "object"
    | "lodobject"
    | "avatar"
    | "terrain"
    | "others"
    | "text"
    | "text3d"
    | "audio"
    | "image"
    | "video"
    | "water"
    | "sky"
    | "light"
    | "fog"
    | "camera"
    | "effect"
    | "cloud"
    | "environment"
    | "lightformer"
    | "ai-npc";
  filePath?: string;
  visibleType: "auto" | "force";
  visible: boolean;
  layerNum?: number;
  args: any;
  rules?: any;
  physics: boolean;
  moveable?: boolean; //移動可能かどうか
  phyType: "box" | "sphere" | "capsule";
}

/**
 * 操作系UI上に表示されるもの
 */
export interface IUIManagement {
  type: "controller" | "button" | "label" | "select" | "textinput";
  id: string;
  name?: string;
  position: {
    x: number;
    y: number;
  };
  styles?: string;
  args?: any;
  visible: boolean;
  startIcon?: NinjaIconType;
  endIcon?: NinjaIconType;
}

/**
 * テクスチャマネジメント
 */
export interface ITextureManagement {
  type: "image";
  id: string;
  name?: string;
  filePath?: string;
}

/**
 * Shaderマネジメント
 */
export interface IShaderManagement {
  id: string;
  vertexShader?: string;
  fragmentShader?: string;
  name?: string;
  filePath?: string;
  binary: Blob;
}

/**
 * スクリプトマネジメント
 */
export interface IScriptManagement {
  type: string; // 種別: "script"今は一つだけ
  id: string; // ID: UUID
  name: string; // 名前
  script: string; // JSスクリプトデータ
}

export interface ISoundProps {
  id: string;
  key: string;
  sound: Audio;
  loop: boolean;
  volume: number;
  filePath: string;
  position?: Vector3;
  trigAnim?: string;
  stopAnim?: string;
}

export interface ISetSoundOption {
  id: string;
  key: string;
  filePath: string;
  loop: boolean;
  volume: number;
  trigAnim?: string;
  stopAnim?: string;
}

export interface IUpdateSoundOption {
  key: string;
  filePath?: string;
  loop?: boolean;
  volume?: number;
  trigAnim?: string;
  stopAnim?: string;
}

export type kvsProps = {
  [key: string]: string;
};

export type MessageProps = {
  id: string;
  message: string;
  username?: string;
  avatar?: string;
  fileUrl?: any;
  fileType?: "image" | "video" | "audio" | "file";
  messagedAt: Date;
};

export type PlayerInfoProps = {
  name: string;
  avatar: string;
  objectURL?: string;
  cameraMode: "first" | "third";
};

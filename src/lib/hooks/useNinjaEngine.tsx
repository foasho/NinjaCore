import React from "react";
import {
  IConfigParams,
  IInputMovement,
  IObjectManagement,
  IScriptManagement,
  ITextureManagement,
  IUIManagement,
  InitMobileConfipParams,
  NonColliderTunnel,
  NJCFile,
  loadNJCFileFromURL,
} from "../utils";
import { Group, Mesh, Object3D, Vector3 } from "three";
import { Canvas as NCanvas, useFrame as useNFrame } from "@react-three/fiber";
import { useInputControl } from "./useInputControl";
import { Loading3D, Loading2D } from "../loaders";
import {
  OMEffects,
  OMObjects,
  Cameras,
  ColliderField,
  OMEnvirments,
  StaticObjects,
  OMAudios,
  AiNPCs,
} from "../canvas-items";
import { NWorkerProp, useNinjaWorker } from "./useNinjaWorker";
import { MemoSplashScreen } from "../commons";

export enum EDeviceType {
  Unknown = 0,
  Desktop = 1,
  Tablet = 2,
  Mobile = 3,
}

export enum ENinjaStatus {
  Play = 0,
  Pause = 1,
}

type NinjaEngineProp = {
  status: ENinjaStatus;
  isPhysics: boolean;
  player: React.MutableRefObject<Mesh | null>;
  curPosition: React.MutableRefObject<Vector3>;
  updateCurPosition: (pos: Vector3) => void;
  curMessage: React.MutableRefObject<string>;
  isSound: boolean;
  setIsSound: (isSound: boolean) => void;
  colGrp: Group | null;
  scriptWorker: NWorkerProp;
  input: IInputMovement;
  config: IConfigParams;
  oms: IObjectManagement[];
  sms: IScriptManagement[];
  ums: IUIManagement[];
  tms: ITextureManagement[];
  setOMObjectById: (id: string, obj: Object3D) => void;
  getOMById: (id: string) => IObjectManagement | null;
  getOMByName: (name: string) => IObjectManagement | null;
  getSMById: (id: string) => IScriptManagement | null;
};
export const NinjaEngineContext = React.createContext<NinjaEngineProp>({
  status: ENinjaStatus.Pause,
  isPhysics: true,
  player: React.createRef<Mesh>(),
  curPosition: React.createRef<Vector3>(),
  updateCurPosition: (pos: Vector3) => {},
  curMessage: React.createRef<string>(),
  isSound: false,
  setIsSound: (isSound: boolean) => {},
  colGrp: null,
  scriptWorker: {
    loadUserScript: async () => {},
    runFrameLoop: () => {},
    runInitialize: () => {},
  },
  input: {
    forward: 0,
    backward: 0,
    left: 0,
    right: 0,
    jump: false,
    dash: false,
    action: false,
    prevDrag: null,
    curDrag: null,
    speed: 0,
    pressedKeys: [],
    angleAxis: [0, 0],
  },
  config: InitMobileConfipParams,
  oms: [],
  sms: [],
  ums: [],
  tms: [],
  setOMObjectById: () => {},
  getOMById: () => null,
  getOMByName: () => null,
  getSMById: () => null,
} as NinjaEngineProp);

export const useNinjaEngine = () => React.useContext(NinjaEngineContext);

export const detectDeviceType = (): EDeviceType => {
  if (typeof window !== "undefined") {
    // check if window is defined (we are on client side)
    const ua = navigator.userAgent;
    if (
      ua.indexOf("iPhone") > 0 ||
      ua.indexOf("iPod") > 0 ||
      (ua.indexOf("Android") > 0 && ua.indexOf("Mobile") > 0)
    ) {
      return EDeviceType.Mobile;
    } else if (ua.indexOf("iPad") > 0 || ua.indexOf("Android") > 0) {
      return EDeviceType.Tablet;
    } else if (
      navigator.maxTouchPoints &&
      navigator.maxTouchPoints > 2 &&
      /MacIntel/.test(navigator.platform)
    ) {
      return EDeviceType.Tablet;
    } else {
      return EDeviceType.Desktop;
    }
  } else {
    return EDeviceType.Unknown; // as a default, return "desktop" when window is not defined (we are on server side)
  }
};

/**
 * Canvas(@react-three/fiber)内部に設置するProvider
 * ex):
 * <Canvas>
 *  <NinjaEngineProvider/>
 * </Canvas>
 */
interface INinjaEngineProvider {
  njc?: NJCFile | null;
  njcPath?: string;
  noCanvas?: boolean;
  isSplashScreen?: boolean;
  children?: React.ReactNode;
}
export const ThreeJSVer = "0.154.0";
export const NinjaGL = ({
  njc,
  njcPath,
  noCanvas = false,
  isSplashScreen = true,
  children,
}: INinjaEngineProvider) => {
  const [init, setInit] = React.useState(false);
  const [status, setStatus] = React.useState<ENinjaStatus>(ENinjaStatus.Pause);
  const [isSound, setIsSound] = React.useState<boolean>(false); // サウンドの有効/無効
  // coreファイル
  const [njcFile, setNjcFile] = React.useState<NJCFile | null>(null);
  // Loading周り
  const loadingPercentage = React.useRef<number>(0);
  const cameraLayer = React.useRef<number>(1);
  const [device, setDevice] = React.useState<EDeviceType>(EDeviceType.Unknown);
  // コンテンツ管理
  const [config, setConfig] = React.useState<IConfigParams>(
    InitMobileConfipParams
  );
  const [oms, setOMs] = React.useState<IObjectManagement[]>([]);
  const [ums, setUMs] = React.useState<IUIManagement[]>([]);
  const [tms, setTMs] = React.useState<ITextureManagement[]>([]);
  const [sms, setSMs] = React.useState<IScriptManagement[]>([]);
  // Player情報
  const player = React.useRef<Mesh>(null);
  const curPosition = React.useRef<Vector3>(new Vector3(0, 0, 0));
  const curMessage = React.useRef<string>("");
  // 物理世界
  const [physics, setPhysics] = React.useState<boolean>(true);
  const colGrp = React.useRef<Group>(null); // BVH用/Octree用コライダー
  // 汎用入力
  const { input, attachJumpBtn, attachRunBtn } = useInputControl({});
  // Debugツリー
  const debugTree = React.useRef<any>(null);
  // スクリプトワーカー(NinjaWokrer)
  const scriptWorker = useNinjaWorker({ ThreeJSVer });

  React.useEffect(() => {
    // njcが指定されていればそのままセット
    if (njc && !njcFile) {
      setNjcFile(njc);
    }
    // njcPathが指定されていれば読み込み
    if (njcPath && !njcFile) {
      console.log(njcPath);
      loadNJCFile(njcPath);
    }
    // njcFileが設定済みなら初期設定を行う
    if (njcFile) {
      // 1. 接続デバイスを判定する
      setDevice(detectDeviceType());
      // 3. Coreファイルを読み込む
      setOMs(njcFile.oms);
      setUMs(njcFile.ums);
      setTMs(njcFile.tms);
      setSMs(njcFile.sms);
      if (njcFile.config) {
        setConfig(njcFile.config);
      }
      setInit(true);
    }
  }, [njcFile, njc, njcPath]);

  React.useEffect(() => {
    if (init) {
      // 1. 初期設定完了後にPhyWold/ScriptWorkerの設置アップ
      scriptWorker.loadUserScript(sms);
    }
  }, [init]);

  React.useEffect(() => {
    const checkAudio = async () => {
      // 音声をならせられるかどうかを設定する
      try {
        if (isSound) return;
        const audio = new Audio("/audios/system.mp3");
        // volumeを0にしておく
        audio.volume = 0;
        await audio.play();
        setIsSound(true);
      } catch (e) {
        setIsSound(false);
      }
    };
    checkAudio();
  });

  /**
   * njcPathからFileをロード
   */
  const loadNJCFile = async (path: string) => {
    const startTime = new Date().getTime();
    const data = await loadNJCFileFromURL(path);
    const endTime = new Date().getTime();
    console.info(`<< LoadedTime: ${endTime - startTime}ms >>`);
    setNjcFile(data);
    console.log(data);
  };

  /**
   * ----------------------------------------
   * Functions for NinjaEngineWorker
   * ----------------------------------------
   */
  // IDからOMを取得する
  const getOMById = (id: string): IObjectManagement | null => {
    const om = oms.find((om) => om.id === id);
    if (om) {
      return om;
    }
    return null;
  };
  // 名前からOMを取得する
  const getOMByName = (name: string): IObjectManagement | null => {
    const om = oms.find((om) => om.name === name);
    if (om) {
      return om;
    }
    return null;
  };
  // 特定のOMにObject3Dを追加する
  const setOMObjectById = (id: string, obj: Object3D) => {
    const om = oms.find((om) => om.id === id);
    if (om) {
      om.object = obj;
    }
  };
  // IDからSMを取得する
  const getSMById = (id: string): IScriptManagement | null => {
    const sm = sms.find((sm) => sm.id === id);
    if (sm) {
      return sm;
    }
    return null;
  };

  const updateCurPosition = (pos: Vector3) => {
    curPosition.current = pos;
  };

  return (
    <NinjaEngineContext.Provider
      value={{
        status,
        isPhysics: physics,
        scriptWorker,
        input,
        player,
        curPosition,
        updateCurPosition,
        curMessage,
        isSound,
        setIsSound,
        colGrp: colGrp.current,
        config,
        oms,
        sms,
        ums,
        tms,
        setOMObjectById,
        getOMById,
        getOMByName,
        getSMById,
      }}
    >
      <MemoSplashScreen />
      {init && njcFile && (
        <>
          {!noCanvas ? (
            <NCanvas>
              <React.Suspense
                fallback={<Loading3D isLighting position={[0, 0, 3]} />}
              >
                <NinjaCanvasItems />
                {children}
              </React.Suspense>
            </NCanvas>
          ) : (
            <>{children}</>
          )}
          {/** UIレンダリング */}
        </>
      )}
      {!init && !noCanvas && (
        <>
          {/** ローディング */}
          <Loading2D />
        </>
      )}
    </NinjaEngineContext.Provider>
  );
};

/**
 * Canvasレンダリング
 */
type NinjaCanvasProp = {
  children?: React.ReactNode;
};
export const NinjaCanvas = ({ children }: NinjaCanvasProp) => (
  <NCanvas>{children}</NCanvas>
);
export const NinjaCanvasItems = () => {
  return (
    <>
      {/** OMのID */}
      <OMObjects />
      <StaticObjects />
      {/** AINPC */}
      <AiNPCs />
      {/** Audio */}
      <OMAudios />
      {/** エフェクト */}
      <OMEffects />
      {/** 環境 */}
      <OMEnvirments />
      {/** カメラ */}
      <Cameras />
      {/** ColliderField & Player */}
      <ColliderField />
      {/** NonCollider */}
      <NonColliderTunnel.Out />
      <group>
        <SystemFrame />
      </group>
    </>
  );
};

/**
 * システムフレーム(時間をすすめる)
 */
const SystemFrame = () => {
  const { status, scriptWorker, input, sms } = useNinjaEngine();

  // フレームの更新
  useNFrame((state, delta) => {
    if (status === ENinjaStatus.Pause) {
      return;
    }

    // 3. ユーザースクリプトの更新
    if (scriptWorker) {
      sms.forEach((sm) => {
        scriptWorker.runFrameLoop(sm.id, state, delta, input);
      });
    }
  });

  return <></>;
};

import React, { useEffect, useRef } from "react";
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
import { MdMusicNote, MdMusicOff } from "react-icons/md";
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
import { NinjaWorkerProvider, useNinjaWorker } from "./useNinjaWorker";
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
  input: IInputMovement;
  config: IConfigParams;
  oms: IObjectManagement[];
  sms: IScriptManagement[];
  ums: IUIManagement[];
  tms: ITextureManagement[];
  getOMById: (id: string) => IObjectManagement | null;
  getOMByName: (name: string) => IObjectManagement | null;
  getSMById: (id: string) => IScriptManagement | null;
  setArg: (id: string, key: string, arg: any) => void;
  addOM: (om: IObjectManagement) => void;
  onOMIdChanged: (id: string, listener: () => void) => void;
  offOMIdChanged: (id: string, listener: () => void) => void;
  onOMsChanged: (listener: () => void) => void;
  offOMsChanged: (listener: () => void) => void;
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
  getOMById: () => null,
  getOMByName: () => null,
  getSMById: () => null,
  setArg: () => {},
  addOM: () => {},
  onOMIdChanged: () => {},
  offOMIdChanged: () => {},
  onOMsChanged: () => {},
  offOMsChanged: () => {},
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
export const ThreeJSVer = "0.157.0";
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
      // scriptWorker.loadUserScript(sms);
      setTimeout(() => {
        setStatus(ENinjaStatus.Play);
      }, 3000);
    }
  }, [init]);

  React.useEffect(() => {
    console.log("isSound", isSound);

    const checkAudio = async () => {
      // 音声をならせられるかどうかを設定する
      const audioContext = new AudioContext();
      try {
        audioContext
          .resume()
          .then(() => {
            console.log("AudioContext successfully started");
            setIsSound(true); // 成功時に isSound を true に設定
          })
          .catch((error) => {
            console.error("Webセキュリティにより、音声を再生できません。");
            setIsSound(false); // エラー時に isSound を false に設定
          });
      } catch (error) {
        console.error("Webセキュリティにより、音声を再生できません。");
        setIsSound(false); // エラー時に isSound を false に設定
      }
    };
    checkAudio();
  }, []);

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
  // IDからSMを取得する
  const getSMById = (id: string): IScriptManagement | null => {
    const sm = sms.find((sm) => sm.id === id);
    if (sm) {
      return sm;
    }
    return null;
  };
  const setArg = (id: string, key: string, arg: any) => {
    const om = oms.find((om) => om.id === id);
    if (om) {
      om.args[key] = arg;
      notifyOMIdChanged(id);
    }
  };
  const addOM = (om: IObjectManagement, multiShare = true) => {
    setOMs([...oms, om]);
    if (multiShare) {
      // multiplayer利用時は、他のクライアントにもOMを追加する
      // TODO: 他のクライアントにOMを追加する
    }
    notifyOMsChanged();
  };

  // Listenerを作成
  /**
   * 個別のOM変更リスナー
   */
  const objectManagementIdChangedListeners = useRef<{
    [id: string]: (() => void)[];
  }>({});
  const onOMIdChanged = (id: string, listener: () => void) => {
    if (!objectManagementIdChangedListeners.current[id]) {
      objectManagementIdChangedListeners.current[id] = [];
    }
    objectManagementIdChangedListeners.current[id].push(listener);
  };
  const offOMIdChanged = (id: string, listener: () => void) => {
    if (!objectManagementIdChangedListeners.current[id]) {
      return;
    }
    objectManagementIdChangedListeners.current[id] =
      objectManagementIdChangedListeners.current[id].filter(
        (l) => l !== listener
      );
  };
  // 特定のOM変更を通知する
  const notifyOMIdChanged = (id: string) => {
    if (!objectManagementIdChangedListeners.current[id]) {
      return;
    }
    objectManagementIdChangedListeners.current[id].forEach((l) => l());
  };
  /**
   * OMsの変更リスナー
   */
  const objectManagementChangedListeners = useRef<(() => void)[]>([]);
  const onOMsChanged = (listener: () => void) => {
    objectManagementChangedListeners.current.push(listener);
  };
  const offOMsChanged = (listener: () => void) => {
    objectManagementChangedListeners.current =
      objectManagementChangedListeners.current.filter((l) => l !== listener);
  };
  // OMsの変更を通知する
  const notifyOMsChanged = () => {
    objectManagementChangedListeners.current.forEach((l) => l());
  };

  const updateCurPosition = (pos: Vector3) => {
    curPosition.current = pos;
  };

  return (
    <NinjaEngineContext.Provider
      value={{
        status,
        isPhysics: physics,
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
        getOMById,
        getOMByName,
        getSMById,
        setArg,
        addOM,
        onOMIdChanged,
        offOMIdChanged,
        onOMsChanged,
        offOMsChanged,
      }}
    >
      {/** スプラッシュスクリーン */ isSplashScreen && <MemoSplashScreen />}
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
      {!init && !noCanvas && <Loading2D />}
      <SystemSound />
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
    <NinjaWorkerProvider ThreeJSVer={ThreeJSVer}>
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
    </NinjaWorkerProvider>
  );
};

/**
 * システムフレーム(時間をすすめる)
 */
const SystemFrame = () => {
  const { status, input, sms } = useNinjaEngine();
  const { runFrameLoop, runInitialize, loadUserScript } = useNinjaWorker();

  useEffect(() => {
    if (status === ENinjaStatus.Pause) {
      return;
    }
    const startScript = async () => {
      // 1. ユーザースクリプトの読み込み
      await loadUserScript(sms);
      // 2. ユーザースクリプトの初期化
      sms.forEach((sm) => {
        runInitialize(sm.id);
      });
    };
    startScript();
  }, [status, sms]);

  // フレームの更新
  useNFrame((state, delta) => {
    if (status === ENinjaStatus.Pause) {
      return;
    }

    // 3. ユーザースクリプトの更新
    sms.forEach((sm) => {
      runFrameLoop(sm.id, state, delta, input);
    });
  });

  return <></>;
};

const SystemSound = () => {
  const { isSound, setIsSound } = useNinjaEngine();
  return (
    <div
      style={{
        position: "absolute",
        top: "1rem",
        right: "1rem",
        padding: ".5rem 1.5rem",
        fontSize: "1.5rem",
        color: "#fff",
        background: "rgba(0,0,0,0.5)",
        borderRadius: "5px",
      }}
      onClick={() => {
        setIsSound(!isSound);
      }}
    >
      {isSound && (
        <MdMusicNote style={{ display: "inline", verticalAlign: "middle" }} />
      )}
      {!isSound && (
        <MdMusicOff style={{ display: "inline", verticalAlign: "middle" }} />
      )}
    </div>
  );
};

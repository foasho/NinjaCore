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
  MoveableColliderTunnel,
  ConvPos,
} from "../utils";
import { MdMusicNote, MdMusicOff } from "react-icons/md";
import {
  Box3,
  Group,
  Line3,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  RingGeometry,
  Sphere,
  Vector3,
} from "three";
import { Canvas as NCanvas, useFrame as useNFrame } from "@react-three/fiber";
import { InputControlProvider, useInputControl } from "./useInputControl";
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
import { Moveable } from "../canvas-items/Moveables";
import { MeshBVH } from "three-mesh-bvh";
import { Capsule } from "three-stdlib";
import { UIItems } from "../uis";
import { NinjaKVSProvider } from "./useKVS";

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

// function onCollide( object1: Object3D, object2: Object3D, point: Vector3, normal: any, velocity: number, gravity: number, offset = 0 ) {

// 	if ( velocity < Math.max( Math.abs( 0.04 * gravity ), 5 ) ) {
// 		return;
// 	}

// 	// Create an animation when objects collide
// 	const effectScale = Math.max(
// 		object2 ?
// 			Math.max( object1.collider.radius, object2.collider.radius ) :
// 			object1.collider.radius,
// 		0.4
// 	) * 2.0;
// 	const plane = new Mesh(
// 		new RingGeometry( 0, 1, 30 ),
// 		new MeshBasicMaterial( { side: 2, transparent: true, depthWrite: false } )
// 	);
// 	plane.lifetime = 0;
// 	plane.maxLifetime = 0.4;
// 	plane.maxScale = effectScale * Math.max( Math.sin( Math.min( velocity / 200, 1 ) * Math.PI / 2 ), 0.35 );

// 	plane.position.copy( point ).addScaledVector( normal, offset );
// 	plane.quaternion.setFromUnitVectors( forwardVector, normal );
// 	// scene.add( plane );
// 	// hits.push( plane );

// }

type NinjaEngineProp = {
  device: EDeviceType;
  status: ENinjaStatus;
  isPhysics: boolean;
  player: React.MutableRefObject<Mesh | null>;
  curPosition: React.MutableRefObject<Vector3>;
  updateCurPosition: (pos: Vector3) => void;
  curMessage: React.MutableRefObject<string>;
  isSound: boolean;
  setIsSound: (isSound: boolean) => void;
  bvhGrp: React.MutableRefObject<Group | null>;
  bvhCollider: React.MutableRefObject<Mesh | null>;
  moveGrp: React.MutableRefObject<Group | null>;
  boundsTree: React.MutableRefObject<MeshBVH | null>;
  updateCollisions: (daltaTime: number) => void;
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
  device: EDeviceType.Unknown,
  status: ENinjaStatus.Pause,
  isPhysics: true,
  player: React.createRef<Mesh>(),
  curPosition: React.createRef<Vector3>(),
  updateCurPosition: (pos: Vector3) => {},
  curMessage: React.createRef<string>(),
  isSound: false,
  setIsSound: (isSound: boolean) => {},
  bvhGrp: React.createRef<Group>(),
  bvhCollider: React.createRef<Mesh>(),
  moveGrp: React.createRef<Group>(),
  boundsTree: React.createRef<Object3D>(),
  updateCollisions: (daltaTime: number) => {},
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
  const bvhGrp = React.useRef<Group>(null); // BVH用コライダー
  const bvhCollider = React.useRef<Mesh>(null); // BVH用コライダー
  const moveGrp = React.useRef<Group>(null); // 移動用コライダー
  const boundsTree = React.useRef<MeshBVH>(null); // BVH-boundsTree
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
    document.addEventListener('contextmenu', function(event) {
      event.preventDefault();
    }, false);
    return () => {
      document.removeEventListener('contextmenu', function(event) {
        event.preventDefault();
      }, false);
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
  const setArg = (id: string, key: string, arg: any, offListenser = false) => {
    const om = oms.find((om) => om.id === id);
    if (om) {
      // argsが異なれば、更新する
      if (om.args[key] !== arg) {
        if (["position", "scale", "velocity"].includes(key)) {
          om.args[key] = ConvPos(arg);
        } else {
          om.args[key] = arg;
        }
        if (!offListenser) notifyOMIdChanged(id);
      }
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

  const gravity = -9.8;
  const deadBoxY = -80;
  const tempBox = new Box3();
  const tempSphere = new Sphere();
  const tempCapsule = new Capsule();
  const tempSegment = new Line3();
  const tempVec = new Vector3();
  const tempVector = new Vector3();
  const tempVector2 = new Vector3();
  const tempMat = new Matrix4();
  const deltaVec = new Vector3();
  const colliders = [];
  const updateCollisions = (deltaTime: number) => {
    if (!bvhCollider.current) return;
    if (!moveGrp.current) return;
    if (!boundsTree.current) return;
    // 衝突判定
    for (const object of moveGrp.current.children) {
      // TODO: ここで、移動可能なオブジェクトの衝突判定を行う
      const om = getOMById(object.userData.omId);
      if (!om) return;
      let collider;
      // DeadBoxに入ったら、処理をスキップする
      if (object.position.y < deadBoxY) {
        continue;
      }
      if (!om.args.velocity) {
        om.args.velocity = new Vector3(0, 0, 0);
      }
      let radius = 0.5;
      if (om.phyType === "box") {
        const position = object.position.clone();
        const min = position
          .clone()
          .sub(object.scale.clone().multiplyScalar(0.5));
        const max = position
          .clone()
          .add(object.scale.clone().multiplyScalar(0.5));
        collider = new Box3(min, max);
        tempBox.copy(collider);

        om.args.velocity.y += gravity * deltaTime;
        collider.min.addScaledVector(om.args.velocity, deltaTime);
      } else if (om.phyType === "sphere") {
        collider = new Sphere(
          om.args.position || new Vector3(0, 0, 0),
          om.args.radius || 1
        );
        tempSphere.copy(collider);
        om.args.velocity.y += gravity * deltaTime;
        collider.center.addScaledVector(om.args.velocity, deltaTime);
      } else if (om.phyType === "capsule") {
        tempBox.makeEmpty();
        tempMat.copy(bvhCollider.current.matrixWorld).invert();
        const sizeBox = new Box3().setFromObject(object);
        const height = sizeBox.max.y - sizeBox.min.y;
        radius = Math.max(sizeBox.max.x, sizeBox.max.z);
        const segment = new Line3(
          new Vector3(),
          new Vector3(0, -height / 2, 0.0)
        );
        tempSegment.copy(segment);

        // ローカル空間内のユーザーの位置を取得
        tempSegment.start
          .applyMatrix4(object.matrixWorld)
          .applyMatrix4(tempMat);
        tempSegment.end.applyMatrix4(object.matrixWorld).applyMatrix4(tempMat);
        // 軸が整列した境界ボックスを取得
        tempBox.expandByPoint(tempSegment.start);
        tempBox.expandByPoint(tempSegment.end);

        tempBox.min.addScalar(radius);
        tempBox.max.addScalar(radius);
      }
      colliders.push(collider);
      // BVH-boundsTreeとの衝突判定
      // TODO: Remove Deadbox
      // if ( sphereCollider.center.y < - 80 ) {}

      let collided = false;
      boundsTree.current.shapecast({
        intersectsBounds: (box) => {
          if (om.phyType === "box") {
            return box.intersectsBox(tempBox);
          } else if (om.phyType === "sphere") {
            return box.intersectsSphere(tempSphere);
          } else if (om.phyType === "capsule") {
            return box.intersectsBox(tempBox);
          }
          return false;
        },
        intersectsTriangle: (tri) => {
          if (om.phyType === "sphere") {
            // get delta between closest point and center
            tri.closestPointToPoint(tempSphere.center, deltaVec);
            deltaVec.sub(tempSphere.center);
            const distance = deltaVec.length();
            if (distance < tempSphere.radius) {
              // move the sphere position to be outside the triangle
              const radius = tempSphere.radius;
              const depth = distance - radius;
              deltaVec.multiplyScalar(1 / distance);
              tempSphere.center.addScaledVector(deltaVec, depth);

              collided = true;
            }
          } else if (om.phyType === "capsule") {
            const triPoint = tempVector;
            const capsulePoint = tempVector2;
            const distance = tri.closestPointToSegment(
              tempSegment,
              triPoint,
              capsulePoint
            );
            if (distance < radius) {
              const depth = radius - distance;
              const direction = capsulePoint.sub(triPoint).normalize();
              tempSegment.start.addScaledVector(direction, depth);
              tempSegment.end.addScaledVector(direction, depth);

              collided = true;
            }
          } else if (om.phyType === "box") {
            const triPoint = tempVector;
            const capsulePoint = tempVector2;
            const distance = tri.closestPointToSegment(
              tempSegment,
              triPoint,
              capsulePoint
            );
            if (distance < radius) {
              const depth = radius - distance;
              const direction = capsulePoint.sub(triPoint).normalize();
              tempSegment.start.addScaledVector(direction, depth);
              tempSegment.end.addScaledVector(direction, depth);

              collided = true;
            }
          }
        },
        boundsTraverseOrder: (box) => {
          if (om.phyType === "box") {
            return box.distanceToPoint(tempBox.min);
          } else if (om.phyType === "capsule") {
            return box.distanceToPoint(tempCapsule.start);
          }
          // Default Sphere
          return box.distanceToPoint(tempSphere.center);
        },
      });

      // 衝突処理
      if (collided) {
        if (om.phyType === "box") {
          // TODO: sphereの関数を参考にして
        } else if (om.phyType === "sphere") {
          // get the delta direction and reflect the velocity across it
          deltaVec
            .subVectors(tempSphere.center, (collider as Sphere).center)
            .normalize();
          om.args.velocity.reflect(deltaVec);

          // dampen the velocity and apply some drag
          const dot = om.args.velocity.dot(deltaVec);
          om.args.velocity.addScaledVector(deltaVec, -dot * 0.5);
          om.args.velocity.multiplyScalar(Math.max(1.0 - deltaTime, 0));

          // update the sphere collider position
          (collider as Sphere).center.copy(tempSphere.center);

          // find the point on the surface that was hit
          tempVec
            .copy(tempSphere.center)
            .addScaledVector(deltaVec, -tempSphere.radius);

          // TODO: 衝突処理
          // onCollide( sphere, null, tempVec, deltaVec, dot, 0.05 );
        } else if (om.phyType === "capsule") {
          // TODO: sphereの関数を参考にして衝突関数前の処理を書く
        }
      }
    }
    // Handle collisions
    for (const object of moveGrp.current.children) {
      // TODO: ここで、衝突に対する移動値を計算する
    }
  };

  return (
    <NinjaEngineContext.Provider
      value={{
        device,
        status,
        isPhysics: config.physics,
        input,
        player,
        curPosition,
        updateCurPosition,
        curMessage,
        isSound,
        setIsSound,
        bvhGrp,
        bvhCollider,
        moveGrp,
        boundsTree,
        updateCollisions,
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
      <div
        id="Ninjaviewer"
        style={{ width: "100%", height: "100%", position: "relative", userSelect: "none" }}
      >
        <NinjaWorkerProvider ThreeJSVer={ThreeJSVer}>
          <NinjaKVSProvider>
            <InputControlProvider>
              {
                /** スプラッシュスクリーン */ isSplashScreen && (
                  <MemoSplashScreen />
                )
              }
              {init && njcFile && (
                <>
                  {/** Canvasレンダリング */}
                  {!noCanvas ? (
                    <NCanvas
                      style={{
                        width: "100%",
                        height: "100%",
                        position: "absolute",
                      }}
                    >
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
                  <UIItems />
                </>
              )}
              {!init && !noCanvas && <Loading2D />}
              <SystemSound />
            </InputControlProvider>
          </NinjaKVSProvider>
        </NinjaWorkerProvider>
      </div>
    </NinjaEngineContext.Provider>
  );
};

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
      {/** Moveable */}
      <Moveable />
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

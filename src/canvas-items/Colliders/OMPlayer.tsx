import * as React from "react";
import { useRef, useEffect, useState } from "react";
import { IObjectManagement } from "../../utils";
import { Group, Vector3, Euler, AnimationAction, AnimationClip, Mesh, AnimationMixer } from "three";
import { EDeviceType, useNinjaEngine, detectDeviceType } from "../../hooks";
import { useGLTF } from "@react-three/drei";
import { PlayerControl } from "./PlayerControls";

/**
 * Player表示
 * Playerが場合は通常のカメラを表示する
 * @returns 
 */
interface IOMPlayerProps {
  grp: React.RefObject<Group>
}
export const OMPlayer = ({ grp }: IOMPlayerProps) => {
  const ref = React.useRef<any>();
  const engine = useNinjaEngine();
  const [mounted, setMounted] = React.useState(false);

  const player = React.useMemo(() => {
    if (!engine) return null;
    const avatar = engine.oms.find((o: IObjectManagement) => o.type === "avatar");
    return avatar? avatar : null;
  }, [engine]);

  React.useEffect(() => {
    if (player && ref.current && engine) {
      if (player.args.position){
        ref.current.position.copy(player.args.position.clone());
      }
      if (player.args.rotation){
        ref.current.rotation.copy(player.args.rotation.clone());
      }
      if (player.args.scale){
        ref.current.scale.copy(player.args.scale.clone());
      }
    }
  }, [player]);


  return (
    <>
      {player &&
        // @ts-ignore
        <Player gpr={grp} objectURL={player.args.url} initPosition={player.args.position} initRotation={player.args.rotation} />
      }
    </>
  )
}

/**
 * プレイヤー
 */
interface IPlayerProps {
  grp: React.RefObject<Group>
  objectURL: string
  initPosition?: Vector3
  initRotation?: Euler
  scale?: number
}
export const Player = ({
  grp,
  objectURL,
  initPosition = new Vector3(0, 3, 0),
  initRotation = new Euler(0, 0, 0),
  scale = 0.75
}: IPlayerProps) => {
  const playerRef = useRef<Mesh>(null)
  const [device, setDevice] = useState<EDeviceType>(EDeviceType.Unknown)
  const { scene, animations } = useGLTF(objectURL) as any
  const [mixer, setMixer] = useState<AnimationMixer>()
  const [myActions, setMyActions] = useState<{ [x: string]: AnimationAction }>({})
  const p = initPosition ? initPosition : new Vector3(0, 0, 0)

  useEffect(() => {
    if (scene && animations) {
      const _mixer = new AnimationMixer(scene)
      setMixer(_mixer)
      const _actions: { [x: string]: AnimationAction } = {}
      animations.forEach((clip: AnimationClip) => {
        _actions[clip.name] = _mixer.clipAction(clip)
      })
      setMyActions(_actions)
    }
    setDevice(detectDeviceType());
    // Storeに保持
    // setPlayerRef(playerRef);
  }, [scene, animations, objectURL])

  return (
    <group renderOrder={1}>
      <mesh ref={playerRef} scale={scale} position={p} rotation={initRotation ? initRotation : new Euler(0, 0, 0)}>
        <primitive object={scene} />
      </mesh>
      {device !== EDeviceType.Unknown && (
        <PlayerControl object={playerRef} grp={grp} resetPosition={initPosition} actions={myActions} mixer={mixer} device={device} />
      )}
    </group>
  )
}
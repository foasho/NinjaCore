import { useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import React from "react";
import { Object3D } from "three";
import { IInputMovement } from "../utils";
import { useNinjaWorker, useWebRTC } from "../hooks";

type PlayerAnimationHelperProps = {
  id: string;
  object: Object3D;
};
export const PlayerAnimationHelper = ({
  id,
  object,
}: PlayerAnimationHelperProps) => {
  const animations = object.animations;
  const { ref, actions, mixer } = useAnimations(animations);
  const { getMemberData } = useWebRTC();
  const { worker } = useNinjaWorker();

  const updateAnimation = (
    input: IInputMovement,
    delta: number,
    isGround: boolean
  ) => {
    if (!actions) return;
    if (
      input.forward !== 0 ||
      input.backward !== 0 ||
      input.left !== 0 ||
      input.right !== 0
    ) {
      // 歩きの時は歩きのアニメーションを再生
      if (actions["Walk"] && !input.dash) {
        actions["Walk"].play();
      } else if (actions["Run"] && input.dash) {
        // ダッシュの時はダッシュのアニメーションを再生
        actions["Run"].play();
      }
    } else if (!isGround) {
      // ジャンプのアニメーション
      if (actions["Jump"]) {
        actions["Jump"].play();
        Object.keys(actions).forEach((key) => {
          if (key !== "Jump" && actions[key]) {
            actions[key]!.stop();
          }
        });
      }
    } else {
      // 何もないときは、Idleを再生し、Idle以外が再生されていれば停止
      if (actions["Idle"]) {
        actions["Idle"].play();
        Object.keys(actions).forEach((key) => {
          if (key !== "Idle" && actions[key]) {
            actions[key]!.stop();
          }
        });
      }
    }
    mixer.update(delta);
  };

  useFrame((_state, delta) => {
    const pdata = getMemberData(id);
    if (pdata) {
      // 位置/回転情報更新
      const { input } = pdata;
      if (input) updateAnimation(input, delta, true);
    }
  });

  return (
    <primitive
      ref={ref}
      onClick={() => {
        if (worker.current) {
          worker.current.postMessage({
            type: "click",
            id: id,
          });
        }
      }}
      onDoubleClick={() => {
        if (worker.current) {
          worker.current.postMessage({
            type: "doubleclick",
            id: id,
          });
        }
      }}
      object={object}
    />
  );
};

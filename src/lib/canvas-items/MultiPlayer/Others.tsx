import React, { useEffect, useMemo, useRef, useState } from "react";
import { Html, useHelper } from "@react-three/drei";
import { useWebRTC } from "../../hooks";
import { useFrame } from "@react-three/fiber";
import {
  AnimationAction,
  Group,
  Mesh,
  LoadingManager,
  AnimationClip,
  AnimationMixer,
  Quaternion,
  Vector3,
  BoxHelper,
  Object3D,
} from "three";
import { IInputMovement, loadGLTF } from "../../utils";
import { SkeletonUtils } from "three-stdlib";
import { PlayerAnimationHelper } from "../../commons/PlayerAnimationHelper";
import { DisntanceVisible } from "../../helpers";

export interface IOthersProps {}

export const Others = () => {
  const { membersData, me, updateCnt } = useWebRTC();
  const othersData = useMemo(() => {
    return membersData.filter((data) => data.id !== me?.id);
  }, [updateCnt, membersData, me]);

  return (
    <>
      {othersData.map((data) => {
        return <OtherPlayer key={data.id} id={data.id!} />;
      })}
    </>
  );
};

interface IOtherPlayer {
  id: string;
}
const OtherPlayer = ({ id }: IOtherPlayer) => {
  const otherRef = useRef<Mesh>(null);
  const messageRef = useRef<any>(null);
  const { getMemberData, activeDistance, curPosition } = useWebRTC();
  const [objUrl, setObjUrl] = useState<string>("/models/ybot.glb");
  const nowChange = useRef<boolean>(false);
  const [scene, setScene] = useState<Group | null>(null);
  const [clone, setClone] = useState<Object3D | null>(null);
  const [animations, setAnimations] = useState<AnimationClip[]>([]);
  const [mixer, setMixer] = useState<AnimationMixer | null>(null);
  const [message, setMessage] = useState<string>("");
  const [actions, setActions] = useState<{ [key: string]: AnimationAction }>(
    {}
  ); // アニメーションの再生用

  useEffect(() => {
    const gltfSet = async (objUrl: string) => {
      const gltf = await loadGLTF(objUrl);
      if (gltf) {
        setScene(gltf as Group);
      }
    };
    // objUrlが変更されたら、アニメーションを更新
    if (objUrl) {
      gltfSet(objUrl);
    }
  }, [objUrl]);

  useEffect(() => {
    if (scene) {
      // cloneを作成
      const clone = SkeletonUtils.clone(scene);
      // animationsもコピー
      clone.animations = animations;
      clone.traverse((node) => {
        if (node instanceof Mesh) {
          node.castShadow = true;
        }
      });
      clone.traverse((node) => {
        if (node instanceof Mesh) {
          node.receiveShadow = true;
        }
      });
      setClone(clone);
    }
  }, [scene]);

  useFrame(() => {
    const pdata = getMemberData(id);
    if (pdata && otherRef.current) {
      // 位置/回転情報更新
      const { position, rotation } = pdata;
      if (position && rotation) {
        // lerpを使って滑らかに移動
        otherRef.current.position.lerp(position, 0.2);
        // slerpを使って滑らかに回転
        otherRef.current.quaternion.slerp(
          new Quaternion().setFromEuler(rotation),
          0.2
        );
      }
      if (pdata.objectURL && objUrl !== pdata.objectURL && !nowChange.current) {
        nowChange.current = true;
        // objUrlが変更されたら、アニメーションを更新
        setObjUrl(pdata.objectURL);
      }
      // メッセージがあれば追加
      if (pdata.message && message !== pdata.message) {
        setMessage(pdata.message);
        setTimeout(() => {
          messageRef.current.visible = false;
          setMessage("");
        }, 5000);
      }
    }
    if (message && message.length > 0) {
      // messageのposition と rotation を更新
      const { position, rotation } = otherRef.current!;
      if (position && rotation) {
        // positionはやや高い位置
        const newPosition = position.clone().add(new Vector3(0, 2.5, 0));
        messageRef.current.position.lerp(newPosition, 0.2);
        messageRef.current.quaternion.slerp(
          new Quaternion().setFromEuler(rotation),
          0.2
        );
      }
    }
  });

  return (
    <>
      <DisntanceVisible>
        {clone ? (
          <PlayerAnimationHelper id={id} object={clone} />
        ) : (
          <mesh ref={otherRef}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={"#00FF00"} />
          </mesh>
        )}
      </DisntanceVisible>
      {message && message.length > 0 && (
        <DisntanceVisible>
          <mesh ref={messageRef}>
            <Html>
              <div
                className={""}
                style={{
                  fontSize: "13px",
                  minWidth: "100px",
                  maxWidth: "200px",
                  background: "#fff",
                  borderRadius: "5px",
                  padding: "5px",
                  userSelect: "none",
                  marginTop: "50px",
                }}
              >
                {message}
              </div>
            </Html>
          </mesh>
        </DisntanceVisible>
      )}
    </>
  );
};

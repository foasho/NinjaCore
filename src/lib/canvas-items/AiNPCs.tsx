import React, { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, Html } from "@react-three/drei";
import {
  Vector3,
  Euler,
  Group,
  MathUtils,
  AnimationMixer,
  Object3D,
} from "three";
import { playTextToSpeech } from "../hooks/useTextToSpeech";
import { useNinjaEngine } from "../hooks";
import { SkeletonUtils } from "three-stdlib";
import { AnimationHelper } from "../helpers/AnimationHelper";
import { IObjectManagement } from "../utils";
import { DisntanceVisible } from "../helpers";

export const AiNPCs = () => {
  const { oms } = useNinjaEngine();
  const ainpcs = oms.filter((om) => om.type === "ai-npc");
  return (
    <>
      {ainpcs.map((ainpc) => (
        <AiNPC
          key={ainpc.id}
          om={ainpc}
          npcName={ainpc.args.npcName}
          objectURL={ainpc.args.url}
          system={ainpc.args.system}
          apiURL={ainpc.args.apiURL}
          position={ainpc.args.position}
          rotation={ainpc.args.rotation}
          scale={ainpc.args.scale}
          trackingRotation={ainpc.args.trackingRotation}
          conversationDistance={ainpc.args.conversationDistance}
          talkSpeed={ainpc.args.talkSpeed}
          isSpeak={ainpc.args.isSpeak}
        />
      ))}
    </>
  );
};

interface IConversationProps {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * NPC
 */
export interface AiNPCProps {
  om: IObjectManagement;
  npcName?: string;
  objectURL?: string;
  system?: string;
  apiURL?: string;
  trackingRotation?: boolean;
  trackingNodeName?: string;
  conversationDistance?: number;
  position?: Vector3;
  rotation?: Euler;
  rangeAzimuthAngle?: number;
  scale?: Vector3;
  randomMoveRange?: Vector3 | [number, number, number];
  textBackground?: string;
  talkSpeed?: number;
  isSpeak?: boolean;
  isRandomMove?: boolean;
}
export const AiNPC = ({
  om,
  npcName = "AIくん",
  objectURL = "/models/ybot.glb",
  system = undefined,
  apiURL = "/api/npc/conversations",
  trackingRotation = true,
  trackingNodeName = undefined,
  conversationDistance = 5,
  position = new Vector3(0, 0, 0),
  rotation = new Euler(0, 0, 0),
  rangeAzimuthAngle = undefined,
  scale = new Vector3(1, 1, 1),
  randomMoveRange = [0, 0, 0],
  textBackground = "#43D9D9bb",
  talkSpeed = 2.0,
  isSpeak = true,
  isRandomMove = false,
}: AiNPCProps) => {
  const target = useRef<Group | null>(null);
  const mesHtmlRef = useRef<any>(null);
  const { scene, animations, nodes } = useGLTF(objectURL) as any;
  const { curPosition, curMessage, config } = useNinjaEngine();
  const [conversations, setConversations] = useState<IConversationProps[]>([]);
  const [lastAssistantMessage, setLastAssistantMessage] =
    useState<IConversationProps>();
  const [clone, setClone] = useState<Object3D>();

  useEffect(() => {
    if (scene) {
      // cloneを作成
      const clone = SkeletonUtils.clone(scene);
      // animationsもコピー
      clone.animations = animations;
      setClone(clone);
    }
    if (target.current) {
      target.current.position.copy(position as Vector3);
      target.current.rotation.copy(rotation as Euler);
      target.current.scale.copy(scale as Vector3);
    }
  }, [scene]);

  const getAssistantMessage = async (
    cons: IConversationProps[]
  ): Promise<IConversationProps> => {
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversations: cons }),
    };
    const response = await fetch(apiURL, requestOptions);
    const json = await response.json();
    // 失敗した場合、適当に埋め合わせする
    if (response.status !== 200) {
      return {
        role: "assistant",
        content: "すみません、\nよくわかりませんでした。",
      };
    }
    return {
      role: "assistant",
      content: json.content,
    };
  };

  useEffect(() => {
    if (!config.isApi) return;
    const dinstance = curPosition.current.distanceTo(target.current!.position);
    // systemが設定されている場合、初期メッセージを追加する
    if (system && conversations.length === 0) {
      const convers: IConversationProps[] = [];
      const systemMessage: IConversationProps = {
        role: "system",
        content: system,
      };
      convers.push(systemMessage);
      setConversations(convers);
    }

    if (dinstance < conversationDistance) {
      if (curMessage.current && curMessage.current !== "") {
        const userMessage: IConversationProps = {
          role: "user",
          content: curMessage.current,
        };
        // 最後の要素が重複していないかチェックする
        if (conversations.length > 0) {
          const lastConversation = conversations[conversations.length - 1];
          if (lastConversation.content === userMessage.content) {
            return;
          }
        }
        setConversations((prevConversations) => [
          ...prevConversations,
          userMessage,
        ]);
      }
    }
    return () => {
      setConversations([]);
    };
  }, [curMessage]);

  useEffect(() => {
    const update = async (conversations: IConversationProps[]) => {
      const assistantMessage: IConversationProps = await getAssistantMessage(
        conversations
      );
      const _nowConversations = conversations;
      _nowConversations.push(assistantMessage);
      setConversations([..._nowConversations]);
      setLastAssistantMessage(assistantMessage);
    };
    // conversationsの最後のroleがuserの場合、assistantの発言を追加する
    if (conversations.length > 0) {
      const lastConversation = conversations[conversations.length - 1];
      if (lastConversation.role === "user") {
        update(conversations);
      }
    }
  }, [conversations]);

  useEffect(() => {
    if (
      isSpeak &&
      lastAssistantMessage &&
      lastAssistantMessage.content &&
      lastAssistantMessage.content !== ""
    ) {
      playTextToSpeech({
        text: lastAssistantMessage.content,
        lang: "ja-JP",
        speed: talkSpeed,
      });
    }
  }, [lastAssistantMessage]);

  useFrame((state, delta) => {
    if (target.current) {
      if (isRandomMove) {
        // 調整中
      }
      const dinstance = curPosition.current.distanceTo(target.current.position);
      if (dinstance < conversationDistance) {
        // trackingRotationがtrueの場合、curPositionの方向を向く
        const rotationY = Math.atan2(
          curPosition.current.x - target.current.position.x,
          curPosition.current.z - target.current.position.z
        );
        if (trackingRotation) {
          // 向くときはTargetPositionに向くように回転させる
          if (rangeAzimuthAngle) {
            const targetDeg = MathUtils.radToDeg(target.current.rotation.y);
            const nowDeg = MathUtils.radToDeg(rotationY);
            const minDeg = targetDeg - MathUtils.radToDeg(rangeAzimuthAngle);
            const maxDeg = targetDeg + MathUtils.radToDeg(rangeAzimuthAngle);
            if (minDeg < nowDeg && nowDeg < maxDeg) {
              if (trackingNodeName) {
                const trackingNode = nodes[trackingNodeName];
                if (trackingNode) {
                  trackingNode.rotation.y =
                    rotationY - target.current.rotation.y;
                } else {
                  target.current.rotation.y = rotationY;
                }
              } else {
                target.current.rotation.y = rotationY;
              }
            }
          } else {
            target.current.rotation.y = rotationY;
          }
        }
        // targetの上にメッセージを表示する
        if (mesHtmlRef.current) {
          const mesPosition = new Vector3();
          mesPosition.setFromMatrixPosition(target.current.matrixWorld);
          const offsetY = 2;
          mesHtmlRef.current.position.set(
            mesPosition.x,
            mesPosition.y + offsetY,
            mesPosition.z
          );
        }
      } else {
        if (mesHtmlRef.current) {
          mesHtmlRef.current.visible = false;
          setLastAssistantMessage(undefined);
        }
      }
    }
  });

  return (
    <>
      <DisntanceVisible distance={om.args.distance}>
        <group ref={target} position={position} scale={scale} rotation={rotation}>
          {clone && (
            <AnimationHelper
              id={om.id}
              object={clone}
            />
          )}
        </group>
      </DisntanceVisible>
      {lastAssistantMessage && (
        <mesh ref={mesHtmlRef}>
          <Html position={[0, 1, 0]}>
            <div
              style={{
                position: "absolute",
                left: "50%",
                transform: "translate(-50%, 0)",
                padding: "10px",
                width: "200px",
                borderRadius: "5px",
                background: textBackground,
                userSelect: "none",
                fontSize: "0.8em",
              }}
            >
              {lastAssistantMessage?.content}
            </div>
          </Html>
        </mesh>
      )}
    </>
  );
};

import React from "react";
import {
  useNinjaEngine,
  useWebRTC,
  IPublishData,
  useMultiInputControl,
} from "../../hooks";
import { useFrame } from "@react-three/fiber";

/**
 * MultiPlayer用
 * 自分自身のデータを共有
 */
export const MyselfSender = () => {
  const { player, curMessage, playerIsOnGround } = useNinjaEngine();
  const { publishData } = useWebRTC();
  const { input } = useMultiInputControl();

  useFrame(() => {
    if (publishData && player.current) {
      const sendData: IPublishData = {
        position: player.current.position,
        rotation: player.current.rotation,
        objectURL: player.current.userData.url,
        input: input,
        id: player.current.userData.omId,
        username: player.current.userData.username,
        message: curMessage.current,
        playerIsOnGround: playerIsOnGround.current,
      };
      publishData(sendData);
    }
  });

  return <></>;
};

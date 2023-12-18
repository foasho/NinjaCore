import React from "react";
import { MultiPlayerTunnel } from "../../utils";

/**
 * MultiPlayer用
 * 自分自身のデータを共有
 */
export const MyselfSender = () => {
  return (
    <MultiPlayerTunnel.In>
      <></>
    </MultiPlayerTunnel.In>
  );
};

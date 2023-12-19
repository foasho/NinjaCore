import React, { useEffect, useState } from "react";
import { WebRTCProvider, useNinjaEngine } from "../../hooks";
import { Others } from "./Others";
import { MultiPlayerTunnel } from "../../utils";
import { MyselfSender } from "./MyselfSender";

export const MultiPlayer = () => {
  const { config } = useNinjaEngine();
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    const fetchToken = async () => {
      const res = await fetch("/api/skyway/token");
      const response = await res.json();
      setToken(response.data);
    };
    if (config.isApi) {
      fetchToken();
    }
  }, [config.isApi]);

  return (
    <>
      {token && config.isApi && (
        <WebRTCProvider token={token} roomName={config.projectName}>
          <MultiPlayerTunnel.Out />
          <Others />
          <MyselfSender />
        </WebRTCProvider>
      )}
    </>
  );
};

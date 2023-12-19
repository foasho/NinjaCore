import React, { useEffect, useState } from "react";
import { WebRTCProvider, useNinjaEngine } from "../../hooks";
import { Others } from "./Others";
import { MyselfSender } from "./MyselfSender";
import { ShareColliders } from "./ShareCollider";

export const MultiPlayer = () => {
  const { config } = useNinjaEngine();
  const [token, setToken] = useState<string|null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      const res = await fetch("/api/skyway/token");
      const response = await res.json();
      if (res.status === 200 && response.data){
        setToken(response.data);
      }
    };
    if (config.isApi && config.multi) {
      fetchToken();
    }
  }, [config.isApi, config.multi]);

  return (
    <>
      {token && (
        <WebRTCProvider token={token} roomName={config.projectName}>
          <Others />
          <MyselfSender />
          <ShareColliders />
        </WebRTCProvider>
      )}
    </>
  );
};

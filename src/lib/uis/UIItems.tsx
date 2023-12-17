import React from "react";
import { useNinjaEngine } from "../hooks";
import { IUIManagement } from "../utils";
import { useNinjaWorker } from "../hooks/useNinjaWorker";

export const UIItems = () => {
  const { ums } = useNinjaEngine();
  const { worker } = useNinjaWorker();

  return (
    <div style={{ position: "absolute", zIndex: 10 }} id="target">
      {ums.map((um: IUIManagement) => {
        return (
          <div
            key={um.id}
            style={um.styles as React.CSSProperties}
            onClick={() => {
              if (worker.current) {
                worker.current.postMessage({ id: um.id, type: "click" });
              }
            }}
            onDoubleClick={() => {
              if (worker.current) {
                worker.current.postMessage({ id: um.id, type: "dblclick" });
              }
            }}
          />
        );
      })}
    </div>
  );
};

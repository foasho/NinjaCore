import React from "react";
import { useNinjaEngine, useNinjaWorker } from "../hooks";
import { IUIManagement } from "../utils";
import { convertCssProperties } from "../utils/Styling";

export const UIButtons = () => {
  const { ums } = useNinjaEngine();

  const filteredUms = ums.filter((um:IUIManagement) => um.type === "button");

  return (
    <>
      {filteredUms.map((um: any) => (
        <UIButton um={um} key={um.id} />
      ))}
    </>
  );
};

const UIButton = ({ um }: { um: IUIManagement }) => {
  const { worker } = useNinjaWorker();

  const styles = um.styles ? convertCssProperties(um.styles) : {};
  const text = um.args.text ? um.args.text : "";

  return (
    <button
      id={um.id}
      style={styles}
      onClick={() => {
        if (worker.current) {
          worker.current.postMessage({ id: um.id, type: "click" });
        }
      }}
    >
      {text}
    </button>
  );
};

import React from "react";
import { IUIManagement } from "../utils";
import { useNinjaEngine } from "../hooks";
import { convertCssProperties } from "../utils/Styling";

export const UILabels = () => {
  const { ums } = useNinjaEngine();

  const filteredUms = ums.filter((um: IUIManagement) => um.type === "label");

  return (
    <>
      {filteredUms.map((um: IUIManagement) => (
        <UILabel um={um} key={um.id} />
      ))}
    </>
  );
};

const UILabel = ({ um }: { um: IUIManagement }) => {
  const styles = um.styles ? convertCssProperties(um.styles) : {};
  const text = um.args.text ? um.args.text : "";
  return (
    <>
      {um.args.href ? (
        <a id={um.id} href={um.args.href} style={styles}>
          {text}
        </a>
      ) : (
        <span id={um.id}>{text}</span>
      )}
    </>
  );
};

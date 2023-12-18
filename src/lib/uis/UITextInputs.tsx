import React from "react";
import { useNinjaEngine, useNinjaWorker } from "../hooks";
import { IUIManagement } from "../utils";
import { BsMicFill } from "react-icons/bs";
import { convertCssProperties } from "../utils/Styling";
import { MdSend } from "react-icons/md";

export const UITextInputs = () => {
  const { ums } = useNinjaEngine();
  const filteredUms = ums.filter((um) => um.type === "textinput");
  return (
    <>
      {filteredUms.map((um) => (
        <UITextInput key={um.id} um={um} />
      ))}
    </>
  );
};

const UITextInput = ({ um }: { um: IUIManagement }) => {
  const { worker } = useNinjaWorker();
  const [message, setMessage] = React.useState("");
  const styles = um.args.styles ? convertCssProperties(um.args.styles) : {};

  return (
    <div style={styles} id={um.id}>
      <textarea
        value={message}
        onChange={(e) => {
          // 最後の改行を削除
          if (e.target.value.slice(-1) === "\n") {
            setMessage(e.target.value.slice(0, -1));
          } else {
            setMessage(e.target.value);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            // Shift + Enter で改行
            if (e.shiftKey) {
              setMessage(message + "\n");
            } else {
              // worker
              if (worker.current) {
                worker.current.postMessage({
                  id: um.id,
                  type: "sendtext",
                  message: message,
                });
              }
            }
          }
        }}
        style={{
          flexBasis: "100%",
          height: "44px",
          margin: "0 22px",
          padding: "0 11px",
          border: "none",
          borderRadius: "11px",
          fontSize: "12px",
        }}
      />
      <a
        style={{
          color: um.args.color || "#43D9D9",
          cursor: "pointer",
        }}
        onClick={() => {
          // worker
          if (worker.current) {
            worker.current.postMessage({
              id: um.id,
              type: "sendtext",
              message: message,
            });
          }
        }}
      >
        <MdSend style={{ display: "inline" }} />
      </a>
    </div>
  );
};

interface IRoundButtonProps {
  size?: string;
  className?: string;
  style?: any;
  onClick?: any;
  children?: JSX.Element | undefined;
}
const RoundButton = ({
  size = "w-10 h-10",
  className = "",
  style = undefined,
  onClick = null,
  children = undefined,
}: IRoundButtonProps) => {
  return (
    <button
      className={`rounded-full bg-main-color cursor-pointer ${size} ${className}`}
      onClick={onClick!}
      style={style}
    >
      {children}
    </button>
  );
};

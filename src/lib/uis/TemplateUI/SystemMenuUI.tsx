import React from "react";
import { useNinjaEngine } from "../../hooks";
import {
  useSpring,
  useSprings,
  animated,
  config,
  AsyncResult,
  SpringRef,
} from "@react-spring/web";
import { MdMusicNote, MdMusicOff } from "react-icons/md";
import {
  FaCompress,
  FaExpand,
  FaMicrophone,
  FaMicrophoneSlash,
} from "react-icons/fa";
import { BsCameraVideo, BsHeadset, BsHeadsetVr } from "react-icons/bs";

const animationConfig = {
  mass: 1,
  frictionLight: 20,
  frictionHeavy: 30,
  tension: 575,
  delay: 175,
};

export const SystemMenuUI = React.memo(() => {
  const [open, setOpen] = React.useState(false);

  const [styles, api] = useSpring(() => ({
    transformTop: "translate(-6px, 10px) rotate(0deg)",
    transformMiddle: "translate(-6px, 0px) rotate(0deg)",
    transformBottom: "translate(-6px, -10px) rotate(0deg)",
    widthTop: "24px",
    widthBottom: "20px",
    config: {
      mass: animationConfig.mass,
      friction: animationConfig.frictionHeavy,
      tension: animationConfig.tension,
    },
  }));

  return (
    <div
      style={{
        position: "absolute",
        top: "32px",
        right: "32px",
      }}
    >
      {/** Iconのバックグラウンド */}
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          backgroundColor: "#fff",
          padding: "6px",
        }}
      >
        <HamburgerMenu
          open={open}
          toggle={setOpen}
          api={api}
          styles={styles}
        ></HamburgerMenu>
      </div>
      {/** メニュー */}
      <IconMenuItems open={open} />
    </div>
  );
});

type HamburgerMenuProps = {
  open: boolean;
  toggle: React.Dispatch<React.SetStateAction<boolean>>;
  api: SpringRef<{
    transformTop: string;
    transformMiddle: string;
    transformBottom: string;
    widthTop: string;
    widthBottom: string;
  }>;
  styles: any;
};
const HamburgerMenu = ({ open, toggle, api, styles }: HamburgerMenuProps) => {
  const handleClick = () => {
    api.start({
      to: open
        ? [
            {
              transformTop: "translate(-6px, 18.5px) rotate(0deg)",
              transformMiddle: "translate(-6px, 0px) rotate(0deg)",
              transformBottom: "translate(-6px, -18.5px) rotate(0deg)",
              widthTop: "28px",
              widthBottom: "28px",
              config: { clamp: true },
            },
            {
              transformTop: "translate(-6px, 10px) rotate(0deg)",
              transformMiddle: "translate(-6px, 0px) rotate(0deg)",
              transformBottom: "translate(-6px, -10px) rotate(0deg)",
              widthTop: "24px",
              widthBottom: "20px",
              config: {
                clamp: false,
                friction: animationConfig.frictionLight,
                tension: animationConfig.tension,
              },
              delay: animationConfig.delay,
            },
          ]
        : [
            {
              transformTop: "translate(-6px, 18.5px) rotate(0deg)",
              transformMiddle: "translate(-6px, 0px) rotate(0deg)",
              transformBottom: "translate(-6px, -18.5px) rotate(0deg)",
              widthTop: "28px",
              widthBottom: "28px",
              config: { clamp: true },
            },
            {
              transformTop: "translate(-6px, 18.5px) rotate(45deg)",
              transformMiddle: "translate(-6px, 0px) rotate(45deg)",
              transformBottom: "translate(-6px, -18.5px) rotate(-45deg)",
              widthTop: "28px",
              widthBottom: "28px",
              config: {
                clamp: false,
                friction: animationConfig.frictionLight,
                tension: animationConfig.tension,
              },
              delay: animationConfig.delay,
            },
          ],
    });
    toggle((prev) => !prev);
  };

  const menuStyle = {
    height: "3px",
    backgroundColor: "#43D9D9",
    borderRadius: "2px",
  };

  return (
    <button
      style={{
        pointerEvents: "auto",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "flex-end",
        width: "40px",
        height: "40px",
        padding: "0px",
        border: "none",
        overflow: "hidden",
        backgroundColor: "transparent",
        cursor: "pointer",
      }}
      onClick={() => handleClick()}
    >
      <animated.div
        style={{
          transform: styles.transformTop,
          width: styles.widthTop,
          ...menuStyle,
        }}
      />
      <animated.div
        style={{
          transform: styles.transformMiddle,
          width: "28px",
          ...menuStyle,
        }}
      />
      <animated.div
        style={{
          transform: styles.transformBottom,
          width: styles.widthBottom,
          ...menuStyle,
        }}
      />
    </button>
  );
};

type IconMenuItemsProps = {
  open: boolean;
};

const IconMenuItems = ({ open }: IconMenuItemsProps) => {
  const items = [<FullScreen />, <VoiceChat />, <SystemSound />, <VRMode />];
  const springs = useSprings(
    items.length,
    items.map((_, index) => ({
      from: { opacity: 0, transform: "translateX(-50%)" },
      to: {
        opacity: open ? 1 : 0,
        transform: open ? "translateX(0%)" : "translateX(-50%)",
      },
      delay: open ? index * 100 : (items.length - index - 1) * 100,
    }))
  );
  const animationWidth = useSpring({
    from: { width: "0px" },
    to: async (next) => {
      if (open) {
        await next({
          width: `${items.length * 52 + 64}px`,
          opacity: 1,
          config: { duration: items.length * 50 },
        });
      } else {
        await next({
          width: `0px`,
          opacity: 0,
          config: { duration: items.length * 150 },
        });
      }
    },
  });

  return (
    <>
      {springs.map((props, index) => (
        <animated.div
          key={index}
          style={{
            ...props,
            position: "absolute",
            top: -12,
            right: `${index * 52 + 52}px`,
            pointerEvents: "auto",
          }}
        >
          {items[index]}
        </animated.div>
      ))}
      {/** BackGround用のアニメーションバー */}
      <animated.div
        style={{
          position: "absolute",
          top: "0px",
          right: 0,
          zIndex: -1,
          height: "52px",
          backgroundColor: "#43D9D9",
          pointerEvents: "none",
          borderRadius: "26px",
          ...animationWidth,
        }}
      />
    </>
  );
};

/**
 * VoiceChat
 */
const VoiceChat = () => {
  const [voiceChat, setVoiceChat] = React.useState(false); // [TODO] 仮置き
  // const { voiceChat, setVoiceChat } = useNinjaEngine();

  return (
    <div
      style={{
        position: "absolute",
        top: "1rem",
        right: "1rem",
        fontSize: "1.8rem",
        color: "#fff",
        borderRadius: "5px",
        cursor: "pointer",
        pointerEvents: "auto",
      }}
      onClick={() => {
        setVoiceChat(!voiceChat);
      }}
    >
      {voiceChat && (
        <FaMicrophone style={{ display: "inline", verticalAlign: "middle" }} />
      )}
      {!voiceChat && (
        <FaMicrophoneSlash
          style={{ display: "inline", verticalAlign: "middle" }}
        />
      )}
    </div>
  );
};

/**
 * システムサウンド
 */
const SystemSound = () => {
  const { isSound, setIsSound } = useNinjaEngine();
  // BsHeadsetVr
  return (
    <div
      style={{
        position: "absolute",
        top: "1rem",
        right: "1rem",
        fontSize: "1.8rem",
        color: "#fff",
        borderRadius: "5px",
        cursor: "pointer",
        pointerEvents: "auto",
      }}
      onClick={() => {
        setIsSound(!isSound);
      }}
    >
      {isSound && (
        <MdMusicNote style={{ display: "inline", verticalAlign: "middle" }} />
      )}
      {!isSound && (
        <MdMusicOff style={{ display: "inline", verticalAlign: "middle" }} />
      )}
    </div>
  );
};

/**
 * VRモード
 */
const VRMode = () => {
  const [isVRMode, setIsVRMode] = React.useState(false); // [TODO] 仮置き
  // const { isVRMode, setIsVRMode } = useNinjaEngine();
  // BsHeadsetVr
  return (
    <div
      style={{
        position: "absolute",
        top: "1rem",
        right: "1rem",
        fontSize: "1.8rem",
        color: "#fff",
        borderRadius: "5px",
        cursor: "pointer",
        pointerEvents: "auto",
      }}
      onClick={() => {
        setIsVRMode(!isVRMode);
      }}
    >
      {isVRMode && (
        <BsHeadsetVr style={{ display: "inline", verticalAlign: "middle" }} />
      )}
      {!isVRMode && (
        <BsCameraVideo style={{ display: "inline", verticalAlign: "middle" }} />
      )}
    </div>
  );
};

/**
 * 全画面表示
 */
const FullScreen = () => {
  const [zoom, setZoom] = React.useState(false); // [TODO] 仮置き

  const windowZoom = (value: boolean) => {
    // valueがtrueの場合は全画面表示
    if (value) {
      // 全画面表示
      document.body.requestFullscreen();
    } else {
      // 通常表示
      document.exitFullscreen();
    }
    setZoom(value);
  };

  return (
    <div
      style={{
        position: "absolute",
        top: "1rem",
        right: "1rem",
        fontSize: "1.8rem",
        color: "#fff",
        borderRadius: "5px",
        cursor: "pointer",
        pointerEvents: "auto",
      }}
      onClick={() => {
        windowZoom(!zoom);
      }}
    >
      {zoom && (
        <FaCompress style={{ display: "inline", verticalAlign: "middle" }} />
      )}
      {!zoom && (
        <FaExpand style={{ display: "inline", verticalAlign: "middle" }} />
      )}
    </div>
  );
};

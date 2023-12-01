import React, { useEffect, useState } from "react";
import "./SplashScreen.css";

type Props = {
  bgColor?: string;
  logoSrc?: string;
  splashTime?: number;
};
export const SplashScreen: React.FC = ({
  bgColor = "#000",
  logoSrc = "/logo.png",
  splashTime = 3000,
}: Props) => {
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (ref.current) {
        if (ref.current.style) {
          ref.current.style.display = "none";
        }
      }
    }, splashTime);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      ref={ref}
      className="splashScreen"
      style={{
        backgroundColor: bgColor,
      }}
    >
      <img src={logoSrc} alt="ロゴ" />
    </div>
  );
};

// memo化して再レンダリングを抑制
export const MemoSplashScreen = React.memo(SplashScreen);
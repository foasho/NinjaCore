import React, { useEffect } from "react";
import styled, { keyframes } from "styled-components";

const fadeInOut = keyframes`
  0% {
    opacity: 0;
  }
  25% {
    opacity: 1;
  }
  75% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
`;

const StyledDiv = styled.div`
  width: 100%;
  height: 100%;
  z-index: 999;
  animation: ${fadeInOut} 3s;
  display: flex;
  align-items: center;
  justify-content: center;
`;

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
    <StyledDiv
      ref={ref}
      style={{
        backgroundColor: bgColor,
      }}
    >
      <img src={logoSrc} alt="ロゴ" />
    </StyledDiv>
  );
};

// memo化して再レンダリングを抑制
export const MemoSplashScreen = React.memo(SplashScreen);

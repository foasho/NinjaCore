import * as React from "react";
import { useRef, useEffect, createContext, useContext } from "react";

// @ts-ignore
import PWAInstall from "@khmyznikov/pwa-install/dist/pwa-install.react.js";


type PWAInstallEventProps = {
  onInstallSuccess: (event: any) => void;
  onInstallFail: (event: any) => void;
  onUserChoiceResult: (event: any) => void;
  onInstallAvailable: (event: any) => void;
  onInstallHowTo: (event: any) => void;
  onInstallGallery: (event: any) => void;
  showDialog: () => void;
};
export type AppInfoProps = {
  manifestUrl: string;
  icon: string;
  name: string;
  description: string;
  installDescription: string;
};
export type PWAInstallProps = AppInfoProps & {
  children: React.ReactNode;
};

const PWAInstallContext = createContext({
  onInstallSuccess: () => {},
  onInstallFail: () => {},
  onUserChoiceResult: () => {},
  onInstallAvailable: () => {},
  onInstallHowTo: () => {},
  onInstallGallery: () => {},
  showDialog: () => {},
} as PWAInstallEventProps);

export const PWAInstallProvider = ({
  manifestUrl,
  icon,
  name,
  description,
  installDescription,
  children,
}: PWAInstallProps) => {
  const pwaInstallRef = useRef<HTMLDivElement>(null);

  const onInstallSuccess = (e: any) => {
    // NOTE: インストール成功時の処理
  }
  const onInstallFail = (e: any) => {
    // NOTE: インストール失敗時の処理
  }
  const onUserChoiceResult = (e: any) => {
    // NOTE: ユーザーの選択結果の処理
  }
  const onInstallAvailable = (e: any) => {
    // NOTE: インストール可能時の処理
  }
  const onInstallHowTo = (e: any) => {
    // NOTE: インストール方法の表示
  }
  const onInstallGallery = (e: any) => {
    // NOTE: インストールギャラリーの表示
  }

  /**
   * インストールダイアログの表示
   */
  const showDialog = () => {
    // @ts-ignore
    pwaInstallRef.current?.showDialog(true);
  } ;

  useEffect(() => {
    const currentElement = pwaInstallRef.current;

    const handleInstallSuccess = (event: any) => onInstallSuccess?.(event);
    const handleInstallFail = (event: any) => onInstallFail?.(event);
    const handleUserChoiceResult = (event: any) => onUserChoiceResult?.(event);
    const handleInstallAvailable = (event: any) => onInstallAvailable?.(event);
    const handleInstallHowTo = (event: any) => onInstallHowTo?.(event);
    const handleInstallGallery = (event: any) => onInstallGallery?.(event);

    if (currentElement) {
      currentElement.addEventListener(
        "pwa-install-success-event",
        handleInstallSuccess
      );
      currentElement.addEventListener(
        "pwa-install-fail-event",
        handleInstallFail
      );
      currentElement.addEventListener(
        "pwa-user-choice-result-event",
        handleUserChoiceResult
      );
      currentElement.addEventListener(
        "pwa-install-available-event",
        handleInstallAvailable
      );
      currentElement.addEventListener(
        "pwa-install-how-to-event",
        handleInstallHowTo
      );
      currentElement.addEventListener(
        "pwa-install-gallery-event",
        handleInstallGallery
      );

      return () => {
        currentElement.removeEventListener(
          "pwa-install-success-event",
          handleInstallSuccess
        );
        currentElement.removeEventListener(
          "pwa-install-fail-event",
          handleInstallFail
        );
        currentElement.removeEventListener(
          "pwa-user-choice-result-event",
          handleUserChoiceResult
        );
        currentElement.removeEventListener(
          "pwa-install-available-event",
          handleInstallAvailable
        );
        currentElement.removeEventListener(
          "pwa-install-how-to-event",
          handleInstallHowTo
        );
        currentElement.removeEventListener(
          "pwa-install-gallery-event",
          handleInstallGallery
        );
      };
    }
  }, [
    onInstallSuccess,
    onInstallFail,
    onUserChoiceResult,
    onInstallAvailable,
    onInstallHowTo,
    onInstallGallery,
  ]);

  return (
    <PWAInstallContext.Provider value={{
      onInstallSuccess,
      onInstallFail,
      onUserChoiceResult,
      onInstallAvailable,
      onInstallHowTo,
      onInstallGallery,
      showDialog,
    }}>
      <PWAInstall  
        ref={pwaInstallRef} 
        manifestUrl={manifestUrl}
        icon={icon}
        name={name}
        description={description}
        installDescription={installDescription}
      />
      {children}
    </PWAInstallContext.Provider>
  );
};

export const usePWAInstall = () => {
  return useContext(PWAInstallContext);
}

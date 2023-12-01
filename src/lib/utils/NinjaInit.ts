import { MathUtils } from "three";
import { IConfigParams, IScriptManagement } from "./NinjaProps";

export const InitMobileConfipParams: IConfigParams = {
  physics: true,
  dpr: 1,
  multi: true,
  isApi: true,
  isDebug: false,
};

export const InitTabletConfipParams: IConfigParams = {
  physics: true,
  dpr: [1, 1.5],
  multi: true,
  isApi: true,
  isDebug: false,
};

const isBrowser = typeof window !== "undefined";
const dpr = isBrowser ? window.devicePixelRatio : 1;
export const InitDesktopConfipParams: IConfigParams = {
  physics: true,
  dpr: dpr,
  multi: true,
  isApi: true,
  isDebug: false,
};

export const InitScriptManagement: IScriptManagement = {
  id: MathUtils.generateUUID(),
  name: "nonname-script" + MathUtils.generateUUID().substring(0, 6),
  type: "script",
  script: "",
};

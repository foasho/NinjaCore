import { IConfigParams } from "../../lib";

export const initTpConfig = (): IConfigParams => {
  return {
    physics: true,
    dpr: 1,
    multi: true,
    isApi: true,
    isDebug: true,
  };
};

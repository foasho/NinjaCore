import { IConfigParams } from "../../utils";

export const initTpConfig = (): IConfigParams => {
  return {
    projectName: "NinjaGL",
    physics: true,
    multi: true,
    isApi: true,
    isDebug: true,
  };
};

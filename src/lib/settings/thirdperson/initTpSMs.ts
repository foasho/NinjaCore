import { MathUtils } from "three";
import { IScriptManagement } from "../../utils";

export const initTpSMs = (): IScriptManagement[] => {
  return [
    {
      id: MathUtils.generateUUID(),
      name: "nonname-script" + MathUtils.generateUUID().substring(0, 6),
      type: "script",
      script: `
      async function initialize() {
      }
      
      async function frameLoop(state, delta, input) {
        const om = await getOMByName({name: "movebox"});
        const { x, y, z } = om.args.position;
        if (x + 0.01 < 10){
          await setPosition({id: om.id, position: [x+0.01, y, z]});
        }
      }    
      `,
    },
    {
      id: MathUtils.generateUUID(),
      name: "nonname-script" + MathUtils.generateUUID().substring(0, 6),
      type: "script",
      script: `
      async function initialize() {
      }
      
      async function frameLoop(state, delta, input) {
        const om = await getOMByName({name: "movebox"});
        const { x, y, z } = om.args.rotation;
        const time = state.elapsedTime;
        // Y軸を時間で回転
        await setRotation({id: om.id, rotation: [x, Math.sin(time)* 2 * Math.PI, z]});
      }
      `,
    },
    {
      id: MathUtils.generateUUID(),
      name: "nonname-script" + MathUtils.generateUUID().substring(0, 6),
      type: "script",
      script: `
      async function initialize() {
      }
      
      async function frameLoop(state, delta, input) {
          const om = await getOMByName({name: "movebox"});
        const { x, y, z } = om.args.scale;
        const time = state.elapsedTime;
        // 0.5 ~ 1.5 倍の拡縮
        const s = 0.5 * Math.sin(time)
        await setScale({id: om.id, rotation: [1 + s, 1 + s, 1 + s]});
      }
      `,
    },
  ];
};

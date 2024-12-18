import React from "react";
import { IObjectManagement } from "../utils";
import { LUTCubeLoader } from "three-stdlib";
// @threeのverupには注意が必要。https://github.com/pmndrs/react-postprocessing/issues/263
import { Bloom, LUT, SSR, EffectComposer } from "@react-three/postprocessing";
import { Texture } from "three";
import { useNinjaEngine } from "../hooks";

const _OMEffects = () => {
  const { oms } = useNinjaEngine();
  const effects = React.useMemo(() => {
    return oms.filter((om) => om.type === "effect");
  }, [oms]);

  return (
    <>
      {effects.length > 0 && (
        <EffectComposer>
          {effects.map((om: IObjectManagement) => {
            return <MyEffect om={om} key={om.id} />;
          })}
        </EffectComposer>
      )}
    </>
  );
};
export const OMEffects = React.memo(_OMEffects);

/**
 * -------
 * Effect
 * -------
 */
const _MyEffect = ({ om }: { om: IObjectManagement }) => {
  const [texture, setTexture] = React.useState<any>(null);

  React.useEffect(() => {
    if (om.args.type === "lut" && om.args.texture) {
      const loader = new LUTCubeLoader();
      loader.load(om.args.texture, (loadedTexture) => {
        setTexture(loadedTexture);
      });
    } else {
      setTexture(null);
    }
  }, [om]);

  const effect = React.useMemo(() => {
    if (om.args.type === "bloom") {
      return (
        <Bloom
          luminanceThreshold={om.args.luminanceThreshold}
          mipmapBlur={om.args.mipmapBlur}
          luminanceSmoothing={om.args.luminanceSmoothing}
          intensity={om.args.intensity}
        />
      );
    } else if (om.args.type === "ssr") {
      return (
        <SSR
        // ... All SSR props
        />
      );
    } else if (om.args.type === "lut" && texture) {
      return <LUT lut={texture as Texture} />;
    } else {
      return <></>;
    }
  }, [om, texture]);

  return <>{effect}</>;
};
const MyEffect = React.memo(_MyEffect);

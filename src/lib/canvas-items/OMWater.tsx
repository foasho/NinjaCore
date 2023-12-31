import React, { useEffect } from "react";
import { useNinjaEngine } from "../hooks";
import { IObjectManagement } from "../utils";
import { Water } from "./Water";
import { Group } from "three";

export const OMWaters = () => {
  const { oms } = useNinjaEngine();
  const omWaters = oms.filter((om) => om.type === "water");

  return (
    <>
      {omWaters.map((omWater) => (
        <OMWater key={omWater.id} om={omWater} />
      ))}
    </>
  );
};

type OMWaterProps = {
  om: IObjectManagement;
};
const OMWater = ({ om }: OMWaterProps) => {
  const ref = React.useRef<Group>(null);
  const { onOMIdChanged, offOMIdChanged } = useNinjaEngine();

  useEffect(() => {
    const update = () => {
      if (ref.current) {
        if (om.args.position) ref.current.position.copy(om.args.position);
        if (om.args.rotation) ref.current.rotation.copy(om.args.rotation);
        if (om.args.scale) ref.current.scale.copy(om.args.scale);
      }
    };
    onOMIdChanged(om.id, update);
    return () => {
      offOMIdChanged(om.id, update);
    };
  }, []);

  return (
    <Water
      ref={ref}
      position={om.args.position || [0, 0, 0]}
      rotation={om.args.rotation || [0, 0, 0]}
      scale={om.args.scale || 1}
    />
  );
};

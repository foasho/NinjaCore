import React, { useRef } from "react";
import { Group } from "three";
import { OMPlayer } from "./OMPlayer";
import { ColliderTunnel } from "../../utils/tunnel";
import { useThree } from "@react-three/fiber";
import { InputControlProvider } from "../../hooks";

export const ColliderField = () => {
  const { raycaster } = useThree();
  raycaster.firstHitOnly = true;
  const grp = useRef<Group>(null);

  return (
    <InputControlProvider>
      <OMPlayer grp={grp} />
      <group ref={grp}>
        <ColliderTunnel.Out />
      </group>
    </InputControlProvider>
  );
};

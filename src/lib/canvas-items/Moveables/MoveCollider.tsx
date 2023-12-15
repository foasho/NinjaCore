import React, { useRef } from "react";

import { IObjectManagement } from "../../utils";
import { useFrame } from "@react-three/fiber";
import { Mesh, Vector3 } from "three";

/**
 * 不可視オブジェクト
 */
type MoveColliderProps = {
  om: IObjectManagement;
};
export const MoveCollider = (
  { om }: MoveColliderProps
) => {

  const ref = useRef<Mesh>(null);

  useFrame(() => {
    if (!ref.current) return;
    if (om.args.position) {
      ref.current.position.copy(om.args.position.clone());
    }
    if (om.args.rotation) {
      ref.current.rotation.copy(om.args.rotation.clone());
    }
    if (om.args.scale) {
      ref.current.scale.copy(om.args.scale.clone());
    }
  });

  return (
    <>
      {om.phyType === "box" && 
        <mesh
          ref={ref}
          visible={false}
          position={om.args.position || [0, 0, 0]}
          rotation={om.args.rotation || [0, 0, 0]}
          scale={om.args.scale || 1}
          userData={{ omId: om.id }}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="red" />
        </mesh>
      }
      {om.phyType === "sphere" && 
        <mesh
          ref={ref}
          visible={false}
          position={om.args.position || [0, 0, 0]}
          rotation={om.args.rotation || [0, 0, 0]}
          scale={om.args.scale || 1}
          userData={{ omId: om.id }}
        >
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial color="red" />
        </mesh>
      }
      {om.phyType === "capsule" && 
        <mesh
          ref={ref}
          visible={false}
          position={om.args.position || [0, 0, 0]}
          rotation={om.args.rotation || [0, 0, 0]}
          scale={om.args.scale || 1}
          userData={{ omId: om.id }}
        >
          <capsuleGeometry args={[1, 1, 1, 8]} />
          <meshStandardMaterial color="red" />
        </mesh>
      }
    </>
  )
}
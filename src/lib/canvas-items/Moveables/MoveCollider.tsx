import React from "react";

import { IObjectManagement } from "../../utils";

/**
 * 不可視オブジェクト
 */
type MoveColliderProps = {
  om: IObjectManagement;
};
export const MoveCollider = (
  { om }: MoveColliderProps
) => {

  return (
    <>
      {om.phyType === "box" && 
        <mesh
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
          visible={false}
          position={om.args.position || [0, 0, 0]}
          rotation={om.args.rotation || [0, 0, 0]}
          scale={om.args.scale || 1}
          userData={{ omId: om.id }}
        >
          <capsuleGeometry args={[1, 1, 32]} />
          <meshStandardMaterial color="red" />
        </mesh>
      }
    </>
  )
}
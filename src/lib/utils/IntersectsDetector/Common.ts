import { Vector3 } from "three";

export type ResultCollisionProps = {
  intersect: boolean;
  distance: number;
  castDirection: Vector3;
  recieveDirection: Vector3;
  point: Vector3;
};

export const getInitCollision = (): ResultCollisionProps => {
  return {
    intersect: false,
    distance: 0,
    castDirection: new Vector3(),
    recieveDirection: new Vector3(),
    point: new Vector3(),
  };
};


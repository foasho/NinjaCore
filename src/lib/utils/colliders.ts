import React from "react";
import { IObjectManagement } from "./NinjaProps";
import {
  Box3,
  Line3,
  Matrix4,
  Sphere,
  Vector3,
  Mesh,
  Group,
  BufferGeometry,
  NormalBufferAttributes,
} from "three";
import { Capsule } from "three-stdlib";
import { debounce } from "lodash-es";
import { CENTER, MeshBVH, StaticGeometryGenerator } from "three-mesh-bvh";

// 規定値基本パラメータ
const gravity = -9.8;
const deadBoxY = -80;
const tempBox = new Box3();
const tempSphere = new Sphere();
const tempCapsule = new Capsule();
const tempSegment = new Line3();
const tempVec = new Vector3();
const tempVector = new Vector3();
const tempVector2 = new Vector3();
const tempMat = new Matrix4();
const deltaVec = new Vector3();
const colliders = [];
let regenerateTime = 0;
const regenerateTimeMax = 0.05;
let staticGrpMeshLength = 0;
let isStaticGenerating = false;
let mergedGeometry: BufferGeometry<NormalBufferAttributes>;
const options = { strategy: CENTER }; // CENTER, SAH, AVERAGE: SAHが一番速い※実測値でCENTERが一番速い場合もある

/**
 * BVHメッシュの再生成
 */
type RegenerateBvhMeshType = {
  mergedGeometry: BufferGeometry<NormalBufferAttributes>;
};
export const regenerateBvhMesh = (grp: Group): RegenerateBvhMeshType => {
  staticGrpMeshLength = grp.children.length;
  // BVHメッシュの再生成
  const staticGenerator = new StaticGeometryGenerator(grp);
  staticGenerator.attributes = ["position"];
  // @ts-ignore
  if (staticGenerator.meshes && staticGenerator.meshes.length > 0) {
    mergedGeometry = staticGenerator.generate();
    // @ts-ignore
    mergedGeometry.boundsTree = new MeshBVH(mergedGeometry, options);
  }
  return { mergedGeometry };
};
const _regenerateBvhMesh = debounce(regenerateBvhMesh, 100);

/**
 * [静的なCollisionの更新]
 * Stable Collision Update
 */
export const updateStableCollisions = (
  bvhGrp: Group,
  pause: boolean,
  delta: number
) => {
  if (isStaticGenerating) return { mergedGeometry };
  isStaticGenerating = true;
  regenerateTime += delta;
  if (pause) {
    if (regenerateTime > regenerateTimeMax) {
      regenerateBvhMesh(bvhGrp);
      // timeをリセットする
      regenerateTime = 0;
    }
    regenerateTime += delta;
  } else {
    regenerateTime = 0;
  }
  // End
  isStaticGenerating = false;
  return { mergedGeometry };
};

/**
 * [動的な衝突判定]
 * Moveable Collision Detection
 * @returns
 */
export const updateMoveableCollisions = (
  oms: IObjectManagement[],
  pause: boolean,
  moveGrp: React.MutableRefObject<any>,
  delta: number
) => {};


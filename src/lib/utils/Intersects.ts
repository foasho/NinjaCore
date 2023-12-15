import {
  Box3,
  CapsuleGeometry,
  Line3,
  Matrix4,
  Mesh,
  Sphere,
  Vector3,
} from "three";

export type CapsuleInfoProps = {
  segment: Line3;
  radius: number;
};

export type ResultCollisionProps = {
  intersect: boolean;
  distance: number;
  direction: Vector3;
  point: Vector3;
};

export const getInitCollision = (): ResultCollisionProps => {
  return {
    intersect: false,
    distance: 0,
    direction: new Vector3(),
    point: new Vector3(),
  };
};

/**
 * BoxとCapsuleの衝突判定
 * @param boxMesh
 * @param capsuleMesh
 * @returns
 */
export const checkBoxCapsuleCollision = (
  boxMesh: Mesh,
  capsuleMesh: Mesh
): ResultCollisionProps => {
  // AABBを取得
  const aabb = new Box3().setFromObject(boxMesh);

  // // Boxのローカル座標系に変換するためのマトリクスを取得
  const aabb2 = new Box3().setFromObject(capsuleMesh);
  const size = aabb2.getSize(new Vector3());
  // console.log(aabb2.getSize(new Vector3()));

  const intersect = aabb.intersectsBox(aabb2);
  const direction = new Vector3();
  // aaab2の中心点とboxMeshの中心点の方向を計算
  direction.subVectors(aabb2.getCenter(new Vector3()), boxMesh.position);
  // 衝突点を計算
  const point = aabb.clampPoint(
    aabb2.getCenter(new Vector3()),
    new Vector3()
  );

  const res = {
    intersect: intersect,
    distance: boxMesh.position.distanceTo(capsuleMesh.position),
    direction: direction.normalize(),
    point: point,
  };

  // 衝突点がcapsuleのRadiusでなければdirectionのYを0にする
  if (
    intersect &&
    point.y >
    (capsuleMesh.geometry as CapsuleGeometry).parameters.radius
  ) {
    res.direction.setY(0);
    // distanceをxzで再計算
    res.distance = boxMesh.position
      .clone()
      .setY(0)
      .distanceTo(capsuleMesh.position.clone().setY(0));
  }

  // 衝突判定
  return res;
};

/**
 * SphereとCapsuleの衝突判定
 * @param sphereMesh
 * @param capsuleInfo
 * @returns
 */
export const checkSphereCapsuleIntersect = (
  sphereMesh: Mesh,
  capsuleInfo: CapsuleInfoProps
): ResultCollisionProps => {
  // Sphereのバウンディングスフィアを取得
  // Scaleから考慮する
  const sphere = sphereMesh.geometry.boundingSphere;
  if (!sphere)
    return {
      intersect: false,
      distance: 0,
      direction: new Vector3(),
      point: new Vector3(),
    };
  // TODO: Scaleを考慮する必要があれば追記

  // Sphereの中心とCapsuleの中心線の最短距離を計算
  const closestPoint = capsuleInfo.segment.closestPointToPoint(
    sphere.center,
    true,
    new Vector3()
  );
  const distance = closestPoint.distanceTo(sphere.center);

  // 衝突判定
  // return distance <= sphere.radius + capsuleInfo.radius;
  return {
    intersect: distance <= sphere.radius + capsuleInfo.radius,
    distance,
    direction: closestPoint,
    point: closestPoint,
  };
};

/**
 *
 * @param capsuleMesh 衝突CapsuleMesh1
 * @param capsuleInfo 衝突Capsule2の情報
 */
// TODO: 不完全コード、後で修正
// export const checkCapsuleCapsuleCollision = (capsuleMesh: Mesh, capsuleInfo: CapsuleInfoProps): boolean => {
//   // capsuleMeshのセグメントをWorld座標系に変換
//   const segmentStartWorld = capsuleMesh.geometry.parameters.path.getPointAt(0).applyMatrix4(capsuleMesh.matrixWorld);
//   const segmentEndWorld = capsuleMesh.geometry.parameters.path.getPointAt(1).applyMatrix4(capsuleMesh.matrixWorld);
//   const capsuleMeshSegment = new Line3(segmentStartWorld, segmentEndWorld);

//   // capsuleInfoのセグメントをcapsuleMeshのローカル座標系に変換
//   const inverseMatrix = new Matrix4().getInverse(capsuleMesh.matrixWorld);
//   const transformedSegment = capsuleInfo.segment.clone().applyMatrix4(inverseMatrix);

//   // Capsule同士の中心線間の最短距離を計算
//   const closestPointOnMeshSegment = capsuleMeshSegment.closestPointToPoint(transformedSegment.start, true, new Vector3());
//   const closestPointOnInfoSegment = transformedSegment.closestPointToPoint(closestPointOnMeshSegment, true, new Vector3());
//   const distance = closestPointOnMeshSegment.distanceTo(closestPointOnInfoSegment);

//   // 衝突判定
//   const totalRadius = capsuleMesh.geometry.parameters.radius + capsuleInfo.radius;
//   return distance <= totalRadius;
// };

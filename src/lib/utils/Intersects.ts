import { Box3, Line3, Mesh, Vector3 } from "three";

// 再利用可能な変数
const v1 = new Vector3();
const b1 = new Box3();
const b2 = new Box3();

export type CapsuleInfoProps = {
  segment: Line3;
  radius: number;
};

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

/**
 * BoxとCapsuleの衝突判定
 * @param boxMesh
 * @param capsuleMesh
 * @returns
 */
export const getBoxCapsuleCollision = (
  boxMesh: Mesh,
  capsuleMesh: Mesh
): ResultCollisionProps => {
  // AABBを取得
  const box = b1.setFromObject(boxMesh);
  // TODO: 純粋な方向ベクトルから、衝突判定のBoxの拡縮をするべき
  // Boxのローカル座標系に変換するためのマトリクスを取得
  const capsule = b2.setFromObject(capsuleMesh);

  const res = getInitCollision();

  const intersect = box.intersectsBox(capsule);
  if (intersect) {
    // Boxの中心
    const boxCenter = box.getCenter(v1);

    // 各軸に沿った重なりの中心点を計算
    const centerOverlapX =
      (Math.min(box.max.x, capsule.max.x) +
        Math.max(box.min.x, capsule.min.x)) /
      2;
    const centerOverlapY =
      (Math.min(box.max.y, capsule.max.y) +
        Math.max(box.min.y, capsule.min.y)) /
      2;
    const centerOverlapZ =
      (Math.min(box.max.z, capsule.max.z) +
        Math.max(box.min.z, capsule.min.z)) /
      2;

    // Boxの中心から見た重なりの中心点の方向を計算
    let direction = v1.set(
      centerOverlapX - boxCenter.x,
      centerOverlapY - boxCenter.y,
      centerOverlapZ - boxCenter.z
    );
    const originDirection = direction.clone().normalize();

    // 方向ベクトルを正規化して、最も大きい成分を基に方向を決定
    direction.normalize();
    const maxComponent = Math.max(
      Math.abs(direction.x),
      Math.abs(direction.y),
      Math.abs(direction.z)
    );

    if (maxComponent === Math.abs(direction.x)) {
      direction.set(direction.x > 0 ? 1 : -1, 0, 0);
    } else if (maxComponent === Math.abs(direction.y)) {
      direction.set(0, direction.y > 0 ? 1 : -1, 0);
    } else {
      direction.set(0, 0, direction.z > 0 ? 1 : -1);
    }

    // capsule側はそのまま、box側は逆方向にする
    const capsuleDirection = direction.clone().negate();

    const rounededPoint = boxMesh.position.clone().add(originDirection);
    // Boxの境界に合わせた衝突点を計算
    let point = new Vector3();
    if (direction.x !== 0) {
      // X軸に沿った衝突の場合
      point.x = direction.x > 0 ? box.max.x : box.min.x;
      point.y = Math.min(Math.max(rounededPoint.y, box.min.y), box.max.y);
      point.z = Math.min(Math.max(rounededPoint.z, box.min.z), box.max.z);
      res.distance = Math.abs(capsuleMesh.position.x - point.x);
    } else if (direction.y !== 0) {
      // Y軸に沿った衝突の場合
      point.x = Math.min(Math.max(rounededPoint.x, box.min.x), box.max.x);
      point.y = direction.y > 0 ? box.max.y : box.min.y;
      point.z = Math.min(Math.max(rounededPoint.z, box.min.z), box.max.z);
      res.distance = Math.abs(capsuleMesh.position.y - point.y);
    } else {
      // Z軸に沿った衝突の場合
      point.x = Math.min(Math.max(rounededPoint.x, box.min.x), box.max.x);
      point.y = Math.min(Math.max(rounededPoint.y, box.min.y), box.max.y);
      point.z = direction.z > 0 ? box.max.z : box.min.z;
      res.distance = Math.abs(capsuleMesh.position.z - point.z);
    }

    res.point.copy(point);
    res.castDirection.copy(direction);
    res.recieveDirection.copy(capsuleDirection);
    res.intersect = intersect;
    // res.distance = capsuleMesh.position.distanceTo(point);
  }
  return res;
};

// /**
//  * SphereとCapsuleの衝突判定
//  * @param sphereMesh
//  * @param capsuleInfo
//  * @returns
//  */
// export const checkSphereCapsuleIntersect = (
//   sphereMesh: Mesh,
//   capsuleInfo: CapsuleInfoProps
// ): ResultCollisionProps => {
//   // Sphereのバウンディングスフィアを取得
//   // Scaleから考慮する
//   const sphere = sphereMesh.geometry.boundingSphere;
//   if (!sphere)
//     return {
//       intersect: false,
//       distance: 0,
//       direction: new Vector3(),
//       point: new Vector3(),
//     };
//   // TODO: Scaleを考慮する必要があれば追記

//   // Sphereの中心とCapsuleの中心線の最短距離を計算
//   const closestPoint = capsuleInfo.segment.closestPointToPoint(
//     sphere.center,
//     true,
//     new Vector3()
//   );
//   const distance = closestPoint.distanceTo(sphere.center);

//   // 衝突判定
//   // return distance <= sphere.radius + capsuleInfo.radius;
//   return {
//     intersect: distance <= sphere.radius + capsuleInfo.radius,
//     distance,
//     direction: closestPoint,
//     point: closestPoint,
//   };
// };

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

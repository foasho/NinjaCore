import { Box3, CapsuleGeometry, Line3, Mesh, Vector3 } from "three";
import { getInitCollision, ResultCollisionProps } from "./Common";

// 再利用可能な変数
const v1 = new Vector3();
const b1 = new Box3();
const b2 = new Box3();
const l1 = new Line3();

export type CapsuleInfoProps = {
  segment: Line3;
  radius: number;
};

/**
 * BoxとCapsuleの衝突判定
 * @param boxMesh
 * @param capsuleMesh
 * @returns
 */
export const detectAABBCapsuleCollision = (
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

/**
 * Capsule同士の衝突判定
 * @param capsuleMesh1
 * @param capsuleMesh2
 * @returns
 */
export const getCapsuleCapsuleCollision = (
  capsuleMesh1: Mesh,
  capsuleMesh2: Mesh
): ResultCollisionProps => {
  const res = getInitCollision();
  const length1 = (capsuleMesh1.geometry as CapsuleGeometry).parameters.length;
  const length2 = (capsuleMesh2.geometry as CapsuleGeometry).parameters.length;
  const radius1 = (capsuleMesh1.geometry as CapsuleGeometry).parameters.radius;
  const radius2 = (capsuleMesh2.geometry as CapsuleGeometry).parameters.radius;
  const segment1 = new Line3(
    new Vector3(0, length1 / 2 - radius1, 0).add(capsuleMesh1.position),
    new Vector3(0, -length1 / 2 + radius1, 0).add(capsuleMesh1.position)
  );
  const segment2 = new Line3(
    new Vector3(0, length2 / 2 - radius2, 0).add(capsuleMesh2.position),
    new Vector3(0, -length2 / 2 + radius2, 0).add(capsuleMesh2.position)
  );

  // 線分間の最短距離を計算する
  const closestPoints = getClosestPointsBetweenLines(segment1, segment2);
  // console.log("closestPoints", closestPoints);
  // 最短距離ベクトルを計算
  if (closestPoints.length !== 2) return res;

  const distanceVec = closestPoints[0].sub(closestPoints[1]);
  const distance = distanceVec.length();
  // console.log("distance", distance);

  // 衝突判定
  if (distance <= radius1 + radius2) {
    res.intersect = true;
    res.distance = distance;
    res.point.copy(closestPoints[0].lerp(closestPoints[1], 0.5));
    res.castDirection.copy(distanceVec.normalize());
    res.recieveDirection.copy(distanceVec.normalize().negate());
  }

  return res;
};

/**
 * 線分間の最短距離を計算する
 * @param line1
 * @param line2
 * @returns
 */
export const getClosestPointsBetweenLines = (
  line1: Line3,
  line2: Line3
): Vector3[] => {
  let p1 = line1.start;
  let p2 = line1.end;
  let p3 = line2.start;
  let p4 = line2.end;

  let p13 = p1.clone().sub(p3);
  let p43 = p4.clone().sub(p3);

  if (p43.lengthSq() < Number.EPSILON) return [];
  let p21 = p2.clone().sub(p1);
  if (p21.lengthSq() < Number.EPSILON) return [];

  let d1343 = p13.dot(p43);
  let d4321 = p43.dot(p21);
  let d1321 = p13.dot(p21);
  let d4343 = p43.dot(p43);
  let d2121 = p21.dot(p21);

  let denom = d2121 * d4343 - d4321 * d4321;
  if (Math.abs(denom) < Number.EPSILON) return [];
  let numer = d1343 * d4321 - d1321 * d4343;

  let mua = numer / denom;
  let mub = (d1343 + d4321 * mua) / d4343;

  let pa = p1.clone().add(p21.clone().multiplyScalar(mua));
  let pb = p3.clone().add(p43.clone().multiplyScalar(mub));

  return [pa, pb];
};

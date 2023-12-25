/**
 * SAT法による衝突判定を使うが、少し工夫しないとだめ
 */
import { Vector3, Matrix4, Box3, Mesh, Raycaster } from "three";
import { getInitCollision, ResultCollisionProps } from "./Common";
import { CapsuleGeometry } from "three";

// カプセルジオメトリの作成 radius: 1, length: 1, capSegments: 1, radialSegments: 6
const capsuleGeometry = new CapsuleGeometry(1, 1, 1, 6);
// 頂点の取得
const arr = capsuleGeometry.attributes.position.array;
const tempVertices: Vector3[] = [];
for (let i = 0; i < arr.length; i += 3) {
  tempVertices.push(new Vector3(arr[i], arr[i + 1], arr[i + 2]));
}
// キャッシュ用の変数
const b1 = new Box3();
const b2 = new Box3();
const av11 = new Vector3(1, 0, 0);
const av12 = new Vector3(0, 1, 0);
const av13 = new Vector3(0, 0, 1);
const av21 = new Vector3(1, 0, 0);
const av22 = new Vector3(0, 1, 0);
const av23 = new Vector3(0, 0, 1);
const ray = new Raycaster();
ray.firstHitOnly = true;
let castDirection = new Vector3();

const projectBoxOnAxis = (
  box: Mesh,
  axis: Vector3,
  matrix: Matrix4
): {
  min: number;
  max: number;
} => {
  const vertices = tempVertices.map((vertex) => vertex.clone());
  let min = Infinity;
  let max = -Infinity;

  vertices.forEach((vertex) => {
    vertex.applyMatrix4(matrix);
    const projection = vertex.dot(axis);
    min = Math.min(min, projection);
    max = Math.max(max, projection);
  });

  return { min, max };
};

const isSeparatedOnAxis = (
  axis: Vector3,
  box: Mesh,
  capsule: Mesh,
  boxMatrix: Matrix4,
  capsuleMatrix: Matrix4
) => {
  const worldAxis = axis.clone().normalize();

  const projection1 = projectBoxOnAxis(box, worldAxis, boxMatrix);
  const projection2 = projectBoxOnAxis(capsule, worldAxis, capsuleMatrix);

  return projection1.max < projection2.min || projection2.max < projection1.min;
};

export const detectBoxCapsuleCollision = (
  boxMesh: Mesh,
  capsuleMesh: Mesh
): ResultCollisionProps => {
  const res = getInitCollision();
  let satIntersect = true;
  boxMesh.updateMatrixWorld();
  capsuleMesh.updateMatrixWorld();
  const boxMatrix = boxMesh.matrixWorld;
  const capsuleMatrix = capsuleMesh.matrixWorld;

  const boxAxis = [
    av11.clone().applyMatrix4(boxMatrix).normalize(),
    av12.clone().applyMatrix4(boxMatrix).normalize(),
    av13.clone().applyMatrix4(boxMatrix).normalize(),
  ];
  const capsuleAxis = [
    av21.clone().applyMatrix4(capsuleMatrix).normalize(),
    av22.clone().applyMatrix4(capsuleMatrix).normalize(),
    av23.clone().applyMatrix4(capsuleMatrix).normalize(),
  ];

  // ボックス1とカプセルの各軸に対する分離軸チェック
  for (let i = 0; i < 3; i++) {
    if (
      isSeparatedOnAxis(
        boxAxis[i],
        boxMesh,
        capsuleMesh,
        boxMatrix,
        capsuleMatrix
      )
    ) {
      satIntersect = false;
      break;
    }
    if (
      isSeparatedOnAxis(
        capsuleAxis[i],
        boxMesh,
        capsuleMesh,
        boxMatrix,
        capsuleMatrix
      )
    ) {
      satIntersect = false;
      break;
    }
  }
  if (satIntersect) {
    // クロスプロダクトによる分離軸のチェック
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const crossAxis = boxAxis[i].clone().cross(capsuleAxis[j]);
        if (
          crossAxis.lengthSq() > 1e-10 &&
          isSeparatedOnAxis(
            crossAxis,
            boxMesh,
            capsuleMesh,
            boxMatrix,
            capsuleMatrix
          )
        ) {
          satIntersect = false;
          break;
        }
      }
    }
  }
  // 衝突点の計算
  if (satIntersect) {
    /**
     * 計算量を減らすために、単純化する
     */
    castDirection = new Vector3()
      .subVectors(boxMesh.position, capsuleMesh.position)
      .normalize();
    ray.set(capsuleMesh.position, castDirection);
    const intersects = ray.intersectObject(boxMesh, true);
    if (intersects.length > 0) {
      const point = intersects[0].point;
      res.distance = intersects[0].distance;
      res.point.copy(point);
      res.castDirection.copy(castDirection);
      res.recieveDirection.copy(castDirection.clone().negate());
    }
  }
  res.intersect = satIntersect;

  // すべての軸において分離が見つからなかった場合、衝突している
  return res;
};

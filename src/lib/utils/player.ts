import { Box3, Euler, Group, Line3, Matrix4, Mesh, Raycaster, Vector3 } from "three";
import { IInputMovement } from "./NinjaProps";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { ExtendedTriangle, MeshBVH } from "three-mesh-bvh";
import { GridProps } from "@react-three/drei";
import { CapsuleInfoProps } from "./IntersectsDetector";
import { Camera } from "@react-three/fiber";

// --- ジャンプ/物理判定に関連する変数 ---
const playerVelocity = new Vector3(0, 0, 0);
const tempBox = new Box3();
const tempVector = new Vector3();
const capsulePoint = new Vector3();
const tempMat = new Matrix4();
const tempSegment = new Line3(); // 衝突用の線分
const gravity = -30;
const deadZone = -25;
const upVector = new Vector3(0, 1, 0);
const baseSpeed = 2.5; // 移動速度を調整できるように定数を追加
const physicsSteps = 5;
const dashRatio = 2.1;
const jumpInterval = 0.5; // (秒) ジャンプの連続入力を防ぐための定数
const jumpEnabled = true;
const jumpTimer = 0;
const jumpPower = 10;
const jumpLag = 0.5; //(秒) ジャンプのラグを調整するための定数
let targetRotationY = 0;
let forwardAmount = 0;
let rightAmount = 0;
let intersectPoint = new Vector3();
const deltaVector = new Vector3();
const raycaster = new Raycaster();
// ---------------------------

/**
 * プレイヤー入力値に応じて移動量を計算
 */
type UpdatePlayerMovementType = {
  targetRotationY: number;
  forwardAmount: number;
  rightAmount: number;
};
export const updatePlayerMovement = (
  player: Mesh | Group,
  playerIsOnGround: boolean,
  input: IInputMovement,
  playerVelocity: Vector3,
  delta: number,
  angle: number
): UpdatePlayerMovementType => {
  if (playerIsOnGround) {
    playerVelocity.y = delta * gravity;
  } else {
    playerVelocity.y += delta * gravity;
  }
  player.position.addScaledVector(playerVelocity, delta);
  /**
   * @step1 入力データ(input)からの単純な移動
   */
  let speed = baseSpeed * input.speed;
  if (input.dash) {
    speed *= dashRatio;
  }
  forwardAmount = input.forward - input.backward;
  let movementVector = new Vector3(0, 0, 0);
  // 前後方向の移動
  if (forwardAmount !== 0) {
    tempVector.set(0, 0, -1 * forwardAmount).applyAxisAngle(upVector, angle);
    movementVector.add(tempVector);
  }
  // 左右方向の移動
  rightAmount = input.right - input.left;
  if (rightAmount !== 0) {
    tempVector.set(rightAmount, 0, 0).applyAxisAngle(upVector, angle);
    movementVector.add(tempVector);
  }

  // 移動量があれば、その移動方向に応じてObjectのY軸を回転させる
  if (forwardAmount !== 0 || rightAmount !== 0) {
    targetRotationY = Math.atan2(movementVector.x, movementVector.z);
    // ここで移動量をセット
    player.position.addScaledVector(movementVector, speed * delta);
  }
  player.updateMatrixWorld();
  return { targetRotationY, forwardAmount, rightAmount };
};

/**
 * BVHとカプセル型の衝突判定
 */
type DetectionCollisionCapsuleBVHTrees = {
  tempSegment: Line3;
  intersectPoint: Vector3;
};
export const detectCollisionCapsuleBVHTrees = (
  player: Mesh,
  boundsTree: MeshBVH | undefined,
  collider: Group,
  capsuleInfo: CapsuleInfoProps
): DetectionCollisionCapsuleBVHTrees => {
  if (!boundsTree)
    return {
      tempSegment,
      intersectPoint,
    };
  tempBox.makeEmpty();
  tempMat.copy(collider.matrixWorld).invert();
  tempSegment.copy(capsuleInfo.segment);

  // ローカル空間内のユーザーの位置を取得
  tempSegment.start.applyMatrix4(player.matrixWorld).applyMatrix4(tempMat);
  tempSegment.end.applyMatrix4(player.matrixWorld).applyMatrix4(tempMat);
  // 軸が整列した境界ボックスを取得
  tempBox.expandByPoint(tempSegment.start);
  tempBox.expandByPoint(tempSegment.end);

  tempBox.min.addScalar(-capsuleInfo.radius);
  tempBox.max.addScalar(capsuleInfo.radius);

  // 衝突を検出
  boundsTree.shapecast({
    intersectsBounds: (_box: Box3) => {
      return _box.intersectsBox(tempBox);
    },
    intersectsTriangle: (tri: ExtendedTriangle) => {
      const triPoint = tempVector;
      // 衝突点を取得
      intersectPoint.copy(triPoint);
      const distance = tri.closestPointToSegment(
        tempSegment,
        triPoint,
        capsulePoint
      );
      if (distance < capsuleInfo.radius) {
        const depth = capsuleInfo.radius - distance;
        const direction = capsulePoint.sub(triPoint).normalize();
        // tempSegmentは衝突で移動すべき遷移座標
        tempSegment.start.addScaledVector(direction, depth);
        tempSegment.end.addScaledVector(direction, depth);
      }
    },
  });
  return { tempSegment, intersectPoint };
};


/**
 * 
 */
export const updatePlayerObstacle = (
  player: Mesh,
  playerHeight: number,
  playerIsOnGround: boolean,
  camera: Camera,
  controls: OrbitControlsImpl,
  collider: Group,
  cameraMode: "first" | "third",
  desiredDistance: number,
) => {
  // 接地処理
  if (!playerIsOnGround) {
    // 接地していない場合は、player速度にdeltaVector方向*重力分の移動ベクトルを追加
    deltaVector.normalize();
    playerVelocity.addScaledVector(
      deltaVector,
      -deltaVector.dot(playerVelocity)
    );
  } else {
    // 接地している場合は、速度を０にして静止する
    playerVelocity.set(0, 0, 0);
  }

  // カメラとの距離を調整
  camera.position.sub(controls.target);
  controls.target.copy(player.position);
  camera.position.add(player.position);

  // CameraからPlayerに向けてRaycastを行い、障害物があればカメラを障害物の位置に移動
  if (cameraMode === "third") {
    const objectPosition = player.position
      .clone()
      .add(new Vector3(0, playerHeight / 2, 0));
    const direction = objectPosition
      .clone()
      .sub(camera.position.clone())
      .normalize();
    const distance = camera.position.distanceTo(objectPosition);
    raycaster.set(camera.position, direction); // Raycast起源点をカメラに
    raycaster.far = distance - playerHeight / 2;
    raycaster.near = 0.01;
    const intersects = raycaster.intersectObject(collider, true); // 全てのオブジェクトを対象にRaycast
    if (intersects.length > 0) {
      // 複数のオブジェクトに衝突した場合、distanceが最も近いオブジェクトを選択
      const target = intersects.reduce((prev, current) => {
        return prev.distance < current.distance ? prev : current;
      });
      camera.position.copy(target.point);
    } else if (forwardAmount !== 0 || rightAmount !== 0) {
      // 障害物との交差がない場合はプレイヤーから一定の距離を保つ
      const directionFromPlayerToCamera = camera.position
        .clone()
        .sub(objectPosition)
        .normalize();
      // カメラの位置をプレイヤーから一定の距離を保つように調整※カメラのカクツキを防ぐためにLerpを使用
      camera.position.lerp(
        objectPosition
          .clone()
          .add(directionFromPlayerToCamera.multiplyScalar(desiredDistance)),
        0.1
      );
    }
  }
};

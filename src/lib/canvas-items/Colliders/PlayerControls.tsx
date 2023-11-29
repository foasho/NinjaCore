import React from "react";
import { MutableRefObject, useEffect, useRef, useState } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, RoundedBox } from "@react-three/drei";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { StaticGeometryGenerator, MeshBVH } from "three-mesh-bvh";
import {
  Mesh,
  Vector3,
  Object3D,
  Box3,
  Line3,
  Matrix4,
  Group,
  BufferGeometry,
  Raycaster,
  AnimationAction,
  AnimationMixer,
} from "three";
import { EDeviceType, useMultiInputControl } from "../../hooks";
import { IInputMovement } from "../../utils";

/**
 * プレイヤー操作
 */
interface IPlayerControlProps {
  object: React.RefObject<Mesh | Object3D>;
  actions?: { [x: string]: AnimationAction };
  mixer?: AnimationMixer;
  grp: React.RefObject<Group>;
  cameraOffset?: Vector3;
  firstPerson?: boolean;
  resetPosition?: Vector3;
  desiredDistance?: number;
  touchDomId?: string | null;
  device: EDeviceType;
}
export const PlayerControl = ({
  object,
  actions = {},
  mixer = undefined,
  grp,
  cameraOffset = new Vector3(-0.25, 1, -5),
  firstPerson,
  resetPosition = new Vector3(0.0, 3, -30),
  desiredDistance = 4.5,
  touchDomId = null,
  device,
}: IPlayerControlProps) => {
  const { input } = useMultiInputControl();
  const orbitTouchMove = useRef<{ flag: boolean; angleAxis: [number, number] }>(
    { flag: false, angleAxis: [0, 0] }
  );
  const isInit = useRef(true);
  const player = useRef<Mesh>(null);
  const capsuleInfo = useRef<{ radius: number; segment: Line3 }>();
  capsuleInfo.current = {
    radius: 0.5,
    segment: new Line3(new Vector3(), new Vector3(0, -1.0, 0.0)),
  };
  const collider: MutableRefObject<Mesh | null> = useRef<Mesh>(null);
  const controls = useRef<OrbitControlsImpl>(null);
  // --- ジャンプ/物理判定に関連する変数 ---
  const playerIsOnGround = useRef(false);
  const playerVelocity = useRef(new Vector3(0, 0, 0));
  const tempBox = new Box3();
  const tempVector = new Vector3();
  const tempVector2 = new Vector3();
  const tempMat = new Matrix4();
  const tempSegment = new Line3();
  const gravity = -30;
  const deadZone = -25;
  const upVector = new Vector3(0, 1, 0);
  const height = 2.0;
  const baseSpeed = 10; // 移動速度を調整できるように定数を追加
  const physicsSteps = 5;
  const dashRatio = 2.1;
  const jumpPower = 10;
  // ---------------------------
  const { camera, gl } = useThree();
  const raycaster = new Raycaster();
  // @ts-ignore
  raycaster.firstHitOnly = true;
  const [mergeGeometry, setMergeGeometry] = useState<BufferGeometry>();

  useEffect(() => {
    if (player.current) {
      player.current.position.copy(resetPosition.clone());
    }
    if (grp.current) {
      // grpをマージして衝突を行うオブジェクトを作成する
      const staticGenerator = new StaticGeometryGenerator(grp.current);
      staticGenerator.attributes = ["position"];
      const mergedGeometry = staticGenerator.generate();
      // @ts-ignore
      mergedGeometry.boundsTree = new MeshBVH(mergedGeometry);
      setMergeGeometry(mergedGeometry);
    }
  }, [grp.current, firstPerson]);

  useEffect(() => {
    let domElement = touchDomId
      ? document.getElementById(touchDomId)
      : gl.domElement;
    if (!domElement) {
      domElement = gl.domElement;
    }
    let posX: number | null = null;
    let posY: number | null = null;
    let touchId = -1;

    const touchStartHandler = (e: TouchEvent) => {
      const targetTouch = e.changedTouches[e.changedTouches.length - 1];
      touchId = targetTouch.identifier;
    };

    const touchMoveHandler = (e: TouchEvent) => {
      if (orbitTouchMove.current) {
        for (let i = 0; i < e.touches.length; i++) {
          const touch = e.touches[i];
          if (touch.identifier === touchId) {
            if (posX === null || posY === null) {
              posX = touch.pageX;
              posY = touch.pageY;
              return;
            }
            const diffX = touch.pageX - posX;
            const diffY = touch.pageY - posY;
            const delimeter = 10;
            const angleX = diffX / delimeter;
            const angleY = diffY / delimeter;
            orbitTouchMove.current = {
              flag: true,
              angleAxis: [angleX, angleY],
            };
            posX = touch.pageX;
            posY = touch.pageY;
          }
        }
      }
    };

    const touchEndHandler = () => {
      posX = null;
      posY = null;
      touchId = -1;
      orbitTouchMove.current = { flag: false, angleAxis: [0, 0] };
    };

    if (device === EDeviceType.Mobile || device === EDeviceType.Tablet) {
      domElement.addEventListener("touchstart", touchStartHandler);
      domElement.addEventListener("touchmove", touchMoveHandler);
      domElement.addEventListener("touchend", touchEndHandler);
    }

    return () => {
      if (device === EDeviceType.Mobile || device === EDeviceType.Tablet) {
        if (domElement) {
          domElement.removeEventListener("touchstart", touchStartHandler);
          domElement.removeEventListener("touchmove", touchMoveHandler);
          domElement.removeEventListener("touchend", touchEndHandler);
        }
      }
    };
  }, [gl.domElement]);

  const reset = () => {
    if (player.current) {
      playerVelocity.current.set(0, 0, 0);
      player.current.position.copy(resetPosition.clone());
      camera.position.sub(controls.current!.target);
      controls.current!.target.copy(player.current.position);
      camera.position.add(player.current.position);
      controls.current!.update();
    }
  };

  useEffect(() => {
    if (player.current) {
      player.current.geometry.translate(0, -0.5, 0);
      // カメラを初期位置に設定
      camera.position.copy(resetPosition.clone().add(cameraOffset));
      if (isInit.current) {
        reset();
        isInit.current = false;
      }
    }
    return () => {
      if (player.current) {
        player.current.geometry.translate(0, 0.5, 0);
      }
      // 現在再生中のアニメーションを停止する
      for (const key in actions) {
        actions[key].stop();
      }
    };
  }, [actions]);

  const updateAnimation = (input: IInputMovement, delta: number) => {
    if (
      input.forward !== 0 ||
      input.backward !== 0 ||
      input.left !== 0 ||
      input.right !== 0
    ) {
      // 歩きの時は歩きのアニメーションを再生
      if (actions["Walk"] && !input.dash) {
        actions["Walk"].play();
      } else if (actions["Run"] && input.dash) {
        // ダッシュの時はダッシュのアニメーションを再生
        actions["Run"].play();
      }
    } else {
      // 何もないときは、Idleを再生し、Idle以外が再生されていれば停止
      if (actions["Idle"]) {
        actions["Idle"].play();
        Object.keys(actions).forEach((key) => {
          if (key !== "Idle" && actions[key]) {
            actions[key].stop();
          }
        });
      }
    }
    // ジャンプのアニメーション
    if (actions["Jump"] && !playerIsOnGround.current) {
      actions["Jump"].play();
    } else if (actions["Jump"] && playerIsOnGround.current) {
      actions["Jump"].stop();
    }
    if (mixer) mixer.update(delta);
  };

  const updatePlayer = (delta: number) => {
    if (player.current && controls.current && mergeGeometry) {
      /**
       * 処理順序
       * 1. 入力データから移動方向ベクトルを計算
       * 　- 接地しているかどうか -> 重力分の移動ベクトルを追加
       * 　-
       * 2. 衝突検出
       *
       */
      if (playerIsOnGround.current) {
        playerVelocity.current.y = delta * gravity;
      } else {
        playerVelocity.current.y += delta * gravity;
      }
      player.current.position.addScaledVector(playerVelocity.current, delta);

      // 移動
      let speed = baseSpeed * input.speed;
      if (input.dash) {
        speed *= dashRatio;
      }
      const angle = controls.current.getAzimuthalAngle();
      let forwardAmount = input.forward - input.backward;
      let movementVector = new Vector3(0, 0, 0);
      if (forwardAmount !== 0) {
        tempVector
          .set(0, 0, -1 * forwardAmount)
          .applyAxisAngle(upVector, angle);
        player.current.position.addScaledVector(tempVector, speed * delta);
        movementVector.add(tempVector);
      }
      let rightAmount = input.right - input.left;
      if (rightAmount !== 0) {
        tempVector.set(rightAmount, 0, 0).applyAxisAngle(upVector, angle);
        player.current.position.addScaledVector(tempVector, speed * delta);
        movementVector.add(tempVector);
      }
      player.current.updateMatrixWorld();

      // 移動量があれば、その移動方向に応じてObjectのY軸を回転させる
      if (forwardAmount !== 0 || rightAmount !== 0) {
        const targetRotation = Math.atan2(movementVector.x, movementVector.z);
        object.current!.rotation.y = targetRotation;
      }

      /**
       * 衝突検出
       */
      if (collider.current && capsuleInfo.current) {
        tempBox.makeEmpty();
        tempMat.copy(collider.current.matrixWorld).invert();
        tempSegment.copy(capsuleInfo.current.segment);

        // ローカル空間内のユーザーの位置を取得
        tempSegment.start
          .applyMatrix4(player.current.matrixWorld)
          .applyMatrix4(tempMat);
        tempSegment.end
          .applyMatrix4(player.current.matrixWorld)
          .applyMatrix4(tempMat);
        // 軸が整列した境界ボックスを取得
        tempBox.expandByPoint(tempSegment.start);
        tempBox.expandByPoint(tempSegment.end);

        tempBox.min.addScalar(-capsuleInfo.current.radius);
        tempBox.max.addScalar(capsuleInfo.current.radius);

        // 衝突を検出
        // @ts-ignore
        collider.current!.geometry!.boundsTree!.shapecast({
          intersectsBounds: (_box: Box3) => {
            return _box.intersectsBox(tempBox);
          },
          intersectsTriangle: (tri: any) => {
            const triPoint = tempVector;
            const capsulePoint = tempVector2;
            const distance = tri.closestPointToSegment(
              tempSegment,
              triPoint,
              capsulePoint
            );
            if (distance < capsuleInfo.current!.radius) {
              const depth = capsuleInfo.current!.radius - distance;
              const direction = capsulePoint.sub(triPoint).normalize();
              tempSegment.start.addScaledVector(direction, depth);
              tempSegment.end.addScaledVector(direction, depth);
            }
          },
        });
      }

      const newPosition = tempVector;
      newPosition
        .copy(tempSegment.start)
        .applyMatrix4(collider.current!.matrixWorld);

      const deltaVector = tempVector2;
      deltaVector.subVectors(newPosition, player.current.position);

      playerIsOnGround.current =
        deltaVector.y > Math.abs(delta * playerVelocity.current.y * 0.25);

      const offset = Math.max(0.0, deltaVector.length() - 1e-5);
      deltaVector.normalize().multiplyScalar(offset);

      // Player(Capsule)とObjectの位置を同期
      player.current.position.add(deltaVector);
      if (object.current) {
        object.current.position.copy(
          player.current.position
            .clone()
            .add(new Vector3(0, -(height - capsuleInfo.current!.radius), 0))
        );
      }
      if (!playerIsOnGround.current) {
        deltaVector.normalize();
        playerVelocity.current.addScaledVector(
          deltaVector,
          -deltaVector.dot(playerVelocity.current)
        );
      } else {
        playerVelocity.current.set(0, 0, 0);
      }

      // カメラとの距離を調整
      camera.position.sub(controls.current.target);
      controls.current.target.copy(player.current.position);
      camera.position.add(player.current.position);

      // CameraからPlayerに向けてRaycastを行い、障害物があればカメラを障害物の位置に移動
      const objectPosition = player.current.position
        .clone()
        .add(new Vector3(0, height / 2, 0));
      const direction = objectPosition
        .clone()
        .sub(camera.position.clone())
        .normalize();
      const distance = camera.position.distanceTo(objectPosition);
      raycaster.set(camera.position, direction); // Raycast起源点をカメラに
      raycaster.far = distance - height / 2;
      raycaster.near = 0.01;
      // @ts-ignore
      raycaster.firstHitOnly = true;
      const intersects = raycaster.intersectObject(collider.current!, true); // 全てのオブジェクトを対象にRaycast
      if (intersects.length > 0) {
        // 複数のオブジェクトに衝突した場合、distanceが最も近いオブジェクトを選択
        // const target = intersects.reduce((prev, current) => {
        //   return prev.distance < current.distance ? prev : current
        // })
        // この処理が完璧でないため、コメントアウト
        // camera.position.copy(target.point)
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

      // デッドゾーンまで落ちたらリセット
      if (player.current.position.y < deadZone) {
        reset();
      }
    }
  };

  useFrame((_state, delta) => {
    const timeDelta = Math.min(delta, 0.1);
    // OrbitTouchMoveが有効な場合は、OrbitControlsを無効にする
    if (orbitTouchMove.current.flag && controls.current) {
      controls.current.enabled = false;
    }
    // ジャンプの入力を受け付ける
    if (input.jump && playerIsOnGround.current) {
      playerVelocity.current.setY(jumpPower);
      playerIsOnGround.current = false;
    }
    // OrbitsContolsの設定
    if (firstPerson) {
      controls.current!.maxPolarAngle = Math.PI;
      controls.current!.minDistance = 1e-4;
      controls.current!.maxDistance = 1e-4;
    } else if (controls.current) {
      // ThirdPerson
      // controls.current.maxPolarAngle = Math.PI / (2 / 3);
      controls.current.minDistance = 1;
      controls.current.maxDistance = desiredDistance;
    }
    if (collider.current) {
      for (let i = 0; i < physicsSteps; i++) {
        updatePlayer(timeDelta / physicsSteps);
      }
    }
    if (controls.current) {
      let axisX = 0;
      let axisY = 0;
      if (
        Math.abs(input.angleAxis[0]) > 0 ||
        Math.abs(input.angleAxis[1]) > 0
      ) {
        const cameraSpeed = 0.27;
        axisX = input.angleAxis[0] * cameraSpeed;
        axisY = input.angleAxis[1] * cameraSpeed;
      } else if (
        orbitTouchMove.current &&
        orbitTouchMove.current.flag &&
        (Math.abs(orbitTouchMove.current.angleAxis[0]) > 0 ||
          Math.abs(orbitTouchMove.current.angleAxis[1]) > 0)
      ) {
        const cameraSpeed = 0.27;
        axisX = orbitTouchMove.current.angleAxis[0] * cameraSpeed;
        axisY = orbitTouchMove.current.angleAxis[1] * cameraSpeed;
      }
      if (axisX !== 0 || axisY !== 0) {
        // 今向いている方向からX軸方向に移動
        const direction = new Vector3(-1, 0, 0);
        direction.applyQuaternion(camera.quaternion);
        direction.normalize();
        direction.multiplyScalar(axisX);
        camera.position.add(direction);
        // 今向いている方向からY軸方向に移動
        const direction2 = new Vector3(0, 1, 0);
        direction2.applyQuaternion(camera.quaternion);
        direction2.normalize();
        direction2.multiplyScalar(axisY);
        camera.position.add(direction2);
      }
      controls.current.update();
    }
    updateAnimation(input, timeDelta);
  });

  return (
    <>
      <OrbitControls
        ref={controls}
        args={[camera, gl.domElement]}
        camera={camera}
        makeDefault={true}
        // スマホタブレットの場合は、OrbitControlsを無効にする
        enabled={
          device === EDeviceType.Mobile || device === EDeviceType.Tablet
            ? false
            : true
        }
      />
      {/** 以下は物理判定Playerの可視化用：強制的に非表示に設定 */}
      <RoundedBox
        ref={player}
        visible={false}
        args={[1.0, height, 1.0]}
        radius={0.5}
        smoothness={2}
      >
        <meshBasicMaterial color={0x00ff00} wireframe />
      </RoundedBox>
      {mergeGeometry && (
        <mesh ref={collider} visible={false} name="collider">
          <primitive object={mergeGeometry} />
          <meshBasicMaterial wireframe color={0x00ff00} />
        </mesh>
      )}
    </>
  );
};

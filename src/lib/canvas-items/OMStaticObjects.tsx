import React from "react";
import { Group, Mesh, Object3D } from "three";
import { IObjectManagement, ColliderTunnel, NonColliderTunnel } from "../utils";
import { useNinjaEngine } from "../hooks";
import { useAnimations, useGLTF } from "@react-three/drei";
import { GLTF, SkeletonUtils } from "three-stdlib";
import { Loading3D } from "./Common/Loading3D";

export interface IStaticObjectsProps {}

export const StaticObjects = () => {
  const engine = useNinjaEngine();
  const staticObjects = React.useMemo(() => {
    if (!engine) return [];
    const staticObjects = engine.oms.filter(
      (o: IObjectManagement) => o.type === "object"
    );
    return staticObjects ? staticObjects : [];
  }, [engine]);
  return (
    <>
      {staticObjects.map((om, index) => {
        <>
          {om.physics ? (
            <ColliderTunnel.In>
              <StaticObject om={om} key={index} />
            </ColliderTunnel.In>
          ) : (
            <NonColliderTunnel.In>
              <StaticObject om={om} key={index} />
            </NonColliderTunnel.In>
          )}
        </>;
      })}
    </>
  );
};

const StaticObject = ({ om }) => {
  const { scene, animations } = useGLTF(om.args.url) as GLTF;
  const [clone, setClone] = React.useState<Object3D>();
  const ref = React.useRef<Group>(null);

  React.useEffect(() => {
    const init = () => {
      if (ref.current) {
        if (om.args.position) {
          ref.current.position.copy(om.args.position.clone());
        }
        if (om.args.rotation) {
          ref.current.rotation.copy(om.args.rotation.clone());
        }
        if (om.args.scale) {
          ref.current.scale.copy(om.args.scale.clone());
        }
      }
    };
    init();
    // onOMIdChanged(id, init);
    return () => {
      // offOMIdChanged(id, init);
    };
  }, []);

  React.useEffect(() => {
    if (scene) {
      // cloneを作成
      const clone = SkeletonUtils.clone(scene);
      // animationsもコピー
      clone.animations = animations;
      if (om.args.castShadow) {
        clone.traverse((node) => {
          if (node instanceof Mesh) {
            node.castShadow = true;
          }
        });
      }
      if (om.args.receiveShadow) {
        clone.traverse((node) => {
          if (node instanceof Mesh) {
            node.receiveShadow = true;
          }
        });
      }
      setClone(clone);
    }
  }, [scene]);

  return (
    <>
      <React.Suspense fallback={<Loading3D />}>
        <group ref={ref}>
          {clone && <AnimationHelper id={om.id} object={clone} />}
        </group>
      </React.Suspense>
    </>
  );
};

type AnimationHelperProps = {
  id: string;
  object: Object3D;
  visible?: boolean;
};
const AnimationHelper = ({
  id,
  object,
  visible = true,
}: AnimationHelperProps) => {
  const animations = object.animations;
  const { ref, actions } = useAnimations(animations);
  const { getOMById } = useNinjaEngine();
  const [defaultAnimation, setDefaultAnimation] =
    React.useState<string>("Idle");
  const [animationLoop, setAnimationLoop] = React.useState<boolean>(true);

  const animationStop = () => {
    if (actions && actions[defaultAnimation]) {
      actions[defaultAnimation]!.stop();
    }
  };

  const animationAllStop = () => {
    if (actions) {
      Object.keys(actions).forEach((key) => {
        actions[key]!.stop();
      });
    }
  };

  React.useEffect(() => {
    const init = () => {
      const _om = getOMById(id);
      if (_om) {
        if (_om.args.defaultAnimation) {
          setDefaultAnimation(_om.args.defaultAnimation);
        }
        setAnimationLoop(_om.args.animationLoop);
      }
    };
    init();
    // onOMIdChanged(id, init);
    return () => {
      // offOMIdChanged(id, init);
    };
  });

  React.useEffect(() => {
    if (actions && actions[defaultAnimation]) {
      animationAllStop();
      actions[defaultAnimation]!.play();
    }
    if (!animationLoop) {
      animationStop();
    }
  }, [actions, defaultAnimation, animationLoop]);

  return <primitive ref={ref} visible={visible} object={object} />;
};

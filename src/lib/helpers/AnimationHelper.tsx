import React from "react";

import { Object3D } from "three";
import { useAnimations } from "@react-three/drei";
import { useNinjaEngine } from "../hooks";
import { useFrame } from "@react-three/fiber";

export type AnimationHelperProps = {
  id: string;
  object: Object3D;
  visible?: boolean;
  initSelectAnimation?: string;
};
export const AnimationHelper = ({
  id,
  object,
  visible = true,
  initSelectAnimation = "Idle",
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
      console.log("check1");
      if (_om) {
        console.log("check2");
        if (_om.args.defaultAnimation) {
          console.log("check3");
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
      console.log("check4 - all stop -");
      // animationAllStop();
      actions[defaultAnimation]!.play();
    }
    if (!animationLoop) {
      animationStop();
    }
  }, [actions, defaultAnimation, animationLoop]);

  return <primitive ref={ref} visible={visible} object={object} />;
};
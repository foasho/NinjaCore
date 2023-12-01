import React, { Suspense } from "react";
import { PositionalAudio } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { PositionalAudio as PositionalAudioImpl, Vector3 } from "three";
import { useNinjaEngine } from "../../hooks";

export const OMAudios = () => {
  const { oms } = useNinjaEngine();
  const audios = React.useMemo(() => {
    if (!oms) return [];
    const audios = oms.filter((o) => o.type === "audio");
    return audios ? audios : [];
  }, [oms]);
  return (
    <Suspense key="audio-oms">
      {audios.map((om) => (
        <>
          {om.args.url && (
            <OMAudio
              key={om.id}
              url={om.args.url}
              position={om.args.position}
              distance={om.args.distance}
              maxVolume={om.args.volume}
            />
          )}
        </>
      ))}
    </Suspense>
  );
};

export const OMAudio = ({
  url,
  position,
  distance = 25,
  maxVolume = 0.75,
  load = undefined,
}: {
  url: string;
  position: Vector3;
  distance?: number;
  maxVolume?: number;
  load?: any;
}) => {
  const ref = useRef<PositionalAudioImpl | any>(null);
  const { curPosition, isSound } = useNinjaEngine();
  // let isTime = 0;

  useEffect(() => {
    if (!ref.current) return;
    if (isSound) {
      // 再生中でなければ再生
      if (!ref.current.isPlaying) {
        ref.current.play();
      }
    } else {
      // 再生中なら停止
      if (ref.current.isPlaying) {
        ref.current.pause();
      }
    }
  }, [isSound]);

  useFrame(() => {
    if (!isSound) return;
    if (ref.current) {
      const d = position.distanceTo(curPosition.current);
      if (d > distance) {
        ref.current.setVolume(0);
      } else {
        if (distance == d || distance == 0) {
          ref.current.setVolume(maxVolume);
          return;
        }
        const v = maxVolume * (1 - d / distance);
        if (v >= 0 && v <= 1) {
          ref.current.setVolume(v >= 1 ? 1 : v);
        }
      }
    }
  });

  return (
    <>
      {isSound && (
        <PositionalAudio
          ref={ref}
          url={url}
          position={position}
          distance={distance}
          loop={true}
          autoplay={true}
        />
      )}
    </>
  );
};

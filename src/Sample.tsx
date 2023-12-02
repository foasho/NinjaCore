import React from 'react';
import { Box } from "@react-three/drei";

export const TestR3F = () => {
  return (
    <>
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
      <pointLight position={[-10, -10, -10]} />
      <Box />
      <Box position={[-2, 0, 0]} />
      <Box position={[2, 0, 0]} />
      <Box position={[0, 2, 0]} />
      <Box position={[0, -2, 0]} />
      <Box position={[0, 0, 2]} />
      <Box position={[0, 0, -2]} />
    </>
  );
}
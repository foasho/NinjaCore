import * as React from 'react';
import { Group } from 'three';
import { OMPlayer } from './OMPlayer';
import { ColliderTunnel } from '../../utils/tunnel';

export const ColliderField = () => {

  const grp = React.useRef<Group>(null);

  return (
    <>
      <OMPlayer grp={grp} />
      <group ref={grp}>
        <ColliderTunnel.Out/>
      </group>
    </>
  )
}
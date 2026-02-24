import { useConvex, useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import Button from './buttons/Button';
import freezeImg from '../../assets/freeze.svg';
import unfreezeImg from '../../assets/unfreeze.svg';
import { toastOnError } from '../toasts';

export default function FreezeButton() {
  const worldStatus = useQuery(api.world.defaultWorldStatus);
  const isFrozen = worldStatus?.status === 'stoppedByDeveloper';
  const freeze = useMutation(api.world.freeze);
  const unfreeze = useMutation(api.world.unfreeze);
  const convex = useConvex();

  return (
    <Button
      imgUrl={isFrozen ? unfreezeImg : freezeImg} 
      onClick={async () => {
        if (isFrozen) {
          console.log('Unfreezing world');
          await toastOnError(unfreeze());
        } else {
          console.log('Freezing world');
          await toastOnError(freeze());
        }
      }}
      title={isFrozen ? 'Resume Simulation' : 'Pause Simulation'}
    >
      {isFrozen ? 'Unfreeze' : 'Freeze'}
    </Button>
  );
}

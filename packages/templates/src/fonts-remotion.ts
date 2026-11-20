import { useEffect, useState } from 'react';
import { continueRender, delayRender } from 'remotion';
import { loadFamily } from './fonts';

// Kept apart from fonts.ts: this is the only font code that needs the Remotion runtime, and the
// web app's static card thumbnails import fonts.ts without wanting Remotion.

/** Blocks rendering (stills, video frames, Player) until fonts are ready. */
export function useInviteFonts(families: string[], script?: string): boolean {
  const [ready, setReady] = useState(false);
  const signature = families.join('|') + (script ?? '');

  useEffect(() => {
    let done = false;
    const handle = delayRender(`fonts:${signature}`, { timeoutInMilliseconds: 60_000 });
    const finish = () => {
      if (done) return;
      done = true;
      continueRender(handle);
    };
    Promise.allSettled(families.map((f) => loadFamily(f, script))).finally(() => {
      setReady(true);
      finish();
    });
    return finish;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `signature` already encodes families + script
  }, [signature]);

  return ready;
}

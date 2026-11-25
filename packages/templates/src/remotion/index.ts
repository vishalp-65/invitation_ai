import { registerRoot } from 'remotion';
import { disablePhotoCors } from '../photo/cors';
import { RemotionRoot } from './Root';

disablePhotoCors();
registerRoot(RemotionRoot);

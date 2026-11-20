// framer-motion's DOM renderer, loaded on its own after first paint (see LazyMotion in perspective-tunnel).
// The tunnel only binds scroll-driven motion values to `style`, so the smallest bundle is enough.
export { domMin as default } from 'framer-motion';

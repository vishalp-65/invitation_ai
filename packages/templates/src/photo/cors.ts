let mode: 'anonymous' | undefined = 'anonymous';

/** `crossOrigin` for photo <img> tags. The website needs CORS so the editor can export what it draws. */
export const photoCrossOrigin = () => mode;

/**
 * The renderer only screenshots the page, from a local origin that the media bucket's CORS rules do
 * not list. Asking for CORS there makes Chrome drop every uploaded photo.
 */
export function disablePhotoCors() {
  mode = undefined;
}

/*
 * Kept free of React so the server layout can import it: the layout inlines THEME_SCRIPT in <head>.
 */
export const THEME_KEY = "ajo-theme";

/**
 * Runs in <head> before the first paint, so a stored choice never flashes the other theme. Kept as a
 * string because it is inlined (with the page's CSP nonce), not bundled.
 */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

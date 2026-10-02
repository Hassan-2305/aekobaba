// Theme constants shared by the server layout and the client toggle.
// (Kept out of the "use client" module: constants exported from a client
// module reach Server Components as client references, not values.)

export const THEME_STORAGE_KEY = "aekobaba-theme";
export const DEFAULT_THEME = "light" as const;

/** Inline, render-blocking: apply the saved theme before first paint. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

// Demo preview: the form works fully, but nothing is sent to a server.
// Turn it on with VITE_DEMO_MODE=true (for example in Vercel → Settings → Environment Variables)
// while the backend is not live yet. Remove it (or set false) when the backend is connected.
export const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

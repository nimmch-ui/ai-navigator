import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import '@/services/data';
import '@/services/data/init';
import { installLngLatGuard } from './utils/mapboxLngLatGuard';

// CRITICAL: Install LngLatGuard BEFORE any Mapbox code runs
// This must happen before App renders to catch all coordinate errors
installLngLatGuard();

// Disabled dev tests - need refactoring to match current provider array structure
// if (import.meta.env.DEV) {
//   import('./dev/testProviderHealthCaching');
// }

createRoot(document.getElementById("root")!).render(<App />);

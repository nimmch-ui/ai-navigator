import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import '@/services/data';
import '@/services/data/init';

if (import.meta.env.DEV) {
  import('./dev/testProviderHealthCaching');
}

createRoot(document.getElementById("root")!).render(<App />);

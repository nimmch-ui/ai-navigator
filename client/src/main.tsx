import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import '@/services/data';

createRoot(document.getElementById("root")!).render(<App />);

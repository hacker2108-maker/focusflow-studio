import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "@/lib/notifications";

// Register SW early so focus timer notifications work when app is in background
void registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);

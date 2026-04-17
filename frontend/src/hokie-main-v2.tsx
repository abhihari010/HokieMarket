import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import HokieMartAppV2 from "./HokieMartAppV2";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HokieMartAppV2 />
  </StrictMode>,
);
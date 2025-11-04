import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import App from "./App";
import LobbyPage from "./pages/LobbyPage";
import GamePage from "./pages/GamePage";

const router = createBrowserRouter([
  { path: "/", element: <App />, children: [
    { index: true, element: <LobbyPage /> },
    { path: "game/:roomId", element: <GamePage /> },
  ]},
]);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

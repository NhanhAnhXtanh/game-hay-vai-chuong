import type { GameModule } from "../types";
import { TIC_TAC_TOE_ROUTE_SEGMENT } from "./constants";
import LobbyPage from "./pages/LobbyPage";
import GamePage from "./pages/GamePage";

export const ticTacToeGame: GameModule = {
  slug: TIC_TAC_TOE_ROUTE_SEGMENT,
  name: "Gomoku 20x20",
  description: "Danh caro online 20x20 cho 2 nguoi, luu diem va chat trong phong.",
  routes: [
    {
      path: TIC_TAC_TOE_ROUTE_SEGMENT,
      children: [
        { index: true, element: <LobbyPage /> },
        { path: "game/:roomId", element: <GamePage /> },
        { path: "room/:inviteId", element: <GamePage /> }
      ]
    },
    {
      path: "game/:roomId",
      element: <GamePage />
    },
    {
      path: "room/:inviteId",
      element: <GamePage />
    }
  ]
};

import type { GameModule } from "../types";
import { CHESS_ROUTE_SEGMENT } from "./constants";
import ChessLobbyPage from "./pages/ChessLobbyPage";
import ChessGamePage from "./pages/ChessGamePage";

export const chessGame: GameModule = {
  slug: CHESS_ROUTE_SEGMENT,
  name: "Co vua",
  description: "Phong co vua realtime, su dung Firebase project B doc lap.",
  routes: [
    {
      path: CHESS_ROUTE_SEGMENT,
      children: [
        { index: true, element: <ChessLobbyPage /> },
        { path: "game/:roomId", element: <ChessGamePage /> }
      ]
    },
    {
      path: `${CHESS_ROUTE_SEGMENT}/game/:roomId`,
      element: <ChessGamePage />
    }
  ]
};

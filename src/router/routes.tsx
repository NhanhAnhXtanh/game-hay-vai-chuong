import { createBrowserRouter, type RouteObject } from "react-router-dom";
import App from "../App";
import HomePage from "../pages/HomePage";
import { ticTacToeGame } from "../games/tictactoe";
import { chessGame } from "../games/chess";
import { flappyGame } from "../games/flappy";

const gameRoutes: RouteObject[] = [...ticTacToeGame.routes, ...chessGame.routes, ...flappyGame.routes];

const routes: RouteObject[] = [
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      ...gameRoutes
    ]
  }
];

export const router = createBrowserRouter(routes);
export default router;

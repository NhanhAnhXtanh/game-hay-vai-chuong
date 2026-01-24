import { createBrowserRouter, type RouteObject } from "react-router-dom";
import App from "../App";
import HomePage from "../pages/HomePage";
import ErrorPage from "../pages/ErrorPage";
import NotFoundPage from "../pages/NotFoundPage";
import { ticTacToeGame } from "../games/tictactoe";
import { chessGame } from "../games/chess";

// Helper function to recursively add errorElement to routes
function addErrorElementToRoutes(routes: RouteObject[]): RouteObject[] {
  return routes.map(route => ({
    ...route,
    errorElement: <ErrorPage />,
    children: route.children ? addErrorElementToRoutes(route.children) : undefined
  }));
}

const gameRoutes: RouteObject[] = addErrorElementToRoutes([...ticTacToeGame.routes, ...chessGame.routes]);

const routes: RouteObject[] = [
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      { 
        index: true, 
        element: <HomePage />, 
        errorElement: <ErrorPage /> 
      },
      ...gameRoutes,
      {
        path: "*",
        element: <NotFoundPage />,
        errorElement: <ErrorPage />
      }
    ]
  }
];

export const router = createBrowserRouter(routes);
export default router;

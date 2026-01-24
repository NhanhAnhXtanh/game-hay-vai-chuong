import { createBrowserRouter, type RouteObject } from "react-router-dom";
import App from "../App";
import HomePage from "../pages/HomePage";
import ErrorPage from "../pages/ErrorPage";
import NotFoundPage from "../pages/NotFoundPage";
import { ticTacToeGame } from "../games/tictactoe";
import { chessGame } from "../games/chess";

// Helper function to recursively add errorElement to routes
function addErrorElementToRoutes(routes: RouteObject[]): RouteObject[] {
  return routes.map(route => {
    // Create a new route object with errorElement
    const newRoute = {
      ...route,
      errorElement: <ErrorPage />
    } as RouteObject;
    
    // Recursively add errorElement to children if they exist
    if (route.children && Array.isArray(route.children)) {
      newRoute.children = addErrorElementToRoutes(route.children);
    }
    
    return newRoute;
  });
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

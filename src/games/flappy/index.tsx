import type { GameModule } from "../types";
import { FLAPPY_ROUTE_SEGMENT } from "./constants";
import FlappyLobbyPage from "./pages/FlappyLobbyPage";
import FlappySoloPage from "./pages/FlappySoloPage";
import FlappyRoomPage from "./pages/FlappyRoomPage";

export const flappyGame: GameModule = {
  slug: FLAPPY_ROUTE_SEGMENT,
  name: "Flappy Battle",
  description: "Flappy Bird responsive, choi don hoac phong 4 nguoi, ket thuc khi nguoi cuoi cung rot.",
  routes: [
    {
      path: FLAPPY_ROUTE_SEGMENT,
      children: [
        { index: true, element: <FlappyLobbyPage /> },
        { path: "solo", element: <FlappySoloPage /> },
        { path: "room/:roomId", element: <FlappyRoomPage /> }
      ]
    },
    { path: `${FLAPPY_ROUTE_SEGMENT}/room/:roomId`, element: <FlappyRoomPage /> }
  ]
};
export default flappyGame;

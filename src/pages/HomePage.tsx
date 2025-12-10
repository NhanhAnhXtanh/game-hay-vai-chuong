import { Link } from "react-router-dom";
import { ticTacToeGame } from "../games/tictactoe";
import { chessGame } from "../games/chess";
import { TIC_TAC_TOE_HOME_PATH } from "../games/tictactoe/constants";
import { CHESS_HOME_PATH } from "../games/chess/constants";

const cards = [
  { game: ticTacToeGame, href: TIC_TAC_TOE_HOME_PATH },
  { game: chessGame, href: CHESS_HOME_PATH }
];

export default function HomePage() {
  return (
    <section className="space-y-10">
      <header className="space-y-3 text-center">
        <p className="text-sm uppercase tracking-widest text-indigo-600 font-semibold">Playground</p>
        <h1 className="text-4xl font-bold text-gray-900">Chon tro choi</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          He thong da gom Gomoku 20x20 va Co vua realtime (Firebase rieng). Chon tro va moi ban cua ban vao phong
          bang ma chia se.
        </p>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        {cards.map(({ game, href }) => (
          <article key={game.slug} className="border rounded-2xl p-6 bg-white shadow-sm">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">{game.name}</h2>
                {game.comingSoon && (
                  <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-700 bg-amber-100 rounded-full">
                    Coming soon
                  </span>
                )}
              </div>
              <p className="text-gray-600">{game.description}</p>
              {game.comingSoon ? (
                <button
                  className="mt-4 inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed w-full"
                  disabled
                >
                  Dang phat trien
                </button>
              ) : (
                <Link
                  to={href}
                  className="mt-4 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white w-full"
                >
                  Vao san choi
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

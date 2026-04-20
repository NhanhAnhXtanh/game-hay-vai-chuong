import { Outlet } from "react-router-dom";

export default function App() {
  return (
    <main className="min-h-screen px-3 py-3 sm:px-4 sm:py-4 md:px-5 md:py-5">
      <div className="mx-auto w-full max-w-7xl">
        <Outlet />
      </div>
    </main>
  );
}

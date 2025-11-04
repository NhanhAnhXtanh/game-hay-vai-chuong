import { Outlet } from "react-router-dom";

export default function App() {
  return (
    <main className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-xl font-bold mb-4">Shell</h1>
        <Outlet />
      </div>
    </main>
  );
}

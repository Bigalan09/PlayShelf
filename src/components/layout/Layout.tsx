import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50">
      <div className="fixed inset-0 bg-game-pattern pointer-events-none opacity-50"></div>
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8 pb-12 relative z-10">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;

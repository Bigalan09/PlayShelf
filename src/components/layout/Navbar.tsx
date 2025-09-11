import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X, User, Shield, Users as UsersIcon } from "lucide-react";
import DiceIcon from "../common/DiceIcon";
import { useAuth, useUserProfile, useUserSecurity, useUserPermissions } from "../../hooks/useAuthHooks";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Authentication state
  const { isAuthenticated, isLoading } = useAuth();
  const { getDisplayName } = useUserProfile();
  const { forceLogout } = useUserSecurity();
  const { isAdmin } = useUserPermissions();
  
  // Determine user role for existing component logic
  const userRole: "guest" | "member" | "admin" = isAuthenticated 
    ? (isAdmin ? "admin" : "member")
    : "guest";
  const username = isAuthenticated ? getDisplayName() : null;

  const navLinks = [
    { to: "/", label: "🏠 Home", color: "hover:text-game-purple", show: true },
    {
      to: "/games",
      label: "🎲 Our Games",
      color: "hover:text-game-blue",
      show: true,
    },
  ];

  // Immediate logout handler
  const handleLogout = async () => {
    try {
      await forceLogout();
      setIsUserMenuOpen(false);
      setIsMenuOpen(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getRoleBadge = () => {
    switch (userRole) {
      case "admin":
        return (
          <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-game-red to-game-orange text-white text-xs rounded-full font-medium">
            Admin
          </span>
        );
      case "member":
        return (
          <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-game-blue to-game-teal text-white text-xs rounded-full font-medium">
            Member
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <nav className="bg-white shadow-xl sticky top-0 z-50 border-b-4 border-primary-400">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="transform group-hover:rotate-180 transition-transform duration-500">
              <DiceIcon className="h-10 w-10" />
            </div>
            <span className="text-2xl font-game font-bold bg-gradient-to-r from-primary-600 to-game-pink bg-clip-text text-transparent">
              PlayShelf
            </span>
            <span className="text-sm font-game text-gray-500">
              Family Game Library
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `text-gray-700 ${link.color} transition-all duration-200 font-game font-medium text-lg transform hover:scale-105 ${
                    isActive ? "text-primary-600" : ""
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}

            {userRole === "member" && (
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `text-gray-700 hover:text-game-green transition-all duration-200 font-game font-medium text-lg transform hover:scale-105 ${
                    isActive ? "text-game-green" : ""
                  }`
                }
              >
                📚 My Lists
              </NavLink>
            )}

            {userRole === "admin" && (
              <>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    `text-gray-700 hover:text-game-green transition-all duration-200 font-game font-medium text-lg transform hover:scale-105 ${
                      isActive ? "text-game-green" : ""
                    }`
                  }
                >
                  📚 My Lists
                </NavLink>
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `text-gray-700 hover:text-game-orange transition-all duration-200 font-game font-medium text-lg transform hover:scale-105 ${
                      isActive ? "text-game-orange" : ""
                    }`
                  }
                >
                  ⚙️ Admin
                </NavLink>
              </>
            )}
          </div>

          {/* User Menu */}
          <div className="hidden md:block relative">
            {isLoading ? (
              <div className="flex items-center space-x-2 text-gray-400">
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                <span className="font-game">Loading...</span>
              </div>
            ) : isAuthenticated ? (
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 transition-all duration-200 font-game transform hover:scale-105"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-game-purple to-game-pink rounded-full flex items-center justify-center">
                  {userRole === "admin" ? (
                    <Shield className="h-5 w-5 text-white" />
                  ) : userRole === "member" ? (
                    <UsersIcon className="h-5 w-5 text-white" />
                  ) : (
                    <User className="h-5 w-5 text-white" />
                  )}
                </div>
                <span className="font-medium">{username}</span>
                {getRoleBadge()}
              </button>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/auth/login"
                  className="text-gray-700 hover:text-primary-600 transition-all duration-200 font-game font-medium transform hover:scale-105"
                >
                  Log In
                </Link>
                <Link
                  to="/auth/signup"
                  className="bg-gradient-to-r from-primary-500 to-game-pink text-white px-6 py-2 rounded-full hover:shadow-game-hover transition-all duration-200 font-game font-medium transform hover:scale-105"
                >
                  🎮 Sign Up
                </Link>
              </div>
            )}

            {/* Dropdown Menu */}
            {isUserMenuOpen && isAuthenticated && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl py-2 z-50 border-2 border-primary-200">
                {userRole === "member" || userRole === "admin" ? (
                  <>
                    <Link
                      to="/dashboard"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 font-game"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      📚 My Lists
                    </Link>
                    <Link
                      to="/dashboard/reviews"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 font-game"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      ⭐ My Reviews
                    </Link>
                  </>
                ) : null}
                {userRole === "admin" && (
                  <>
                    <hr className="my-1 border-primary-100" />
                    <Link
                      to="/admin"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 font-game"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      ⚙️ Admin Panel
                    </Link>
                  </>
                )}
                <hr className="my-1 border-primary-100" />
                <Link
                  to="/dashboard/settings"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 font-game"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  ⚙️ Settings
                </Link>
                <button
                  className="block w-full text-left px-4 py-2 text-sm font-game transition-colors text-gray-700 hover:bg-primary-50"
                  onClick={handleLogout}
                >
                  👋 Log Out
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden transform hover:scale-105 transition-transform"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6 text-gray-700" />
            ) : (
              <Menu className="h-6 w-6 text-gray-700" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t-2 border-primary-100">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `block py-2 text-gray-700 hover:text-primary-600 transition-colors font-game ${
                    isActive ? "text-primary-600 font-semibold" : ""
                  }`
                }
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}

            {userRole === "member" || userRole === "admin" ? (
              <>
                <NavLink
                  to="/dashboard"
                  className="block py-2 text-gray-700 hover:text-primary-600 transition-colors font-game"
                  onClick={() => setIsMenuOpen(false)}
                >
                  📚 My Lists
                </NavLink>
              </>
            ) : null}

            {userRole === "admin" && (
              <NavLink
                to="/admin"
                className="block py-2 text-gray-700 hover:text-primary-600 transition-colors font-game"
                onClick={() => setIsMenuOpen(false)}
              >
                ⚙️ Admin
              </NavLink>
            )}

            {isLoading ? (
              <div className="pt-4 text-center">
                <div className="py-2 text-sm text-gray-400 font-game">
                  Loading...
                </div>
              </div>
            ) : isAuthenticated ? (
              <>
                <hr className="my-2 border-primary-100" />
                <div className="py-2 text-sm text-gray-500 font-game">
                  Logged in as {username} {getRoleBadge()}
                </div>
                <button 
                  className="block w-full text-left py-2 font-game transition-colors text-gray-700 hover:text-primary-600"
                  onClick={handleLogout}
                >
                  👋 Log Out
                </button>
              </>
            ) : (
              <div className="pt-4 space-y-2">
                <Link
                  to="/auth/login"
                  className="block w-full text-center py-2 text-gray-700 border-2 border-primary-300 rounded-full hover:bg-primary-50 font-game"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Log In
                </Link>
                <Link
                  to="/auth/signup"
                  className="block w-full text-center py-2 bg-gradient-to-r from-primary-500 to-game-pink text-white rounded-full hover:shadow-game font-game"
                  onClick={() => setIsMenuOpen(false)}
                >
                  🎮 Sign Up
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

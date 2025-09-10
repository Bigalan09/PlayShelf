import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import {
  Dice6,
  Users,
  Shield,
  Settings,
  BarChart,
  UserPlus,
  Edit,
  Trash,
} from "lucide-react";

const AdminPage = () => {
  const navItems = [
    { path: "overview", label: "Overview", icon: BarChart, emoji: "📊" },
    { path: "games", label: "Manage Games", icon: Dice6, emoji: "🎲" },
    { path: "users", label: "Manage Users", icon: Users, emoji: "👥" },
    { path: "settings", label: "Settings", icon: Settings, emoji: "⚙️" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Sidebar */}
      <div className="md:col-span-1">
        <div className="bg-white rounded-2xl shadow-lg p-4 border-2 border-orange-200">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-orange-600" />
            <h2 className="font-game font-semibold text-gray-900">
              Admin Panel
            </h2>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 rounded-lg transition-all duration-200 font-game ${
                    isActive
                      ? "bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 transform scale-105"
                      : "text-gray-700 hover:bg-gray-100 hover:scale-102"
                  }`
                }
              >
                <span className="mr-2 text-xl">{item.emoji}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="md:col-span-3">
        <Routes>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<AdminOverview />} />
          <Route path="games" element={<ManageGames />} />
          <Route path="users" element={<ManageUsers />} />
          <Route path="settings" element={<AdminSettings />} />
        </Routes>
      </div>
    </div>
  );
};

// Admin Overview Component
const AdminOverview = () => {
  const stats = [
    {
      label: "Total Games",
      value: "47",
      change: "in library",
      color: "from-game-purple to-game-pink",
    },
    {
      label: "Family Members",
      value: "6",
      change: "with access",
      color: "from-game-blue to-game-teal",
    },
    {
      label: "Total Reviews",
      value: "124",
      change: "written",
      color: "from-game-yellow to-game-orange",
    },
    {
      label: "Lists Created",
      value: "12",
      change: "by members",
      color: "from-game-green to-game-teal",
    },
  ];

  const recentActivity = [
    {
      user: "Mom",
      action: "Added review for Wingspan",
      time: "2 hours ago",
      emoji: "⭐",
    },
    {
      user: "Dad",
      action: 'Created "Quick Games" list',
      time: "1 day ago",
      emoji: "📚",
    },
    {
      user: "Sister",
      action: "Rated Azul 8.5/10",
      time: "2 days ago",
      emoji: "🎯",
    },
    {
      user: "Brother",
      action: "Added Ticket to Ride to favorites",
      time: "3 days ago",
      emoji: "❤️",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-orange-100">
        <h2 className="text-2xl font-game font-bold text-gray-900 mb-6">
          Admin Overview
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-4 border-2 border-gray-100"
            >
              <div
                className={`inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br ${stat.color} mb-2`}
              >
                <span className="text-white text-lg font-bold">
                  {stat.value}
                </span>
              </div>
              <p className="text-sm font-game font-medium text-gray-900">
                {stat.label}
              </p>
              <p className="text-xs text-gray-600 font-game">{stat.change}</p>
            </div>
          ))}
        </div>

        <h3 className="text-lg font-game font-semibold text-gray-900 mb-4">
          Recent Family Activity
        </h3>
        <div className="space-y-3">
          {recentActivity.map((activity, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 border-b border-gray-100"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{activity.emoji}</span>
                <div>
                  <p className="font-game font-medium text-gray-900">
                    {activity.action}
                  </p>
                  <p className="text-sm text-gray-600 font-game">
                    {activity.user} • {activity.time}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Manage Games Component
const ManageGames = () => {
  const games = [
    {
      id: "1",
      title: "Wingspan",
      year: 2019,
      playerCount: "1-5",
      playTime: "40-70",
      rating: 8.1,
    },
    {
      id: "2",
      title: "Azul",
      year: 2017,
      playerCount: "2-4",
      playTime: "30-45",
      rating: 7.9,
    },
    {
      id: "3",
      title: "Catan",
      year: 1995,
      playerCount: "3-4",
      playTime: "60-120",
      rating: 7.2,
    },
    {
      id: "4",
      title: "Ticket to Ride",
      year: 2004,
      playerCount: "2-5",
      playTime: "30-60",
      rating: 7.5,
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-orange-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-game font-bold text-gray-900">
          Manage Games
        </h2>
        <button className="px-4 py-2 bg-gradient-to-r from-game-green to-game-teal text-white rounded-full hover:shadow-game-hover transition-all duration-200 font-game font-medium transform hover:scale-105">
          ➕ Add New Game
        </button>
      </div>

      <div className="grid gap-4">
        {games.map((game) => (
          <div
            key={game.id}
            className="border-2 border-gray-100 rounded-xl p-4 hover:shadow-md transition-all duration-200"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-game font-semibold text-lg text-gray-900">
                  {game.title}
                </h3>
                <div className="flex gap-4 mt-2 text-sm text-gray-600 font-game">
                  <span>📅 {game.year}</span>
                  <span>👥 {game.playerCount} players</span>
                  <span>⏱️ {game.playTime} min</span>
                  <span>⭐ {game.rating}/10</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Edit className="h-4 w-4" />
                </button>
                <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="mt-4 w-full py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-game font-medium">
        Load More Games
      </button>
    </div>
  );
};

// Manage Users Component
const ManageUsers = () => {
  const users = [
    {
      id: "1",
      name: "Dad",
      email: "dad@family.com",
      role: "Admin",
      joined: "Jan 2024",
      color: "from-red-400 to-orange-400",
    },
    {
      id: "2",
      name: "Mom",
      email: "mom@family.com",
      role: "Member",
      joined: "Jan 2024",
      color: "from-blue-400 to-cyan-400",
    },
    {
      id: "3",
      name: "Sister",
      email: "sister@family.com",
      role: "Member",
      joined: "Feb 2024",
      color: "from-purple-400 to-pink-400",
    },
    {
      id: "4",
      name: "Brother",
      email: "brother@family.com",
      role: "Member",
      joined: "Feb 2024",
      color: "from-green-400 to-emerald-400",
    },
    {
      id: "5",
      name: "Grandpa",
      email: "grandpa@family.com",
      role: "Guest",
      joined: "Mar 2024",
      color: "from-gray-400 to-gray-500",
    },
    {
      id: "6",
      name: "Cousin",
      email: "cousin@family.com",
      role: "Guest",
      joined: "Mar 2024",
      color: "from-yellow-400 to-amber-400",
    },
  ];

  const getRoleBadge = (role: string) => {
    const colors = {
      Admin: "bg-gradient-to-r from-red-500 to-orange-500 text-white",
      Member: "bg-gradient-to-r from-blue-500 to-cyan-500 text-white",
      Guest: "bg-gray-200 text-gray-700",
    };
    return colors[role as keyof typeof colors] || colors.Guest;
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-4 border-2 border-orange-100">
          <div className="flex items-center justify-between">
            <Shield className="h-6 w-6 text-orange-600" />
            <span className="text-2xl font-game font-bold text-gray-900">
              1
            </span>
          </div>
          <p className="text-sm font-game text-gray-600 mt-2">Admins</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4 border-2 border-blue-100">
          <div className="flex items-center justify-between">
            <Users className="h-6 w-6 text-blue-600" />
            <span className="text-2xl font-game font-bold text-gray-900">
              3
            </span>
          </div>
          <p className="text-sm font-game text-gray-600 mt-2">Members</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4 border-2 border-gray-200">
          <div className="flex items-center justify-between">
            <UserPlus className="h-6 w-6 text-gray-600" />
            <span className="text-2xl font-game font-bold text-gray-900">
              2
            </span>
          </div>
          <p className="text-sm font-game text-gray-600 mt-2">Guests</p>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-orange-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-game font-bold text-gray-900">
            Family Members
          </h2>
          <button className="px-4 py-2 bg-gradient-to-r from-primary-500 to-game-pink text-white rounded-full hover:shadow-game-hover transition-all duration-200 font-game font-medium transform hover:scale-105">
            ➕ Invite Family Member
          </button>
        </div>

        <div className="grid gap-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="border-2 border-gray-100 rounded-xl p-4 hover:shadow-md transition-all duration-200"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-full bg-gradient-to-br ${user.color} flex items-center justify-center text-white font-game font-bold text-lg`}
                  >
                    {user.name[0]}
                  </div>
                  <div>
                    <h3 className="font-game font-semibold text-gray-900">
                      {user.name}
                    </h3>
                    <p className="text-sm text-gray-600 font-game">
                      {user.email}
                    </p>
                    <p className="text-xs text-gray-500 font-game">
                      Joined {user.joined}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-game font-medium ${getRoleBadge(user.role)}`}
                  >
                    {user.role}
                  </span>
                  {user.role !== "Admin" && (
                    <select className="px-3 py-1 border-2 border-gray-300 rounded-lg text-sm font-game focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
                      <option>Change Role</option>
                      {user.role === "Guest" && (
                        <option>Upgrade to Member</option>
                      )}
                      <option>Make Admin</option>
                    </select>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Admin Settings Component
const AdminSettings = () => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-orange-100">
      <h2 className="text-2xl font-game font-bold text-gray-900 mb-6">
        Library Settings
      </h2>

      <form className="space-y-6 max-w-2xl">
        <div>
          <h3 className="font-game font-medium text-gray-900 mb-3">
            Library Information
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-game font-medium text-gray-700 mb-1">
                Library Name
              </label>
              <input
                type="text"
                defaultValue="Smith Family Game Library"
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-game"
              />
            </div>
            <div>
              <label className="block text-sm font-game font-medium text-gray-700 mb-1">
                Welcome Message
              </label>
              <textarea
                rows={3}
                defaultValue="Welcome to our family game collection! Browse our games and find something fun to play together."
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-game"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-game font-medium text-gray-900 mb-3">
            Access Settings
          </h3>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="checkbox" className="mr-2 rounded" defaultChecked />
              <span className="text-sm text-gray-700 font-game">
                Allow guests to view the library without login
              </span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2 rounded" defaultChecked />
              <span className="text-sm text-gray-700 font-game">
                Allow new registrations (guests by default)
              </span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2 rounded" />
              <span className="text-sm text-gray-700 font-game">
                Require admin approval for new members
              </span>
            </label>
          </div>
        </div>

        <div>
          <h3 className="font-game font-medium text-gray-900 mb-3">
            Game Settings
          </h3>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="checkbox" className="mr-2 rounded" defaultChecked />
              <span className="text-sm text-gray-700 font-game">
                Show BoardGameGeek ratings
              </span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2 rounded" defaultChecked />
              <span className="text-sm text-gray-700 font-game">
                Allow members to create custom lists
              </span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2 rounded" defaultChecked />
              <span className="text-sm text-gray-700 font-game">
                Track play history
              </span>
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full hover:shadow-game-hover transition-all duration-200 font-game font-medium"
          >
            Save Settings
          </button>
          <button
            type="button"
            className="px-6 py-2 border-2 border-gray-300 rounded-full hover:bg-gray-50 transition-colors font-game font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminPage;

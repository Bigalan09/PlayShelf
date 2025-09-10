import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import {
  Star,
  List,
  Settings,
  Home,
  Heart,
  Calendar,
  Trophy,
} from "lucide-react";

const DashboardPage = () => {
  const navItems = [
    { path: "lists", label: "My Lists", icon: List, emoji: "📚" },
    { path: "reviews", label: "My Reviews", icon: Star, emoji: "⭐" },
    { path: "settings", label: "Settings", icon: Settings, emoji: "⚙️" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Sidebar */}
      <div className="md:col-span-1">
        <div className="bg-white rounded-2xl shadow-lg p-4 border-2 border-primary-100">
          <div className="flex items-center gap-2 mb-4">
            <Home className="h-5 w-5 text-primary-600" />
            <h2 className="font-game font-semibold text-gray-900">
              My Dashboard
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
                      ? "bg-gradient-to-r from-primary-100 to-pink-100 text-primary-700 transform scale-105"
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
          <Route index element={<Navigate to="lists" replace />} />
          <Route path="lists" element={<MyLists />} />
          <Route path="reviews" element={<MyReviews />} />
          <Route path="settings" element={<AccountSettings />} />
        </Routes>
      </div>
    </div>
  );
};

// My Lists Component
const MyLists = () => {
  const lists = [
    {
      id: "1",
      name: "Family Favourites",
      emoji: "❤️",
      games: 12,
      description: "Games everyone loves to play",
      color: "from-pink-400 to-rose-400",
    },
    {
      id: "2",
      name: "Quick Games",
      emoji: "⚡",
      games: 8,
      description: "Perfect for when we have 30 minutes",
      color: "from-yellow-400 to-orange-400",
    },
    {
      id: "3",
      name: "Party Night",
      emoji: "🎉",
      games: 6,
      description: "Great for large groups",
      color: "from-purple-400 to-pink-400",
    },
    {
      id: "4",
      name: "Two Player",
      emoji: "👫",
      games: 15,
      description: "Perfect for date night",
      color: "from-blue-400 to-cyan-400",
    },
    {
      id: "5",
      name: "Want to Try",
      emoji: "🎯",
      games: 4,
      description: "Games we haven't played yet",
      color: "from-green-400 to-emerald-400",
    },
  ];

  const recentlyPlayed = [
    {
      id: "1",
      title: "Wingspan",
      image: "https://placehold.co/300x400/e0f2fe/0891b2?text=Wingspan",
      lastPlayed: "2 days ago",
      playCount: 12,
    },
    {
      id: "2",
      title: "Azul",
      image: "https://placehold.co/300x400/dbeafe/2563eb?text=Azul",
      lastPlayed: "1 week ago",
      playCount: 8,
    },
    {
      id: "3",
      title: "Ticket to Ride",
      image: "https://placehold.co/300x400/fef3c7/f59e0b?text=Ticket+to+Ride",
      lastPlayed: "2 weeks ago",
      playCount: 15,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-primary-100">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-game font-bold text-gray-900 mb-1">
              My Game Lists
            </h2>
            <p className="text-gray-600 font-game">
              Organize games for different occasions
            </p>
          </div>
          <button className="px-4 py-2 bg-gradient-to-r from-primary-500 to-game-pink text-white rounded-full hover:shadow-game-hover transition-all duration-200 font-game font-medium transform hover:scale-105">
            ➕ Create List
          </button>
        </div>

        {/* Lists Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lists.map((list) => (
            <div
              key={list.id}
              className="bg-gradient-to-br bg-white border-2 border-gray-100 rounded-xl p-4 hover:shadow-lg transform hover:scale-105 hover:-rotate-1 transition-all duration-200 cursor-pointer"
            >
              <div
                className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br ${list.color} mb-3`}
              >
                <span className="text-2xl">{list.emoji}</span>
              </div>
              <h3 className="font-game font-semibold text-gray-900 text-lg">
                {list.name}
              </h3>
              <p className="text-sm text-gray-600 font-game mb-2">
                {list.description}
              </p>
              <div className="flex justify-between items-center">
                <span className="text-sm font-game text-gray-500">
                  {list.games} games
                </span>
                <button className="text-primary-600 hover:text-primary-700 font-game text-sm font-medium">
                  View →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recently Played Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-primary-100">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-game-blue" />
          <h3 className="text-xl font-game font-bold text-gray-900">
            Recently Played
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recentlyPlayed.map((game) => (
            <div
              key={game.id}
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <img
                src={game.image}
                alt={game.title}
                className="w-16 h-20 object-cover rounded-lg"
              />
              <div className="flex-1">
                <h4 className="font-game font-semibold text-gray-900">
                  {game.title}
                </h4>
                <p className="text-sm text-gray-600 font-game">
                  {game.lastPlayed}
                </p>
                <p className="text-xs text-gray-500 font-game">
                  Played {game.playCount} times
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// My Reviews Component
const MyReviews = () => {
  const reviews = [
    {
      id: "1",
      game: "Wingspan",
      rating: 8.5,
      date: "2024-01-15",
      review:
        "Beautiful game with amazing components. The whole family enjoys it!",
      helpful: 12,
    },
    {
      id: "2",
      game: "Catan",
      rating: 7.0,
      date: "2024-01-08",
      review:
        "Classic game but can drag on with 4 players. Better with the Cities expansion.",
      helpful: 8,
    },
    {
      id: "3",
      game: "Ticket to Ride",
      rating: 9.0,
      date: "2024-01-01",
      review:
        "Perfect gateway game! Easy to teach to new players and always fun.",
      helpful: 15,
    },
  ];

  const stats = {
    totalReviews: 24,
    averageRating: 7.8,
    helpfulVotes: 156,
    thisMonth: 3,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-4 border-2 border-primary-100 transform hover:scale-105 transition-all">
          <div className="flex items-center justify-between mb-2">
            <Star className="h-6 w-6 text-game-yellow fill-current" />
            <span className="text-2xl">📝</span>
          </div>
          <p className="text-2xl font-game font-bold text-gray-900">
            {stats.totalReviews}
          </p>
          <p className="text-sm text-gray-600 font-game">Total Reviews</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4 border-2 border-primary-100 transform hover:scale-105 transition-all">
          <div className="flex items-center justify-between mb-2">
            <Trophy className="h-6 w-6 text-game-orange" />
            <span className="text-2xl">⭐</span>
          </div>
          <p className="text-2xl font-game font-bold text-gray-900">
            {stats.averageRating}
          </p>
          <p className="text-sm text-gray-600 font-game">Avg Rating</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4 border-2 border-primary-100 transform hover:scale-105 transition-all">
          <div className="flex items-center justify-between mb-2">
            <Heart className="h-6 w-6 text-game-pink" />
            <span className="text-2xl">👍</span>
          </div>
          <p className="text-2xl font-game font-bold text-gray-900">
            {stats.helpfulVotes}
          </p>
          <p className="text-sm text-gray-600 font-game">Helpful Votes</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4 border-2 border-primary-100 transform hover:scale-105 transition-all">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="h-6 w-6 text-game-green" />
            <span className="text-2xl">📅</span>
          </div>
          <p className="text-2xl font-game font-bold text-gray-900">
            {stats.thisMonth}
          </p>
          <p className="text-sm text-gray-600 font-game">This Month</p>
        </div>
      </div>

      {/* Reviews List */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-primary-100">
        <h2 className="text-2xl font-game font-bold text-gray-900 mb-6">
          My Reviews
        </h2>

        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="border-2 border-gray-100 rounded-xl p-4 hover:shadow-md transition-all duration-200"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-game font-semibold text-lg text-gray-900">
                  {review.game}
                </h3>
                <div className="flex items-center bg-gradient-to-r from-game-yellow to-game-orange px-3 py-1 rounded-full">
                  <Star className="h-4 w-4 text-white fill-current" />
                  <span className="ml-1 text-white font-game font-bold">
                    {review.rating}
                  </span>
                </div>
              </div>
              <p className="text-gray-700 font-game mb-3">{review.review}</p>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4 text-sm text-gray-600 font-game">
                  <span>{review.date}</span>
                  <span>👍 {review.helpful} found helpful</span>
                </div>
                <div className="flex gap-2">
                  <button className="text-primary-600 hover:text-primary-700 text-sm font-game font-medium">
                    Edit
                  </button>
                  <button className="text-red-600 hover:text-red-700 text-sm font-game font-medium">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button className="mt-4 w-full py-2 border-2 border-primary-300 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors font-game font-medium">
          Load More Reviews
        </button>
      </div>
    </div>
  );
};

// Account Settings Component
const AccountSettings = () => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-primary-100">
      <h2 className="text-2xl font-game font-bold text-gray-900 mb-6">
        Account Settings
      </h2>

      <form className="space-y-6 max-w-2xl">
        <div>
          <label className="block text-sm font-game font-medium text-gray-700 mb-1">
            Display Name
          </label>
          <input
            type="text"
            defaultValue="Player One"
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-game"
          />
          <p className="mt-1 text-xs text-gray-500 font-game">
            This is how other family members will see you
          </p>
        </div>

        <div>
          <label className="block text-sm font-game font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            type="email"
            defaultValue="player.one@family.com"
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-game"
          />
        </div>

        <div>
          <label className="block text-sm font-game font-medium text-gray-700 mb-1">
            Favourite Game Genre
          </label>
          <select className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-game">
            <option>Strategy</option>
            <option>Party</option>
            <option>Family</option>
            <option>Card Games</option>
            <option>Cooperative</option>
          </select>
        </div>

        <div>
          <h3 className="font-game font-medium text-gray-900 mb-3">
            Game Night Preferences
          </h3>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="checkbox" className="mr-2 rounded" defaultChecked />
              <span className="text-sm text-gray-700 font-game">
                Available for weekend game nights
              </span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2 rounded" defaultChecked />
              <span className="text-sm text-gray-700 font-game">
                Interested in learning new games
              </span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2 rounded" />
              <span className="text-sm text-gray-700 font-game">
                Prefer shorter games (under 1 hour)
              </span>
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="px-6 py-2 bg-gradient-to-r from-primary-500 to-game-pink text-white rounded-full hover:shadow-game-hover transition-all duration-200 font-game font-medium"
          >
            Save Changes
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

export default DashboardPage;

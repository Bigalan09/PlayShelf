import { Link } from "react-router-dom";
import { Dice6, Star, Users, ArrowRight, Sparkles, Zap } from "lucide-react";
import GameCard from "../components/games/GameCard";
import DiceIcon from "../components/common/DiceIcon";

const HomePage = () => {
  // Mock data
  const featuredGames = [
    {
      id: "1",
      title: "Wingspan",
      image: "https://placehold.co/300x400/e0f2fe/0891b2?text=Wingspan",
      rating: 8.1,
      bggRating: 8.0,
      playerCount: "1-5",
      playTime: "40-70",
      categories: ["Strategy", "Card Game"],
      year: 2019,
    },
    {
      id: "2",
      title: "Azul",
      image: "https://placehold.co/300x400/dbeafe/2563eb?text=Azul",
      rating: 7.9,
      bggRating: 7.8,
      playerCount: "2-4",
      playTime: "30-45",
      categories: ["Abstract", "Tile Placement"],
      year: 2017,
    },
    {
      id: "3",
      title: "Ticket to Ride",
      image: "https://placehold.co/300x400/fef3c7/f59e0b?text=Ticket+to+Ride",
      rating: 7.5,
      bggRating: 7.4,
      playerCount: "2-5",
      playTime: "30-60",
      categories: ["Strategy", "Family"],
      year: 2004,
    },
    {
      id: "4",
      title: "Catan",
      image: "https://placehold.co/300x400/fed7aa/ea580c?text=Catan",
      rating: 7.2,
      bggRating: 7.1,
      playerCount: "3-4",
      playTime: "60-120",
      categories: ["Strategy", "Trading"],
      year: 1995,
    },
  ];

  const stats = [
    {
      label: "Total Games",
      value: "47",
      icon: Dice6,
      color: "from-game-purple to-game-pink",
      emoji: "🎲",
    },
    {
      label: "Quick Games",
      value: "12",
      icon: Zap,
      color: "from-game-yellow to-game-orange",
      emoji: "⚡",
      subtitle: "Under 30 min",
    },
    {
      label: "2-Player Games",
      value: "18",
      icon: Users,
      color: "from-game-blue to-game-teal",
      emoji: "👫",
    },
    {
      label: "Unplayed",
      value: "3",
      icon: Sparkles,
      color: "from-game-green to-game-teal",
      emoji: "✨",
      subtitle: "Try these!",
    },
  ];

  const categories = [
    { name: "Strategy", emoji: "🧠", color: "from-purple-400 to-pink-400" },
    { name: "Family", emoji: "👨‍👩‍👧‍👦", color: "from-blue-400 to-cyan-400" },
    { name: "Party", emoji: "🎉", color: "from-pink-400 to-rose-400" },
    { name: "Card Game", emoji: "🃏", color: "from-red-400 to-orange-400" },
    {
      name: "Cooperative",
      emoji: "🤝",
      color: "from-green-400 to-emerald-400",
    },
    { name: "Abstract", emoji: "🎨", color: "from-indigo-400 to-purple-400" },
    { name: "Dice", emoji: "🎲", color: "from-yellow-400 to-amber-400" },
    { name: "Economic", emoji: "💰", color: "from-amber-400 to-yellow-400" },
  ];

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative">
        <div className="absolute -top-10 -left-10 w-32 h-32 animate-bounce-slow">
          <DiceIcon className="w-full h-full opacity-20" value={1} />
        </div>
        <div
          className="absolute -top-10 -right-10 w-32 h-32 animate-float"
          style={{ animationDelay: "1s" }}
        >
          <DiceIcon className="w-full h-full opacity-20" value={6} />
        </div>

        <div className="bg-gradient-to-br from-primary-500 via-game-pink to-game-purple rounded-3xl p-8 md:p-12 text-white shadow-2xl transform hover:scale-[1.02] transition-transform duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full translate-y-24 -translate-x-24"></div>

          <div className="max-w-4xl relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-8 w-8 text-yellow-300 animate-pulse" />
              <span className="text-yellow-300 font-game text-xl">
                Welcome to the Game Zone!
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-game font-bold mb-4 animate-pulse-slow">
              PlayShelf 🎮
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-purple-100 font-game">
              Track your board game collection, write reviews, and discover your
              next favourite game!
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/games"
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary-600 rounded-full font-game font-semibold hover:shadow-game-hover transform hover:scale-105 transition-all duration-200 text-lg"
              >
                <Zap className="mr-2 h-5 w-5" />
                Browse Our Games
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 shadow-lg border-2 border-primary-100 transform hover:scale-105 hover:rotate-1 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`p-3 rounded-full bg-gradient-to-br ${stat.color} shadow-lg group-hover:animate-bounce`}
                >
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <span className="text-3xl animate-wiggle">{stat.emoji}</span>
              </div>
              <div className="text-3xl font-game font-bold text-gray-900">
                {stat.value}
              </div>
              <div className="text-sm text-gray-600 font-game">
                {stat.label}
              </div>
              {stat.subtitle && (
                <div className="text-xs text-gray-500 font-game mt-1">
                  {stat.subtitle}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Featured Games */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Star className="h-8 w-8 text-game-yellow fill-current animate-pulse" />
            <h2 className="text-3xl font-game font-bold bg-gradient-to-r from-primary-600 to-game-pink bg-clip-text text-transparent">
              Featured Games
            </h2>
          </div>
          <Link
            to="/games"
            className="text-primary-600 hover:text-primary-700 font-game font-medium inline-flex items-center transform hover:scale-110 transition-all duration-200"
          >
            View All
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredGames.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </section>

      {/* Categories Section */}
      <section className="bg-white rounded-3xl p-8 shadow-xl border-4 border-primary-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="animate-wiggle">🎯</div>
          <h2 className="text-3xl font-game font-bold text-gray-900">
            Browse by Category
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((category, index) => (
            <Link
              key={category.name}
              to={`/games?category=${category.name}`}
              className={`bg-gradient-to-br ${category.color} p-6 rounded-2xl text-center hover:shadow-game-hover transform hover:scale-105 hover:rotate-2 transition-all duration-200`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="text-4xl mb-2 animate-bounce-slow">
                {category.emoji}
              </div>
              <span className="text-lg font-game font-semibold text-white">
                {category.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Fun Facts Section */}
      <section className="bg-gradient-to-r from-game-purple to-game-pink rounded-3xl p-8 text-white shadow-xl">
        <div className="text-center">
          <h2 className="text-3xl font-game font-bold mb-4 flex items-center justify-center gap-2">
            <Sparkles className="h-8 w-8 animate-pulse" />
            Did You Know?
            <Sparkles className="h-8 w-8 animate-pulse" />
          </h2>
          <p className="text-xl font-game mb-2">
            The oldest board game ever found is Senet from Ancient Egypt! 🏺
          </p>
          <p className="text-lg font-game text-purple-100">
            It dates back to around 3,100 BCE - that's over 5,000 years of
            gaming history!
          </p>
        </div>
      </section>
    </div>
  );
};

export default HomePage;

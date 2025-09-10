import { useState } from "react";
import { Search, Filter, ChevronDown, X } from "lucide-react";
import GameCard from "../../components/games/GameCard";

const GamesPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedMechanics, setSelectedMechanics] = useState<string[]>([]);
  const [selectedPlayerCount, setSelectedPlayerCount] = useState("");
  const [selectedPlayTime, setSelectedPlayTime] = useState("");
  const [sortBy, setSortBy] = useState("name");

  // Mock data - same as HomePage for consistency
  const games = [
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
    {
      id: "5",
      title: "Pandemic",
      image: "https://placehold.co/300x400/dcfce7/65a30d?text=Pandemic",
      rating: 7.6,
      bggRating: 7.5,
      playerCount: "2-4",
      playTime: "45",
      categories: ["Cooperative", "Strategy"],
      year: 2008,
    },
    {
      id: "6",
      title: "Codenames",
      image: "https://placehold.co/300x400/fce7f3/ec4899?text=Codenames",
      rating: 7.8,
      bggRating: 7.7,
      playerCount: "2-8",
      playTime: "15",
      categories: ["Party", "Word Game"],
      year: 2015,
    },
    {
      id: "7",
      title: "Splendor",
      image: "https://placehold.co/300x400/f3e8ff/a855f7?text=Splendor",
      rating: 7.4,
      bggRating: 7.3,
      playerCount: "2-4",
      playTime: "30",
      categories: ["Strategy", "Economic"],
      year: 2014,
    },
    {
      id: "8",
      title: "7 Wonders",
      image: "https://placehold.co/300x400/e9d5ff/9333ea?text=7+Wonders",
      rating: 7.7,
      bggRating: 7.6,
      playerCount: "2-7",
      playTime: "30",
      categories: ["Strategy", "Card Drafting"],
      year: 2010,
    },
  ];

  const categories = [
    "Strategy",
    "Family",
    "Party",
    "Cooperative",
    "Abstract",
    "Card Game",
    "Economic",
    "Word Game",
  ];

  const mechanics = [
    "Engine Building",
    "Card Drafting",
    "Dice Rolling",
    "Tile Placement",
    "Worker Placement",
    "Set Collection",
    "Area Control",
    "Hand Management",
    "Pattern Building",
    "Trading",
    "Auction/Bidding",
    "Cooperative",
  ];

  const playerCounts = ["1", "2", "3", "4", "5", "6+"];
  const playTimes = ["< 30 min", "30-60 min", "60-90 min", "90+ min"];

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  const toggleMechanic = (mechanic: string) => {
    setSelectedMechanics((prev) =>
      prev.includes(mechanic)
        ? prev.filter((m) => m !== mechanic)
        : [...prev, mechanic],
    );
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Games</h1>
        <p className="text-gray-600">
          Discover and explore our collection of board games
        </p>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
            >
              <option value="name">Name</option>
              <option value="rating">Highest Rated</option>
              <option value="newest">Newest First</option>
              <option value="players">Player Count</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {(selectedCategories.length > 0 ||
              selectedMechanics.length > 0 ||
              selectedPlayerCount ||
              selectedPlayTime) && (
              <span className="ml-2 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full">
                {selectedCategories.length +
                  selectedMechanics.length +
                  (selectedPlayerCount ? 1 : 0) +
                  (selectedPlayTime ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
            {/* Categories */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedCategories.includes(category)
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Mechanics */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Mechanics</h3>
              <div className="flex flex-wrap gap-2">
                {mechanics.map((mechanic) => (
                  <button
                    key={mechanic}
                    onClick={() => toggleMechanic(mechanic)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedMechanics.includes(mechanic)
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {mechanic}
                  </button>
                ))}
              </div>
            </div>

            {/* Player Count */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Player Count</h3>
              <div className="flex flex-wrap gap-2">
                {playerCounts.map((count) => (
                  <button
                    key={count}
                    onClick={() =>
                      setSelectedPlayerCount(
                        selectedPlayerCount === count ? "" : count,
                      )
                    }
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedPlayerCount === count
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {count} {count === "1" ? "Player" : "Players"}
                  </button>
                ))}
              </div>
            </div>

            {/* Play Time */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Play Time</h3>
              <div className="flex flex-wrap gap-2">
                {playTimes.map((time) => (
                  <button
                    key={time}
                    onClick={() =>
                      setSelectedPlayTime(selectedPlayTime === time ? "" : time)
                    }
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedPlayTime === time
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            {(selectedCategories.length > 0 ||
              selectedMechanics.length > 0 ||
              selectedPlayerCount ||
              selectedPlayTime) && (
              <button
                onClick={() => {
                  setSelectedCategories([]);
                  setSelectedMechanics([]);
                  setSelectedPlayerCount("");
                  setSelectedPlayTime("");
                }}
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
              >
                <X className="h-4 w-4 mr-1" />
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Active Filters Display */}
      {(selectedCategories.length > 0 ||
        selectedMechanics.length > 0 ||
        selectedPlayerCount ||
        selectedPlayTime) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedCategories.map((category) => (
            <span
              key={category}
              className="inline-flex items-center px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
            >
              {category}
              <button
                onClick={() => toggleCategory(category)}
                className="ml-2 hover:text-primary-900"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {selectedMechanics.map((mechanic) => (
            <span
              key={mechanic}
              className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
            >
              {mechanic}
              <button
                onClick={() => toggleMechanic(mechanic)}
                className="ml-2 hover:text-purple-900"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {selectedPlayerCount && (
            <span className="inline-flex items-center px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
              {selectedPlayerCount} Players
              <button
                onClick={() => setSelectedPlayerCount("")}
                className="ml-2 hover:text-primary-900"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {selectedPlayTime && (
            <span className="inline-flex items-center px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
              {selectedPlayTime}
              <button
                onClick={() => setSelectedPlayTime("")}
                className="ml-2 hover:text-primary-900"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Showing <span className="font-medium">{games.length}</span> games
        </p>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-8 flex justify-center">
        <nav className="flex items-center space-x-2">
          <button
            className="px-3 py-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
            disabled
          >
            Previous
          </button>
          <button className="px-3 py-2 bg-primary-600 text-white rounded-lg">
            1
          </button>
          <button className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            2
          </button>
          <button className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            3
          </button>
          <span className="px-3 py-2 text-gray-500">...</span>
          <button className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            10
          </button>
          <button className="px-3 py-2 text-gray-700 hover:text-gray-900">
            Next
          </button>
        </nav>
      </div>
    </div>
  );
};

export default GamesPage;

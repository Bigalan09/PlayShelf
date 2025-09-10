import { Link } from "react-router-dom";
import { Star, Users, Clock } from "lucide-react";

interface GameCardProps {
  game: {
    id: string;
    title: string;
    image: string;
    rating: number;
    bggRating: number;
    playerCount: string;
    playTime: string;
    categories: string[];
    year: number;
  };
}

const GameCard = ({ game }: GameCardProps) => {
  const ratingColors = {
    high: "from-game-green to-game-teal",
    medium: "from-game-yellow to-game-orange",
    low: "from-game-orange to-game-red",
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return ratingColors.high;
    if (rating >= 6) return ratingColors.medium;
    return ratingColors.low;
  };

  const categoryColors = [
    "bg-game-purple text-white",
    "bg-game-blue text-white",
    "bg-game-pink text-white",
    "bg-game-teal text-white",
    "bg-game-orange text-white",
  ];

  return (
    <Link
      to={`/games/${game.id}`}
      className="bg-white rounded-2xl shadow-lg hover:shadow-game-hover transform transition-all duration-300 hover:scale-105 hover:-rotate-1 overflow-hidden group border-2 border-primary-100"
    >
      {/* Image */}
      <div className="aspect-[3/4] overflow-hidden bg-gradient-to-br from-primary-100 to-accent-100 relative">
        <img
          src={game.image}
          alt={game.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-dice transform rotate-12 group-hover:rotate-180 transition-transform duration-500">
          <Star className="h-5 w-5 text-game-yellow fill-current" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title and Year */}
        <h3 className="font-game font-semibold text-gray-900 mb-1 line-clamp-1 text-lg">
          {game.title}
        </h3>
        <p className="text-sm text-gray-500 mb-2 font-game">{game.year}</p>

        {/* Ratings */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`flex items-center px-2 py-1 rounded-full bg-gradient-to-r ${getRatingColor(game.rating)}`}
          >
            <Star className="h-4 w-4 text-white fill-current" />
            <span className="ml-1 text-sm font-bold text-white">
              {game.rating.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            <span className="text-xs font-game">BGG:</span>
            <span className="ml-1 text-sm font-semibold">
              {game.bggRating.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Game Info */}
        <div className="flex items-center gap-3 text-xs text-gray-600 mb-3">
          <div className="flex items-center bg-purple-50 px-2 py-1 rounded-full">
            <Users className="h-3 w-3 mr-1 text-game-purple" />
            <span className="font-game">{game.playerCount}</span>
          </div>
          <div className="flex items-center bg-blue-50 px-2 py-1 rounded-full">
            <Clock className="h-3 w-3 mr-1 text-game-blue" />
            <span className="font-game">{game.playTime} min</span>
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-1">
          {game.categories.slice(0, 2).map((category, index) => (
            <span
              key={category}
              className={`px-2 py-1 ${categoryColors[index % categoryColors.length]} text-xs rounded-full font-game font-medium transform hover:scale-110 transition-transform`}
            >
              {category}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
};

export default GameCard;

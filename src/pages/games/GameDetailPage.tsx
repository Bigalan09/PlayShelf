import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Star,
  Users,
  Clock,
  Calendar,
  Tag,
  Heart,
  Share2,
  ChevronLeft,
} from "lucide-react";
import ReviewCard from "../../components/games/ReviewCard";
import ReviewForm from "../../components/games/ReviewForm";

const GameDetailPage = () => {
  const { id } = useParams();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Mock data
  const game = {
    id: id,
    title: "Wingspan",
    image: "https://placehold.co/400x600/e0f2fe/0891b2?text=Wingspan",
    rating: 8.1,
    bggRating: 8.0,
    totalReviews: 234,
    description:
      "Wingspan is a competitive, medium-weight, card-driven, engine-building board game from Stonemaier Games. You are bird enthusiasts—researchers, bird watchers, ornithologists, and collectors—seeking to discover and attract the best birds to your network of wildlife preserves.",
    playerCount: "1-5",
    playTime: "40-70",
    age: "10+",
    categories: ["Strategy", "Card Game", "Animals"],
    mechanics: ["Engine Building", "Card Drafting", "Dice Rolling"],
    designer: "Elizabeth Hargrave",
    publisher: "Stonemaier Games",
    year: 2019,
  };

  const reviews = [
    {
      id: "1",
      author: "John Doe",
      avatar: "https://placehold.co/40x40/94a3b8/ffffff?text=JD",
      rating: 9,
      date: "2024-01-15",
      title: "Beautiful and engaging",
      content:
        "Wingspan is absolutely stunning, both in terms of components and gameplay. The bird cards are gorgeous, and the engine-building mechanics are satisfying. Each game feels different thanks to the variety of birds and bonus cards.",
      helpful: 12,
      notHelpful: 2,
    },
    {
      id: "2",
      author: "Jane Smith",
      avatar: "https://placehold.co/40x40/94a3b8/ffffff?text=JS",
      rating: 7.5,
      date: "2024-01-10",
      title: "Good but not for everyone",
      content:
        "While the production quality is top-notch and the theme is unique, the gameplay can feel a bit repetitive after multiple plays. The random card draws can sometimes be frustrating.",
      helpful: 8,
      notHelpful: 3,
    },
    {
      id: "3",
      author: "Mike Johnson",
      avatar: "https://placehold.co/40x40/94a3b8/ffffff?text=MJ",
      rating: 8.5,
      date: "2024-01-05",
      title: "Perfect gateway game",
      content:
        "This is an excellent game to introduce newcomers to modern board gaming. The rules are straightforward, the theme is approachable, and the components are exceptional.",
      helpful: 15,
      notHelpful: 1,
    },
  ];

  const ratingDistribution = [
    { rating: 10, count: 45, percentage: 19 },
    { rating: 9, count: 78, percentage: 33 },
    { rating: 8, count: 62, percentage: 26 },
    { rating: 7, count: 35, percentage: 15 },
    { rating: 6, count: 10, percentage: 4 },
    { rating: 5, count: 4, percentage: 2 },
  ];

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-6">
        <Link
          to="/games"
          className="inline-flex items-center text-gray-600 hover:text-primary-600"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Games
        </Link>
      </nav>

      {/* Game Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Game Image */}
          <div className="md:col-span-1">
            <img
              src={game.image}
              alt={game.title}
              className="w-full rounded-lg shadow-md"
            />
            <div className="mt-4 flex gap-2">
              <button className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                <Heart className="h-4 w-4 mr-2" />
                Add to Collection
              </button>
              <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Share2 className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Game Info */}
          <div className="md:col-span-2">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {game.title}
            </h1>
            <p className="text-gray-600 mb-4">
              {game.year} • {game.publisher}
            </p>

            {/* Ratings */}
            <div className="flex items-center gap-6 mb-6">
              <div>
                <div className="flex items-center">
                  <Star className="h-6 w-6 text-yellow-500 fill-current" />
                  <span className="ml-2 text-2xl font-bold text-gray-900">
                    {game.rating.toFixed(1)}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {game.totalReviews} reviews
                </p>
              </div>
              <div className="border-l pl-6">
                <p className="text-sm text-gray-600 mb-1">BGG Rating</p>
                <div className="flex items-center">
                  <Star className="h-5 w-5 text-blue-500 fill-current" />
                  <span className="ml-1 text-xl font-bold text-gray-900">
                    {game.bggRating.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center text-gray-600 mb-1">
                  <Users className="h-4 w-4 mr-2" />
                  <span className="text-sm">Players</span>
                </div>
                <p className="font-semibold text-gray-900">
                  {game.playerCount}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center text-gray-600 mb-1">
                  <Clock className="h-4 w-4 mr-2" />
                  <span className="text-sm">Play Time</span>
                </div>
                <p className="font-semibold text-gray-900">
                  {game.playTime} min
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center text-gray-600 mb-1">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span className="text-sm">Age</span>
                </div>
                <p className="font-semibold text-gray-900">{game.age}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center text-gray-600 mb-1">
                  <Tag className="h-4 w-4 mr-2" />
                  <span className="text-sm">Designer</span>
                </div>
                <p className="font-semibold text-gray-900 text-sm">
                  {game.designer}
                </p>
              </div>
            </div>

            {/* Categories */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Categories</p>
              <div className="flex flex-wrap gap-2">
                {game.categories.map((category) => (
                  <Link
                    key={category}
                    to={`/games?category=${category}`}
                    className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm hover:bg-primary-200 transition-colors"
                  >
                    {category}
                  </Link>
                ))}
              </div>
            </div>

            {/* Mechanics */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Mechanics</p>
              <div className="flex flex-wrap gap-2">
                {game.mechanics.map((mechanic) => (
                  <span
                    key={mechanic}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {mechanic}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b">
          <div className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === "overview"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === "reviews"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              Reviews ({game.totalReviews})
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === "overview" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                About {game.title}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                {game.description}
              </p>

              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Rating Distribution
              </h3>
              <div className="space-y-2 max-w-2xl">
                {ratingDistribution.map((item) => (
                  <div key={item.rating} className="flex items-center gap-3">
                    <span className="w-8 text-sm font-medium text-gray-600">
                      {item.rating}
                    </span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className="w-12 text-sm text-gray-600 text-right">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "reviews" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  User Reviews
                </h2>
                <button
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Write a Review
                </button>
              </div>

              {showReviewForm && (
                <div className="mb-6">
                  <ReviewForm onCancel={() => setShowReviewForm(false)} />
                </div>
              )}

              <div className="space-y-4">
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>

              <div className="mt-6 text-center">
                <button className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Load More Reviews
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameDetailPage;

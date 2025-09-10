import { Star, ThumbsUp, ThumbsDown } from 'lucide-react'

interface ReviewCardProps {
  review: {
    id: string
    author: string
    avatar: string
    rating: number
    date: string
    title: string
    content: string
    helpful: number
    notHelpful: number
  }
}

const ReviewCard = ({ review }: ReviewCardProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <img
            src={review.avatar}
            alt={review.author}
            className="w-10 h-10 rounded-full mr-3"
          />
          <div>
            <h4 className="font-semibold text-gray-900">{review.author}</h4>
            <p className="text-sm text-gray-600">{formatDate(review.date)}</p>
          </div>
        </div>
        <div className="flex items-center">
          <Star className="h-5 w-5 text-yellow-500 fill-current" />
          <span className="ml-1 font-semibold text-gray-900">
            {review.rating.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Content */}
      <h3 className="font-semibold text-gray-900 mb-2">{review.title}</h3>
      <p className="text-gray-700 leading-relaxed mb-4">{review.content}</p>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
        <span className="text-sm text-gray-600">Was this helpful?</span>
        <button className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600 transition-colors">
          <ThumbsUp className="h-4 w-4" />
          <span>{review.helpful}</span>
        </button>
        <button className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-red-600 transition-colors">
          <ThumbsDown className="h-4 w-4" />
          <span>{review.notHelpful}</span>
        </button>
      </div>
    </div>
  )
}

export default ReviewCard

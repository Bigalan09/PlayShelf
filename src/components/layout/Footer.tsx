import { Dice6 } from 'lucide-react'
import { Link } from 'react-router-dom'

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Dice6 className="h-6 w-6" />
              <span className="text-lg font-bold">PlayShelf</span>
            </div>
            <p className="text-gray-400 text-sm">
              Track your board game collection and discover new favourites.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link to="/games" className="hover:text-white transition-colors">
                  Browse Games
                </Link>
              </li>
              <li>
                <Link to="/games?sort=rating" className="hover:text-white transition-colors">
                  Top Rated
                </Link>
              </li>
              <li>
                <Link to="/games?sort=new" className="hover:text-white transition-colors">
                  New Releases
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="font-semibold mb-4">Account</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link to="/auth/login" className="hover:text-white transition-colors">
                  Log In
                </Link>
              </li>
              <li>
                <Link to="/auth/signup" className="hover:text-white transition-colors">
                  Sign Up
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-white transition-colors">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className="font-semibold mb-4">About</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>© 2024 PlayShelf. All rights reserved.</p>
          <p className="mt-2">
            Game data powered by BoardGameGeek
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer

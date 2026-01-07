# UpNext

**Don't know what to watch now?** UpNext recommends movies and series based on your moment, your energy, and the time you have. Less deciding, more watching.

A modern web application for personalized movie and TV series recommendations that uses intelligence based on your tastes to suggest content you'll really love.

## 🚀 Main Features

### Personalized Recommendation System
- **Recommended for you**: Content specially selected for you based on your tastes
- **Easy to watch**: Low-attention recommendations for those moments when you want to watch something without complications
- **Based on what you like**: Titles similar to those you've already marked as favorites

### Preference Management
- **Initial onboarding**: Select up to 10 movies or series you enjoy to personalize your recommendations
- **Edit preferences**: Manage your favorite titles at any time (add/remove)
- **History**: 
  - List of titles you've already watched
  - List of titles you're not interested in
  - Option to remove titles from both lists

### Authentication and Profile
- **Sign up and login**: Email/password or magic link (passwordless)
- **Password recovery**: Complete password reset system
- **User profile**: Preference management and personal configuration

### Content Exploration
- **Advanced search**: Search for movies and series by title
- **Complete details**: Detailed pages with complete information, ratings, and streaming providers
- **Streaming providers**: Find where to watch each title on different platforms
- **Seasons and episodes**: Complete navigation for TV series

### User Experience
- **Light/dark theme**: Adaptive interface with support for light and dark mode
- **Responsive design**: Optimized for all devices (mobile, tablet, desktop)
- **Intuitive interface**: Modern and easy-to-use design

## 🛠️ Technologies

- **Nuxt 3**: Vue.js framework with SSR/SSG
- **Vue 3**: Progressive JavaScript framework
- **TypeScript**: Static typing for JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Pinia**: State management for Vue
- **Supabase**: Backend as a service (authentication, database)
- **TMDB API**: Integration with The Movie Database for movie and series data

## 📋 Prerequisites

- Node.js (version 20 or higher, < 25)
- npm or yarn
- TMDB API Key ([get it here](https://www.themoviedb.org/settings/api))
- Supabase project ([create here](https://supabase.com))

## 🔧 Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd agregador-streaming
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables. Create a `.env.local` file in the project root:

```env
# TMDB API
NUXT_TMDB_API_KEY=your_api_key_here
NUXT_TMDB_BASE_URL=https://api.themoviedb.org/3

# Supabase
NUXT_PUBLIC_SUPABASE_URL=your_supabase_url
NUXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Base URL (for production)
NUXT_PUBLIC_BASE_URL=http://localhost:3000
```

4. Configure Supabase database:
   - Run the SQL schema in Supabase SQL Editor (see `supabase/schema.sql`)
   - Configure redirect URLs in Authentication > URL Configuration

5. Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 📜 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build application for production
- `npm run generate` - Generate static version of the application
- `npm run preview` - Preview production version
- `npm run lint` - Run linter to verify code
- `npm run typecheck` - Verify TypeScript types

## 📁 Project Structure

```
agregador-streaming/
├── components/          # Reusable Vue components
│   ├── AuthForm.vue    # Authentication form
│   ├── RecommendationCard.vue  # Recommendation card
│   ├── RecommendationSection.vue  # Recommendation section
│   ├── SearchBar.vue   # Search bar
│   └── ...
├── composables/        # Reusable composables
│   ├── useAuth.ts      # Authentication
│   └── useTheme.ts     # Theme management
├── layouts/            # Application layouts
├── middleware/         # Route middleware
│   ├── auth.ts         # Authenticated route protection
│   └── guest.ts        # Guest-only routes
├── pages/              # Pages and routes
│   ├── auth/           # Authentication pages
│   ├── onboarding.vue   # Onboarding flow
│   ├── preferences.vue # Preference management
│   ├── history.vue     # Title history
│   ├── pelicula/       # Movie pages
│   └── serie/          # Series pages
├── plugins/            # Nuxt plugins
│   ├── supabase.client.ts  # Supabase initialization
│   └── theme-init.client.ts  # Theme initialization
├── server/             # API routes and server utilities
│   └── api/            # API endpoints
│       ├── recommendations.get.ts  # Personalized recommendations
│       └── tmdb/       # TMDB integration
├── stores/             # Pinia stores
│   └── user.ts         # User state
├── types/              # TypeScript definitions
└── utils/               # Utilities and helper functions
```

## 🌐 Main API Routes

### Recommendations
- `/api/recommendations` - Personalized recommendations based on user tastes

### User Title Status
- `/api/users/title-status` - Marks titles as watched or not interested

### TMDB Integration
- `/api/tmdb/search/multi` - Multi-type search (movies and series)
- `/api/tmdb/movies/[id]` - Movie details
- `/api/tmdb/tvshows/[id]` - Series details
- `/api/tmdb/movies/[id]/providers` - Streaming providers for movies
- `/api/tmdb/tvshows/[id]/providers` - Streaming providers for series

## 🎨 Main Components

- `AuthForm` - Authentication form (login, signup, password recovery)
- `RecommendationCard` - Individual recommendation card with actions (mark as watched/not interested)
- `RecommendationSection` - Recommendation section with description
- `MediaBannerDetail` - Banner with complete movie/series details
- `SearchBar` - Search bar with real-time results
- `ProviderList` - Streaming provider list
- `RatingBadge` - Rating badge
- `MediaStatusBagde` - Content status badge
- `ThemeSwitcher` - Light/dark theme selector

## 🔐 Authentication

The application uses Supabase for authentication with support for:

- **Email/password signup**: Password validation on frontend
- **Email/password login**
- **Magic link**: Passwordless authentication
- **Password recovery**: Complete reset flow with automatic redirect

## 🎯 User Flow

1. **First visit**: User can explore the home page without authentication
2. **Signup/Login**: User signs up or logs in
3. **Onboarding**: If new user, selects up to 10 titles they like
4. **Recommendations**: Once onboarding is complete, sees personalized recommendations
5. **Management**: Can edit preferences, view history, and mark titles as watched/not interested

## 🚀 Deployment

The application is configured to deploy on Vercel:

- Automatic Nuxt 3 configuration
- Environment variables configured in Vercel dashboard
- Automatic build on each push

## 📝 License

This project is private.

## 🤝 Contributions

Contributions are welcome. Please open an issue or pull request to discuss proposed changes.

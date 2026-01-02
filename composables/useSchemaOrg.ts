import type { Movie } from '@/types/Movie';
import type { TVShow } from '@/types/TVShow';
import type { Season } from '@/types/TVShow';

/**
 * Generate Schema.org JSON-LD for a Movie
 */
export function useMovieSchema(movie: Movie, siteUrl: string) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: movie.title,
    description: movie.overview,
    image: movie.poster_path
      ? `https://image.tmdb.org/t/p/w780${movie.poster_path}`
      : undefined,
    datePublished: movie.release_date || undefined,
    aggregateRating: movie.vote_average
      ? {
          '@type': 'AggregateRating',
          ratingValue: movie.vote_average,
          bestRating: 10,
          worstRating: 0,
        }
      : undefined,
    genre: movie.genres?.map((g) => g.name).join(', ') || undefined,
    duration: movie.runtime
      ? `PT${movie.runtime}M`
      : undefined, // ISO 8601 duration format
    url: `${siteUrl}/movie/${movie.id}`,
  };

  // Remove undefined values
  return JSON.parse(JSON.stringify(schema));
}

/**
 * Generate Schema.org JSON-LD for a TV Show
 */
export function useTVShowSchema(tvShow: TVShow, siteUrl: string) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    name: tvShow.name,
    description: tvShow.overview,
    image: tvShow.poster_path
      ? `https://image.tmdb.org/t/p/w780${tvShow.poster_path}`
      : undefined,
    datePublished: tvShow.first_air_date || undefined,
    aggregateRating: tvShow.vote_average
      ? {
          '@type': 'AggregateRating',
          ratingValue: tvShow.vote_average,
          bestRating: 10,
          worstRating: 0,
        }
      : undefined,
    genre: tvShow.genres?.map((g) => g.name).join(', ') || undefined,
    numberOfSeasons: tvShow.number_of_seasons || undefined,
    url: `${siteUrl}/tv-show/${tvShow.id}`,
  };

  // Remove undefined values
  return JSON.parse(JSON.stringify(schema));
}

/**
 * Generate Schema.org JSON-LD for a TV Season
 */
export function useTVSeasonSchema(
  season: Season,
  tvShow: TVShow,
  siteUrl: string
) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'TVSeason',
    name: season.name,
    description: season.overview,
    image: season.poster_path
      ? `https://image.tmdb.org/t/p/w780${season.poster_path}`
      : undefined,
    datePublished: season.air_date || undefined,
    aggregateRating: season.vote_average
      ? {
          '@type': 'AggregateRating',
          ratingValue: season.vote_average,
          bestRating: 10,
          worstRating: 0,
        }
      : undefined,
    partOfSeries: {
      '@type': 'TVSeries',
      name: tvShow.name,
      url: `${siteUrl}/tv-show/${tvShow.id}`,
    },
    numberOfEpisodes: season.episode_count || season.episodes?.length || undefined,
    seasonNumber: season.season_number || undefined,
    url: `${siteUrl}/tv-show/${tvShow.id}/season/${season.season_number}`,
  };

  // Remove undefined values
  return JSON.parse(JSON.stringify(schema));
}


import axios, { type AxiosResponse } from 'axios'
import type { MovieSearchResponse } from '../types/MovieSearch'
import type { ExternalIDs } from '../types/ExternalIDs'

const apiKey = import.meta.env.VITE_TMDB_API_KEY
const baseURL = 'https://api.themoviedb.org/3'

const tmdb = axios.create({
  baseURL,
  params: {
    api_key: apiKey,
    language: 'es-ES', // o 'en-US' si prefieres
    include_adult: true,
  }
})

export async function searchMovies(query: string): Promise<MovieSearchResponse> {
  return await tmdb.get('/search/movie', {
    params: {
      query
    }
  }).then((response: AxiosResponse<MovieSearchResponse>) => response.data)
}

export async function searchTVShows(query: string) {
  return tmdb.get('/search/tv', {
    params: {
      query
    }
  })
}

export async function getMovieDetails(movie_id: number) {
  return tmdb.get(`/movie/${movie_id}`, {
    params: {
      append_to_response: 'movie-watch-providers'
    }
})
}

export async function getTrendingMovies(): Promise<MovieSearchResponse> {
  return (await tmdb.get('/trending/movie/week')).data
}

export async function getExternalIds(movie_id: number): Promise<ExternalIDs> {
  return (await tmdb.get(`/movie/${movie_id}/external_ids`)).data
}
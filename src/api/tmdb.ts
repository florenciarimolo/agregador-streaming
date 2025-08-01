import axios, { type AxiosResponse } from 'axios'
import type { MovieSearchResponse } from '../types/MovieSearch'
import type { ExternalIDs } from '../types/ExternalIDs'
import type { TVSearchResponse } from '../types/TVSearch'
import type { MediaTrendingResponse } from '../types/Media'

const apiKey = import.meta.env.VITE_TMDB_API_KEY
const baseURL = 'https://api.themoviedb.org/3'

const tmdb = axios.create({
  baseURL,
  params: {
    api_key: apiKey,
    language: 'es-ES',
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

export async function getMovieDetails(movie_id: number): Promise<MovieSearchResponse> {
  return tmdb.get(`/movie/${movie_id}`, {
    params: {
      append_to_response: 'movie-watch-providers'
    }
  }).then((response: AxiosResponse<MovieSearchResponse>) => response.data)
}

export async function getTrendingMovies(): Promise<MediaTrendingResponse> {
  return (await tmdb.get('/trending/movie/week')).data
}

export async function getTrendingTVShows(): Promise<MediaTrendingResponse> {
  return (await tmdb.get('/trending/tv/week')).data
}

export async function getExternalMovieIds(movie_id: number): Promise<ExternalIDs> {
  return (await tmdb.get(`/movie/${movie_id}/external_ids`)).data
}

export async function getExternalTVIds(tv_id: number): Promise<ExternalIDs> {
  return (await tmdb.get(`/tv/${tv_id}/external_ids`)).data
}
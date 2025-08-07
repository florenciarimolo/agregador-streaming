import axios from 'axios';

export const TMDB_BASE_URL = import.meta.env.VITE_TMDB_BASE_URL;

const apiKey: string = import.meta.env.VITE_TMDB_API_KEY
const baseURL: string = TMDB_BASE_URL || 'https://api.themoviedb.org/3'

export const tmdb = axios.create({
  baseURL,
  params: {
    api_key: apiKey,
    language: 'es-ES',
    include_adult: true,
  }
})
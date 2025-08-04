import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import SearchView from '@/views/SearchView.vue'
import LibraryView from '@/views/LibraryView.vue'
import MovieDetailView from '@/views/MovieDetailView.vue'
/*
  If you have defined the "@" alias in your Vite or Webpack config, ESLint may still complain if it's not configured to recognize it.
  To fix ESLint errors related to path aliases, ensure you have the following in your ESLint config:

  For Vite projects, add to your `eslint.config.js` or `.eslintrc.js`:
  settings: {
    'import/resolver': {
      alias: {
        map: [['@', './src']],
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.vue']
      }
    }
  }

  Also, make sure you have `eslint-plugin-import` installed.
*/
const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/buscar', name: 'search', component: SearchView },
  { path: '/biblioteca', name: 'library', component: LibraryView },
  { path: '/peliculas/:id', name: 'movie', component: MovieDetailView, props: true },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router

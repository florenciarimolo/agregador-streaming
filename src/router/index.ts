import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '@/views/HomeView.vue';
import SearchView from '@/views/SearchView.vue';
import LibraryView from '@/views/LibraryView.vue';
import MovieDetailView from '@/views/MovieDetailView.vue';

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/buscar', name: 'search', component: SearchView },
  { path: '/biblioteca', name: 'library', component: LibraryView },
  {
    path: '/peliculas/:id',
    name: 'movie',
    component: MovieDetailView,
    props: true,
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;

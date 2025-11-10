# Agregador Streaming

Una aplicación web moderna para descubrir y explorar películas y series de televisión, integrada con The Movie Database (TMDB) API. La aplicación permite buscar contenido, ver tendencias, explorar detalles de películas y series, y encontrar dónde verlos en diferentes plataformas de streaming.

## 🚀 Características

- **Tendencias**: Explora películas y series en tendencia
- **Búsqueda**: Busca películas y series por título
- **Detalles completos**: Páginas detalladas para películas y series con información completa
- **Proveedores de streaming**: Encuentra dónde ver cada título en diferentes plataformas
- **Biblioteca**: Gestiona tu biblioteca personal de contenido
- **Diseño responsive**: Interfaz optimizada para todos los dispositivos

## 🛠️ Tecnologías

- **Nuxt 4**: Framework Vue.js con SSR/SSG
- **Vue 3**: Framework JavaScript progresivo
- **TypeScript**: Tipado estático para JavaScript
- **Tailwind CSS**: Framework CSS utility-first
- **Pinia**: Gestión de estado para Vue
- **TMDB API**: Integración con The Movie Database

## 📋 Requisitos Previos

- Node.js (versión 18 o superior)
- npm o yarn
- API Key de TMDB ([obtener aquí](https://www.themoviedb.org/settings/api))

## 🔧 Instalación

1. Clona el repositorio:

```bash
git clone <repository-url>
cd agregador-streaming
```

2. Instala las dependencias:

```bash
npm install
```

3. Configura las variables de entorno. Crea un archivo `.env` en la raíz del proyecto:

```env
NUXT_TMDB_API_KEY=tu_api_key_aqui
NUXT_TMDB_BASE_URL=https://api.themoviedb.org/3
```

4. Inicia el servidor de desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📜 Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run generate` - Genera una versión estática de la aplicación
- `npm run preview` - Previsualiza la versión de producción
- `npm run lint` - Ejecuta el linter para verificar el código

## 📁 Estructura del Proyecto

```
agregador-streaming/
├── components/          # Componentes Vue reutilizables
├── config/              # Configuración de APIs
├── layouts/             # Layouts de la aplicación
├── pages/               # Páginas y rutas
│   ├── pelicula/        # Páginas de películas
│   └── serie/           # Páginas de series
├── server/              # API routes y utilidades del servidor
│   └── api/             # Endpoints de la API
│       └── tmdb/        # Integración con TMDB
├── stores/              # Stores de Pinia
├── types/               # Definiciones de TypeScript
└── utils/               # Utilidades y funciones auxiliares
```

## 🌐 API Routes

La aplicación incluye endpoints del servidor para interactuar con TMDB:

- `/api/tmdb/movies/trending` - Películas en tendencia
- `/api/tmdb/tvshows/trending` - Series en tendencia
- `/api/tmdb/search/multi` - Búsqueda multi-tipo
- `/api/tmdb/movies/[id]` - Detalles de película
- `/api/tmdb/tvshows/[id]` - Detalles de serie
- `/api/tmdb/movies/[id]/providers` - Proveedores de streaming para películas
- `/api/tmdb/tvshows/[id]/providers` - Proveedores de streaming para series

## 🎨 Componentes Principales

- `MediaCarousel` - Carrusel de contenido multimedia
- `MediaBannerDetail` - Banner con detalles de película/serie
- `SearchBar` - Barra de búsqueda
- `ProviderList` - Lista de proveedores de streaming
- `RatingBadge` - Badge de calificación
- `MediaStatusBadge` - Badge de estado del contenido

## 📝 Licencia

Este proyecto es privado.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un issue o pull request para discutir los cambios propuestos.

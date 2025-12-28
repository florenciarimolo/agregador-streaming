# UpNext

**¿No sabes qué ver ahora?** UpNext te recomienda películas y series según tu momento, tu energía y el tiempo que tienes. Menos decidir, más ver.

Una aplicación web moderna de recomendaciones personalizadas de películas y series de televisión que utiliza inteligencia basada en tus gustos para sugerirte contenido que realmente te va a encantar.

## 🚀 Características Principales

### Sistema de Recomendaciones Personalizadas
- **Recomendado para ti**: Contenido seleccionado especialmente para ti basado en tus gustos
- **Fácil de ver**: Recomendaciones de baja atención para esos momentos en los que quieres ver algo sin complicarte
- **Basado en lo que te gusta**: Títulos similares a los que ya has marcado como favoritos

### Gestión de Preferencias
- **Onboarding inicial**: Selecciona hasta 10 películas o series que disfrutas para personalizar tus recomendaciones
- **Editar preferencias**: Gestiona tus títulos favoritos en cualquier momento (agregar/eliminar)
- **Historial**: 
  - Lista de títulos que ya has visto
  - Lista de títulos que no te interesan
  - Opción de eliminar títulos de ambas listas

### Autenticación y Perfil
- **Registro e inicio de sesión**: Email/password o magic link (sin contraseña)
- **Recuperación de contraseña**: Sistema completo de reset de contraseña
- **Perfil de usuario**: Gestión de preferencias y configuración personal

### Exploración de Contenido
- **Búsqueda avanzada**: Busca películas y series por título
- **Detalles completos**: Páginas detalladas con información completa, calificaciones, y proveedores de streaming
- **Proveedores de streaming**: Encuentra dónde ver cada título en diferentes plataformas
- **Temporadas y episodios**: Navegación completa para series de televisión

### Experiencia de Usuario
- **Tema claro/oscuro**: Interfaz adaptable con soporte para modo claro y oscuro
- **Diseño responsive**: Optimizado para todos los dispositivos (móvil, tablet, desktop)
- **Interfaz intuitiva**: Diseño moderno y fácil de usar

## 🛠️ Tecnologías

- **Nuxt 3**: Framework Vue.js con SSR/SSG
- **Vue 3**: Framework JavaScript progresivo
- **TypeScript**: Tipado estático para JavaScript
- **Tailwind CSS**: Framework CSS utility-first
- **Pinia**: Gestión de estado para Vue
- **Supabase**: Backend como servicio (autenticación, base de datos)
- **TMDB API**: Integración con The Movie Database para datos de películas y series

## 📋 Requisitos Previos

- Node.js (versión 20 o superior, < 25)
- npm o yarn
- API Key de TMDB ([obtener aquí](https://www.themoviedb.org/settings/api))
- Proyecto de Supabase ([crear aquí](https://supabase.com))

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

3. Configura las variables de entorno. Crea un archivo `.env.local` en la raíz del proyecto:

```env
# TMDB API
NUXT_TMDB_API_KEY=tu_api_key_aqui
NUXT_TMDB_BASE_URL=https://api.themoviedb.org/3

# Supabase
NUXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NUXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_de_supabase

# Base URL (para producción)
NUXT_PUBLIC_BASE_URL=http://localhost:3000
```

4. Configura la base de datos de Supabase:
   - Ejecuta el schema SQL en el SQL Editor de Supabase (ver `supabase/schema.sql`)
   - Configura las URLs de redirección en Authentication > URL Configuration

5. Inicia el servidor de desarrollo:

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
- `npm run typecheck` - Verifica los tipos de TypeScript

## 📁 Estructura del Proyecto

```
agregador-streaming/
├── components/          # Componentes Vue reutilizables
│   ├── AuthForm.vue    # Formulario de autenticación
│   ├── RecommendationCard.vue  # Tarjeta de recomendación
│   ├── RecommendationSection.vue  # Sección de recomendaciones
│   ├── SearchBar.vue   # Barra de búsqueda
│   └── ...
├── composables/        # Composables reutilizables
│   ├── useAuth.ts      # Autenticación
│   └── useTheme.ts     # Gestión de tema
├── layouts/            # Layouts de la aplicación
├── middleware/         # Middleware de rutas
│   ├── auth.ts         # Protección de rutas autenticadas
│   └── guest.ts        # Rutas solo para invitados
├── pages/              # Páginas y rutas
│   ├── auth/           # Páginas de autenticación
│   ├── onboarding.vue  # Flujo de onboarding
│   ├── preferences.vue # Gestión de preferencias
│   ├── history.vue     # Historial de títulos
│   ├── pelicula/       # Páginas de películas
│   └── serie/          # Páginas de series
├── plugins/            # Plugins de Nuxt
│   ├── supabase.client.ts  # Inicialización de Supabase
│   └── theme-init.client.ts  # Inicialización de tema
├── server/             # API routes y utilidades del servidor
│   └── api/            # Endpoints de la API
│       ├── recommendations.get.ts  # Recomendaciones personalizadas
│       ├── user-history.get.ts     # Historial del usuario
│       └── tmdb/       # Integración con TMDB
├── stores/             # Stores de Pinia
│   └── user.ts         # Estado del usuario
├── types/              # Definiciones de TypeScript
└── utils/               # Utilidades y funciones auxiliares
```

## 🌐 API Routes Principales

### Recomendaciones
- `/api/recommendations` - Recomendaciones personalizadas basadas en gustos del usuario

### Historial del Usuario
- `/api/user-history` - Obtiene el historial de títulos vistos y no interesados
- `/api/user-title-status` - Marca títulos como vistos o no interesados

### TMDB Integration
- `/api/tmdb/search/multi` - Búsqueda multi-tipo (películas y series)
- `/api/tmdb/movies/[id]` - Detalles de película
- `/api/tmdb/tvshows/[id]` - Detalles de serie
- `/api/tmdb/movies/[id]/providers` - Proveedores de streaming para películas
- `/api/tmdb/tvshows/[id]/providers` - Proveedores de streaming para series

## 🎨 Componentes Principales

- `AuthForm` - Formulario de autenticación (login, registro, recuperación de contraseña)
- `RecommendationCard` - Tarjeta individual de recomendación con acciones (marcar como visto/no interesado)
- `RecommendationSection` - Sección de recomendaciones con descripción
- `MediaBannerDetail` - Banner con detalles completos de película/serie
- `SearchBar` - Barra de búsqueda con resultados en tiempo real
- `ProviderList` - Lista de proveedores de streaming
- `RatingBadge` - Badge de calificación
- `MediaStatusBagde` - Badge de estado del contenido
- `ThemeSwitcher` - Selector de tema claro/oscuro

## 🔐 Autenticación

La aplicación utiliza Supabase para la autenticación con soporte para:

- **Registro con email/password**: Validación de contraseña en el frontend
- **Inicio de sesión con email/password**
- **Magic link**: Autenticación sin contraseña
- **Recuperación de contraseña**: Flujo completo de reset con redirección automática

## 🎯 Flujo de Usuario

1. **Primera visita**: El usuario puede explorar la página de inicio sin autenticarse
2. **Registro/Login**: El usuario se registra o inicia sesión
3. **Onboarding**: Si es nuevo usuario, selecciona hasta 10 títulos que le gustan
4. **Recomendaciones**: Una vez completado el onboarding, ve recomendaciones personalizadas
5. **Gestión**: Puede editar preferencias, ver historial, y marcar títulos como vistos/no interesados

## 🚀 Despliegue

La aplicación está configurada para desplegarse en Vercel:

- Configuración automática de Nuxt 3
- Variables de entorno configuradas en el dashboard de Vercel
- Build automático en cada push

## 📝 Licencia

Este proyecto es privado.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un issue o pull request para discutir los cambios propuestos.

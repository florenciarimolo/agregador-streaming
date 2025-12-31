<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="text-4xl font-bold dark:text-gray-300 text-gray-800 mb-4">
        Cómo funciona UpNext
      </h1>
      <p class="text-lg dark:text-gray-300 text-gray-800">
        Descubre cómo UpNext te ayuda a encontrar el contenido perfecto para ver
        en streaming.
      </p>
    </div>

    <div class="space-y-8">
      <!-- Sección 1: Introducción -->
      <section
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-300/50 dark:border-white/10"
      >
        <h2
          class="text-2xl font-semibold dark:text-gray-300 text-gray-800 mb-4"
        >
          ¿Qué es UpNext?
        </h2>
        <p class="dark:text-gray-300 text-gray-800 mb-4">
          UpNext es una plataforma inteligente que te ayuda a descubrir
          películas y series perfectas para ti. En lugar de perder tiempo
          buscando qué ver, nosotros te recomendamos contenido personalizado
          basado en tus gustos y preferencias.
        </p>
        <p class="dark:text-gray-300 text-gray-800">
          Además, te mostramos en qué plataformas de streaming está disponible
          cada título, para que sepas exactamente dónde verlo.
        </p>
      </section>

      <!-- Sección 2: Onboarding -->
      <section
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-300/50 dark:border-white/10"
      >
        <h2
          class="text-2xl font-semibold dark:text-gray-300 text-gray-800 mb-4"
        >
          1. Configuración inicial
        </h2>
        <p class="dark:text-gray-300 text-gray-800 mb-4">
          Cuando te registras por primera vez, te pedimos que selecciones hasta
          10 películas o series que te gusten. Esto nos ayuda a entender tus
          preferencias y crear un perfil de tus gustos.
        </p>
        <div class="bg-primary/10 dark:bg-primary-500/20 rounded-lg p-4">
          <p class="text-sm dark:text-gray-300 text-gray-800">
            <strong>💡 Tip:</strong> Selecciona una variedad de géneros y
            estilos para obtener recomendaciones más diversas.
          </p>
        </div>
      </section>

      <!-- Sección 3: Recomendaciones -->
      <section
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-300/50 dark:border-white/10"
      >
        <h2
          class="text-2xl font-semibold dark:text-gray-300 text-gray-800 mb-4"
        >
          2. Recibe recomendaciones personalizadas
        </h2>
        <p class="dark:text-gray-300 text-gray-800 mb-4">
          Basándonos en tus selecciones iniciales y en tus interacciones con la
          plataforma, nuestro algoritmo te muestra recomendaciones
          personalizadas en la página principal.
        </p>
        <p class="dark:text-gray-300 text-gray-800 mb-4">
          Cada recomendación incluye:
        </p>
        <ul
          class="list-disc list-inside space-y-2 dark:text-gray-300 text-gray-800 ml-4"
        >
          <li>Información sobre la película o serie</li>
          <li>Plataformas donde está disponible</li>
          <li>Puntuación y reseñas</li>
          <li>Géneros y descripción</li>
        </ul>
      </section>

      <!-- Sección 4: Filtros -->
      <section
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-300/50 dark:border-white/10"
      >
        <h2
          class="text-2xl font-semibold dark:text-gray-300 text-gray-800 mb-4"
        >
          3. Filtra por estado de ánimo y atención
        </h2>
        <p class="dark:text-gray-300 text-gray-800 mb-4">
          UpNext te permite filtrar las recomendaciones según cómo te sientes:
        </p>
        <div class="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <h3 class="font-semibold dark:text-gray-300 text-gray-800 mb-2">
              Estado de ánimo:
            </h3>
            <ul
              class="list-disc list-inside space-y-1 text-sm dark:text-gray-300 text-gray-800 ml-4"
            >
              <li>Relajado</li>
              <li>Ligero</li>
              <li>Intenso</li>
              <li>Emocional</li>
              <li>Reflexivo</li>
            </ul>
          </div>
          <div>
            <h3 class="font-semibold dark:text-gray-300 text-gray-800 mb-2">
              Nivel de atención:
            </h3>
            <ul
              class="list-disc list-inside space-y-1 text-sm dark:text-gray-300 text-gray-800 ml-4"
            >
              <li>Bajo - Para ver mientras haces otras cosas</li>
              <li>Medio - Requiere algo de atención</li>
              <li>Alto - Necesita toda tu atención</li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Sección 5: Gestión de contenido -->
      <section
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-300/50 dark:border-white/10"
      >
        <h2
          class="text-2xl font-semibold dark:text-gray-300 text-gray-800 mb-4"
        >
          4. Organiza tu contenido
        </h2>
        <p class="dark:text-gray-300 text-gray-800 mb-4">
          Puedes gestionar tus títulos de varias formas:
        </p>
        <div class="space-y-3">
          <div class="flex items-start gap-3">
            <span class="text-primary text-xl">✓</span>
            <div>
              <strong class="dark:text-gray-300 text-gray-800">Visto:</strong>
              <span class="dark:text-gray-300 text-gray-800">
                Marca contenido que ya has visto para que no aparezca en las
                recomendaciones.
              </span>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <span class="text-primary text-xl">❤️</span>
            <div>
              <strong class="dark:text-gray-300 text-gray-800"
                >Me gusta:</strong
              >
              <span class="dark:text-gray-300 text-gray-800">
                Guarda tus favoritos para acceder a ellos fácilmente.
              </span>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <span class="text-primary text-xl">⏰</span>
            <div>
              <strong class="dark:text-gray-300 text-gray-800"
                >Ver más tarde:</strong
              >
              <span class="dark:text-gray-300 text-gray-800">
                Crea una lista de contenido que quieres ver en el futuro.
              </span>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <span class="text-primary text-xl">✗</span>
            <div>
              <strong class="dark:text-gray-300 text-gray-800"
                >No me interesa:</strong
              >
              <span class="dark:text-gray-300 text-gray-800">
                Oculta contenido que no te interesa para mejorar tus
                recomendaciones.
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Sección 6: Plataformas -->
      <section
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-300/50 dark:border-white/10"
      >
        <h2
          class="text-2xl font-semibold dark:text-gray-300 text-gray-800 mb-4"
        >
          5. Encuentra dónde ver
        </h2>
        <p class="dark:text-gray-300 text-gray-800 mb-4">
          Para cada título, te mostramos en qué plataformas de streaming está
          disponible:
        </p>
        <ul
          class="list-disc list-inside space-y-2 dark:text-gray-300 text-gray-800 ml-4"
        >
          <li>
            <strong>Ver en:</strong> Plataformas de streaming con suscripción
            donde puedes ver el contenido incluido
          </li>
          <li>
            <strong>Alquiler:</strong> Plataformas donde puedes alquilar el
            contenido por un período limitado
          </li>
          <li>
            <strong>Compra:</strong> Plataformas donde puedes comprar el
            contenido para verlo cuando quieras
          </li>
        </ul>
      </section>

      <!-- Sección 7: Búsqueda -->
      <section
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-300/50 dark:border-white/10"
      >
        <h2
          class="text-2xl font-semibold dark:text-gray-300 text-gray-800 mb-4"
        >
          6. Busca contenido específico
        </h2>
        <p class="dark:text-gray-300 text-gray-800 mb-4">
          Si tienes algo específico en mente, usa nuestra función de búsqueda.
          Puedes buscar por título, actor o director, y verás resultados de
          películas y series con toda su información y disponibilidad en
          streaming.
        </p>
      </section>

      <!-- Sección 8: Mejora continua -->
      <section
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-300/50 dark:border-white/10"
      >
        <h2
          class="text-2xl font-semibold dark:text-gray-300 text-gray-800 mb-4"
        >
          7. Mejora tus recomendaciones
        </h2>
        <p class="dark:text-gray-300 text-gray-800 mb-4">
          Cuanto más uses UpNext, mejor se vuelven tus recomendaciones. El
          sistema aprende de tus interacciones:
        </p>
        <ul
          class="list-disc list-inside space-y-2 dark:text-gray-300 text-gray-800 ml-4"
        >
          <li>Los títulos que marcas como vistos</li>
          <li>Los que te gustan</li>
          <li>Los que guardas para ver más tarde</li>
          <li>Los que marcas como no interesantes</li>
        </ul>
        <p class="dark:text-gray-300 text-gray-800 mt-4">
          Todo esto ayuda a nuestro algoritmo a entender mejor tus preferencias
          y ofrecerte contenido cada vez más relevante.
        </p>
      </section>
    </div>

    <!-- CTA -->
    <div class="mt-8 text-center">
      <nuxt-link
        to="/"
        class="inline-block px-6 py-3 bg-primary-800 dark:bg-primary hover:bg-primary-900 dark:hover:bg-primary-600 text-white rounded-lg font-medium transition-all duration-300"
      >
        Comenzar a usar UpNext
      </nuxt-link>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Cómo funciona - UpNext',
});

useSeoMeta({
  title: 'Cómo funciona - UpNext',
  description:
    'Aprende cómo UpNext te ayuda a encontrar el contenido perfecto para ver en streaming con recomendaciones personalizadas.',
});
</script>

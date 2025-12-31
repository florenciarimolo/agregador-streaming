<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="text-4xl font-bold dark:text-gray-300 text-gray-800 mb-4">
        Preguntas frecuentes
      </h1>
      <p class="text-lg dark:text-gray-300 text-gray-800">
        Encuentra respuestas a las preguntas más comunes sobre UpNext.
      </p>
    </div>

    <div class="space-y-4">
      <!-- FAQ Item 1 -->
      <details
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 overflow-hidden"
      >
        <summary
          class="p-6 cursor-pointer font-semibold dark:text-gray-300 text-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors list-none"
        >
          <div class="flex items-center justify-between">
            <span>¿Cómo funciona el sistema de recomendaciones?</span>
            <span class="text-primary text-xl">+</span>
          </div>
        </summary>
        <div class="px-6 pb-6 dark:text-gray-300 text-gray-800">
          <p>
            Nuestro algoritmo analiza tus preferencias basándose en las
            películas y series que seleccionas, los títulos que marcas como
            vistos, los que te gustan y los que guardas. También considera tu
            estado de ánimo y nivel de atención para ofrecerte recomendaciones
            personalizadas que se adaptan a cómo te sientes en cada momento.
          </p>
        </div>
      </details>

      <!-- FAQ Item 2 -->
      <details
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 overflow-hidden"
      >
        <summary
          class="p-6 cursor-pointer font-semibold dark:text-gray-300 text-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors list-none"
        >
          <div class="flex items-center justify-between">
            <span>¿Es necesario crear una cuenta para usar UpNext?</span>
            <span class="text-primary text-xl">+</span>
          </div>
        </summary>
        <div class="px-6 pb-6 dark:text-gray-300 text-gray-800">
          <p>
            Sí, necesitas crear una cuenta gratuita para usar UpNext. Esto nos
            permite guardar tus preferencias y ofrecerte recomendaciones
            personalizadas. Tu información está protegida y nunca compartimos
            tus datos con terceros.
          </p>
        </div>
      </details>

      <!-- FAQ Item 3 -->
      <details
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 overflow-hidden"
      >
        <summary
          class="p-6 cursor-pointer font-semibold dark:text-gray-300 text-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors list-none"
        >
          <div class="flex items-center justify-between">
            <span
              >¿De dónde obtienen la información sobre disponibilidad en
              streaming?</span
            >
            <span class="text-primary text-xl">+</span>
          </div>
        </summary>
        <div class="px-6 pb-6 dark:text-gray-300 text-gray-800">
          <p>
            Utilizamos la API de The Movie Database (TMDB) para obtener
            información actualizada sobre en qué plataformas está disponible
            cada título. Esta información se actualiza regularmente, pero ten en
            cuenta que la disponibilidad puede variar según tu ubicación
            geográfica.
          </p>
        </div>
      </details>

      <!-- FAQ Item 4 -->
      <details
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 overflow-hidden"
      >
        <summary
          class="p-6 cursor-pointer font-semibold dark:text-gray-300 text-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors list-none"
        >
          <div class="flex items-center justify-between">
            <span
              >¿Puedo cambiar mis preferencias después del onboarding
              inicial?</span
            >
            <span class="text-primary text-xl">+</span>
          </div>
        </summary>
        <div class="px-6 pb-6 dark:text-gray-300 text-gray-800">
          <p>
            Sí, puedes actualizar tus preferencias en cualquier momento. Cada
            vez que marcas un título como visto, te gusta, lo guardas para más
            tarde o lo marcas como no interesante, el sistema aprende y ajusta
            tus recomendaciones automáticamente. También puedes buscar contenido
            específico y explorar diferentes géneros.
          </p>
        </div>
      </details>

      <!-- FAQ Item 5 -->
      <details
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 overflow-hidden"
      >
        <summary
          class="p-6 cursor-pointer font-semibold dark:text-gray-300 text-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors list-none"
        >
          <div class="flex items-center justify-between">
            <span>¿Qué diferencia hay entre "Me gusta" y "Ver más tarde"?</span>
            <span class="text-primary text-xl">+</span>
          </div>
        </summary>
        <div class="px-6 pb-6 dark:text-gray-300 text-gray-800">
          <p>
            "Me gusta" se usa para marcar contenido que ya has visto y te ha
            gustado, ayudando al sistema a entender tus preferencias. "Ver más
            tarde" es para contenido que aún no has visto pero quieres recordar
            para verlo en el futuro. Ambos ayudan a mejorar tus recomendaciones,
            pero sirven para propósitos diferentes.
          </p>
        </div>
      </details>

      <!-- FAQ Item 6 -->
      <details
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 overflow-hidden"
      >
        <summary
          class="p-6 cursor-pointer font-semibold dark:text-gray-300 text-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors list-none"
        >
          <div class="flex items-center justify-between">
            <span
              >¿Por qué no veo todas las plataformas de streaming
              disponibles?</span
            >
            <span class="text-primary text-xl">+</span>
          </div>
        </summary>
        <div class="px-6 pb-6 dark:text-gray-300 text-gray-800">
          <p>
            La disponibilidad de contenido en plataformas de streaming varía
            según tu ubicación geográfica. Mostramos las plataformas disponibles
            en tu región basándonos en los datos de TMDB. Si no ves una
            plataforma específica, puede ser que el contenido no esté disponible
            en tu país o que la información aún no se haya actualizado.
          </p>
        </div>
      </details>

      <!-- FAQ Item 7 -->
      <details
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 overflow-hidden"
      >
        <summary
          class="p-6 cursor-pointer font-semibold dark:text-gray-300 text-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors list-none"
        >
          <div class="flex items-center justify-between">
            <span>¿Cómo puedo eliminar mi cuenta?</span>
            <span class="text-primary text-xl">+</span>
          </div>
        </summary>
        <div class="px-6 pb-6 dark:text-gray-300 text-gray-800">
          <p>
            Puedes eliminar tu cuenta en cualquier momento desde la página de
            perfil. Al eliminar tu cuenta, se borrarán todos tus datos,
            incluyendo tus preferencias, listas y historial. Esta acción no se
            puede deshacer. Si necesitas ayuda, puedes contactarnos en
            hello@getupnext.io.
          </p>
        </div>
      </details>

      <!-- FAQ Item 8 -->
      <details
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 overflow-hidden"
      >
        <summary
          class="p-6 cursor-pointer font-semibold dark:text-gray-300 text-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors list-none"
        >
          <div class="flex items-center justify-between">
            <span>¿UpNext es gratuito?</span>
            <span class="text-primary text-xl">+</span>
          </div>
        </summary>
        <div class="px-6 pb-6 dark:text-gray-300 text-gray-800">
          <p>
            Sí, UpNext es completamente gratuito. No cobramos por usar la
            plataforma ni por las recomendaciones. Nuestro objetivo es ayudarte
            a encontrar contenido que disfrutes sin coste alguno.
          </p>
        </div>
      </details>

      <!-- FAQ Item 9 -->
      <details
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 overflow-hidden"
      >
        <summary
          class="p-6 cursor-pointer font-semibold dark:text-gray-300 text-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors list-none"
        >
          <div class="flex items-center justify-between">
            <span>¿Puedo usar UpNext en mi móvil?</span>
            <span class="text-primary text-xl">+</span>
          </div>
        </summary>
        <div class="px-6 pb-6 dark:text-gray-300 text-gray-800">
          <p>
            Sí, UpNext es una aplicación web responsive que funciona
            perfectamente en dispositivos móviles, tablets y ordenadores. Puedes
            acceder desde cualquier navegador en tu dispositivo móvil y
            disfrutar de todas las funcionalidades.
          </p>
        </div>
      </details>

      <!-- FAQ Item 10 -->
      <details
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 overflow-hidden"
      >
        <summary
          class="p-6 cursor-pointer font-semibold dark:text-gray-300 text-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors list-none"
        >
          <div class="flex items-center justify-between">
            <span>¿Qué hago si encuentro un error o tengo una sugerencia?</span>
            <span class="text-primary text-xl">+</span>
          </div>
        </summary>
        <div class="px-6 pb-6 dark:text-gray-300 text-gray-800">
          <p>
            Nos encantaría escuchar tus comentarios. Puedes contactarnos en
            hello@getupnext.io con cualquier error que encuentres, sugerencia de
            mejora o pregunta que no esté respondida en esta sección. Tu
            feedback nos ayuda a mejorar UpNext continuamente.
          </p>
        </div>
      </details>
    </div>

    <!-- CTA -->
    <div class="mt-8 text-center">
      <p class="dark:text-gray-300 text-gray-800 mb-4">
        ¿Tienes más preguntas?
      </p>
      <a
        href="mailto:hello@getupnext.io"
        class="inline-block px-6 py-3 bg-primary-800 dark:bg-primary hover:bg-primary-900 dark:hover:bg-primary-600 text-white rounded-lg font-medium transition-all duration-300"
      >
        Contáctanos
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Preguntas frecuentes - UpNext',
});

useSeoMeta({
  title: 'Preguntas frecuentes - UpNext',
  description:
    'Encuentra respuestas a las preguntas más comunes sobre UpNext, cómo funciona y cómo usar la plataforma.',
});
</script>

<style scoped>
details[open] summary span:last-child {
  transform: rotate(45deg);
}

details summary {
  list-style: none;
}

details summary::-webkit-details-marker {
  display: none;
}
</style>

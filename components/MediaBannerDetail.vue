<template>
  <div>
    <!-- Mobile: Full width image right after navbar -->
    <div
      v-if="mediaWithProviders.backdrop_path || mediaWithProviders.poster_path"
      class="lg:hidden w-screen -mx-4 md:-mx-6 -mt-4"
    >
      <div class="relative w-full aspect-[16/9] p-4 pt-6">
        <img
          :src="
            `https://image.tmdb.org/t/p/w780` +
            (mediaWithProviders.backdrop_path || mediaWithProviders.poster_path)
          "
          :alt="mediaWithProviders.title"
          class="absolute inset-0 w-full h-full object-cover object-top z-0"
        />
        <!-- Gradient overlay: black to transparent left to right -->
        <div
          class="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent z-0"
        ></div>
        <!-- Top row: Back button, Rating and Menu - aligned horizontally -->
        <div
          class="absolute top-6 left-4 right-4 flex items-center justify-between gap-4 z-30"
        >
          <!-- Back button - left -->
          <button
            class="inline-flex gap-2 items-center text-sm font-medium text-white transition-opacity hover:opacity-80 flex-shrink-0"
            @click="handleBack"
          >
            <IconArrowLeft icon-class="w-4 h-4" />
            <span class="hidden sm:inline">{{ $t('media.back') }}</span>
          </button>
          <!-- Rating and Menu - right -->
          <div class="flex items-center gap-3 flex-shrink-0">
            <!-- Rating -->
            <RatingBadge
              v-if="mediaWithProviders.vote_average"
              :rating="mediaWithProviders.vote_average"
              class="lg:hidden"
            />
            <!-- TmdbStatusBadge: Shows TMDB status or inTheaters (mobile only) -->
            <TmdbStatusBadge
              v-if="mediaWithProviders.status || inTheaters"
              :status="mediaWithProviders.status"
              :in-theaters="inTheaters"
              class="lg:hidden"
            />
            <!-- Actions Menu (only show if user has session) -->
            <ActionMenu
              v-if="hasSession"
              ref="mobileDropdownRef"
              position="right"
              width="w-48"
              custom-class="left-0 right-auto backdrop-blur-xl dark:bg-gray-900/40 bg-gray-100/80 border-gray-300/50 dark:border-white/10 md:right-0 md:left-auto"
            >
              <template #trigger>
                <IconButton
                  :icon="IconMoreVertical"
                  :aria-label="
                    $t('media.actionsMenuFor', {
                      title:
                        mediaWithProviders.title ||
                        (mediaWithProviders as any).name,
                    })
                  "
                  size="small"
                  variant="default"
                  custom-class="menu-button p-2 rounded-full bg-black/50 hover:bg-gray-700/80 backdrop-blur-sm [&>svg]:text-white"
                />
              </template>
              <div class="p-4">
                <!-- If title has a state, only show option to remove that state -->
                <!-- All remove actions use IconX -->
                <Button
                  v-if="isLiked"
                  type="button"
                  variant="ghost"
                  size="small"
                  custom-class="justify-start w-full text-left"
                  @click.stop.prevent="
                    mobileDropdownRef?.close();
                    handleRemoveLike();
                  "
                >
                  <template #icon>
                    <IconX icon-class="w-4 h-4" />
                  </template>
                  {{ $t('media.removeFromLiked') }}
                </Button>
                <Button
                  v-else-if="isSeen && !isLiked"
                  type="button"
                  variant="ghost"
                  size="small"
                  custom-class="justify-start w-full text-left"
                  @click.stop.prevent="
                    mobileDropdownRef?.close();
                    handleAction(TITLE_STATUS.SEEN);
                  "
                >
                  <template #icon>
                    <IconX icon-class="w-4 h-4" />
                  </template>
                  {{ $t('media.removeFromSeen') }}
                </Button>
                <Button
                  v-else-if="isNotInterested"
                  type="button"
                  variant="ghost"
                  size="small"
                  custom-class="justify-start w-full text-left"
                  @click.stop.prevent="
                    mobileDropdownRef?.close();
                    handleAction(TITLE_STATUS.NOT_INTERESTED);
                  "
                >
                  <template #icon>
                    <IconX icon-class="w-4 h-4" />
                  </template>
                  {{ $t('media.removeFromNotInterested') }}
                </Button>
                <Button
                  v-else-if="isFollowing"
                  type="button"
                  variant="ghost"
                  size="small"
                  custom-class="justify-start w-full text-left"
                  @click.stop.prevent="
                    mobileDropdownRef?.close();
                    handleUnfollow();
                  "
                >
                  <template #icon>
                    <IconX icon-class="w-4 h-4" />
                  </template>
                  {{ $t('following.unfollow') }}
                </Button>
                <Button
                  v-else-if="isInWatchlist"
                  type="button"
                  variant="ghost"
                  size="small"
                  custom-class="justify-start w-full text-left"
                  @click.stop.prevent="
                    mobileDropdownRef?.close();
                    handleRemoveFromWatchlist();
                  "
                >
                  <template #icon>
                    <IconX icon-class="w-4 h-4" />
                  </template>
                  {{ $t('media.removeFromWatchlist') }}
                </Button>
                <!-- If title has no state, show all options to add states -->
                <template v-else>
                  <Button
                    type="button"
                    variant="ghost"
                    size="small"
                    custom-class="justify-start mb-2 w-full text-left"
                    @click.stop.prevent="
                      dropdownRef?.close();
                      handleAction(TITLE_STATUS.SEEN);
                    "
                  >
                    <template #icon>
                      <IconCheck icon-class="w-4 h-4" />
                    </template>
                    {{ $t('media.seen') }}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="small"
                    custom-class="justify-start mb-2 w-full text-left"
                    @click.stop.prevent="
                      mobileDropdownRef?.close();
                      handleAction(TITLE_ACTION.LIKED);
                    "
                  >
                    <template #icon>
                      <IconHeart icon-class="w-4 h-4" />
                    </template>
                    {{ $t('media.liked') }}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="small"
                    custom-class="justify-start mb-2 w-full text-left"
                    @click.stop.prevent="
                      dropdownRef?.close();
                      handleAction(TITLE_STATUS.NOT_INTERESTED);
                    "
                  >
                    <template #icon>
                      <IconX icon-class="w-4 h-4" />
                    </template>
                    {{ $t('media.notInterested') }}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="small"
                    custom-class="justify-start mb-2 w-full text-left"
                    @click.stop.prevent="
                      mobileDropdownRef?.close();
                      handleAction(TITLE_STATUS.WATCHLIST);
                    "
                  >
                    <template #icon>
                      <IconClock icon-class="w-4 h-4" />
                    </template>
                    {{ $t('media.watchLater') }}
                  </Button>
                  <!-- Follow option for TV series (hide if fully seen) -->
                  <Button
                    v-if="mediaType === MEDIA_TYPE.TV && !isFullySeen"
                    type="button"
                    variant="ghost"
                    size="small"
                    custom-class="justify-start w-full text-left"
                    @click.stop.prevent="
                      mobileDropdownRef?.close();
                      handleFollow();
                    "
                  >
                    <template #icon>
                      <IconStar icon-class="w-4 h-4" />
                    </template>
                    {{ $t('following.follow') }}
                  </Button>
                </template>
              </div>
            </ActionMenu>
          </div>
        </div>
        <!-- Title and Tagline - vertically centered container -->
        <div
          v-if="
            mediaWithProviders.title ||
            (mediaWithProviders as any).name ||
            tagline
          "
          class="flex absolute inset-0 z-10 flex-col justify-center items-start gap-2 px-4 pointer-events-none"
        >
          <h1
            class="text-lg sm:text-xl font-bold text-white break-words line-clamp-2 mt-4"
          >
            {{ mediaWithProviders.title || (mediaWithProviders as any).name }}
          </h1>
          <p
            v-if="tagline"
            class="text-sm sm:text-base italic text-white/90 break-words"
          >
            {{ tagline }}
          </p>
          <p
            v-if="mediaWithProviders.overview"
            class="text-xs sm:text-sm text-white/90 break-words line-clamp-3 mt-2"
          >
            {{ mediaWithProviders.overview }}
          </p>
        </div>
        <!-- Informative icons overlay (only show if user has session) -->
        <div
          v-if="hasSession"
          class="media-banner-tooltips flex absolute bottom-6 right-4 gap-2 z-30"
        >
          <Tooltip v-if="isLiked" text="Favorito">
            <div
              class="flex justify-center items-center w-8 h-8 rounded-full backdrop-blur-sm bg-primary-600/90"
            >
              <IconHeartFilled icon-class="w-5 h-5 text-white" />
            </div>
          </Tooltip>
          <Tooltip v-if="isSeen && !isLiked" text="Visto">
            <div
              class="flex justify-center items-center w-8 h-8 rounded-full backdrop-blur-sm bg-primary-600/90"
            >
              <IconCheck icon-class="w-5 h-5 text-white" />
            </div>
          </Tooltip>
          <Tooltip v-if="isNotInterested" text="No me interesa">
            <div
              class="flex justify-center items-center w-8 h-8 rounded-full backdrop-blur-sm bg-primary-600/90"
            >
              <IconX icon-class="w-5 h-5 text-white" />
            </div>
          </Tooltip>
          <Tooltip v-if="isInWatchlist" text="Watchlist">
            <div
              class="flex justify-center items-center w-8 h-8 rounded-full backdrop-blur-sm bg-primary-600/90"
            >
              <IconClock icon-class="w-5 h-5 text-white" />
            </div>
          </Tooltip>
          <Tooltip
            v-if="isFollowing && !isLiked && !isSeen && !isNotInterested && !isInWatchlist"
            :text="$t('following.following')"
          >
            <div
              class="flex justify-center items-center w-8 h-8 rounded-full backdrop-blur-sm bg-primary-600/90"
            >
              <IconStar icon-class="w-5 h-5 text-white" />
            </div>
          </Tooltip>
        </div>
      </div>
    </div>
    <Section>
      <section
        class="relative flex flex-col items-center justify-between gap-16 dark:text-gray-300 text-gray-800 w-full flex-shrink-0 min-h-[400px] lg:flex-row lg:items-start lg:p-16 lg:bg-gray-100/80 dark:lg:bg-gray-900/40 lg:backdrop-blur-xl lg:border lg:gap-14 rounded-3xl lg:border-gray-300/50 lg:dark:border-white/10 lg:shadow-lg lg:shadow-primary/20"
      >
        <div
          class="hidden absolute inset-0 z-0 rounded-3xl lg:block"
          :style="sectionStyle"
        ></div>
        <div
          class="hidden absolute z-0 rounded-3xl lg:block bg-gray-100/90 dark:bg-gray-900/90"
          style="top: 0px; right: 0px; bottom: 0px; left: 0px"
        ></div>
        <!-- Left column: Image + Providers -->
        <div
          class="hidden lg:flex flex-col gap-14 lg:max-w-80 lg:w-80 flex-shrink-0 relative z-10"
        >
          <div
            class="relative w-full lg:max-w-80 lg:w-80 flex-shrink-0 lg:aspect-[2/3]"
            :style="posterFilterStyle"
          >
            <div
              class="relative overflow-hidden rounded-3xl w-full aspect-[2/3] h-full max-h-[500px]"
            >
              <img
                :src="
                  `https://image.tmdb.org/t/p/w780` +
                  mediaWithProviders.poster_path
                "
                :alt="mediaWithProviders.title"
                class="w-full h-full object-cover rounded-3xl"
              />
            </div>
            <!-- Informative icons overlay (only show if user has session) -->
            <!-- Moved outside overflow-hidden container to prevent tooltip clipping -->
            <div
              v-if="hasSession"
              class="media-banner-tooltips flex absolute top-2 right-2 gap-2 z-20"
            >
              <Tooltip v-if="isLiked" text="Favorito">
                <div
                  class="flex justify-center items-center w-8 h-8 rounded-full backdrop-blur-sm bg-primary-600/90"
                >
                  <IconHeartFilled icon-class="w-5 h-5 text-white" />
                </div>
              </Tooltip>
              <Tooltip v-if="isSeen && !isLiked" text="Visto">
                <div
                  class="flex justify-center items-center w-8 h-8 rounded-full backdrop-blur-sm bg-primary-600/90"
                >
                  <IconCheck icon-class="w-5 h-5 text-white" />
                </div>
              </Tooltip>
              <Tooltip v-if="isNotInterested" text="No me interesa">
                <div
                  class="flex justify-center items-center w-8 h-8 rounded-full backdrop-blur-sm bg-primary-600/90"
                >
                  <IconX icon-class="w-5 h-5 text-white" />
                </div>
              </Tooltip>
              <Tooltip v-if="isInWatchlist" text="Watchlist">
                <div
                  class="flex justify-center items-center w-8 h-8 rounded-full backdrop-blur-sm bg-primary-600/90"
                >
                  <IconClock icon-class="w-5 h-5 text-white" />
                </div>
              </Tooltip>
              <Tooltip
                v-if="isFollowing && !isLiked && !isSeen && !isNotInterested && !isInWatchlist"
                :text="$t('following.following')"
              >
                <div
                  class="flex justify-center items-center w-8 h-8 rounded-full backdrop-blur-sm bg-primary-600/90"
                >
                  <IconStar icon-class="w-5 h-5 text-white" />
                </div>
              </Tooltip>
            </div>
          </div>
          <!-- Providers below image on desktop -->
          <section class="flex flex-col gap-6">
            <section v-if="hasAvailableProviders" class="flex flex-col gap-8">
              <ProviderList
                :media-provider-prop-list="
                  mediaWithProviders.providers?.flatrate || []
                "
                :watch-type-prop="$t('media.watchIn')"
                :media-title="
                  mediaWithProviders.title ||
                  (mediaWithProviders as any).name ||
                  ''
                "
                :original-title="
                  mediaWithProviders.original_title ||
                  (mediaWithProviders as any).original_name ||
                  ''
                "
                :alternative-titles="alternativeTitles"
                :media-type="mediaType"
                :tmdb-id="mediaWithProviders.id"
              />

              <ProviderList
                :media-provider-prop-list="
                  mediaWithProviders.providers?.buy || []
                "
                :watch-type-prop="$t('media.buyIn')"
                :media-title="
                  mediaWithProviders.title ||
                  (mediaWithProviders as any).name ||
                  ''
                "
                :original-title="
                  mediaWithProviders.original_title ||
                  (mediaWithProviders as any).original_name ||
                  ''
                "
                :alternative-titles="alternativeTitles"
                :media-type="mediaType"
                :tmdb-id="mediaWithProviders.id"
              />

              <ProviderList
                :media-provider-prop-list="
                  mediaWithProviders.providers?.rent || []
                "
                :watch-type-prop="$t('media.rentIn')"
                :media-title="
                  mediaWithProviders.title ||
                  (mediaWithProviders as any).name ||
                  ''
                "
                :original-title="
                  mediaWithProviders.original_title ||
                  (mediaWithProviders as any).original_name ||
                  ''
                "
                :alternative-titles="alternativeTitles"
                :media-type="mediaType"
                :tmdb-id="mediaWithProviders.id"
              />
            </section>
            <section v-else class="text-gray-600 dark:text-gray-400">
              <p class="italic">{{ $t('media.noPlatforms') }}</p>
            </section>
          </section>
        </div>
        <!-- Right column: Content -->
        <div
          class="z-10 relative flex flex-col flex-1 gap-6 rounded-lg w-full flex-shrink-0 min-h-[300px]"
        >
          <div class="relative flex-row text-left">
            <button
              class="hidden lg:inline-flex gap-2 items-center mb-4 text-sm font-medium text-gray-700 transition-colors dark:text-gray-300 hover:dark:text-white hover:text-gray-900"
              @click="handleBack"
            >
              <IconArrowLeft icon-class="w-4 h-4" />
              {{ $t('media.back') }}
            </button>
            <div
              class="flex flex-col gap-2 w-full xl:flex-row xl:items-center xl:justify-between"
            >
              <!-- Title with Rating inline on desktop large -->
              <div
                class="flex flex-wrap gap-3 items-center xl:flex-nowrap xl:flex-1 xl:min-w-0"
              >
                <div class="hidden lg:flex flex-col gap-2 xl:flex-1 xl:min-w-0">
                  <h1
                    class="text-4xl font-bold text-gray-800 break-words dark:text-gray-300"
                  >
                    {{
                      mediaWithProviders.title ||
                      (mediaWithProviders as any).name
                    }}
                  </h1>
                  <p
                    v-if="tagline"
                    class="text-base italic text-gray-700 dark:text-gray-400 break-words"
                  >
                    {{ tagline }}
                  </p>
                </div>
                <!-- Rating inline with title on desktop large, hidden on mobile/tablet (shown below) -->
                <div class="hidden xl:block xl:flex-shrink-0">
                  <RatingBadge
                    v-if="mediaWithProviders.vote_average"
                    :rating="mediaWithProviders.vote_average"
                  />
                </div>
              </div>
              <!-- Rating, Status, Menu row (mobile/tablet) or Status, Menu (desktop large) -->
              <div
                class="hidden lg:flex flex-shrink-0 gap-3 items-center xl:gap-2"
              >
                <!-- Rating only on mobile/tablet (hidden on desktop large, already shown above) -->
                <RatingBadge
                  v-if="mediaWithProviders.vote_average"
                  :rating="mediaWithProviders.vote_average"
                  class="xl:hidden"
                />
                <!-- TmdbStatusBadge: Shows TMDB status or inTheaters -->
                <TmdbStatusBadge
                  v-if="mediaWithProviders.status || inTheaters"
                  :status="mediaWithProviders.status"
                  :in-theaters="inTheaters"
                />
                <!-- Actions Menu (only show if user has session) -->
                <ActionMenu
                  v-if="hasSession"
                  ref="dropdownRef"
                  position="right"
                  width="w-48"
                  custom-class="left-0 right-auto backdrop-blur-xl dark:bg-gray-900/40 bg-gray-100/80 border-gray-300/50 dark:border-white/10 md:right-0 md:left-auto"
                >
                  <template #trigger>
                    <IconButton
                      :icon="IconMoreVertical"
                      :aria-label="
                        $t('media.actionsMenuFor', {
                          title:
                            mediaWithProviders.title ||
                            (mediaWithProviders as any).name,
                        })
                      "
                      size="small"
                      variant="default"
                      custom-class="menu-button p-2 rounded-full bg-black/50 hover:bg-gray-700/80 backdrop-blur-sm [&>svg]:text-white"
                    />
                  </template>
                  <div class="p-4">
                    <!-- If title has a state, only show option to remove that state -->
                    <!-- All remove actions use IconX -->
                    <Button
                      v-if="isLiked"
                      type="button"
                      variant="ghost"
                      size="small"
                      custom-class="justify-start w-full text-left"
                      @click.stop.prevent="
                        dropdownRef?.close();
                        handleRemoveLike();
                      "
                    >
                      <template #icon>
                        <IconX icon-class="w-4 h-4" />
                      </template>
                      {{ $t('media.removeFromLiked') }}
                    </Button>
                    <Button
                      v-else-if="isSeen && !isLiked"
                      type="button"
                      variant="ghost"
                      size="small"
                      custom-class="justify-start w-full text-left"
                      @click.stop.prevent="
                        dropdownRef?.close();
                        handleAction(TITLE_STATUS.SEEN);
                      "
                    >
                      <template #icon>
                        <IconX icon-class="w-4 h-4" />
                      </template>
                      {{ $t('media.removeFromSeen') }}
                    </Button>
                    <Button
                      v-else-if="isNotInterested"
                      type="button"
                      variant="ghost"
                      size="small"
                      custom-class="justify-start w-full text-left"
                      @click.stop.prevent="
                        dropdownRef?.close();
                        handleAction(TITLE_STATUS.NOT_INTERESTED);
                      "
                    >
                      <template #icon>
                        <IconX icon-class="w-4 h-4" />
                      </template>
                      {{ $t('media.removeFromNotInterested') }}
                    </Button>
                    <Button
                      v-else-if="isFollowing"
                      type="button"
                      variant="ghost"
                      size="small"
                      custom-class="justify-start w-full text-left"
                      @click.stop.prevent="
                        dropdownRef?.close();
                        handleUnfollow();
                      "
                    >
                      <template #icon>
                        <IconX icon-class="w-4 h-4" />
                      </template>
                      {{ $t('following.unfollow') }}
                    </Button>
                    <Button
                      v-else-if="isInWatchlist"
                      type="button"
                      variant="ghost"
                      size="small"
                      custom-class="justify-start w-full text-left"
                      @click.stop.prevent="
                        dropdownRef?.close();
                        handleRemoveFromWatchlist();
                      "
                    >
                      <template #icon>
                        <IconX icon-class="w-4 h-4" />
                      </template>
                      {{ $t('media.removeFromWatchlist') }}
                    </Button>
                    <!-- If title has no state, show all options to add states -->
                    <template v-else>
                      <Button
                        type="button"
                        variant="ghost"
                        size="small"
                        custom-class="justify-start mb-2 w-full text-left"
                        @click.stop.prevent="
                          dropdownRef?.close();
                          handleAction(TITLE_STATUS.SEEN);
                        "
                      >
                        <template #icon>
                          <IconCheck icon-class="w-4 h-4" />
                        </template>
                        {{ $t('media.seen') }}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="small"
                        custom-class="justify-start mb-2 w-full text-left"
                        @click.stop.prevent="
                          dropdownRef?.close();
                          handleAction(TITLE_ACTION.LIKED);
                        "
                      >
                        <template #icon>
                          <IconHeart icon-class="w-4 h-4" />
                        </template>
                        {{ $t('media.liked') }}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="small"
                        custom-class="justify-start mb-2 w-full text-left"
                        @click.stop.prevent="
                          dropdownRef?.close();
                          handleAction(TITLE_STATUS.NOT_INTERESTED);
                        "
                      >
                        <template #icon>
                          <IconX icon-class="w-4 h-4" />
                        </template>
                        {{ $t('media.notInterested') }}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="small"
                        custom-class="justify-start mb-2 w-full text-left"
                        @click.stop.prevent="
                          dropdownRef?.close();
                          handleAction(TITLE_STATUS.WATCHLIST);
                        "
                      >
                        <template #icon>
                          <IconClock icon-class="w-4 h-4" />
                        </template>
                        {{ $t('media.watchLater') }}
                      </Button>
                      <!-- Follow option for TV series (hide if fully seen) -->
                      <Button
                        v-if="mediaType === MEDIA_TYPE.TV && !isFullySeen"
                        type="button"
                        variant="ghost"
                        size="small"
                        custom-class="justify-start w-full text-left"
                        @click.stop.prevent="
                          dropdownRef?.close();
                          handleFollow();
                        "
                      >
                        <template #icon>
                          <IconStar icon-class="w-4 h-4" />
                        </template>
                        {{ $t('following.follow') }}
                      </Button>
                    </template>
                  </div>
                </ActionMenu>
              </div>
            </div>
          </div>

          <p
            :class="[
              'hidden lg:block dark:text-gray-300 text-gray-800',
              { italic: !mediaWithProviders.overview },
            ]"
            >{{ mediaWithProviders.overview || $t('media.noDescription') }}</p
          >
          <div
            class="flex gap-2 items-center mt-2 text-gray-800 dark:text-gray-300"
          >
            <IconCalendar icon-class="w-5 h-5" />
            <span>{{
              formatDateByRegion(
                mediaWithProviders.release_date ||
                  (mediaWithProviders as any).first_air_date ||
                  '',
                userRegion,
                t
              )
            }}</span>
          </div>
          <div
            v-if="
              mediaType === MEDIA_TYPE.TV &&
              ((mediaWithProviders as any).number_of_episodes ||
                (mediaWithProviders as any).number_of_seasons)
            "
            class="flex gap-2 items-center text-gray-800 dark:text-gray-300"
          >
            <IconEpisodes icon-class="w-5 h-5" />
            <span>
              <template v-if="(mediaWithProviders as any).number_of_seasons">
                {{
                  $t(
                    (mediaWithProviders as any).number_of_seasons === 1
                      ? 'media.seasonsCount_one'
                      : 'media.seasonsCount_other',
                    {
                      count: (mediaWithProviders as any).number_of_seasons || 0,
                    }
                  )
                }}
              </template>
              <template
                v-if="
                  (mediaWithProviders as any).number_of_seasons &&
                  (mediaWithProviders as any).number_of_episodes
                "
                >,
              </template>
              <template v-if="(mediaWithProviders as any).number_of_episodes">
                {{
                  $t(
                    (mediaWithProviders as any).number_of_episodes === 1
                      ? 'media.episodesCount_one'
                      : 'media.episodesCount_other',
                    {
                      count:
                        (mediaWithProviders as any).number_of_episodes || 0,
                    }
                  )
                }}
              </template>
            </span>
          </div>
          <div class="flex gap-2 items-center text-gray-800 dark:text-gray-300">
            <IconTag icon-class="w-5 h-5" />
            <span>{{
              mediaWithProviders?.genres
                ?.map((genre: Genre) => genre.name)
                .join(', ') || $t('media.notAvailable')
            }}</span>
          </div>
          <div
            v-if="
              mediaType === MEDIA_TYPE.MOVIE &&
              mediaWithProviders.runtime != null &&
              mediaWithProviders.runtime > 0
            "
            class="flex gap-2 items-center text-gray-800 dark:text-gray-300"
          >
            <IconClock icon-class="w-5 h-5" />
            <span>{{ mediaWithProviders.runtime }} min</span>
          </div>
          <!-- Videos section -->
          <div v-if="trailers || recaps" class="flex flex-col gap-6">
            <VideoSection
              v-if="trailers"
              :videos="trailers"
              :title="$t('media.trailers')"
            />
            <VideoSection
              v-if="recaps"
              :videos="recaps"
              :title="$t('media.recaps')"
            />
          </div>
          <!-- Displaying watch providers with their logos (mobile only) -->
          <section class="flex flex-col gap-6 lg:hidden">
            <section v-if="hasAvailableProviders" class="flex flex-col gap-8">
              <ProviderList
                :media-provider-prop-list="
                  mediaWithProviders.providers?.flatrate || []
                "
                :watch-type-prop="$t('media.watchIn')"
                :media-title="
                  mediaWithProviders.title ||
                  (mediaWithProviders as any).name ||
                  ''
                "
                :original-title="
                  mediaWithProviders.original_title ||
                  (mediaWithProviders as any).original_name ||
                  ''
                "
                :alternative-titles="alternativeTitles"
                :media-type="mediaType"
                :tmdb-id="mediaWithProviders.id"
              />

              <ProviderList
                :media-provider-prop-list="
                  mediaWithProviders.providers?.buy || []
                "
                :watch-type-prop="$t('media.buyIn')"
                :media-title="
                  mediaWithProviders.title ||
                  (mediaWithProviders as any).name ||
                  ''
                "
                :original-title="
                  mediaWithProviders.original_title ||
                  (mediaWithProviders as any).original_name ||
                  ''
                "
                :alternative-titles="alternativeTitles"
                :media-type="mediaType"
                :tmdb-id="mediaWithProviders.id"
              />

              <ProviderList
                :media-provider-prop-list="
                  mediaWithProviders.providers?.rent || []
                "
                :watch-type-prop="$t('media.rentIn')"
                :media-title="
                  mediaWithProviders.title ||
                  (mediaWithProviders as any).name ||
                  ''
                "
                :original-title="
                  mediaWithProviders.original_title ||
                  (mediaWithProviders as any).original_name ||
                  ''
                "
                :alternative-titles="alternativeTitles"
                :media-type="mediaType"
                :tmdb-id="mediaWithProviders.id"
              />
            </section>
            <section v-else class="text-gray-600 dark:text-gray-400">
              <p class="italic">{{ $t('media.noPlatforms') }}</p>
            </section>
          </section>
        </div>
      </section>
    </Section>
  </div>
</template>

<script setup lang="ts">
import RatingBadge from './RatingBadge.vue';
import type { Media } from '@/types/Media';
import { computed, nextTick, onMounted, onUnmounted, PropType, ref } from 'vue';
import { formatDateByRegion } from '@/utils/formatDate';
import type { Genre } from '@/types/Genre';
import ProviderList from './ProviderList.vue';
import type { Movie } from '@/types/Movie';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import TmdbStatusBadge from './TmdbStatusBadge.vue';
import IconArrowLeft from './icons/IconArrowLeft.vue';
import IconCalendar from './icons/IconCalendar.vue';
import IconTag from './icons/IconTag.vue';
import IconEpisodes from './icons/IconEpisodes.vue';
import IconMoreVertical from './icons/IconMoreVertical.vue';
import IconCheck from './icons/IconCheck.vue';
import IconHeart from './icons/IconHeart.vue';
import IconHeartFilled from './icons/IconHeartFilled.vue';
import IconX from './icons/IconX.vue';
import IconClock from './icons/IconClock.vue';
import VideoSection from './VideoSection.vue';
import { getVideosForTitle, filterVideosByType } from '@/composables/useVideos';
import {
  VIDEO_TYPE_TRAILER,
  VIDEO_TYPE_RECAP,
} from '@/constants/domain/videos';
import type { Video } from '@/types/Video';
import {
  TITLE_STATUS,
  type TitleStatusType,
} from '@/constants/domain/titleStatus';
import { TITLE_ACTION } from '@/constants/domain/titleActions';
import { getSession } from '@/services/auth';
import { useUndoToast } from '@/composables/useUndoToast';
import { useTitleStatusAction } from '@/composables/useTitleStatusAction';
import ActionMenu from '@/components/ui/ActionMenu.vue';
import { useLogger } from '@/composables/useLogger';
import IconButton from '@/components/ui/IconButton.vue';
import Button from '@/components/ui/Button.vue';
import Tooltip from '@/components/ui/Tooltip.vue';
import IconStar from '@/components/icons/IconStar.vue';
import { getUserLikedTitle, getTitleStatus } from '@/services/userTitleStatus';
import { useRouter } from 'vue-router';
import Section from '@/components/layout/Section.vue';
import { useUserRegion } from '@/composables/useUserRegion';
import { type MultiLanguageText } from '@/services/titles';
import { useRouteWithLang } from '@/composables/useRouteWithLang';
import { useFetchTagline } from '@/composables/useFetchTagline';
import { useFollowing } from '@/composables/useFollowing';
import { checkSeriesFullySeen } from '@/services/userEpisodeStatus';

const props = defineProps({
  media: {
    type: Object as PropType<Media>,
    required: true,
  },
  mediaType: {
    type: String as PropType<typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV>,
    required: true,
  },
  inProduction: {
    type: Boolean,
    required: false,
  },
  inTheaters: {
    type: Boolean,
    required: false,
    default: false,
  },
});

const mediaWithProviders = computed(() => props.media as unknown as Movie);

// Videos state
const allVideos = ref<Video[] | null>(null);
const trailers = computed(() =>
  allVideos.value
    ? filterVideosByType(allVideos.value, VIDEO_TYPE_TRAILER)
    : null
);
const recaps = computed(() =>
  allVideos.value ? filterVideosByType(allVideos.value, VIDEO_TYPE_RECAP) : null
);

const hasAvailableProviders = computed(() => {
  return (
    (mediaWithProviders.value.providers?.flatrate?.length || 0) > 0 ||
    (mediaWithProviders.value.providers?.buy?.length || 0) > 0 ||
    (mediaWithProviders.value.providers?.rent?.length || 0) > 0
  );
});

// Extract alternative titles for Spain (with types)
const alternativeTitles = computed(() => {
  const media = mediaWithProviders.value as Movie & {
    alternative_titles?: {
      titles: Array<{ title: string; type: string; iso_3166_1: string }>;
    };
  };
  if (media.alternative_titles?.titles) {
    // Filter for Spain and return objects with title and type
    return media.alternative_titles.titles
      .filter((alt) => alt.iso_3166_1 === 'ES')
      .map((alt) => ({ title: alt.title, type: alt.type }));
  }
  return [];
});

// Use the reusable composable to fetch tagline from TMDB if missing
const initialTagline = computed(() => {
  return (
    (
      mediaWithProviders.value as Movie & {
        tagline?: string | MultiLanguageText;
      }
    ).tagline || null
  );
});

const tmdbIdComputed = computed(() => mediaWithProviders.value.id);
const typeComputed = computed(() => props.mediaType);

const { tagline, fetchTaglineIfMissing } = useFetchTagline(
  initialTagline,
  tmdbIdComputed,
  typeComputed
);

const isMobile = ref(false);
const dropdownRef = ref<InstanceType<typeof ActionMenu> | null>(null);
const mobileDropdownRef = ref<InstanceType<typeof ActionMenu> | null>(null);
const isLiked = ref(false);
const isInWatchlist = ref(false);
const isSeen = ref(false);
const isNotInterested = ref(false);
const isFullySeen = ref(false);
const router = useRouter();
const { getUserRegion } = useUserRegion();
const userRegion = ref<string | null>(null);

// Following state management (only for TV series)
const tmdbIdRef = computed(() => mediaWithProviders.value.id);
const {
  isFollowing,
  checkFollowing,
  followSeries,
  unfollowSeries,
} = useFollowing(tmdbIdRef);

// Check if user has session
const user = useSupabaseUser();
const hasSession = computed(() => !!user.value);

// Detect mobile/tablet screen size (use mobile style for tablet too)
const checkMobile = () => {
  isMobile.value = window.innerWidth < 1024; // lg breakpoint
};

// Handle resize
const handleResize = () => {
  checkMobile();
};

const { showToast } = useUndoToast();
const { t } = useI18n();

// Fetch title status on mount (only if user has session)
const fetchTitleStatus = async () => {
  // Don't fetch if no session
  if (!hasSession.value) {
    return;
  }

  try {
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      return;
    }

    const userId = session.user?.id || (session.user as { sub?: string })?.sub;

    if (!userId) {
      return;
    }

    const { data: titleStatus } = await getTitleStatus(
      userId,
      mediaWithProviders.value.id
    );

    if (titleStatus) {
      isLiked.value = titleStatus.liked === true;
      isInWatchlist.value = titleStatus.status === TITLE_STATUS.WATCHLIST;
      isSeen.value = titleStatus.status === TITLE_STATUS.SEEN;
      isNotInterested.value =
        titleStatus.status === TITLE_STATUS.NOT_INTERESTED;
    }

    // Check following status (only for TV series)
    if (props.mediaType === MEDIA_TYPE.TV) {
      await checkFollowing();

      // Check if series is fully seen (to hide/disable follow option)
      // Only check on client side to avoid SSR issues
      if (process.client) {
        try {
          isFullySeen.value = await checkSeriesFullySeen(
            userId,
            mediaWithProviders.value.id
          );
        } catch (error) {
          const { logError } = useLogger();
          logError(
            '[MediaBannerDetail] Error checking if series is fully seen',
            error as Error,
            {
              tmdbId: mediaWithProviders.value.id,
            }
          );
          // Default to false if check fails
          isFullySeen.value = false;
        }
      }
    }
  } catch (error) {
    const { logError } = useLogger();
    logError(
      '[MediaBannerDetail] Error fetching title status',
      error as Error,
      {
        tmdbId: mediaWithProviders.value.id,
        mediaType: props.mediaType,
      }
    );
  }
};

onMounted(async () => {
  checkMobile();
  window.addEventListener('resize', handleResize);
  // Get user region for date formatting
  userRegion.value = await getUserRegion();
  // Only fetch title status if user has session
  if (hasSession.value) {
    await fetchTitleStatus();
  }
  // Check and fetch tagline if missing
  await fetchTaglineIfMissing();
  // Fetch videos
  try {
    const videos = await getVideosForTitle(
      mediaWithProviders.value.id,
      props.mediaType === MEDIA_TYPE.MOVIE ? MEDIA_TYPE.MOVIE : MEDIA_TYPE.TV
    );
    allVideos.value = videos;
    // Development-only logging removed
  } catch (error) {
    const { logError } = useLogger();
    logError('[MediaBannerDetail] Error loading videos', error as Error, {
      tmdbId: mediaWithProviders.value.id,
      mediaType: props.mediaType,
    });
    allVideos.value = null;
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

const backgroundImage = computed(() => {
  if (mediaWithProviders.value.backdrop_path) {
    return `https://image.tmdb.org/t/p/w780${mediaWithProviders.value.backdrop_path}`;
  }
  return '';
});

const sectionStyle = computed(() => ({
  backgroundImage: isMobile.value ? '' : `url(${backgroundImage.value})`,
  backgroundSize: isMobile.value ? 'contain' : 'cover',
  backgroundPosition: isMobile.value ? 'center' : 'center',
}));

// Poster filter style - use computed to avoid hydration mismatch with CSS variables
// Primary color: #21186E = rgb(33, 24, 110)
const posterFilterStyle = computed(() => ({
  filter:
    'drop-shadow(0 10px 15px -3px rgb(0 0 0 / 0.1)) drop-shadow(0 4px 6px -4px rgb(0 0 0 / 0.1)) drop-shadow(0 0 20px rgb(33 24 110 / 0.3))',
}));

// Get unified title status action handler
const { executeAction, executeLikedAction } = useTitleStatusAction();

const handleAction = async (action: TitleStatusType | typeof TITLE_ACTION.LIKED) => {
  const mediaTitle =
    mediaWithProviders.value.title ||
    (mediaWithProviders.value as Movie & { name?: string }).name ||
    t('media.thisTitle');

  // Get current status
  const currentStatus = isSeen.value
    ? TITLE_STATUS.SEEN
    : isNotInterested.value
      ? TITLE_STATUS.NOT_INTERESTED
      : isInWatchlist.value
        ? TITLE_STATUS.WATCHLIST
        : null;

  if (action === TITLE_ACTION.LIKED) {
    // Check if title is already liked
    const {
      data: { session },
    } = await getSession();
    const userId =
      session?.user?.id || (session?.user as { sub?: string })?.sub;

    if (userId) {
      const { data: likedTitle } = await getUserLikedTitle(
        userId,
        mediaWithProviders.value.id
      );

      if (likedTitle) {
        // Title is already liked, remove it directly
        await handleRemoveLike();
        return;
      }
    }

    // Store original state for undo
    const originalIsLiked = isLiked.value;
    const originalIsSeen = isSeen.value;

    // Execute liked action using unified composable
    const result = await executeLikedAction(
      {
        tmdb_id: mediaWithProviders.value.id,
        type: props.mediaType,
        title: mediaTitle,
        currentStatus,
        isLiked: isLiked.value,
        onUndoComplete: async () => {
          // Revert local state on undo
          isLiked.value = originalIsLiked;
          isSeen.value = originalIsSeen;
          await fetchTitleStatus();
        },
      },
      isLiked.value
    );

    // Update local state based on result
    if (result.success) {
      if (result.action === 'added') {
        isLiked.value = true;
        isSeen.value = true;
        isInWatchlist.value = false;
        isNotInterested.value = false;
      } else {
        isLiked.value = false;
        // seen status remains
      }
      await fetchTitleStatus();
    }
  } else {
    // Store original state for undo
    const originalIsSeen = isSeen.value;
    const originalIsLiked = isLiked.value;
    const originalIsInWatchlist = isInWatchlist.value;
    const originalIsNotInterested = isNotInterested.value;

    // Execute status action using unified composable
    const result = await executeAction(
      {
        tmdb_id: mediaWithProviders.value.id,
        type: props.mediaType,
        title: mediaTitle,
        currentStatus,
        isLiked: isLiked.value,
        onUndoComplete: async () => {
          // Revert local state on undo
          isSeen.value = originalIsSeen;
          isLiked.value = originalIsLiked;
          isInWatchlist.value = originalIsInWatchlist;
          isNotInterested.value = originalIsNotInterested;
          await fetchTitleStatus();
        },
      },
      action
    );

    // Update local state based on result
    if (result.success) {
      if (result.action === 'added') {
        // Set the new status and clear others
        if (action === TITLE_STATUS.SEEN) {
          isSeen.value = true;
          isInWatchlist.value = false;
          isNotInterested.value = false;
          // Note: liked is not automatically set when marking as seen
        } else if (action === TITLE_STATUS.NOT_INTERESTED) {
          isNotInterested.value = true;
          isInWatchlist.value = false;
          isSeen.value = false;
          isLiked.value = false;
        } else if (action === TITLE_STATUS.WATCHLIST) {
          isInWatchlist.value = true;
          isSeen.value = false;
          isNotInterested.value = false;
          isLiked.value = false;
        }
      } else {
        // Removed - clear the status
        if (action === TITLE_STATUS.SEEN) {
          isSeen.value = false;
          isLiked.value = false; // Removing seen also removes liked
          isInWatchlist.value = false;
          isNotInterested.value = false;
        } else if (action === TITLE_STATUS.NOT_INTERESTED) {
          isNotInterested.value = false;
        } else if (action === TITLE_STATUS.WATCHLIST) {
          isInWatchlist.value = false;
        }
      }
      await fetchTitleStatus();
    }
  }
};

// Handle removing like directly from dropdown
const handleRemoveLike = async () => {
  const mediaTitle =
    mediaWithProviders.value.title ||
    (mediaWithProviders.value as Movie & { name?: string }).name ||
    t('media.thisTitle');

  try {
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      showToast(t('media.authRequired'), null, 3000);
      return;
    }

    // Development-only logging removed

    // Remove like (no modal needed - just updates score)
    await $fetch('/api/users/title-status', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {
        tmdb_id: mediaWithProviders.value.id,
        type: props.mediaType,
        status: TITLE_STATUS.SEEN, // Keep status as seen, just remove liked
        liked: false,
      },
    });

    // Development-only logging removed

    // Note: Title remains as "seen" (not liked), so it should NOT be in recommendations
    // The title was already removed from recommendations when it was marked as "liked"
    // No pool regeneration needed - only score is adjusted, pool remains stable

    // Show success toast
    showToast(
      t('preferences.titleRemoved', { title: mediaTitle }),
      {
        label: t('undo.undo'),
        variant: 'secondary',
        action: async () => {
          // Undo: Re-add as liked
          try {
            await $fetch('/api/users/title-status', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
              body: {
                tmdb_id: mediaWithProviders.value.id,
                type: props.mediaType,
                status: TITLE_STATUS.SEEN,
                liked: true,
              },
            });
            isLiked.value = true;
            isSeen.value = true;
            await fetchTitleStatus();
          } catch (error) {
            const { logError } = useLogger();
            logError('[MediaBannerDetail] Error undoing', error as Error, {
              tmdbId: mediaWithProviders.value.id,
              action: 'undo-remove-like',
            });
            await fetchTitleStatus();
          }
        },
      },
      7000
    );

    // Update local state
    isLiked.value = false;
    await fetchTitleStatus();
  } catch (error) {
    const { logError } = useLogger();
    logError('[MediaBannerDetail] Error removing like', error as Error, {
      tmdbId: mediaWithProviders.value.id,
      mediaType: props.mediaType,
    });
    showToast(
      t('preferences.errorRemoving', { title: mediaTitle }),
      null,
      3000
    );
  }
};

// Handle back navigation
const handleBack = async () => {
  // Close dropdown if open before navigating
  if (dropdownRef.value) {
    dropdownRef.value.close();
  }
  if (mobileDropdownRef.value) {
    mobileDropdownRef.value.close();
  }

  // Wait a tick to ensure dropdown is closed
  await nextTick();

  // Try to get the previous route from sessionStorage
  const previousRoute = sessionStorage.getItem('previousRoute');

  if (previousRoute) {
    // Clear the stored route
    sessionStorage.removeItem('previousRoute');
    // Navigate to the previous route using navigateTo
    await navigateTo(previousRoute);
  } else {
    // Check if we can go back in history (user came from within the app)
    if (window.history.length > 1) {
      // Use router.back() to properly trigger Vue Router navigation
      router.back();
    } else {
      // User came from outside the app, go to home
      const { routeWithLang } = useRouteWithLang();
      await navigateTo(routeWithLang('/'));
    }
  }
};

// Handle removing from watchlist
const handleRemoveFromWatchlist = async () => {
  try {
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      showToast(t('media.authRequired'), null, 3000);
      return;
    }

    const mediaTitle =
      mediaWithProviders.value.title ||
      (mediaWithProviders.value as Movie & { name?: string }).name ||
      t('media.thisTitle');

    // Capture values before deletion for undo
    const tmdbId = mediaWithProviders.value.id;
    const mediaType = props.mediaType;

    // Remove from watchlist by deleting the status
    await $fetch('/api/users/title-status/delete', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      query: {
        tmdb_id: tmdbId,
      },
    });

    // Update local state immediately
    isInWatchlist.value = false;

    // Show toast with undo button
    showToast(
      t('watchlist.titleRemoved', { title: mediaTitle }),
      {
        label: t('undo.undo'),
        variant: 'secondary',
        action: async () => {
          // Undo: Re-add to watchlist
          try {
            const {
              data: { session: undoSession },
            } = await getSession();
            if (!undoSession?.access_token) return;

            await $fetch('/api/users/title-status', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${undoSession.access_token}`,
              },
              body: {
                tmdb_id: tmdbId,
                type: mediaType,
                status: TITLE_STATUS.WATCHLIST,
                liked: false,
              },
            });

            // Restore local state
            isInWatchlist.value = true;
            await fetchTitleStatus();
          } catch (error) {
            const { logError } = useLogger();
            logError('[MediaBannerDetail] Error undoing', error as Error, {
              tmdbId: mediaWithProviders.value.id,
              action: 'undo-remove-like',
            });
            await fetchTitleStatus();
          }
        },
      },
      7000
    );

    // Also fetch to ensure consistency
    await fetchTitleStatus();
  } catch (error) {
    const { logError } = useLogger();
    logError(
      '[MediaBannerDetail] Error removing from watchlist',
      error as Error,
      {
        tmdbId: mediaWithProviders.value.id,
        mediaType: props.mediaType,
      }
    );
    const mediaTitle =
      mediaWithProviders.value.title ||
      (mediaWithProviders.value as Movie & { name?: string }).name ||
      t('media.thisTitle');
    showToast(t('home.errorUpdatingStatus', { title: mediaTitle }), null, 3000);
  }
};

// Handle following a series
const handleFollow = async () => {
  const mediaTitle =
    mediaWithProviders.value.title ||
    (mediaWithProviders.value as Movie & { name?: string }).name ||
    t('media.thisTitle');

  try {
    await followSeries();

    // Update local state
    await fetchTitleStatus();

    // Show success toast
    showToast(
      t('following.titleAdded', { title: mediaTitle }),
      {
        label: t('undo.undo'),
        variant: 'secondary',
        action: async () => {
          // Undo: Unfollow
          try {
            await unfollowSeries();
            await fetchTitleStatus();
          } catch (error) {
            const { logError } = useLogger();
            logError('[MediaBannerDetail] Error undoing follow', error as Error, {
              tmdbId: mediaWithProviders.value.id,
            });
            await fetchTitleStatus();
          }
        },
      },
      7000
    );
  } catch (error) {
    const { logError } = useLogger();
    logError('[MediaBannerDetail] Error following series', error as Error, {
      tmdbId: mediaWithProviders.value.id,
    });
    showToast(
      t('following.errorAdding', { title: mediaTitle }),
      null,
      3000
    );
  }
};

// Handle unfollowing a series
const handleUnfollow = async () => {
  const mediaTitle =
    mediaWithProviders.value.title ||
    (mediaWithProviders.value as Movie & { name?: string }).name ||
    t('media.thisTitle');

  try {
    await unfollowSeries();

    // Update local state
    await fetchTitleStatus();

    // Show success toast
    showToast(
      t('following.titleRemoved', { title: mediaTitle }),
      {
        label: t('undo.undo'),
        variant: 'secondary',
        action: async () => {
          // Undo: Re-follow
          try {
            await followSeries();
            await fetchTitleStatus();
          } catch (error) {
            const { logError } = useLogger();
            logError('[MediaBannerDetail] Error undoing unfollow', error as Error, {
              tmdbId: mediaWithProviders.value.id,
            });
            await fetchTitleStatus();
          }
        },
      },
      7000
    );
  } catch (error) {
    const { logError } = useLogger();
    logError('[MediaBannerDetail] Error unfollowing series', error as Error, {
      tmdbId: mediaWithProviders.value.id,
    });
    showToast(
      t('following.errorRemoving', { title: mediaTitle }),
      null,
      3000
    );
  }
};
</script>

<style>
/* Global styles for tooltip z-index priority in MediaBannerDetail */
/* Ensure the tooltip container has higher z-index when hovered */
/* This matches the same pattern used in watchlist and preferences pages */
.media-banner-tooltips .tooltip-container {
  z-index: 100000 !important;
}

.media-banner-tooltips .tooltip-container:hover {
  z-index: 100000 !important;
}

.media-banner-tooltips .tooltip {
  z-index: 100000 !important;
}
</style>

// src/stores/library.ts
import { defineStore } from 'pinia'

export interface ContentItem {
  id: number
  title: string
  type: 'movie' | 'series'
  platform: string[]
  available: boolean
  url: string
  status: 'pending' | 'watching' | 'watched'
  image: string
}

export const useLibraryStore = defineStore('library', {
  state: () => ({
    content: [] as ContentItem[]
  }),
  actions: {
    loadMockData() {
      this.content = [
        {
          id: 1,
          title: 'El juego del Calamar',
          type: 'series',
          platform: ['Netflix'],
          available: true,
          url: 'https://www.netflix.com/es/title/81040344&ved=2ahUKEwjKwqnOo-COAxUdWaQEHaLHGRUQFnoECCYQAQ&usg=AOvVaw0KbUUlFKLSF81v_QP0fe4_',
          status: 'watching',
          image: 'https://occ-0-358-360.1.nflxso.net/dnm/api/v6/mAcAr9TxZIVbINe88xb3Teg5_OA/AAAABSe6xTqvoDxQpdA07mJWeeRRiWjWyYqpK4kOOVgpEdAt2X-EmQrrqOkMvgfYsw7rCeJmmSisLzkHYTqBT4fh1WzEecPgOZD_akCFN0zei5I3qwh7X8qLD64U0zrYln5XzO1B.jpg?r=9fc'
        },
        {
          id: 2,
          title: 'Los Anillos del Poder',
          type: 'movie',
          platform: ['Prime Video', 'HBO Max'],
          available: true,
          url: 'https://www.primevideo.com/-/es/detail/0UB2ZI7XTDU5ENEYYH4GR048TQ',
          status: 'watched',
          image: 'https://media.themoviedb.org/t/p/w300_and_h450_bestv2/suvlZfDAoq5vfVUrfb468KJhFlL.jpg'
        }
      ]
    }
  }
})

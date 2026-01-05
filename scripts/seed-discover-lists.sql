-- Seed script for initial 10 Discover lists
-- IMPORTANT: All slugs MUST be in English (kebab-case, stable, never change)
-- Titles and descriptions are in JSONB multi-language format

-- List 1: Intense Movies
INSERT INTO public.discover_lists (slug, title, description, type, is_public, is_indexable)
VALUES (
  'intense-movies',
  '{"es-ES": "Películas intensas", "ca-ES": "Pel·lícules intenses", "eu-ES": "Film intentsuak", "gl-ES": "Películas intensas", "en-US": "Intense movies", "en-GB": "Intense films"}',
  '{"es-ES": "Películas que te mantendrán al borde del asiento", "ca-ES": "Pel·lícules que et mantindran al vora del seient", "eu-ES": "Zure eserlekuaren ertzean mantenduko zaituzten filmak", "gl-ES": "Películas que che manterán ao bordo do asento", "en-US": "Movies that will keep you on the edge of your seat", "en-GB": "Films that will keep you on the edge of your seat"}',
  'movie',
  true,
  true
);

-- List 2: Short Movies for Today
INSERT INTO public.discover_lists (slug, title, description, type, is_public, is_indexable)
VALUES (
  'short-movies-for-today',
  '{"es-ES": "Películas cortas para hoy", "ca-ES": "Pel·lícules curtes per avui", "eu-ES": "Film laburrak gaur", "gl-ES": "Películas curtas para hoxe", "en-US": "Short movies for today", "en-GB": "Short films for today"}',
  '{"es-ES": "Películas perfectas para ver cuando tienes poco tiempo", "ca-ES": "Pel·lícules perfectes per veure quan tens poc temps", "eu-ES": "Denbora gutxi duzunean ikusteko film perfektuak", "gl-ES": "Películas perfectas para ver cando tes pouco tempo", "en-US": "Perfect movies to watch when you have little time", "en-GB": "Perfect films to watch when you have little time"}',
  'movie',
  true,
  true
);

-- List 3: Easy TV Shows
INSERT INTO public.discover_lists (slug, title, description, type, is_public, is_indexable)
VALUES (
  'easy-tv-shows',
  '{"es-ES": "Series fáciles de ver", "ca-ES": "Sèries fàcils de veure", "eu-ES": "Ikusteko errazak diren telesailak", "gl-ES": "Series fáciles de ver", "en-US": "Easy TV shows", "en-GB": "Easy TV shows"}',
  '{"es-ES": "Series relajadas y entretenidas", "ca-ES": "Sèries relaxades i entretingudes", "eu-ES": "Lasai eta entretenigarriak diren telesailak", "gl-ES": "Series relaxadas e entretenidas", "en-US": "Relaxed and entertaining series", "en-GB": "Relaxed and entertaining series"}',
  'tv',
  true,
  true
);

-- List 4: Easy to Start TV Shows
INSERT INTO public.discover_lists (slug, title, description, type, is_public, is_indexable)
VALUES (
  'easy-to-start-tv-shows',
  '{"es-ES": "Series fáciles de empezar", "ca-ES": "Sèries fàcils de començar", "eu-ES": "Hasteko errazak diren telesailak", "gl-ES": "Series fáciles de comezar", "en-US": "Easy to start TV shows", "en-GB": "Easy to start TV shows"}',
  '{"es-ES": "Series que enganchan desde el primer episodio", "ca-ES": "Sèries que enganxen des del primer episodi", "eu-ES": "Lehenengo ataletik erakartzen dituzten telesailak", "gl-ES": "Series que enganchan desde o primeiro episodio", "en-US": "Shows that hook you from the first episode", "en-GB": "Shows that hook you from the first episode"}',
  'tv',
  true,
  true
);

-- List 5: Feel Good Movies
INSERT INTO public.discover_lists (slug, title, description, type, is_public, is_indexable)
VALUES (
  'feel-good-movies',
  '{"es-ES": "Películas que te hacen sentir bien", "ca-ES": "Pel·lícules que et fan sentir bé", "eu-ES": "Ongi sentiarazten zaituzten filmak", "gl-ES": "Películas que che fan sentir ben", "en-US": "Feel good movies", "en-GB": "Feel good films"}',
  '{"es-ES": "Películas que mejoran tu estado de ánimo", "ca-ES": "Pel·lícules que milloren el teu estat d''ànim", "eu-ES": "Zure animo egoera hobetzen duten filmak", "gl-ES": "Películas que melloran o teu estado de ánimo", "en-US": "Movies that improve your mood", "en-GB": "Films that improve your mood"}',
  'movie',
  true,
  true
);

-- List 6: Binge-Worthy TV Shows
INSERT INTO public.discover_lists (slug, title, description, type, is_public, is_indexable)
VALUES (
  'binge-worthy-tv-shows',
  '{"es-ES": "Series para maratón", "ca-ES": "Sèries per marató", "eu-ES": "Maratoirako telesailak", "gl-ES": "Series para maratón", "en-US": "Binge-worthy TV shows", "en-GB": "Binge-worthy TV shows"}',
  '{"es-ES": "Series perfectas para ver de un tirón", "ca-ES": "Sèries perfectes per veure d''un tret", "eu-ES": "Tirorik ikusteko telesail perfektuak", "gl-ES": "Series perfectas para ver dun tirón", "en-US": "Perfect shows to watch in one sitting", "en-GB": "Perfect shows to watch in one sitting"}',
  'tv',
  true,
  true
);

-- List 7: Twist Movies
INSERT INTO public.discover_lists (slug, title, description, type, is_public, is_indexable)
VALUES (
  'twist-movies',
  '{"es-ES": "Películas con giro inesperado", "ca-ES": "Pel·lícules amb gir inesperat", "eu-ES": "Bira ustekabeko filmak", "gl-ES": "Películas con xiro inesperado", "en-US": "Twist movies", "en-GB": "Twist films"}',
  '{"es-ES": "Películas con finales que no verás venir", "ca-ES": "Pel·lícules amb finals que no veuràs venir", "eu-ES": "Etortzen ez diren amaierak dituzten filmak", "gl-ES": "Películas con finais que non verás chegar", "en-US": "Movies with endings you won''t see coming", "en-GB": "Films with endings you won''t see coming"}',
  'movie',
  true,
  true
);

-- List 8: Hook from Episode One Series
INSERT INTO public.discover_lists (slug, title, description, type, is_public, is_indexable)
VALUES (
  'hook-from-episode-one-series',
  '{"es-ES": "Series que enganchan desde el primer episodio", "ca-ES": "Sèries que enganxen des del primer episodi", "eu-ES": "Lehenengo ataletik erakartzen dituzten telesailak", "gl-ES": "Series que enganchan desde o primeiro episodio", "en-US": "Hook from episode one series", "en-GB": "Hook from episode one series"}',
  '{"es-ES": "Series que te atrapan desde el primer minuto", "ca-ES": "Sèries que et atrapen des del primer minut", "eu-ES": "Lehenengo minututik harrapatzen zaituzten telesailak", "gl-ES": "Series que che atrapan desde o primeiro minuto", "en-US": "Shows that grab you from the first minute", "en-GB": "Shows that grab you from the first minute"}',
  'tv',
  true,
  true
);

-- List 9: Turn Your Brain Off Movies
INSERT INTO public.discover_lists (slug, title, description, type, is_public, is_indexable)
VALUES (
  'turn-your-brain-off-movies',
  '{"es-ES": "Películas para desconectar", "ca-ES": "Pel·lícules per desconnectar", "eu-ES": "Deskonektatzeko filmak", "gl-ES": "Películas para desconectar", "en-US": "Turn your brain off movies", "en-GB": "Turn your brain off films"}',
  '{"es-ES": "Películas para relajarse y no pensar", "ca-ES": "Pel·lícules per relaxar-se i no pensar", "eu-ES": "Lasaitzeko eta ez pentsatzeko filmak", "gl-ES": "Películas para relaxarse e non pensar", "en-US": "Movies to relax and not think", "en-GB": "Films to relax and not think"}',
  'movie',
  true,
  true
);

-- List 10: Short TV Series
INSERT INTO public.discover_lists (slug, title, description, type, is_public, is_indexable)
VALUES (
  'short-tv-series',
  '{"es-ES": "Series cortas", "ca-ES": "Sèries curtes", "eu-ES": "Telesail laburrak", "gl-ES": "Series curtas", "en-US": "Short TV series", "en-GB": "Short TV series"}',
  '{"es-ES": "Series cortas perfectas para ver en pocos días", "ca-ES": "Sèries curtes perfectes per veure en pocs dies", "eu-ES": "Egun gutxitan ikusteko telesail labur perfektuak", "gl-ES": "Series curtas perfectas para ver en poucos días", "en-US": "Short series perfect for watching in a few days", "en-GB": "Short series perfect for watching in a few days"}',
  'tv',
  true,
  true
);

-- Note: discover_list_items should be populated separately with actual TMDB IDs
-- This script only creates the list structure
-- Items should be added via admin interface or separate script


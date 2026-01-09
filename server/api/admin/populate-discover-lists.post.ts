/**
 * POST /api/admin/populate-discover-lists
 * Temporary endpoint to populate discover lists with titles
 * 
 * Logic:
 * - For each title, search if it exists in Supabase titles table
 * - If it exists, insert into the corresponding discover list
 * - If it doesn't exist, search in TMDB, save to titles, then insert into list
 */

import { createError, defineEventHandler } from 'h3';
import { createClient } from '@supabase/supabase-js';
import { getTMDBConfig } from '@/server/utils/config';
import { TABLES } from '@/constants/db/tables';
import {
  DISCOVER_LISTS_COLUMNS,
  DISCOVER_LIST_ITEMS_COLUMNS,
  TITLES_COLUMNS,
} from '@/constants/db/columns';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGE_CODES } from '@/constants/languages';
import type { TMDBSearchResult } from '@/types/tmdb/Search';
import type { MultiLanguageText } from '@/services/titles';

// Map list names to slugs
const LIST_SLUGS: Record<string, string> = {
  'Intense Movies': 'intense-movies',
  'Short Movies for Today': 'short-movies-for-today',
  'Easy TV Shows': 'easy-tv-shows',
  'Easy to Start TV Shows': 'easy-to-start-tv-shows',
  'Feel Good Movies': 'feel-good-movies',
  'Binge-Worthy TV Shows': 'binge-worthy-tv-shows',
  'Twist Movies': 'twist-movies',
  'Hook from Episode One Series': 'hook-from-episode-one-series',
  'Turn Your Brain Off Movies': 'turn-your-brain-off-movies',
  'Short TV Series': 'short-tv-series',
};

// Discover lists data
// Each title includes a tag object with translations for all supported languages (es, ca, eu, gl, en, en-gb)
const DISCOVER_LISTS = [
  {
    name: 'Intense Movies',
    type: 'movie' as const,
    titles: [
      {
        name: 'The Dark Knight',
        tag: {
          es: 'acción intensa',
          ca: 'acció intensa',
          eu: 'ekintza intentsua',
          gl: 'acción intensa',
          en: 'intense action',
          'en-gb': 'intense action',
        },
      },
      {
        name: 'Inception',
        tag: {
          es: 'tensión constante',
          ca: 'tensió constant',
          eu: 'tentsio konstantea',
          gl: 'tensión constante',
          en: 'constant tension',
          'en-gb': 'constant tension',
        },
      },
      {
        name: 'Sicario',
        tag: {
          es: 'tensión constante',
          ca: 'tensió constant',
          eu: 'tentsio konstantea',
          gl: 'tensión constante',
          en: 'constant tension',
          'en-gb': 'constant tension',
        },
      },
      {
        name: 'Nightcrawler',
        tag: {
          es: 'intensidad psicológica',
          ca: 'intensitat psicològica',
          eu: 'intentsitatea psikologikoa',
          gl: 'intensidade psicolóxica',
          en: 'psychological intensity',
          'en-gb': 'psychological intensity',
        },
      },
      {
        name: 'No Country for Old Men',
        tag: {
          es: 'tensión implacable',
          ca: 'tensió implacable',
          eu: 'tentsio gupidagabea',
          gl: 'tensión implacable',
          en: 'relentless tension',
          'en-gb': 'relentless tension',
        },
      },
      {
        name: 'The Departed',
        tag: {
          es: 'suspense constante',
          ca: 'suspens constant',
          eu: 'suspentsioa konstantea',
          gl: 'suspense constante',
          en: 'constant suspense',
          'en-gb': 'constant suspense',
        },
      },
      {
        name: 'Heat',
        tag: {
          es: 'acción intensa',
          ca: 'acció intensa',
          eu: 'ekintza intentsua',
          gl: 'acción intensa',
          en: 'intense action',
          'en-gb': 'intense action',
        },
      },
      {
        name: 'Se7en',
        tag: {
          es: 'tensión oscura',
          ca: 'tensió fosca',
          eu: 'tentsio iluna',
          gl: 'tensión escura',
          en: 'dark tension',
          'en-gb': 'dark tension',
        },
      },
      {
        name: 'Zodiac',
        tag: {
          es: 'suspense meticuloso',
          ca: 'suspens meticulós',
          eu: 'suspentsioa metikuloa',
          gl: 'suspense meticuloso',
          en: 'meticulous suspense',
          'en-gb': 'meticulous suspense',
        },
      },
      {
        name: 'Drive',
        tag: {
          es: 'tensión y estilo',
          ca: 'tensió i estil',
          eu: 'tentsioa eta estiloa',
          gl: 'tensión e estilo',
          en: 'tension and style',
          'en-gb': 'tension and style',
        },
      },
    ],
  },
  {
    name: 'Short Movies for Today',
    type: 'movie' as const,
    titles: [
      { name: 'Following', tag: { es: '69 min', ca: '69 min', eu: '69 min', gl: '69 min', en: '69 min', 'en-gb': '69 min' } },
      { name: 'Dark City', tag: { es: '100 min', ca: '100 min', eu: '100 min', gl: '100 min', en: '100 min', 'en-gb': '100 min' } },
      { name: 'The Crow', tag: { es: '102 min', ca: '102 min', eu: '102 min', gl: '102 min', en: '102 min', 'en-gb': '102 min' } },
      { name: 'Before Sunset', tag: { es: '80 min', ca: '80 min', eu: '80 min', gl: '80 min', en: '80 min', 'en-gb': '80 min' } },
      { name: 'Run Lola Run', tag: { es: '81 min', ca: '81 min', eu: '81 min', gl: '81 min', en: '81 min', 'en-gb': '81 min' } },
      { name: 'The Father', tag: { es: '97 min', ca: '97 min', eu: '97 min', gl: '97 min', en: '97 min', 'en-gb': '97 min' } },
      { name: 'The Favourite', tag: { es: '119 min', ca: '119 min', eu: '119 min', gl: '119 min', en: '119 min', 'en-gb': '119 min' } },
      { name: 'The Guilty', tag: { es: '85 min', ca: '85 min', eu: '85 min', gl: '85 min', en: '85 min', 'en-gb': '85 min' } },
      { name: 'Promising Young Woman', tag: { es: '113 min', ca: '113 min', eu: '113 min', gl: '113 min', en: '113 min', 'en-gb': '113 min' } },
      { name: 'Another Round', tag: { es: '117 min', ca: '117 min', eu: '117 min', gl: '117 min', en: '117 min', 'en-gb': '117 min' } },
    ],
  },
  {
    name: 'Easy TV Shows',
    type: 'tv' as const,
    titles: [
      { name: 'The Office', tag: { es: 'comedia ligera', ca: 'comèdia lleugera', eu: 'komedia arina', gl: 'comedia lixeira', en: 'light comedy', 'en-gb': 'light comedy' } },
      { name: 'Friends', tag: { es: 'comedia clásica', ca: 'comèdia clàssica', eu: 'komedia klasikoa', gl: 'comedia clásica', en: 'classic comedy', 'en-gb': 'classic comedy' } },
      { name: 'Parks and Recreation', tag: { es: 'comedia optimista', ca: 'comèdia optimista', eu: 'komedia optimista', gl: 'comedia optimista', en: 'optimistic comedy', 'en-gb': 'optimistic comedy' } },
      { name: 'Brooklyn Nine-Nine', tag: { es: 'comedia policial', ca: 'comèdia policial', eu: 'komedia poliziala', gl: 'comedia policial', en: 'police comedy', 'en-gb': 'police comedy' } },
      { name: 'The Big Bang Theory', tag: { es: 'comedia geek', ca: 'comèdia geek', eu: 'komedia geek', gl: 'comedia geek', en: 'geek comedy', 'en-gb': 'geek comedy' } },
      { name: 'Modern Family', tag: { es: 'comedia familiar', ca: 'comèdia familiar', eu: 'komedia familiarra', gl: 'comedia familiar', en: 'family comedy', 'en-gb': 'family comedy' } },
      { name: 'How I Met Your Mother', tag: { es: 'comedia romántica', ca: 'comèdia romàntica', eu: 'komedia erromantikoa', gl: 'comedia romántica', en: 'romantic comedy', 'en-gb': 'romantic comedy' } },
      { name: 'The Good Place', tag: { es: 'comedia inteligente', ca: 'comèdia intel·ligent', eu: 'komedia adimentsua', gl: 'comedia intelixente', en: 'smart comedy', 'en-gb': 'smart comedy' } },
      { name: "Schitt's Creek", tag: { es: 'comedia cálida', ca: 'comèdia càlida', eu: 'komedia beroa', gl: 'comedia cálida', en: 'warm comedy', 'en-gb': 'warm comedy' } },
      { name: 'New Girl', tag: { es: 'comedia de situación', ca: 'comèdia de situació', eu: 'komedia situazionala', gl: 'comedia de situación', en: 'situation comedy', 'en-gb': 'situation comedy' } },
    ],
  },
  {
    name: 'Easy to Start TV Shows',
    type: 'tv' as const,
    titles: [
      { name: 'Breaking Bad', tag: { es: 'engancha rápido', ca: 'enganxa ràpid', eu: 'azkar harrapatzen du', gl: 'engancha rápido', en: 'hooks quickly', 'en-gb': 'hooks quickly' } },
      { name: 'Game of Thrones', tag: { es: 'primer episodio impactante', ca: 'primer episodi impactant', eu: 'lehen atala hunkigarria', gl: 'primeiro episodio impactante', en: 'impactful first episode', 'en-gb': 'impactful first episode' } },
      { name: 'Stranger Things', tag: { es: 'primer episodio adictivo', ca: 'primer episodi addictiu', eu: 'lehen atala adikzioa', gl: 'primeiro episodio adictivo', en: 'addictive first episode', 'en-gb': 'addictive first episode' } },
      { name: 'The Last of Us', tag: { es: 'primer episodio emocional', ca: 'primer episodi emocional', eu: 'lehen atala emozionala', gl: 'primeiro episodio emocional', en: 'emotional first episode', 'en-gb': 'emotional first episode' } },
      { name: 'True Detective', tag: { es: 'primer episodio atmosférico', ca: 'primer episodi atmosfèric', eu: 'lehen atala atmosferikoa', gl: 'primeiro episodio atmosférico', en: 'atmospheric first episode', 'en-gb': 'atmospheric first episode' } },
      { name: 'The Haunting of Hill House', tag: { es: 'primer episodio inquietante', ca: 'primer episodi inquietant', eu: 'lehen atala kezkagarria', gl: 'primeiro episodio inquietante', en: 'unsettling first episode', 'en-gb': 'unsettling first episode' } },
      { name: 'Prison Break', tag: { es: 'primer episodio intenso', ca: 'primer episodi intens', eu: 'lehen atala intentsua', gl: 'primeiro episodio intenso', en: 'intense first episode', 'en-gb': 'intense first episode' } },
      { name: 'Sherlock', tag: { es: 'primer episodio brillante', ca: 'primer episodi brillant', eu: 'lehen atala distiratsua', gl: 'primeiro episodio brillante', en: 'brilliant first episode', 'en-gb': 'brilliant first episode' } },
      { name: '24', tag: { es: 'formato en tiempo real', ca: 'format en temps real', eu: 'denbora errealean formatua', gl: 'formato en tempo real', en: 'real-time format', 'en-gb': 'real-time format' } },
      { name: 'Orphan Black', tag: { es: 'primer episodio sorprendente', ca: 'primer episodi sorprenent', eu: 'lehen atala harrigarria', gl: 'primeiro episodio sorprendente', en: 'surprising first episode', 'en-gb': 'surprising first episode' } },
    ],
  },
  {
    name: 'Feel Good Movies',
    type: 'movie' as const,
    titles: [
      { name: 'Forrest Gump', tag: { es: 'inspiradora', ca: 'inspiradora', eu: 'inspiratzailea', gl: 'inspiradora', en: 'inspiring', 'en-gb': 'inspiring' } },
      { name: 'The Pursuit of Happyness', tag: { es: 'motivadora', ca: 'motivadora', eu: 'motibatzailea', gl: 'motivadora', en: 'motivational', 'en-gb': 'motivational' } },
      { name: 'Up', tag: { es: 'emocional', ca: 'emocional', eu: 'emozionala', gl: 'emocional', en: 'emotional', 'en-gb': 'emotional' } },
      { name: 'Inside Out', tag: { es: 'conmovedora', ca: 'commovedora', eu: 'hunkigarria', gl: 'conmovedora', en: 'touching', 'en-gb': 'touching' } },
      { name: 'Little Miss Sunshine', tag: { es: 'cálida', ca: 'càlida', eu: 'beroa', gl: 'cálida', en: 'warm', 'en-gb': 'warm' } },
      { name: "The King's Speech", tag: { es: 'inspiradora', ca: 'inspiradora', eu: 'inspiratzailea', gl: 'inspiradora', en: 'inspiring', 'en-gb': 'inspiring' } },
      { name: 'Slumdog Millionaire', tag: { es: 'esperanzadora', ca: 'esperançadora', eu: 'itxaropentsua', gl: 'esperanzadora', en: 'hopeful', 'en-gb': 'hopeful' } },
      { name: 'Amélie', tag: { es: 'encantadora', ca: 'encantadora', eu: 'xarmangarria', gl: 'encantadora', en: 'charming', 'en-gb': 'charming' } },
      { name: 'The Intouchables', tag: { es: 'cálida', ca: 'càlida', eu: 'beroa', gl: 'cálida', en: 'warm', 'en-gb': 'warm' } },
      { name: 'CODA', tag: { es: 'conmovedora', ca: 'commovedora', eu: 'hunkigarria', gl: 'conmovedora', en: 'touching', 'en-gb': 'touching' } },
    ],
  },
  {
    name: 'Binge-Worthy TV Shows',
    type: 'tv' as const,
    titles: [
      { name: 'The Wire', tag: { es: 'adictiva', ca: 'addictiva', eu: 'adikzioa', gl: 'adictiva', en: 'addictive', 'en-gb': 'addictive' } },
      { name: 'The Crown', tag: { es: 'narrativa absorbente', ca: 'narrativa absorbent', eu: 'narratiba xurgatzailea', gl: 'narrativa absorbente', en: 'absorbing narrative', 'en-gb': 'absorbing narrative' } },
      { name: 'Better Call Saul', tag: { es: 'adictiva', ca: 'addictiva', eu: 'adikzioa', gl: 'adictiva', en: 'addictive', 'en-gb': 'addictive' } },
      { name: 'Succession', tag: { es: 'adictiva', ca: 'addictiva', eu: 'adikzioa', gl: 'adictiva', en: 'addictive', 'en-gb': 'addictive' } },
      { name: 'Dark', tag: { es: 'adictiva', ca: 'addictiva', eu: 'adikzioa', gl: 'adictiva', en: 'addictive', 'en-gb': 'addictive' } },
      { name: 'Money Heist', tag: { es: 'ritmo rápido', ca: 'ritme ràpid', eu: 'erritmo azkarra', gl: 'ritmo rápido', en: 'fast pace', 'en-gb': 'fast pace' } },
      { name: 'House of Cards', tag: { es: 'adictiva', ca: 'addictiva', eu: 'adikzioa', gl: 'adictiva', en: 'addictive', 'en-gb': 'addictive' } },
      { name: "The Handmaid's Tale", tag: { es: 'adictiva', ca: 'addictiva', eu: 'adikzioa', gl: 'adictiva', en: 'addictive', 'en-gb': 'addictive' } },
      { name: 'Fargo', tag: { es: 'adictiva', ca: 'addictiva', eu: 'adikzioa', gl: 'adictiva', en: 'addictive', 'en-gb': 'addictive' } },
      { name: 'Yellowjackets', tag: { es: 'adictiva', ca: 'addictiva', eu: 'adikzioa', gl: 'adictiva', en: 'addictive', 'en-gb': 'addictive' } },
    ],
  },
  {
    name: 'Twist Movies',
    type: 'movie' as const,
    titles: [
      { name: 'The Usual Suspects', tag: { es: 'giro icónico', ca: 'gir icònic', eu: 'bira ikonikoa', gl: 'xiro icónico', en: 'iconic twist', 'en-gb': 'iconic twist' } },
      { name: 'The Sixth Sense', tag: { es: 'giro sorprendente', ca: 'gir sorprenent', eu: 'bira harrigarria', gl: 'xiro sorprendente', en: 'surprising twist', 'en-gb': 'surprising twist' } },
      { name: 'Fight Club', tag: { es: 'giro memorable', ca: 'gir memorable', eu: 'bira gogoangarria', gl: 'xiro memorable', en: 'memorable twist', 'en-gb': 'memorable twist' } },
      { name: 'The Prestige', tag: { es: 'giro múltiple', ca: 'gir múltiple', eu: 'bira anitzak', gl: 'xiro múltiple', en: 'multiple twists', 'en-gb': 'multiple twists' } },
      { name: 'Shutter Island', tag: { es: 'giro psicológico', ca: 'gir psicològic', eu: 'bira psikologikoa', gl: 'xiro psicolóxico', en: 'psychological twist', 'en-gb': 'psychological twist' } },
      { name: 'Gone Girl', tag: { es: 'giro impactante', ca: 'gir impactant', eu: 'bira hunkigarria', gl: 'xiro impactante', en: 'shocking twist', 'en-gb': 'shocking twist' } },
      { name: 'Oldboy', tag: { es: 'giro brutal', ca: 'gir brutal', eu: 'bira basatia', gl: 'xiro brutal', en: 'brutal twist', 'en-gb': 'brutal twist' } },
      { name: 'Memento', tag: { es: 'giro estructural', ca: 'gir estructural', eu: 'bira estrukturala', gl: 'xiro estrutural', en: 'structural twist', 'en-gb': 'structural twist' } },
      { name: 'The Others', tag: { es: 'giro clásico', ca: 'gir clàssic', eu: 'bira klasikoa', gl: 'xiro clásico', en: 'classic twist', 'en-gb': 'classic twist' } },
      { name: 'Arrival', tag: { es: 'giro conceptual', ca: 'gir conceptual', eu: 'bira kontzeptuala', gl: 'xiro conceptual', en: 'conceptual twist', 'en-gb': 'conceptual twist' } },
    ],
  },
  {
    name: 'Hook from Episode One Series',
    type: 'tv' as const,
    titles: [
      { name: 'Lost', tag: { es: 'primer episodio icónico', ca: 'primer episodi icònic', eu: 'lehen atala ikonikoa', gl: 'primeiro episodio icónico', en: 'iconic first episode', 'en-gb': 'iconic first episode' } },
      { name: 'The Boys', tag: { es: 'primer episodio impactante', ca: 'primer episodi impactant', eu: 'lehen atala hunkigarria', gl: 'primeiro episodio impactante', en: 'impactful first episode', 'en-gb': 'impactful first episode' } },
      { name: 'Westworld', tag: { es: 'primer episodio fascinante', ca: 'primer episodi fascinant', eu: 'lehen atala liluragarria', gl: 'primeiro episodio fascinante', en: 'fascinating first episode', 'en-gb': 'fascinating first episode' } },
      { name: 'The Walking Dead', tag: { es: 'primer episodio impactante', ca: 'primer episodi impactant', eu: 'lehen atala hunkigarria', gl: 'primeiro episodio impactante', en: 'impactful first episode', 'en-gb': 'impactful first episode' } },
      { name: 'Killing Eve', tag: { es: 'primer episodio intrigante', ca: 'primer episodi intrigant', eu: 'lehen atala intrigagarria', gl: 'primeiro episodio intrigante', en: 'intriguing first episode', 'en-gb': 'intriguing first episode' } },
      { name: 'The Leftovers', tag: { es: 'primer episodio misterioso', ca: 'primer episodi misteriós', eu: 'lehen atala misteriotsua', gl: 'primeiro episodio misterioso', en: 'mysterious first episode', 'en-gb': 'mysterious first episode' } },
      { name: 'Black Mirror', tag: { es: 'primer episodio impactante', ca: 'primer episodi impactant', eu: 'lehen atala hunkigarria', gl: 'primeiro episodio impactante', en: 'impactful first episode', 'en-gb': 'impactful first episode' } },
      { name: 'The Mandalorian', tag: { es: 'primer episodio épico', ca: 'primer episodi èpic', eu: 'lehen atala epikoa', gl: 'primeiro episodio épico', en: 'epic first episode', 'en-gb': 'epic first episode' } },
      { name: 'Squid Game', tag: { es: 'primer episodio impactante', ca: 'primer episodi impactant', eu: 'lehen atala hunkigarria', gl: 'primeiro episodio impactante', en: 'impactful first episode', 'en-gb': 'impactful first episode' } },
      { name: 'The White Lotus', tag: { es: 'primer episodio intrigante', ca: 'primer episodi intrigant', eu: 'lehen atala intrigagarria', gl: 'primeiro episodio intrigante', en: 'intriguing first episode', 'en-gb': 'intriguing first episode' } },
    ],
  },
  {
    name: 'Turn Your Brain Off Movies',
    type: 'movie' as const,
    titles: [
      { name: 'Mad Max: Fury Road', tag: { es: 'acción visual', ca: 'acció visual', eu: 'ekintza bisuala', gl: 'acción visual', en: 'visual action', 'en-gb': 'visual action' } },
      { name: 'Baby Driver', tag: { es: 'acción y música', ca: 'acció i música', eu: 'ekintza eta musika', gl: 'acción e música', en: 'action and music', 'en-gb': 'action and music' } },
      { name: 'Kingsman: The Secret Service', tag: { es: 'acción estilizada', ca: 'acció estilitzada', eu: 'ekintza estilizatua', gl: 'acción estilizada', en: 'stylized action', 'en-gb': 'stylized action' } },
      { name: 'Deadpool', tag: { es: 'acción y humor', ca: 'acció i humor', eu: 'ekintza eta umorea', gl: 'acción e humor', en: 'action and humor', 'en-gb': 'action and humour' } },
      { name: 'Kick-Ass', tag: { es: 'acción irreverente', ca: 'acció irreverent', eu: 'ekintza errespetugabea', gl: 'acción irreverente', en: 'irreverent action', 'en-gb': 'irreverent action' } },
      { name: 'The Raid', tag: { es: 'acción sin respiro', ca: 'acció sense respir', eu: 'ekintza arnasarik gabe', gl: 'acción sen respiro', en: 'non-stop action', 'en-gb': 'non-stop action' } },
      { name: 'Skyfall', tag: { es: 'acción clásica', ca: 'acció clàssica', eu: 'ekintza klasikoa', gl: 'acción clásica', en: 'classic action', 'en-gb': 'classic action' } },
      { name: 'The Dark Knight Rises', tag: { es: 'acción épica', ca: 'acció èpica', eu: 'ekintza epikoa', gl: 'acción épica', en: 'epic action', 'en-gb': 'epic action' } },
      { name: 'Spider-Man: Into the Spider-Verse', tag: { es: 'acción animada', ca: 'acció animada', eu: 'ekintza animatua', gl: 'acción animada', en: 'animated action', 'en-gb': 'animated action' } },
      { name: 'The Raid 2', tag: { es: 'acción brutal', ca: 'acció brutal', eu: 'ekintza basatia', gl: 'acción brutal', en: 'brutal action', 'en-gb': 'brutal action' } },
    ],
  },
  {
    name: 'Short TV Series',
    type: 'tv' as const,
    titles: [
      { name: 'Chernobyl', tag: { es: '5 episodios', ca: '5 episodis', eu: '5 atal', gl: '5 episodios', en: '5 episodes', 'en-gb': '5 episodes' } },
      { name: "The Queen's Gambit", tag: { es: '7 episodios', ca: '7 episodis', eu: '7 atal', gl: '7 episodios', en: '7 episodes', 'en-gb': '7 episodes' } },
      { name: 'Band of Brothers', tag: { es: '10 episodios', ca: '10 episodis', eu: '10 atal', gl: '10 episodios', en: '10 episodes', 'en-gb': '10 episodes' } },
      { name: 'Sharp Objects', tag: { es: '8 episodios', ca: '8 episodis', eu: '8 atal', gl: '8 episodios', en: '8 episodes', 'en-gb': '8 episodes' } },
      { name: 'Unbelievable', tag: { es: '8 episodios', ca: '8 episodis', eu: '8 atal', gl: '8 episodios', en: '8 episodes', 'en-gb': '8 episodes' } },
      { name: 'The Night Of', tag: { es: '8 episodios', ca: '8 episodis', eu: '8 atal', gl: '8 episodios', en: '8 episodes', 'en-gb': '8 episodes' } },
      { name: 'Mare of Easttown', tag: { es: '7 episodios', ca: '7 episodis', eu: '7 atal', gl: '7 episodios', en: '7 episodes', 'en-gb': '7 episodes' } },
      { name: 'When They See Us', tag: { es: '4 episodios', ca: '4 episodis', eu: '4 atal', gl: '4 episodios', en: '4 episodes', 'en-gb': '4 episodes' } },
      { name: 'Bodyguard', tag: { es: '6 episodios', ca: '6 episodis', eu: '6 atal', gl: '6 episodios', en: '6 episodes', 'en-gb': '6 episodes' } },
      { name: 'The Pacific', tag: { es: '10 episodios', ca: '10 episodis', eu: '10 atal', gl: '10 episodios', en: '10 episodes', 'en-gb': '10 episodes' } },
    ],
  },
];

/**
 * Search for a title in TMDB by name
 */
async function searchTitleInTMDB(
  titleName: string,
  expectedType: 'movie' | 'tv'
): Promise<{ tmdbId: number; type: 'movie' | 'tv' } | null> {
  const tmdbConfig = getTMDBConfig(DEFAULT_LANGUAGE, 'ES');

  try {
    const response = await $fetch<{
      results?: TMDBSearchResult[];
    }>(`${tmdbConfig.baseUrl}/search/multi`, {
      query: {
        api_key: tmdbConfig.apiKey,
        language: tmdbConfig.language,
        region: tmdbConfig.region,
        query: titleName,
      },
    });

    if (!response.results || response.results.length === 0) {
      console.warn(`[PopulateDiscover] No results found for: ${titleName}`);
      return null;
    }

    // Filter by expected type and find best match
    const filteredResults = response.results.filter(
      (result) => result.media_type === expectedType
    );

    if (filteredResults.length === 0) {
      console.warn(
        `[PopulateDiscover] No ${expectedType} results found for: ${titleName}`
      );
      return null;
    }

    // Get the first result (usually the most relevant)
    const bestMatch = filteredResults[0];
    return {
      tmdbId: bestMatch.id,
      type: bestMatch.media_type as 'movie' | 'tv',
    };
  } catch (error) {
    console.error(
      `[PopulateDiscover] Error searching TMDB for ${titleName}:`,
      error
    );
    return null;
  }
}

/**
 * Ensure title exists in database, fetching from TMDB if needed
 */
async function ensureTitleInDatabase(
  tmdbId: number,
  type: 'movie' | 'tv',
  supabase: ReturnType<typeof createClient>
): Promise<boolean> {
  // Check if title exists
  const { data: existingTitle, error: checkError } = await supabase
    .from(TABLES.TITLES)
    .select('tmdb_id')
    .eq(TITLES_COLUMNS.TMDB_ID, tmdbId)
    .eq(TITLES_COLUMNS.TYPE, type)
    .maybeSingle();

  if (checkError) {
    console.error(
      `[PopulateDiscover] Error checking title ${tmdbId}:`,
      checkError
    );
    return false;
  }

  // If title exists, we're done
  if (existingTitle) {
    return true;
  }

  // Title doesn't exist, fetch from TMDB and insert
  const tmdbConfig = getTMDBConfig(DEFAULT_LANGUAGE, 'ES');
  const supportedLanguages = SUPPORTED_LANGUAGE_CODES.map((code) => code);
  const endpoint = type === MEDIA_TYPE.MOVIE ? 'movie' : 'tv';

  try {
    // Fetch movie/TV data for all supported languages
    const languagePromises = supportedLanguages.map(async (lang) => {
      try {
        const response = await $fetch<{
          title?: string;
          name?: string;
          overview?: string;
          poster_path?: string | null;
          backdrop_path?: string | null;
          release_date?: string;
          first_air_date?: string;
          vote_average?: number;
          status?: string;
          genres?: Array<{ id: number; name: string }>;
        }>(`${tmdbConfig.baseUrl}/${endpoint}/${tmdbId}`, {
          query: {
            api_key: tmdbConfig.apiKey,
            language: lang,
            region: tmdbConfig.region,
          },
        });
        return { lang, data: response };
      } catch {
        return { lang, data: null };
      }
    });

    const languageResults = await Promise.all(languagePromises);

    // Build multi-language JSONB objects
    const titleMultiLang: MultiLanguageText = {};
    const overviewMultiLang: MultiLanguageText = {};
    const posterPathMultiLang: MultiLanguageText = {};
    let backdropPath: string | null = null;
    let releaseDate: string | null = null;
    let firstAirDate: string | null = null;
    let voteAverage: number | null = null;
    let status: string | null = null;
    let genres: Array<{ id: number; name: string }> = [];

    languageResults.forEach(({ lang, data }) => {
      if (data) {
        const titleText = data.title || data.name || '';
        if (titleText) titleMultiLang[lang] = titleText;
        if (data.overview) overviewMultiLang[lang] = data.overview;
        if (data.poster_path) posterPathMultiLang[lang] = data.poster_path;
        // Use first successful response for non-language fields
        if (!backdropPath && data.backdrop_path)
          backdropPath = data.backdrop_path;
        if (type === MEDIA_TYPE.MOVIE) {
          if (!releaseDate && data.release_date) releaseDate = data.release_date;
        } else {
          if (!firstAirDate && data.first_air_date)
            firstAirDate = data.first_air_date;
        }
        if (!voteAverage && data.vote_average) voteAverage = data.vote_average;
        if (!status && data.status) status = data.status;
        if (genres.length === 0 && data.genres) genres = data.genres;
      }
    });

    // Save to database if we got at least one language
    if (Object.keys(titleMultiLang).length > 0) {
      const insertData: Record<string, unknown> = {
        tmdb_id: tmdbId,
        type: type,
        title: titleMultiLang,
        overview: overviewMultiLang,
        poster_path:
          Object.keys(posterPathMultiLang).length > 0
            ? posterPathMultiLang
            : null,
        backdrop_path: backdropPath,
        vote_average: voteAverage,
        status: status,
        genres: genres,
      };

      if (type === MEDIA_TYPE.MOVIE) {
        insertData.release_date = releaseDate;
      } else {
        insertData.first_air_date = firstAirDate;
      }

      const { error: insertError } = await supabase
        .from(TABLES.TITLES)
        .upsert(insertData as never, {
          onConflict: 'tmdb_id',
        });

      if (insertError) {
        console.error(
          `[PopulateDiscover] Error inserting title ${tmdbId}:`,
          insertError
        );
        return false;
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error(
      `[PopulateDiscover] Error fetching title ${tmdbId} from TMDB:`,
      error
    );
    return false;
  }
}

/**
 * Insert title into discover list
 */
async function insertTitleIntoList(
  discoverListId: string,
  tmdbId: number,
  type: 'movie' | 'tv',
  position: number,
  tag: Record<string, string> | null | undefined,
  supabase: ReturnType<typeof createClient>
): Promise<boolean> {
  // Check if item already exists
  const { data: existingItem, error: checkError } = await supabase
    .from(TABLES.DISCOVER_LIST_ITEMS)
    .select('id')
    .eq(DISCOVER_LIST_ITEMS_COLUMNS.DISCOVER_LIST_ID, discoverListId)
    .eq(DISCOVER_LIST_ITEMS_COLUMNS.TMDB_ID, tmdbId)
    .maybeSingle();

  if (checkError) {
    console.error(
      `[PopulateDiscover] Error checking list item ${tmdbId}:`,
      checkError
    );
    return false;
  }

  // Prepare update/insert data
  const itemData: Record<string, unknown> = {
    [DISCOVER_LIST_ITEMS_COLUMNS.POSITION]: position,
  };

  if (tag !== null && tag !== undefined) {
    itemData[DISCOVER_LIST_ITEMS_COLUMNS.TAG] = tag;
  }

  // If item already exists, update position and tag
  if (existingItem) {
    const { error: updateError } = await supabase
      .from(TABLES.DISCOVER_LIST_ITEMS)
      .update(itemData as never)
      .eq('id', (existingItem as { id: string }).id);

    if (updateError) {
      console.error(
        `[PopulateDiscover] Error updating list item ${tmdbId}:`,
        updateError
      );
      return false;
    }
    return true;
  }

  // Insert new item
  const insertData: Record<string, unknown> = {
    [DISCOVER_LIST_ITEMS_COLUMNS.DISCOVER_LIST_ID]: discoverListId,
    [DISCOVER_LIST_ITEMS_COLUMNS.TMDB_ID]: tmdbId,
    [DISCOVER_LIST_ITEMS_COLUMNS.TYPE]: type,
    [DISCOVER_LIST_ITEMS_COLUMNS.POSITION]: position,
  };

  if (tag !== null && tag !== undefined) {
    insertData[DISCOVER_LIST_ITEMS_COLUMNS.TAG] = tag;
  }

  const { error: insertError } = await supabase
    .from(TABLES.DISCOVER_LIST_ITEMS)
    .insert(insertData as never);

  if (insertError) {
    console.error(
      `[PopulateDiscover] Error inserting list item ${tmdbId}:`,
      insertError
    );
    return false;
  }

  return true;
}

export default defineEventHandler(async () => {
  try {
    const config = useRuntimeConfig();

    // Create Supabase client with service role key
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || config.public.supabaseAnonKey;
    const supabase = createClient(config.public.supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const results: {
      listName: string;
      slug: string;
      processed: number;
      inserted: number;
      errors: string[];
    }[] = [];

    // Process each list
    for (const listData of DISCOVER_LISTS) {
      const slug = LIST_SLUGS[listData.name];
      if (!slug) {
        console.warn(
          `[PopulateDiscover] No slug found for list: ${listData.name}`
        );
        continue;
      }

      // Get discover list ID
      const { data: discoverList, error: listError } = await supabase
        .from(TABLES.DISCOVER_LISTS)
        .select('id')
        .eq(DISCOVER_LISTS_COLUMNS.SLUG, slug)
        .maybeSingle();

      if (listError || !discoverList) {
        console.error(
          `[PopulateDiscover] Error fetching list ${slug}:`,
          listError
        );
        results.push({
          listName: listData.name,
          slug,
          processed: 0,
          inserted: 0,
          errors: [`Error fetching list: ${listError?.message || 'Not found'}`],
        });
        continue;
      }

      const listResult = {
        listName: listData.name,
        slug,
        processed: 0,
        inserted: 0,
        errors: [] as string[],
      };

      // Delete all existing items for this list before populating
      const { error: deleteError } = await supabase
        .from(TABLES.DISCOVER_LIST_ITEMS)
        .delete()
        .eq(DISCOVER_LIST_ITEMS_COLUMNS.DISCOVER_LIST_ID, discoverList.id);

      if (deleteError) {
        console.error(
          `[PopulateDiscover] Error deleting existing items for list ${slug}:`,
          deleteError
        );
        listResult.errors.push(
          `Error deleting existing items: ${deleteError.message}`
        );
        // Continue anyway - will try to insert/update
      }

      // Process each title in the list
      for (let position = 0; position < listData.titles.length; position++) {
        const titleEntry = listData.titles[position];
        // Support both string (legacy) and object (with tag) formats
        const titleName =
          typeof titleEntry === 'string' ? titleEntry : titleEntry.name;
        const titleTag =
          typeof titleEntry === 'string' ? null : titleEntry.tag || null;
        listResult.processed++;

        try {
          // Search in TMDB
          const searchResult = await searchTitleInTMDB(
            titleName,
            listData.type
          );

          if (!searchResult) {
            listResult.errors.push(
              `Title not found in TMDB: ${titleName}`
            );
            continue;
          }

          // Ensure title exists in database
          const titleExists = await ensureTitleInDatabase(
            searchResult.tmdbId,
            searchResult.type,
            supabase as ReturnType<typeof createClient>
          );

          if (!titleExists) {
            listResult.errors.push(
              `Failed to ensure title in database: ${titleName} (${searchResult.tmdbId})`
            );
            continue;
          }

          // Insert into discover list
          const inserted = await insertTitleIntoList(
            discoverList.id,
            searchResult.tmdbId,
            searchResult.type,
            position + 1, // Position is 1-indexed
            titleTag,
            supabase as ReturnType<typeof createClient>
          );

          if (inserted) {
            listResult.inserted++;
          } else {
            listResult.errors.push(
              `Failed to insert into list: ${titleName} (${searchResult.tmdbId})`
            );
          }
        } catch (error) {
          listResult.errors.push(
            `Error processing ${titleName}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      results.push(listResult);
    }

    return {
      success: true,
      results,
      summary: {
        totalLists: results.length,
        totalProcessed: results.reduce((sum, r) => sum + r.processed, 0),
        totalInserted: results.reduce((sum, r) => sum + r.inserted, 0),
        totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
      },
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error populating discover lists',
      data: error,
    });
  }
});


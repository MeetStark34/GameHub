import { defineFamily } from './types';

export const MUSIC = defineFamily('music', [
  ['string-instruments', 'String instruments', 'string instrument; strings; stringed instruments', 'Bass, Lute, Harp, Sitar, Viola, Banjo, Cello, Guitar'],
  ['brass-instruments', 'Brass instruments', 'brass instrument; brass', 'Horn, Bugle, Cornet, Tuba, Euphonium, Flugelhorn, Trombone, Trumpet'],
  ['woodwind', 'Woodwind instruments', 'woodwind; woodwinds; woodwind instrument', 'Recorder, Piccolo, Fife, Bassoon, Oboe, Clarinet, Saxophone, Flute'],
  ['percussion', 'Percussion instruments', 'percussion; drums; percussion instrument', 'Triangle, Tabla, Bongo, Gong, Cymbal, Xylophone, Tambourine, Drum'],
  ['tempo-markings', 'Tempo markings', 'tempo; tempos; tempo terms; musical tempos', 'Grave, Presto, Largo, Vivace, Adagio, Andante, Moderato, Allegro'],
  ['music-genres', 'Music genres', 'music genre; genres of music; musical genres', 'Soul, Rock, Metal, Folk, Reggae, Jazz, Blues, Pop'],
  ['voice-types', 'Singing voices', 'voice types; vocal ranges; singing voice', 'Alto, Bass, Tenor, Baritone, Treble, Contralto, Mezzo, Soprano'],
  ['music-notation', 'Music notation symbols', 'musical symbols; music symbols; notation', 'Rest, Tie, Sharp, Flat, Natural, Clef, Stave, Crotchet'],
]);

export const ARTS = defineFamily('arts', [
  ['shakespeare', 'Shakespeare plays', 'shakespeare; plays by shakespeare; shakespearean plays', 'Hamlet, Othello, Pericles, The Tempest, Cymbeline, Coriolanus, King Lear, Macbeth'],
  ['painters', 'Painters', 'painter; artists; artist; famous painters', 'Bacon, Constable, Turner, Hopper, Vermeer, Rembrandt, Monet, Picasso'],
  ['dances', 'Dances', 'dance; dance styles; types of dance', 'Salsa, Twist, Swing, Jive, Tango, Foxtrot, Waltz, Ballet'],
  ['greek-letters', 'Greek letters', 'greek alphabet; greek letter', 'Delta, Pi, Chi, Sigma, Lambda, Gamma, Omega, Alpha'],
  ['greek-gods', 'Greek gods', 'greek god; gods of olympus; greek deities; olympians', 'Nike, Hermes, Apollo, Ares, Hades, Athena, Poseidon, Zeus'],
  ['norse-gods', 'Norse gods', 'norse god; viking gods; norse deities', 'Frigg, Tyr, Freya, Heimdall, Baldur, Loki, Odin, Thor'],
  ['art-movements', 'Art movements', 'art movement; art styles; artistic movements', 'Pop, Dada, Fauvism, Cubism, Baroque, Surrealism, Renaissance, Impressionism'],
  ['ballet-terms', 'Ballet terms', 'ballet; ballet moves; ballet steps', 'Barre, Plié, Jeté, Arabesque, Pointe, Tutu, Pirouette, Ballerina'],
  ['theatre', 'Parts of a theatre', 'theatre; theater; parts of a theater; theatre parts', 'Wings, Pit, Gods, Stalls, Foyer, Curtain, Box office, Stage'],
  ['fairy-tales', 'Fairy-tale characters', 'fairy tale characters; fairytale characters; fairy tales', 'Wolf, Beast, Giant, Witch, Princess, Dwarf, Goldilocks, Cinderella'],
  ['poetry-forms', 'Poetic forms', 'poems; types of poem; poetry; poem forms', 'Ode, Elegy, Ballad, Villanelle, Couplet, Limerick, Haiku, Sonnet'],
  ['film-genres', 'Film genres', 'film genre; movie genres; genres of film', 'Noir, Western, Musical, Thriller, Horror, Comedy, Romance, Action'],
  ['camera-shots', 'Filming terms', 'film terms; movie terms; camera terms', 'Cut, Pan, Take, Zoom, Wrap, Close-up, Action, Director'],
]);

export const WORDS = defineFamily('words', [
  ['palindromes', 'Palindromes', 'palindrome; words spelled the same backwards', 'Rotor, Refer, Civic, Level, Kayak, Radar, Madam, Racecar'],
  ['before-ball', 'Words before "ball"', 'ball; ___ ball; things ending in ball; ball words', 'Eye, Meat, Fire, Snow, Base, Volley, Basket, Foot'],
  ['before-light', 'Words before "light"', 'light; ___ light; light words', 'High, Spot, Head, Moon, Flash, Candle, Traffic, Sun'],
  ['after-sun', 'Words after "sun"', 'sun; sun ___; sun words', 'Dial, Burn, Rise, Set, Screen, Shine, Glasses, Flower'],
  ['before-house', 'Words before "house"', 'house; ___ house; house words', 'Light, Ware, Opera, Green, Tree, Club, Farm, Dog'],
  ['before-fly', 'Words before "fly"', 'fly; ___ fly; flies; types of fly', 'Fire, Dragon, Butter, Horse, Green, Fruit, House, Black'],
  ['after-book', 'Words after "book"', 'book; book ___; book words', 'Worm, End, Mark, Keeper, Case, Shop, Shelf, Club'],
  ['before-man', 'Words before "man"', 'man; ___ man; man words', 'Snow, Post, Fire, Super, Bat, Sales, Police, Spider'],
  ['after-water', 'Words after "water"', 'water; water ___; water words', 'Shed, Mark, Front, Proof, Melon, Fall, Colour, Bottle'],
  ['before-board', 'Words before "board"', 'board; ___ board; board words', 'Key, Dash, Card, Skate, Surf, Black, Chess, Snow'],
  ['onomatopoeia', 'Sound words', 'onomatopoeia; sounds; sound effects', 'Thud, Clang, Fizz, Sizzle, Buzz, Bang, Boom, Crash'],
  ['silent-k', 'Words with a silent K', 'silent k; silent letter k', 'Knack, Knoll, Knead, Knuckle, Knit, Knee, Knight, Knife'],
  ['compound-rain', 'Words after "rain"', 'rain; rain ___; rain words', 'Check, Maker, Forest, Drop, Fall, Coat, Bow, Storm'],
]);

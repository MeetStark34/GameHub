/**
 * Original GameHub Pinpoint content. Each category lists 8 clue words ordered
 * from most ambiguous to most obvious; difficulty picks which window of
 * clues is shown. `family` groups related categories so harder difficulties
 * can use them as close distractors.
 *
 * Adding content: append a category with a unique `id` and exactly 8 clues.
 * Changing existing entries affects future puzzles only (stored puzzles are
 * immutable), but keep ids stable.
 */
export interface PinpointCategory {
  id: string;
  label: string;
  family: string;
  clues: [string, string, string, string, string, string, string, string];
}

export const PINPOINT_CATEGORIES: PinpointCategory[] = [
  // space
  { id: 'planets', label: 'Planets', family: 'space', clues: ['Mercury', 'Mars', 'Venus', 'Saturn', 'Neptune', 'Uranus', 'Jupiter', 'Earth'] },
  { id: 'constellations', label: 'Constellations', family: 'space', clues: ['Draco', 'Gemini', 'Perseus', 'Lyra', 'Cygnus', 'Cassiopeia', 'Andromeda', 'Orion'] },
  { id: 'moons', label: 'Moons in our solar system', family: 'space', clues: ['Titan', 'Europa', 'Triton', 'Charon', 'Callisto', 'Phobos', 'Ganymede', 'Io'] },
  // music
  { id: 'string-instruments', label: 'String instruments', family: 'music', clues: ['Bass', 'Lute', 'Harp', 'Sitar', 'Viola', 'Banjo', 'Cello', 'Guitar'] },
  { id: 'brass-instruments', label: 'Brass instruments', family: 'music', clues: ['Horn', 'Bugle', 'Cornet', 'Tuba', 'Euphonium', 'Flugelhorn', 'Trombone', 'Trumpet'] },
  { id: 'tempo-markings', label: 'Tempo markings', family: 'music', clues: ['Grave', 'Presto', 'Largo', 'Vivace', 'Adagio', 'Andante', 'Moderato', 'Allegro'] },
  // food
  { id: 'pasta', label: 'Pasta shapes', family: 'food', clues: ['Gemelli', 'Orzo', 'Radiatori', 'Farfalle', 'Fusilli', 'Penne', 'Lasagne', 'Spaghetti'] },
  { id: 'cheeses', label: 'Cheeses', family: 'food', clues: ['Jack', 'Swiss', 'Brie', 'Feta', 'Gouda', 'Cheddar', 'Parmesan', 'Mozzarella'] },
  { id: 'herbs', label: 'Herbs', family: 'food', clues: ['Sage', 'Thyme', 'Rosemary', 'Dill', 'Chive', 'Oregano', 'Basil', 'Parsley'] },
  { id: 'breads', label: 'Breads', family: 'food', clues: ['Roll', 'Rye', 'Naan', 'Pita', 'Brioche', 'Ciabatta', 'Focaccia', 'Baguette'] },
  { id: 'citrus', label: 'Citrus fruits', family: 'food', clues: ['Lime', 'Orange', 'Clementine', 'Yuzu', 'Kumquat', 'Tangerine', 'Grapefruit', 'Lemon'] },
  { id: 'spices', label: 'Spices', family: 'food', clues: ['Mace', 'Clove', 'Cumin', 'Nutmeg', 'Paprika', 'Turmeric', 'Saffron', 'Cinnamon'] },
  { id: 'nuts', label: 'Nuts', family: 'food', clues: ['Brazil', 'Pine', 'Cashew', 'Pecan', 'Macadamia', 'Hazelnut', 'Pistachio', 'Almond'] },
  // animals
  { id: 'big-cats', label: 'Big cats', family: 'animals', clues: ['Jaguar', 'Puma', 'Lynx', 'Cougar', 'Panther', 'Leopard', 'Cheetah', 'Tiger'] },
  { id: 'birds-of-prey', label: 'Birds of prey', family: 'animals', clues: ['Kite', 'Harrier', 'Falcon', 'Osprey', 'Condor', 'Buzzard', 'Hawk', 'Eagle'] },
  { id: 'dog-breeds', label: 'Dog breeds', family: 'animals', clues: ['Boxer', 'Pointer', 'Setter', 'Collie', 'Husky', 'Beagle', 'Poodle', 'Labrador'] },
  { id: 'sharks', label: 'Kinds of shark', family: 'animals', clues: ['Nurse', 'Tiger', 'Lemon', 'Bull', 'Mako', 'Thresher', 'Whale', 'Hammerhead'] },
  { id: 'baby-animals', label: 'Baby animals', family: 'animals', clues: ['Kid', 'Kit', 'Joey', 'Fawn', 'Cub', 'Foal', 'Calf', 'Kitten'] },
  { id: 'animal-groups', label: 'Names for groups of animals', family: 'animals', clues: ['Murder', 'Parliament', 'Pride', 'School', 'Pod', 'Pack', 'Flock', 'Herd'] },
  // games & sport
  { id: 'chess-terms', label: 'Chess terms', family: 'games', clues: ['Fork', 'Pin', 'Castle', 'Gambit', 'Pawn', 'Check', 'Stalemate', 'Checkmate'] },
  { id: 'card-games', label: 'Card games', family: 'games', clues: ['Bridge', 'Snap', 'Patience', 'Hearts', 'Rummy', 'Poker', 'Solitaire', 'Blackjack'] },
  { id: 'board-games', label: 'Board games', family: 'games', clues: ['Risk', 'Sorry', 'Go', 'Clue', 'Backgammon', 'Scrabble', 'Checkers', 'Monopoly'] },
  { id: 'poker-hands', label: 'Poker hands', family: 'games', clues: ['Pair', 'Flush', 'Straight', 'Full house', 'Two pair', 'Three of a kind', 'Four of a kind', 'Royal flush'] },
  { id: 'golf-terms', label: 'Golf terms', family: 'sport', clues: ['Albatross', 'Eagle', 'Iron', 'Bogey', 'Birdie', 'Fairway', 'Caddie', 'Putt'] },
  { id: 'tennis-terms', label: 'Tennis terms', family: 'sport', clues: ['Love', 'Let', 'Deuce', 'Lob', 'Ace', 'Volley', 'Baseline', 'Racket'] },
  { id: 'martial-arts', label: 'Martial arts', family: 'sport', clues: ['Sambo', 'Capoeira', 'Aikido', 'Kendo', 'Jujitsu', 'Taekwondo', 'Judo', 'Karate'] },
  { id: 'olympic-sports', label: 'Olympic sports', family: 'sport', clues: ['Diving', 'Sailing', 'Rowing', 'Fencing', 'Archery', 'Curling', 'Luge', 'Biathlon'] },
  // geography
  { id: 'capitals', label: 'Capital cities', family: 'geography', clues: ['Victoria', 'Santiago', 'Lima', 'Valletta', 'Nairobi', 'Ottawa', 'Canberra', 'Paris'] },
  { id: 'rivers', label: 'Rivers', family: 'geography', clues: ['Amazon', 'Indus', 'Volga', 'Seine', 'Ganges', 'Danube', 'Thames', 'Nile'] },
  { id: 'mountain-ranges', label: 'Mountain ranges', family: 'geography', clues: ['Atlas', 'Cascades', 'Urals', 'Pyrenees', 'Rockies', 'Andes', 'Alps', 'Himalayas'] },
  { id: 'islands', label: 'Islands', family: 'geography', clues: ['Java', 'Jersey', 'Iceland', 'Malta', 'Bali', 'Cuba', 'Madagascar', 'Hawaii'] },
  { id: 'deserts', label: 'Deserts', family: 'geography', clues: ['Arabian', 'Namib', 'Sonoran', 'Atacama', 'Mojave', 'Kalahari', 'Gobi', 'Sahara'] },
  { id: 'us-states', label: 'US states', family: 'geography', clues: ['Georgia', 'Washington', 'Indiana', 'Montana', 'Virginia', 'Nevada', 'Texas', 'California'] },
  // science
  { id: 'elements', label: 'Chemical elements', family: 'science', clues: ['Lead', 'Iron', 'Tin', 'Nickel', 'Neon', 'Argon', 'Helium', 'Oxygen'] },
  { id: 'bones', label: 'Bones in the human body', family: 'science', clues: ['Radius', 'Humerus', 'Stirrup', 'Ulna', 'Tibia', 'Fibula', 'Femur', 'Skull'] },
  { id: 'organs', label: 'Organs of the body', family: 'science', clues: ['Colon', 'Heart', 'Spleen', 'Liver', 'Kidney', 'Pancreas', 'Lung', 'Stomach'] },
  { id: 'units', label: 'Units of measurement', family: 'science', clues: ['Newton', 'Pound', 'Foot', 'Yard', 'Joule', 'Watt', 'Volt', 'Kilogram'] },
  { id: 'shapes', label: 'Geometric shapes', family: 'science', clues: ['Kite', 'Diamond', 'Star', 'Rhombus', 'Pentagon', 'Hexagon', 'Triangle', 'Circle'] },
  { id: 'clouds', label: 'Cloud types', family: 'science', clues: ['Nimbus', 'Mammatus', 'Lenticular', 'Stratus', 'Cirrus', 'Altostratus', 'Cumulus', 'Cumulonimbus'] },
  // tech
  { id: 'programming-languages', label: 'Programming languages', family: 'tech', clues: ['Python', 'Ruby', 'Swift', 'Rust', 'Go', 'Java', 'Kotlin', 'JavaScript'] },
  { id: 'keyboard-keys', label: 'Keyboard keys', family: 'tech', clues: ['Home', 'End', 'Escape', 'Shift', 'Tab', 'Delete', 'Enter', 'Spacebar'] },
  // arts & culture
  { id: 'shakespeare', label: 'Shakespeare plays', family: 'arts', clues: ['Hamlet', 'Othello', 'Pericles', 'The Tempest', 'Cymbeline', 'Coriolanus', 'King Lear', 'Macbeth'] },
  { id: 'painters', label: 'Painters', family: 'arts', clues: ['Bacon', 'Constable', 'Turner', 'Hopper', 'Vermeer', 'Rembrandt', 'Monet', 'Picasso'] },
  { id: 'dances', label: 'Dances', family: 'arts', clues: ['Salsa', 'Twist', 'Swing', 'Jive', 'Tango', 'Foxtrot', 'Waltz', 'Ballet'] },
  { id: 'greek-letters', label: 'Greek letters', family: 'arts', clues: ['Delta', 'Pi', 'Chi', 'Sigma', 'Lambda', 'Gamma', 'Omega', 'Alpha'] },
  { id: 'greek-gods', label: 'Greek gods', family: 'arts', clues: ['Nike', 'Hermes', 'Apollo', 'Ares', 'Hades', 'Athena', 'Poseidon', 'Zeus'] },
  // nature
  { id: 'gemstones', label: 'Gemstones', family: 'nature', clues: ['Ruby', 'Amber', 'Jade', 'Jet', 'Opal', 'Topaz', 'Sapphire', 'Emerald'] },
  { id: 'trees', label: 'Trees', family: 'nature', clues: ['Plane', 'Ash', 'Palm', 'Elm', 'Birch', 'Willow', 'Maple', 'Oak'] },
  { id: 'flowers', label: 'Flowers', family: 'nature', clues: ['Iris', 'Violet', 'Poppy', 'Lily', 'Daisy', 'Orchid', 'Tulip', 'Rose'] },
  { id: 'weather', label: 'Weather', family: 'nature', clues: ['Front', 'Hail', 'Sleet', 'Mist', 'Drizzle', 'Thunder', 'Tornado', 'Rain'] },
  { id: 'blues', label: 'Shades of blue', family: 'nature', clues: ['Navy', 'Royal', 'Sky', 'Cobalt', 'Teal', 'Azure', 'Cyan', 'Cerulean'] },
  // things that...
  { id: 'things-with-keys', label: 'Things with keys', family: 'things', clues: ['Florida', 'Map', 'Answer sheet', 'Typewriter', 'Piano', 'Keyboard', 'Lock', 'Keyring'] },
  { id: 'things-with-shells', label: 'Things with shells', family: 'things', clues: ['Taco', 'Bullet', 'Egg', 'Nut', 'Crab', 'Oyster', 'Snail', 'Turtle'] },
  { id: 'things-with-teeth', label: 'Things with teeth', family: 'things', clues: ['Zipper', 'Comb', 'Gear', 'Saw', 'Rake', 'Shark', 'Crocodile', 'Mouth'] },
  { id: 'things-with-wings', label: 'Things with wings', family: 'things', clues: ['Hospital', 'Stage', 'Chicken', 'Angel', 'Bat', 'Butterfly', 'Plane', 'Bird'] },
  { id: 'things-with-crowns', label: 'Things with crowns', family: 'things', clues: ['Watch', 'Tooth', 'Pineapple', 'Tree', 'Hat', 'Monarch', 'Queen', 'King'] },
  { id: 'things-that-bark', label: 'Things that bark', family: 'things', clues: ['Seal', 'Fox', 'Sergeant', 'Deer', 'Coyote', 'Wolf', 'Puppy', 'Dog'] },
  // words
  { id: 'palindromes', label: 'Palindromes', family: 'words', clues: ['Rotor', 'Refer', 'Civic', 'Level', 'Kayak', 'Radar', 'Madam', 'Racecar'] },
  { id: 'before-ball', label: 'Words before "ball"', family: 'words', clues: ['Eye', 'Meat', 'Fire', 'Snow', 'Base', 'Volley', 'Basket', 'Foot'] },
  { id: 'before-light', label: 'Words before "light"', family: 'words', clues: ['High', 'Spot', 'Head', 'Moon', 'Flash', 'Candle', 'Traffic', 'Sun'] },
  { id: 'after-sun', label: 'Words after "sun"', family: 'words', clues: ['Dial', 'Burn', 'Rise', 'Set', 'Screen', 'Shine', 'Glasses', 'Flower'] },
  { id: 'before-house', label: 'Words before "house"', family: 'words', clues: ['Light', 'Ware', 'Opera', 'Green', 'Tree', 'Club', 'Farm', 'Dog'] },
];

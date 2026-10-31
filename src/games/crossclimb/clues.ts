/**
 * Original GameHub Crossclimb clue bank: four-letter word -> clue.
 * Ladders are built only from words in this bank, so every rung the player
 * sees has a clue. To add content, append `word|clue` lines (lowercase word,
 * exactly 4 letters, a real dictionary word). Tests enforce this.
 */
const RAW = `
bare|Uncovered, with nothing on
care|Look after with concern
dare|Challenge someone to be brave
fare|Price of a bus ticket
hare|Long-eared runner that lost a famous race
mare|Female horse
rare|Seldom found, or lightly cooked
pare|Trim the skin off an apple
bore|Someone who makes you yawn
core|Apple centre with the seeds
fore|Golfer's warning shout
gore|Spill of blood in a horror film
more|Opposite of less
pore|Tiny opening in your skin
sore|Aching after a workout
tore|Ripped, in the past
wore|Had on, as clothes
lore|Traditional tales and knowledge
date|Calendar day, or a romantic outing
fate|Destiny
gate|Garden entrance on hinges
hate|Opposite of love
late|Not on time
mate|Friend, or checkmate's partner
rate|Speed or price per unit
ball|Round toy that bounces
call|Ring someone on the phone
fall|Autumn, or tumble down
hall|Corridor or large meeting room
mall|Shopping centre
tall|Of great height
wall|Side of a room
bill|Invoice at a restaurant
fill|Make full
hill|Small mountain
mill|Place where grain becomes flour
pill|Tablet of medicine
sill|Ledge under a window
till|Cash register, or until
will|Legal document for an inheritance
dine|Eat an evening meal
fine|Penalty payment, or all right
line|Queue, or a drawn stroke
mine|Belongs to me, or a pit for ore
nine|Three times three
pine|Evergreen with needles
vine|Climbing plant that grows grapes
wine|Drink made from grapes
bake|Cook a cake in the oven
cake|Birthday treat with candles
fake|Not genuine
lake|Inland body of water
make|Create or build
rake|Garden tool for leaves
take|Grab or accept
wake|Stop sleeping
came|Arrived, in the past
fame|Celebrity status
game|Something you play
name|What you are called
same|Identical
tame|Not wild
cane|Walking stick
lane|Narrow road
mane|Lion's hairy collar
pane|Single sheet of window glass
sane|Of sound mind
vane|Rooftop wind indicator
bold|Brave and confident
cold|Low in temperature
fold|Crease paper in half
gold|Precious yellow metal
hold|Grip in your hands
mold|Fuzzy growth on old bread
sold|Exchanged for money
told|Said to someone
beat|Win against, or a drum rhythm
heat|Warmth
meat|Butcher's product
neat|Tidy
seat|Chair or bench place
feat|Impressive achievement
book|Something you read
cook|Chef's job
hook|Curved catcher on a fishing line
look|Use your eyes
nook|Cosy corner
rook|Chess castle
bind|Tie together tightly
find|Discover
kind|Gentle and caring
mind|Seat of thought
wind|Moving air
king|Monarch on a throne
ring|Band worn on a finger
sing|Use your voice musically
wing|Bird's flying limb
back|Rear of your body
pack|Bundle for hiking
rack|Shelf frame for storage
sack|Large bag, or fire someone
tack|Small sharp pin
lack|Shortage of something
kick|Strike with your foot
lick|Taste with your tongue
pick|Choose
sick|Unwell
tick|Clock sound, or a checkmark
wick|Candle string
dock|Where ships tie up
lock|Opened with a key
rock|Stone, or a music genre
sock|Foot covering
mock|Make fun of
duck|Quacking bird
luck|Fortune
puck|Ice hockey disc
tuck|Fold sheets under a mattress
bell|It rings in a tower
cell|Smallest unit of life
fell|Tumbled down
sell|Exchange for money
tell|Inform
well|Water source with a bucket
yell|Shout loudly
best|Top of the class
nest|Bird's home
pest|Nuisance insect
rest|Relax and recover
test|Exam
vest|Sleeveless undershirt
west|Where the sun sets
jest|Joke
cast|Actors in a play, or a plaster on a break
fast|Quick
last|Final
mast|Pole that holds a sail
past|History, gone by
vast|Enormous
cost|Price
host|Party giver
lost|Unable to find your way
most|Greatest amount
post|Mail
bust|Sculpted head and shoulders
dust|Fine dry powder on shelves
gust|Sudden blast of wind
just|Fair, or only
must|Have to
rust|Orange coating on old iron
band|Musical group
hand|Five fingers and a palm
land|Ground, or arrive by plane
sand|Beach grains
wand|Magician's stick
bend|Curve
lend|Let someone borrow
mend|Repair
send|Post off
tend|Look after
bond|Strong connection
fond|Affectionate
pond|Small pool for ducks
boat|It floats on water
coat|Outerwear for winter
goat|Bearded farm animal
moat|Water around a castle
load|Cargo
road|Street for cars
toad|Warty amphibian
bear|Large furry animal
dear|Beloved, or expensive
fear|Fright
gear|Equipment, or a cog
hear|Use your ears
near|Close by
pear|Fruit shaped like a light bulb
rear|Back end
tear|Drop from a crying eye
wear|Have on your body
year|Twelve months
cool|Chilly, or impressive
fool|Silly person
pool|Swimming spot
tool|Hammer or wrench
wool|Sheep's fleece
boom|Loud explosion
doom|Terrible fate
room|Space inside a house
zoom|Move very fast
moon|It orbits Earth
noon|Midday
soon|Shortly
boot|Sturdy footwear
foot|Twelve inches
hoot|Owl's call
root|Underground part of a plant
bark|Dog's sound
dark|Without light
park|Green public space
lark|Songbird, or a playful prank
mark|Stain, or a grade
cart|Shopping trolley
dart|Pointed projectile thrown at a board
part|Piece
tart|Sour, or a fruit pastry
farm|Place with crops and cows
harm|Damage
warm|Pleasantly hot
born|Brought into the world
corn|Yellow cob vegetable
horn|Rhino's spike, or a car's beeper
torn|Ripped
worn|Used and shabby
cord|Thin rope
ford|Shallow river crossing
lord|Noble title
word|Unit of language
cork|Wine bottle stopper
fork|Pronged utensil
pork|Meat from a pig
work|Job
fort|Military stronghold
port|Harbour
sort|Arrange in order
fire|Flames
hire|Employ
tire|Become weary
wire|Metal thread carrying current
hide|Conceal
ride|Travel on a bike or horse
side|Edge or flank
tide|Rising and falling sea
wide|Broad
file|Folder of documents
mile|Long distance unit
pile|Heap
tile|Square on a bathroom floor
dime|Ten cents
lime|Green citrus
mime|Silent performer
time|What clocks measure
cope|Manage under pressure
hope|Optimistic wish
rope|Thick twisted cord
hose|Garden water pipe
nose|Sniffing organ
pose|Hold still for a photo
rose|Thorny red flower
cove|Small sheltered bay
dove|Bird of peace
love|Deep affection
wove|Made cloth on a loom
dune|Sand hill in a desert
tune|Melody
bull|Male cow
dull|Boring
full|Not empty
gull|Seaside bird
hull|Body of a ship
pull|Opposite of push
bump|Small lump on a road
dump|Rubbish tip
jump|Leap
lump|Swelling
pump|Device that moves air or water
bunk|Stacked bed
junk|Rubbish
sunk|Went to the bottom
link|Connection in a chain
mink|Sleek fur animal
pink|Light red colour
rink|Ice skating arena
sink|Kitchen basin
wink|Close one eye playfully
bank|Place for money
rank|Position in a ranking
sank|Went under water
tank|Armoured vehicle
yank|Sharp pull
cash|Notes and coins
dash|Quick sprint
hash|Pound sign on a keyboard
mash|Crush potatoes
rash|Itchy red skin
wash|Clean with water
dish|Plate of food
fish|Swimmer with fins
wish|Hope made on a star
bush|Shrub
hush|Quiet down
lush|Rich and green
mush|Soft pulp
push|Shove
rush|Hurry
bail|Money for release from jail
fail|Not succeed
hail|Icy rain pellets
jail|Prison
mail|Letters delivered
nail|Hammered metal pin
pail|Bucket
rail|Train track
sail|Cloth that catches wind
tail|Dog's wagger
gain|Increase
main|Most important
pain|Hurt
rain|Water from clouds
vain|Self-admiring
bait|Lure for fish
wait|Stay until something happens
feed|Give food to
need|Require
seed|Tiny start of a plant
weed|Unwanted garden plant
deed|Action, or property paper
reed|Tall marsh grass
beep|Short electronic sound
deep|Far down
keep|Retain
peep|Quick look
seep|Leak slowly
weep|Cry
jeep|Rugged off-road car
feel|Sense by touch
heel|Back of your foot
peel|Banana skin
reel|Fishing line spool
leek|Onion relative in soup
meek|Quiet and humble
peek|Sneaky glance
seek|Search for
week|Seven days
deal|Bargain, or hand out cards
heal|Get better
meal|Breakfast, lunch or dinner
real|Genuine
seal|Flippered sea mammal
veal|Calf meat
zeal|Great enthusiasm
beam|Ray of light
team|Group working together
seam|Stitched join in fabric
bean|Legume in a pod
lean|Rest against
mean|Unkind, or average
bead|Small ball on a necklace
head|Top of your body
lead|Guide, or be in front
read|Look at words
bowl|Soup dish
fowl|Poultry bird
howl|Wolf's cry
down|Opposite of up
gown|Formal dress
town|Small city
daze|Stunned state
gaze|Steady look
haze|Light mist
maze|Puzzle of paths
cave|Hollow in a cliff
gave|Handed over
pave|Cover a road
rave|Wild dance party
save|Rescue
wave|Ocean swell, or hand greeting
bale|Bundle of hay
dale|Valley
gale|Strong wind
kale|Curly leafy green
male|Not female
pale|Light in colour
sale|Discount event
tale|Story
face|Front of your head
lace|Delicate patterned fabric
pace|Walking speed
race|Competition of speed
dice|Cubes in a board game
mice|Small rodents
nice|Pleasant
rice|Grain eaten with curry
fade|Lose colour
jade|Green gemstone
made|Built
wade|Walk through shallow water
cage|Bird enclosure
page|Sheet in a book
rage|Fury
sage|Wise person, or an herb
wage|Pay for work
cape|Superhero's cloak
tape|Sticky strip
base|Foundation
case|Box, or a detective's job
vase|Container for flowers
joke|Something funny
poke|Prod with a finger
woke|Stopped sleeping
yoke|Wooden bar on oxen
hole|Gap or opening
mole|Burrowing animal
pole|Long stick, or an end of the Earth
role|Part in a play
sole|Bottom of a shoe
bone|Skeleton piece
cone|Ice cream holder
done|Finished
gone|Departed
lone|Solitary
tone|Sound quality
zone|Area
code|Secret cipher
mode|Way or setting
node|Junction point in a network
rode|Travelled on horseback
cube|Six-sided solid
tube|Hollow cylinder
mule|Horse-donkey cross
rule|Regulation
fuse|Circuit safety device
muse|Source of inspiration
cure|Remedy
lure|Tempt, or fishing bait
pure|Not mixed
sure|Certain
bike|Two-wheeled ride
hike|Long walk in nature
like|Be fond of
mike|Microphone, for short
pike|Long spear, or a toothy fish
bite|Use your teeth
kite|Flies on a string
site|Location
mite|Tiny bug
wise|Full of wisdom
rise|Go up
hire|Take on staff
dive|Plunge into water
five|Number of fingers on a hand
hive|Home of bees
live|Be alive
bond|Strong connection
mild|Gentle, not spicy
wild|Untamed
bolt|Lightning flash, or a door lock
colt|Young male horse
salt|Seasoning from the sea
malt|Grain used in brewing
halt|Stop
melt|Turn from ice to water
belt|Strap around the waist
felt|Soft fabric, or sensed
dime|Ten cents
dome|Rounded roof
home|Where you live
some|A few
come|Arrive
hare|Long-eared runner that lost a famous race
herd|Group of cattle
hard|Not soft
card|Playing piece in a deck
yard|Garden, or three feet
ward|Hospital room
word|Unit of language
bird|Feathered flyer
bard|Poet
lamp|Light on a desk
camp|Tents in the woods
damp|Slightly wet
ramp|Sloped surface
limp|Floppy, or walk unevenly
lime|Green citrus
lump|Swelling
hump|Camel's bump
wire|Metal thread carrying current
wore|Had on, as clothes
mire|Muddy swamp
male|Not female
mile|Long distance unit
mole|Burrowing animal
mule|Horse-donkey cross
cast|Actors in a play, or a plaster on a break
cost|Price
list|Items written down
mist|Fine fog
fist|Clenched hand
gift|Present
lift|Raise
sift|Strain flour
silt|River mud
tilt|Lean at an angle
wilt|Droop like a thirsty plant
gilt|Thin gold coating
milk|White drink from cows
silk|Smooth fabric from worms
fill|Make full
film|Movie
firm|Solid, or a company
form|Shape, or a paper to fill in
foam|Bubbles on top
loam|Rich soil
roam|Wander
road|Street for cars
roar|Lion's cry
soar|Fly high
sour|Tart like a lemon
four|Number after three
pour|Tip liquid out
tour|Trip around a place
hour|Sixty minutes
your|Belonging to you
dour|Gloomy
`;

const entries = RAW.trim()
  .split('\n')
  .map((line) => line.split('|') as [string, string]);

/** First clue wins if a word appears twice. */
export const CROSSCLIMB_CLUES: ReadonlyMap<string, string> = new Map(
  entries.filter(([w], i) => entries.findIndex(([x]) => x === w) === i).map(([w, c]) => [w.trim(), c.trim()]),
);

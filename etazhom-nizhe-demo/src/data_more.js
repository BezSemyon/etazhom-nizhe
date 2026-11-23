/* ===== Расширение меню (v3): новые блюда во всех категориях и линейка напитков ===== */
ING_SPEC.forEach(r => { if (r[0] === 'coffee') r[7] = 'Чай и кофе'; });
ING_SPEC.push(
  ['orange',      'Апельсины',                         'g',   'green', 180,  1000, 14,  'Овощи и фрукты'],
  ['grapefruit',  'Грейпфруты',                        'g',   'green', 200,  1000, 14,  'Овощи и фрукты'],
  ['celery',      'Сельдерей черешковый',              'g',   'green', 350,  500,  7,   'Овощи и фрукты'],
  ['ginger',      'Имбирь',                            'g',   'green', 450,  500,  21,  'Овощи и фрукты'],
  ['kiwi',        'Киви',                              'g',   'green', 380,  1000, 10,  'Овощи и фрукты'],
  ['mango',       'Манго замороженное',                'g',   'green', 750,  1000, 180, 'Овощи и фрукты'],
  ['pineapple',   'Ананас',                            'g',   'green', 260,  1000, 7,   'Овощи и фрукты'],
  ['beet',        'Свёкла',                            'g',   'green', 60,   1000, 30,  'Овощи и фрукты'],
  ['seabuck',     'Облепиха замороженная',             'g',   'green', 650,  1000, 180, 'Овощи и фрукты'],
  ['mint',        'Мята свежая',                       'g',   'green', 1200, 100,  5,   'Овощи и фрукты'],
  ['cauliflower', 'Цветная капуста',                   'g',   'green', 260,  1000, 7,   'Овощи и фрукты'],
  ['eggplant',    'Баклажаны',                         'g',   'green', 280,  1000, 7,   'Овощи и фрукты'],
  ['tea_black',   'Чай чёрный ассам, листовой',        'g',   'groc',  2200, 500,  365, 'Чай и кофе'],
  ['tea_green',   'Чай зелёный сенча',                 'g',   'groc',  2600, 500,  365, 'Чай и кофе'],
  ['tea_oolong',  'Чай улун молочный',                 'g',   'groc',  3800, 250,  365, 'Чай и кофе'],
  ['tea_herbal',  'Травяной сбор (ромашка, мята, чабрец)', 'g', 'groc', 1800, 250, 365, 'Чай и кофе'],
  ['tea_ivan',    'Иван-чай ферментированный',         'g',   'groc',  1500, 250,  365, 'Чай и кофе'],
  ['hibiscus',    'Каркаде',                           'g',   'groc',  900,  250,  365, 'Чай и кофе'],
  ['matcha',      'Матча',                             'g',   'groc',  9000, 100,  365, 'Чай и кофе'],
  ['cocoa',       'Какао-порошок',                     'g',   'groc',  1100, 500,  365, 'Чай и кофе'],
  ['oatmilk',     'Овсяное молоко',                    'ml',  'dairy', 230,  1000, 30,  'Молочное и яйца'],
  ['coconutwater','Кокосовая вода',                    'ml',  'groc',  450,  1000, 180, 'Напитки'],
  ['kombucha',    'Комбуча 0,33 л',                    'pcs', 'groc',  120,  12,   90,  'Напитки'],
  ['water',       'Вода питьевая 0,5 л',               'pcs', 'groc',  35,   24,   365, 'Напитки'],
  ['sparkling',   'Минеральная вода газ. 0,5 л',       'pcs', 'groc',  55,   24,   365, 'Напитки'],
  ['isotonic',    'Изотоник 0,5 л',                    'pcs', 'sport', 110,  24,   365, 'Напитки'],
);

/* смузи переезжают в «Напитки» */
DISH_SPEC.forEach(r => { if (r[0] === 'greensmoothie' || r[0] === 'berrysmoothie') r[2] = 'drink'; });

DISH_SPEC.push(
  // завтраки
  ['chiaoats', 'Ленивая овсянка с чиа и манго', 'breakfast', ['veg','balance'], 280, '280 г', 360, 12, 12, 50, 3, '🥭', 3, {oats:50, yogurt:120, chia:10, mango:60, honey:5}, 'Овсянка, настоянная за ночь на йогурте, с чиа и кусочками манго.'],
  ['eggroll', 'Белковый ролл-омлет с индейкой', 'breakfast', ['lose','lowcarb','sport'], 320, '230 г', 280, 36, 12, 6, 9, '🍳', 3, {eggs:4, turkey:60, spinach:30, cherry:40}, 'Тонкий белковый омлет, свёрнутый с индейкой и шпинатом.'],
  ['kidporridge', 'Детская рисовая каша с бананом', 'breakfast', ['kids','family'], 190, '250 г', 300, 8, 7, 52, 8, '🍚', 3, {brownrice:40, milk:200, banana:60, butter:5}, 'Нежная молочная каша с бананом, без сахара.'],
  // горячее
  ['cauligratin', 'Цветная капуста, запечённая с сыром', 'hot', ['lowcarb','veg'], 330, '300 г', 290, 16, 18, 14, 15, '🥦', 3, {cauliflower:250, mozz:40, cream:40}, 'Цветная капуста под сливочно-сырной корочкой.'],
  ['turkeystew', 'Рагу из индейки с овощами', 'hot', ['lose','balance','family'], 420, '380 г', 380, 38, 10, 28, 18, '🍲', 3, {turkey:160, zucchini:80, carrot:50, pepper:50, eggplant:80, onion:20}, 'Тушёная индейка с баклажаном, кабачком и перцем.'],
  ['eggplantparm', 'Баклажаны с моцареллой и томатами', 'hot', ['veg','lowcarb'], 360, '320 г', 330, 14, 22, 18, 16, '🍆', 2, {eggplant:250, mozz:60, cherry:100, oil:10}, 'Запечённые баклажаны с томатами и тянущейся моцареллой.'],
  ['massburrito', 'Буррито «Масса» с говядиной и рисом', 'hot', ['gain','sport'], 520, '420 г', 780, 48, 26, 86, 10, '🌯', 3, {tortilla:2, beef:150, brownrice:80, cherry:50, mozz:30}, 'Две тортильи, говядина, рис и сыр — плотный обед после силовой.'],
  // салаты
  ['beetfeta', 'Салат со свёклой, фетой и орехами', 'salad', ['veg','balance'], 320, '250 г', 330, 10, 22, 22, 5, '🥗', 3, {beet:150, feta:40, nuts:15, lettuce:40, oil:8}, 'Печёная свёкла, фета, грецкие орехи и салатный микс.'],
  ['shrimpavo', 'Салат с креветками и авокадо', 'salad', ['lowcarb','lose'], 520, '260 г', 320, 26, 20, 8, 7, '🦐', 3, {shrimp:100, avocado:0.5, lettuce:60, cucumber:60, lemon:0.25}, 'Креветки, авокадо, огурец и лимонная заправка.'],
  ['kidsalad', 'Детский салат «Морковка и яблоко»', 'salad', ['kids','veg'], 160, '180 г', 140, 2, 5, 22, 4, '🥕', 2, {carrot:100, apple:80, yogurt:30}, 'Тёртая морковь с яблоком и йогуртом.'],
  // супы
  ['meatballsoup', 'Суп с фрикадельками из индейки', 'soup', ['kids','family','balance'], 260, '350 г', 240, 20, 8, 20, 6, '🍲', 3, {turkey:80, potato:80, carrot:30, onion:20, greens:5}, 'Лёгкий суп с нежными фрикадельками — любимый у детей.'],
  ['mushroomsoup', 'Грибной крем-суп', 'soup', ['veg','lowcarb'], 260, '300 г', 220, 7, 15, 12, 5, '🍄', 3, {mushroom:180, cream:60, onion:30, potato:40}, 'Бархатный суп из шампиньонов со сливками.'],
  ['beefbroth', 'Говяжий бульон «Восстановление»', 'soup', ['sport','lose'], 290, '350 г', 200, 22, 8, 10, 5, '🥣', 2, {beef:80, carrot:40, celery:40, onion:20, greens:5}, 'Наваристый бульон с говядиной и сельдереем — после тяжёлой тренировки.'],
  // перекусы
  ['hummusveg', 'Хумус с овощными палочками', 'snack', ['veg','sport'], 260, '220 г', 280, 10, 14, 26, 3, '🥒', 3, {chickpea:60, carrot:60, cucumber:60, celery:40, oil:10, lemon:0.25}, 'Домашний хумус, морковь, огурец и сельдерей.'],
  ['proteincream', 'Протеиновый творожный крем', 'snack', ['sport','lowcarb'], 220, '200 г', 240, 34, 6, 10, 2, '🍮', 3, {cottage:150, whey:15, berries:30}, 'Взбитый творог с протеином и ягодами — 34 г белка.'],
  // семейные наборы
  ['breakfast2', 'Набор «Завтрак на двоих»', 'set', ['family','balance'], 790, '900 г', 450, 28, 16, 48, 15, '🧺', 2, {eggs:6, cottage:200, oats:60, berries:100, bread:120, avocado:1, yogurt:100}, 'Скрэмбл, сырники, гранола с йогуртом и тосты с авокадо. КБЖУ — на 1 порцию.', 2],
  ['grillset3', 'Индейка-гриль с овощами — набор на 3', 'set', ['family','lose'], 1390, '1,5 кг', 420, 42, 14, 26, 25, '🦃', 2, {turkey:500, zucchini:300, pepper:250, eggplant:250, sweetpot:300, oil:30}, 'Филе индейки на гриле, овощи и батат на троих. КБЖУ — на 1 порцию.', 3],
  ['vegset2', 'Вегетарианский набор на двоих', 'set', ['veg','family'], 990, '1 кг', 480, 20, 18, 58, 15, '🥙', 2, {tofu:250, quinoa:120, chickpea:120, cucumber:150, cherry:150, lettuce:80, teriyaki:30}, 'Тофу терияки, киноа, хумус и овощи. КБЖУ — на 1 порцию.', 2],
  // рационы
  ['rationlowcarb', 'Рацион на день «Low-carb» · 1500 ккал', 'ration', ['lowcarb'], 1290, '1,2 кг', 1500, 140, 90, 45, 25, '📦', 2, {eggs:5, spinach:60, salmon:150, zucchini:200, chicken:150, broccoli:200, cottage:150, avocado:0.5}, 'Четыре приёма пищи, всего 45 г углеводов за день.'],
  ['rationveg', 'Рацион на день «Вегетарианский» · 1700 ккал', 'ration', ['veg','balance'], 1090, '1,4 кг', 1700, 70, 55, 220, 25, '📦', 2, {oats:70, milk:200, berries:60, tofu:150, quinoa:80, lentil:80, coconut:100, chickpea:60, yogurt:150}, 'Каша, боул с тофу, чечевичное карри и йогурт.'],
  ['rationsport', 'Рацион «День тренировки» · 2200 ккал', 'ration', ['sport','balance'], 1290, '1,6 кг', 2200, 160, 65, 230, 25, '📦', 2, {oats:70, whey:30, banana:120, chicken:200, brownrice:120, broccoli:150, turkey:150, sweetpot:200, eggs:2}, 'Углеводы до тренировки, белок после — расписано по времени приёма.'],
  ['rationkids', 'Детский рацион на день', 'ration', ['kids','family'], 790, '1 кг', 1300, 60, 45, 170, 20, '📦', 2, {cottage:120, eggs:1, chicken:120, potato:200, pasta:60, mozz:30, apple:150, milk:200}, 'Завтрак, обед и полдник для ребёнка — без острого и сахара.'],
  // десерты
  ['brownie', 'Протеиновый брауни без сахара', 'dessert', ['sport','gain'], 220, '90 г', 260, 18, 12, 20, 2, '🍫', 3, {whey:20, cocoa:15, eggs:1, nuts:15, banana:40}, 'Шоколадный брауни на протеине и банане.'],
  ['mangosorbet', 'Сорбет из манго', 'dessert', ['veg','lose','kids'], 190, '120 г', 110, 1, 0, 27, 2, '🍧', 3, {mango:120, lemon:0.25}, 'Только манго и капля лимона.'],

  // соки прямого отжима
  ['oj', 'Апельсиновый сок прямого отжима', 'drink', ['veg','kids'], 290, '300 мл', 130, 2, 0, 30, 3, '🍊', 6, {orange:500}, 'Отжимаем при вас из спелых апельсинов, без сахара и воды.'],
  ['grapefruitj', 'Грейпфрутовый фреш', 'drink', ['lose','veg'], 290, '300 мл', 110, 2, 0, 24, 3, '🍹', 3, {grapefruit:550}, 'Свежевыжатый грейпфрут с приятной горчинкой.'],
  ['applecarrot', 'Сок яблоко-морковь', 'drink', ['veg','kids','balance'], 250, '300 мл', 140, 2, 0, 32, 3, '🥕', 5, {apple:300, carrot:200}, 'Классика прямого отжима.'],
  ['greenjuice', 'Зелёный сок: сельдерей, яблоко, шпинат', 'drink', ['lose','veg'], 290, '300 мл', 90, 2, 0, 19, 4, '🥬', 4, {celery:150, apple:200, spinach:40, lemon:0.25}, 'Свежий зелёный сок с лимоном.'],
  ['beetjuice', 'Сок свёкла-яблоко-имбирь', 'drink', ['veg','sport'], 270, '300 мл', 120, 2, 0, 28, 4, '🍎', 2, {beet:150, apple:250, ginger:10}, 'Свёкла поддерживает выносливость, имбирь бодрит.'],
  ['orangecarrot', 'Сок апельсин-морковь-имбирь', 'drink', ['veg','balance'], 280, '300 мл', 120, 2, 0, 27, 3, '🧃', 3, {orange:300, carrot:150, ginger:8}, 'Яркий витаминный микс прямого отжима.'],
  ['pineapplej', 'Ананасовый фреш', 'drink', ['veg','kids'], 310, '300 мл', 150, 1, 0, 34, 4, '🍍', 2, {pineapple:450}, 'Свежий ананас, отжатый при вас.'],
  ['gingershot', 'Имбирный шот с лимоном', 'drink', ['lose','sport','veg'], 150, '60 мл', 20, 0, 0, 4, 2, '🍋', 4, {ginger:30, lemon:0.5, honey:5}, 'Острый шот имбиря и лимона — проснуться перед тренировкой.'],
  // смузи
  ['mangosmoothie', 'Смузи манго-банан на кокосовой воде', 'drink', ['veg','kids','sport'], 320, '350 мл', 240, 3, 1, 56, 3, '🥭', 4, {mango:120, banana:100, coconutwater:150}, 'Тропический смузи без молока и сахара.'],
  ['strawbanana', 'Смузи клубника-банан на йогурте', 'drink', ['balance','kids'], 290, '350 мл', 260, 10, 4, 46, 3, '🍓', 4, {berries:120, banana:100, yogurt:100}, 'Ягоды, банан и греческий йогурт.'],
  ['kiwispinach', 'Смузи киви-шпинат-яблоко', 'drink', ['lose','veg'], 280, '350 мл', 170, 3, 1, 38, 3, '🥝', 3, {kiwi:150, spinach:40, apple:150}, 'Кисло-сладкий зелёный смузи.'],
  ['seabucksmoothie', 'Смузи облепиха-апельсин', 'drink', ['veg'], 290, '350 мл', 180, 2, 6, 28, 3, '🍹', 2, {seabuck:100, orange:250, honey:10}, 'Облепиха и апельсин — заряд витамина C.'],
  ['postworkout', 'Смузи «После трени»: банан, арахис, протеин', 'drink', ['sport','gain'], 340, '400 мл', 420, 32, 12, 48, 3, '🍌', 4, {whey:30, banana:120, pnut:15, oatmilk:250}, 'На овсяном молоке: белок и углеводы для восстановления.'],
  ['pineapplemint', 'Смузи ананас-мята-кокос', 'drink', ['veg','lose'], 290, '350 мл', 160, 2, 2, 34, 3, '🍍', 2, {pineapple:150, mint:5, coconutwater:200}, 'Освежающий смузи на кокосовой воде.'],
  // чай
  ['teablack', 'Чай чёрный ассам', 'drink', ['lose'], 160, '400 мл', 2, 0, 0, 0, 3, '🫖', 4, {tea_black:6}, 'Крепкий листовой ассам.'],
  ['teagreen', 'Чай зелёный сенча', 'drink', ['lose'], 170, '400 мл', 2, 0, 0, 0, 3, '🍵', 4, {tea_green:5}, 'Японская сенча, заварена при 80 °C.'],
  ['teaoolong', 'Молочный улун', 'drink', ['lose'], 220, '400 мл', 3, 0, 0, 0, 4, '🍵', 3, {tea_oolong:6}, 'Мягкий улун со сливочным ароматом.'],
  ['teaginger', 'Имбирный чай с лимоном и мёдом', 'drink', ['veg'], 220, '400 мл', 60, 0, 0, 15, 4, '🍋', 5, {ginger:20, lemon:0.25, honey:15, tea_green:3}, 'Согревающий имбирь, лимон и мёд.'],
  ['teaseabuck', 'Облепиховый чай с апельсином', 'drink', ['veg','kids'], 240, '400 мл', 80, 0, 2, 16, 4, '🫖', 4, {seabuck:50, orange:60, honey:10, tea_black:3}, 'Облепиха, апельсин и чёрный чай.'],
  ['teaberry', 'Ягодный чай с мятой', 'drink', ['kids','veg'], 220, '400 мл', 50, 0, 0, 12, 4, '🫐', 3, {berries:50, mint:3, tea_black:3, honey:5}, 'Лесные ягоды и свежая мята.'],
  ['teaherbal', 'Травяной сбор: ромашка, мята, чабрец', 'drink', ['lose','kids'], 180, '400 мл', 2, 0, 0, 0, 4, '🌿', 3, {tea_herbal:5}, 'Без кофеина — можно и вечером.'],
  ['teaivan', 'Иван-чай с мёдом', 'drink', ['veg'], 190, '400 мл', 40, 0, 0, 10, 4, '🍯', 2, {tea_ivan:5, honey:10}, 'Ферментированный иван-чай, без кофеина.'],
  ['hibiscus', 'Каркаде холодный с лимоном', 'drink', ['lose','kids'], 190, '400 мл', 20, 0, 0, 5, 3, '🌺', 2, {hibiscus:6, lemon:0.25}, 'Кисловатый холодный чай из каркаде.'],
  ['matcha', 'Матча латте на овсяном молоке', 'drink', ['veg','balance'], 290, '300 мл', 140, 3, 5, 18, 3, '🍵', 4, {matcha:3, oatmilk:250}, 'Японская матча, взбитая с овсяным молоком.'],
  // кофе и какао
  ['espresso', 'Эспрессо', 'drink', [], 120, '40 мл', 5, 0, 0, 1, 1, '☕', 4, {coffee:9}, 'Классический эспрессо.'],
  ['latte', 'Латте', 'drink', ['balance'], 230, '350 мл', 160, 9, 8, 12, 3, '☕', 6, {coffee:18, milk:250}, 'Двойной эспрессо и много молока.'],
  ['flatwhite', 'Флэт уайт', 'drink', [], 230, '250 мл', 110, 6, 6, 8, 3, '☕', 4, {coffee:18, milk:150}, 'Насыщенный кофе с бархатной молочной пеной.'],
  ['oatlatte', 'Латте на овсяном молоке', 'drink', ['veg'], 260, '350 мл', 150, 2, 6, 20, 3, '🥛', 4, {coffee:18, oatmilk:250}, 'Без лактозы, мягкий ореховый вкус.'],
  ['icelatte', 'Айс-латте', 'drink', [], 250, '350 мл', 120, 7, 6, 9, 2, '🧊', 3, {coffee:18, milk:200}, 'Эспрессо, холодное молоко и лёд.'],
  ['proteincoffee', 'Протеиновый айс-кофе', 'drink', ['sport'], 290, '350 мл', 180, 26, 3, 10, 3, '💪', 3, {coffee:18, whey:25, milk:150}, 'Кофе с порцией протеина — 26 г белка.'],
  ['coldbrew', 'Колд брю', 'drink', ['lose'], 220, '300 мл', 5, 0, 0, 1, 1, '🧊', 3, {coffee:25}, 'Кофе холодной экстракции, 16 часов настаивания.'],
  ['cocoa', 'Какао на молоке без сахара', 'drink', ['kids','family'], 210, '300 мл', 170, 9, 7, 16, 3, '🍫', 4, {cocoa:15, milk:250, honey:5}, 'Натуральное какао с каплей мёда.'],
  // лимонады и морсы
  ['lemonadecitrus', 'Лимонад цитрус-мята без сахара', 'drink', ['lose','kids'], 220, '400 мл', 30, 0, 0, 7, 2, '🍋', 4, {lemon:0.5, orange:80, mint:5, sparkling:1}, 'Апельсин, лимон и мята на минеральной воде.'],
  ['lemonadeberry', 'Ягодный лимонад на стевии', 'drink', ['lose','kids'], 220, '400 мл', 40, 0, 0, 9, 2, '🫐', 3, {berries:60, lemon:0.25, sparkling:1}, 'Ягоды и газированная вода, без сахара.'],
  ['cucumberlemonade', 'Лимонад огурец-лимон-мята', 'drink', ['lose','veg'], 220, '400 мл', 20, 0, 0, 4, 2, '🥒', 3, {cucumber:80, lemon:0.25, mint:5, sparkling:1}, 'Самый освежающий после кардио.'],
  ['seabuckmors', 'Облепиховый морс', 'drink', ['veg','kids'], 170, '400 мл', 70, 0, 2, 14, 1, '🧃', 3, {seabuck:70, honey:10}, 'Домашний морс из облепихи.'],
  // вода и спортивные напитки
  ['water', 'Вода питьевая 0,5 л', 'drink', ['sport','lose','kids'], 90, '500 мл', 0, 0, 0, 0, 1, '💧', 7, {water:1}, 'Негазированная питьевая вода.'],
  ['sparklingwater', 'Минеральная вода газированная 0,5 л', 'drink', ['lose'], 110, '500 мл', 0, 0, 0, 0, 1, '🥂', 4, {sparkling:1}, 'Природная минеральная вода.'],
  ['isotonic', 'Изотоник 0,5 л', 'drink', ['sport'], 190, '500 мл', 120, 0, 0, 30, 1, '⚡', 4, {isotonic:1}, 'Восполняет соли и воду во время тренировки.'],
  ['coconutwaterd', 'Кокосовая вода 330 мл', 'drink', ['sport','veg'], 290, '330 мл', 60, 0, 0, 14, 1, '🥥', 3, {coconutwater:330}, 'Натуральные электролиты.'],
  ['kombucha', 'Комбуча 0,33 л', 'drink', ['veg','lose'], 230, '330 мл', 40, 0, 0, 10, 1, '🍾', 3, {kombucha:1}, 'Ферментированный чайный напиток.'],
);

BAR_DISHES.push('oj','grapefruitj','applecarrot','greenjuice','beetjuice','orangecarrot','pineapplej','gingershot','mangosmoothie','strawbanana','kiwispinach','seabucksmoothie','postworkout','pineapplemint','teablack','teagreen','teaoolong','teaginger','teaseabuck','teaberry','teaherbal','teaivan','hibiscus','matcha','espresso','latte','flatwhite','oatlatte','icelatte','proteincoffee','coldbrew','cocoa','lemonadecitrus','lemonadeberry','cucumberlemonade','seabuckmors','water','sparklingwater','isotonic','coconutwaterd','kombucha');
COLD_DISHES.push('chiaoats','beetfeta','shrimpavo','kidsalad','hummusveg','proteincream','brownie','mangosorbet');
INITIAL_PROMO.hits.push('oj', 'matcha');
Object.assign(INITIAL_PROMO.discounts, { kiwispinach: 20, teaginger: 15 });

/* подгруппы напитков */
const DRINK_SUBS = [
  { id: 'fresh',    name: 'Соки прямого отжима' },
  { id: 'smoothie', name: 'Смузи' },
  { id: 'tea',      name: 'Чай' },
  { id: 'coffee',   name: 'Кофе и какао' },
  { id: 'lemonade', name: 'Лимонады и морсы' },
  { id: 'water',    name: 'Вода и спортивные напитки' },
];
const DRINK_SUB = {};
[['fresh', 'oj grapefruitj applecarrot greenjuice beetjuice orangecarrot pineapplej gingershot'],
 ['smoothie', 'greensmoothie berrysmoothie mangosmoothie strawbanana kiwispinach seabucksmoothie postworkout pineapplemint'],
 ['tea', 'teablack teagreen teaoolong teaginger teaseabuck teaberry teaherbal teaivan hibiscus matcha'],
 ['coffee', 'americano cappuccino espresso latte flatwhite oatlatte icelatte proteincoffee coldbrew cocoa'],
 ['lemonade', 'mors lemonwater lemonadecitrus lemonadeberry cucumberlemonade seabuckmors'],
 ['water', 'water sparklingwater isotonic coconutwaterd kombucha']].forEach(([sub, ids]) => ids.split(' ').forEach(id => { DRINK_SUB[id] = sub; }));
Object.assign(STOCK_MULT, { orange: 3, grapefruit: 4.5, pineapple: 4.5, celery: 3, kiwi: 3.5, beet: 5, ginger: 5, seabuck: 6, mango: 6, mint: 3, cauliflower: 2.5, eggplant: 2.5, oatmilk: 4, coconutwater: 6, kombucha: 3, water: 4, sparkling: 4, isotonic: 4, cocoa: 6, matcha: 6 });

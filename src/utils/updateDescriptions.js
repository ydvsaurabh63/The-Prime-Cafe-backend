require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const descriptions = {
  // --- Tea & Coffee (18 items) ---
  "The Prime Signature Espresso Macchiato":
    "Double shot of single-origin Arabica coffee marked with silky micro-foam and rich golden crema.",
  "Classic Hazelnut Cappuccino":
    "Rich dark espresso shot, steamed velvet milk, roasted hazelnut syrup drizzle, and cocoa dust.",
  "Kullad Masala Chai with Elaichi":
    "Traditional Assam CTC tea simmered with fresh cardamom, crushed ginger, cloves, and whole milk.",
  "Belgian Chocolate Thickshake":
    "Dense dark Belgian chocolate shake topped with crushed waffle crisp, choco chips, and whipped cream.",
  "Iced Caramel Frappe":
    "Blended double espresso, buttery golden caramel drizzle, chilled milk, and vanilla cream swirl.",
  "Special Milk Tea":
    "Freshly boiled full-cream milk tea slow-brewed with handpicked Assam tea leaves and aromatic spices.",
  "Hot Coffee":
    "Freshly brewed steaming cup of artisanal coffee made with roasted Arabica beans and silky frothed milk.",
  "Chocolate Tea / Coffee":
    "Unique fusion of rich roasted cocoa and aromatic brew, delivering a velvety chocolate indulgence.",
  "Rose Tea / Coffee":
    "Delicately infused with natural rose extracts and cardamom for a fragrant, soothing floral sip.",
  "Almond Hot Coffee":
    "Rich steaming coffee enriched with crushed roasted almonds and velvety froth for a nutty treat.",
  "Cardamom Tea":
    "Traditional Indian milk chai slow-brewed with freshly crushed green elaichi pods for a royal aroma.",
  "Ginger Tea (Adrak Chai)":
    "Strong rejuvenating tea infused with freshly grated zesty ginger and whole milk for an instant refresh.",
  "Kadak Chai":
    "Extra-strong, bold Assam CTC brew simmered to dark golden perfection for genuine Indian chai lovers.",
  "Keshar Chai":
    "Exquisite golden tea infused with pure saffron strands and cardamom for a luxurious rich flavour.",
  "Masala Chai":
    "Signature cafe blend of ginger, cloves, cinnamon, and black pepper slow-brewed in creamy milk.",
  "Mocha Coffee":
    "Decadent blend of bold espresso, rich dark chocolate syrup, and steamed milk topped with cocoa.",
  "Green Tea":
    "Pure antioxidant-rich whole leaf green tea offering a refreshing, light, and healthy herbal cleanse.",
  "Lemon Honey Tea":
    "Soothing golden brew infused with freshly squeezed lemon juice and pure organic honey for warmth.",

  // --- TPC Special Premium Tea (5 items) ---
  "Special Jaggery Tea":
    "Traditional immunity chai sweetened naturally with pure organic gur (jaggery) and aromatic spices.",
  "Immunity Booster Tea":
    "Ayurvedic herbal blend with fresh tulsi, crushed ginger, black pepper, and cinnamon to energize.",
  "Black Coffee":
    "Bold, intense shot of pure roasted Arabica brew served piping hot with zero dairy and rich aroma.",
  "Flavored Cold Coffee":
    "Thick chilled cafe-style cold coffee blended with rich vanilla ice cream and sweet aromatic syrups.",
  "Mathca Tea":
    "Authentic vibrant green matcha whisked smooth with warm milk for balanced focus and calm energy.",

  // --- Combos (6 items) ---
  "Bun Maska+Tea/Cold Drinks":
    "Oven-soft toasted bun smothered in rich dairy butter, served with steaming chai or chilled drink.",
  "Sandwich+Peri-Peri":
    "Crispy grilled cafe sandwich packed with veggies, paired with crunchy peri-peri spiced french fries.",
  "Sandwich+Peri-Peri+Cold Drinks":
    "Ultimate feast of loaded grilled sandwich, spicy peri-peri fries, and an ice-cold fizzy drink.",
  "Peri-Peri+Cold Drinks/Tea":
    "Crispy golden french fries tossed in zesty peri-peri seasoning, served with your choice of beverage.",
  "Sandwich+Cold Drinks/Tea":
    "Golden grilled sandwich stuffed with savory seasoned filling, paired with fresh tea or chilled drink.",
  "Burger+Cold Drinks/Tea":
    "Juicy stacked burger layered with crispy patty and fresh veggies, served with hot tea or cold drink.",

  // --- Drinks (6 items) ---
  "Mojito":
    "Refreshing fizzy mocktail infused with crushed fresh mint leaves, lime wedges, and crisp soda over ice.",
  "Soft Drinks":
    "Chilled bottle of carbonated refreshment served frosty cold to quench your instant thirst.",
  "Banana Shake":
    "Thick creamy shake blended with fresh ripe bananas, whole milk, and a hint of sweet vanilla.",
  "Lassi / Flavour Lassi":
    "Traditional thick churned sweet yogurt drink, garnished with crushed nuts and rich malai.",
  "Water 1 Ltr.":
    "Pure packaged mineral water bottle chilled and sealed for safe, crisp hydration on the go.",
  "Water 500 ML":
    "Convenient 500ml sealed mineral drinking water bottle, refreshing and hygienically packaged.",

  // --- Instant Hunger (15 items) ---
  "Sandwich":
    "Crispy golden toasted bread loaded with garden-fresh vegetables, herbs, and tangy sandwich spread.",
  "Bun Maska":
    "Classic Mumbai-style soft bun generously slathered with salted butter and lightly grilled to golden.",
  "Peri-Peri":
    "Crunchy deep-fried golden potato fries generously tossed in hot and tangy African peri-peri spice.",
  "Chhola Bhatura":
    "Piping hot fluffy bhature served with slow-cooked spicy Amritsari chhole and pickled onions.",
  "Bhatura (Per Piece)":
    "Single golden puffed bhatura, deep-fried to crisp perfection with a light and airy texture.",
  "TPC Special Momos (Full)":
    "Handcrafted steamed dumplings packed with juicy seasoned vegetable stuffing and spicy red chutney.",
  "Paneer Momos (8Pcs)":
    "Eight delicate steamed momos generously stuffed with spiced cottage cheese and minced fresh herbs.",
  "Kurkure Momos (Veg.) (6Pcs)":
    "Six crunchy coated deep-fried momos tossed in special masala, served with mayonnaise and fiery dip.",
  "Dahi Bada (2Pcs)":
    "Soft lentil dumplings soaked in creamy sweet yogurt, topped with roasted cumin and tangy chutney.",
  "Burger":
    "Grilled savory vegetable patty layered with crisp lettuce, sliced tomatoes, cheese, and creamy mayo.",
  "Maggi":
    "The all-time classic 2-minute instant noodles cooked with signature tastemaker masala and savory spices.",
  "Veg. Maggi":
    "Classic noodles tossed with finely diced onions, green peas, carrots, and special aromatic spices.",
  "Cheez Maggi":
    "Hot steaming noodles smothered with generous melted cheddar cheese and freshly crushed black pepper.",
  "Butter Egg Aamlet (Full)":
    "Fluffy double-egg omelette whisked with onions, green chillies, and cooked in pure amul butter.",
  "Butter Egg Aamlet (Half)":
    "Single-egg golden omelette pan-seared with fresh onions and green chillies in rich amul butter.",

  // --- Chinese & Rolls & Main Course (46 items) ---
  "Egg Roll Single":
    "Crispy flaky paratha wrapped with a farm-fresh egg, sliced crunchy onions, and tangy sauces.",
  "Egg Roll Double":
    "Flaky golden kathi roll layered with two fluffy eggs, crisp salad, and spicy mint mayonnaise.",
  "Egg Chicken Roll Single":
    "Flaky roll stuffed with seasoned tender chicken chunks, a layered fried egg, and chef's special sauce.",
  "Egg Chicken Roll Double":
    "Loaded paratha roll with double fried eggs, succulent grilled chicken pieces, and zesty sauces.",
  "Paneer Roll":
    "Soft flatbread roll generously filled with marinated cottage cheese cubes, capsicum, and herb mayo.",
  "Veg Roll":
    "Crispy paratha wrap stuffed with sauteed garden vegetables, spiced potatoes, and tangy mint dip.",
  "Paneer Chilli (Full)":
    "Crispy fried cottage cheese cubes tossed with capsicum, onions, dark soy sauce, and green chillies.",
  "Paneer Chilli (Half)":
    "Tender paneer cubes wok-tossed in spicy Indo-Chinese chilli gravy with bell peppers and spring onion.",
  "Paneer Pyaza (Half)":
    "Rich North Indian cottage cheese curry cooked with caramelized onions, tomatoes, and garam masala.",
  "Paneer Pyaza (Full)":
    "Hearty portion of succulent paneer cooked in a thick spiced gravy loaded with crunchy sauteed onions.",
  "Paneer Butter Masala (Half)":
    "Soft paneer cubes simmered in a velvety smooth makhani tomato gravy enriched with fresh cream.",
  "Paneer Butter Masala (Full)":
    "Classic royal feast of cottage cheese chunks bathed in rich buttery cashew and tomato gravy.",
  "Mashroom Masala (Full)":
    "Fresh button mushrooms slow-cooked in a thick, fragrant North Indian onion-tomato gravy with herbs.",
  "Mashroom Masala (Half)":
    "Tender sliced button mushrooms prepared in an aromatic semi-dry spiced gravy with fresh coriander.",
  "Mashroom Chilli (Full)":
    "Crisp-fried button mushrooms tossed in spicy garlic soy sauce with crunchy capsicum and onions.",
  "Mashroom Chilli (Half)":
    "Indo-Chinese style wok-tossed crispy mushrooms glazed in a savory hot chilli and garlic sauce.",
  "Chicken Chilli (Full)":
    "Batter-fried crispy chicken bites tossed with crunchy bell peppers, onions, and spicy chilli glaze.",
  "Chicken Chilli (Half)":
    "Juicy diced chicken chunks stir-fried in aromatic green chilli, garlic, and savory soy sauce.",
  "Veg Manchurian (Full)":
    "Crispy vegetable dumplings simmered in a thick, tangy, and savory Indo-Chinese garlic gravy.",
  "Veg Manchurian (Half)":
    "Deep-fried seasoned vegetable balls tossed in fragrant soy-ginger glaze with chopped spring onions.",
  "Paratha (1Pcs)":
    "Single golden pan-toasted layered flatbread cooked on a traditional tawa with pure ghee.",
  "Paneer Paratha (2Pcs)":
    "Pair of whole wheat flatbreads stuffed with spiced crumbled paneer and fresh chopped herbs.",
  "Lachchha Paratha":
    "Crispy multi-layered whole wheat flatbread brushed with melted butter and roasted to golden perfection.",
  "Aloo Paratha (2Pcs)":
    "Two classic stuffed tawa parathas packed with seasoned mashed potatoes and roasted cumin.",
  "Butter Paratha (1Pcs)":
    "Flaky golden layered tawa paratha generously smeared with melting butter on both sides.",
  "Sattu Paratha (2Pcs)":
    "Two traditional flatbreads stuffed with roasted spiced gram flour, carom seeds, and mustard oil.",
  "Veg Fry Rice (Half)":
    "Fragrant basmati rice stir-fried in a hot wok with finely diced vegetables and light soy sauce.",
  "Egg Fry Rice (Half)":
    "Wok-tossed aromatic rice blended with scrambled eggs, shredded carrots, and aromatic seasonings.",
  "Egg Fry Rice (Full)":
    "Generous serving of wok-fried rice tossed with fluffy scrambled eggs, spring onions, and pepper.",
  "Chicken Fry Rice (Full)":
    "Long-grain basmati rice stir-fried with juicy seasoned chicken cubes, vegetables, and Chinese sauces.",
  "Chicken Fry Rice (Half)":
    "Classic wok-tossed fried rice cooked with tender chicken pieces, garlic, and fresh spring onions.",
  "Egg Chicken Fry Rice (Full)":
    "Hearty combination of wok-tossed rice with shredded chicken, fluffy scrambled eggs, and spices.",
  "Egg Chicken Fry Rice (Half)":
    "Savory fried rice prepared with tender chicken bites, whisked egg ribbons, and aromatic herbs.",
  "Chicken Pakora (6 Piece)":
    "Six pieces of juicy chicken marinated in authentic spices and deep-fried to a golden crunch.",
  "Chowmein (Half)":
    "Street-style stir-fried hakka noodles tossed with crunchy shredded cabbage, capsicum, and soy sauce.",
  "Chowmein (Full)":
    "Large portion of classic wok-tossed hakka noodles with crisp garden vegetables and zesty spices.",
  "Chicken Chowmein (Half)":
    "Stir-fried noodles cooked with tender marinated chicken strips, crunchy onions, and Chinese sauce.",
  "Chicken Chowmein (Full)":
    "Full plate of wok-tossed noodles loaded with shredded chicken, crunchy vegetables, and savory sauce.",
  "Paneer Chowmein (Half)":
    "Delicate hakka noodles stir-fried with golden paneer cubes, capsicum, and garlic-infused soy sauce.",
  "Paneer Chowmein (Full)":
    "Generous platter of wok-fried noodles loaded with succulent cottage cheese cubes and vegetables.",
  "Egg Chowmein (Full)":
    "Wok-tossed street-style noodles scrambled with farm-fresh eggs, shredded cabbage, and dark soy.",
  "Chicken Egg Chowmein (Half)":
    "Flavorful stir-fried noodles tossed with juicy chicken bites, scrambled eggs, and oriental spices.",
  "Chicken Egg Chowmein (Full)":
    "Hearty portion of savory noodles packed with both chicken strips and scrambled egg ribbons.",
  "Paneer Pakaura (Full-12pcs)":
    "Twelve pieces of fresh cottage cheese coated in spiced gram flour batter and fried crispy golden.",
  "Paneer Pakaura (Half-6pcs)":
    "Six melt-in-mouth paneer fritters seasoned with ajwain and chaat masala, served with green chutney."
};

async function updateAll() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const collection = mongoose.connection.collection('menuitems');
    const items = await collection.find({}).toArray();
    console.log(`Found ${items.length} items to update.`);

    let updatedCount = 0;
    let missing = [];

    for (const item of items) {
      const desc = descriptions[item.name];
      if (desc) {
        await collection.updateOne(
          { _id: item._id },
          { $set: { description: desc } }
        );
        updatedCount++;
      } else {
        missing.push(item.name);
      }
    }

    console.log(`Successfully updated ${updatedCount} items!`);
    if (missing.length > 0) {
      console.warn('Items without matching description:', missing);
    }

    await mongoose.disconnect();
    console.log('Done!');
  } catch (err) {
    console.error('Error updating descriptions:', err);
    process.exit(1);
  }
}

updateAll();


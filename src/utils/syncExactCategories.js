require('dotenv').config();
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch(e) {}
const mongoose = require('mongoose');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');

const targetCategories = [
  {
    name: 'TPC SPECIAL PREMIUM TEA',
    slug: 'tpc-special-premium-tea',
    description: 'Special jaggery tea, immunity booster, matcha & artisan brews.',
    order: 1,
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=500&q=80'
  },
  {
    name: 'TEA & COFFEE',
    slug: 'tea-coffee',
    description: 'Freshly brewed hot teas, classic coffees & specialty infusions.',
    order: 2,
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=500&q=80'
  },
  {
    name: 'CHINEES',
    slug: 'chinees',
    description: 'Chinese rolls, chilli gravies, fried rice, chowmein, parathas & pakoras.',
    order: 3,
    image: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=500&q=80'
  },
  {
    name: 'INSTANT HUNGER',
    slug: 'instant-hunger',
    description: 'Sandwiches, bun maska, peri-peri, momos, burgers & maggi.',
    order: 4,
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=500&q=80'
  },
  {
    name: 'COMBO',
    slug: 'combo',
    description: 'Delicious value meal combos with sides & beverages.',
    order: 5,
    image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=500&q=80'
  },
  {
    name: 'Cold Drinks',
    slug: 'cold-drinks',
    description: 'Chilled frappes, shakes, thick lassi & iced refreshments.',
    order: 6,
    image: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=500&q=80'
  },
  {
    name: 'DRINKS',
    slug: 'drinks',
    description: 'Refreshing mojitos, soft drinks & packaged drinking water.',
    order: 7,
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=500&q=80'
  }
];

async function sync() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for syncing exact categories...');

    const allowedSlugs = targetCategories.map(c => c.slug);
    const categoryDocMap = {};

    // 1. Create or update the 7 exact categories
    for (const catData of targetCategories) {
      let doc = await Category.findOne({
        $or: [
          { slug: catData.slug },
          { name: new RegExp(`^${catData.name.replace('&', '\\&')}$`, 'i') }
        ]
      });

      if (!doc) {
        doc = await Category.create(catData);
        console.log(`Created: ${doc.name}`);
      } else {
        doc.name = catData.name;
        doc.slug = catData.slug;
        doc.order = catData.order;
        doc.description = catData.description;
        doc.image = catData.image;
        await doc.save();
        console.log(`Updated: ${doc.name}`);
      }
      categoryDocMap[catData.slug] = doc;
    }

    // 2. Remove all old/extra categories not in the 7 allowed
    const extraCategories = await Category.find({ slug: { $nin: allowedSlugs } });
    console.log(`Found ${extraCategories.length} extra categories to clean up:`, extraCategories.map(c => c.name));

    for (const extra of extraCategories) {
      // Reassign any menu items linked to this extra category
      let fallbackSlug = 'instant-hunger';
      const extraName = extra.name.toLowerCase();
      if (extraName.includes('coffee') || extraName.includes('tea')) fallbackSlug = 'tea-coffee';
      else if (extraName.includes('shake') || extraName.includes('cold')) fallbackSlug = 'cold-drinks';
      else if (extraName.includes('drink')) fallbackSlug = 'drinks';
      else if (extraName.includes('chine')) fallbackSlug = 'chinees';

      const targetDoc = categoryDocMap[fallbackSlug];
      if (targetDoc) {
        await MenuItem.updateMany(
          { category: extra._id },
          { $set: { category: targetDoc._id, categorySlug: targetDoc.slug } }
        );
      }

      await Category.deleteOne({ _id: extra._id });
      console.log(`Deleted extra category: ${extra.name}`);
    }

    // 3. Move cold coffee & shakes items to "Cold Drinks"
    const coldDrinksCat = categoryDocMap['cold-drinks'];
    if (coldDrinksCat) {
      const coldNames = [
        'Cold Coffee',
        'Flavored Cold Coffee',
        'Butterscotch Cold Coffee',
        'Caramel Cold Coffee',
        'Vanilla Cold Coffee',
        'Banana Shake',
        'Lassi / Flavour Lassi',
        'Mango Cold Beverage'
      ];
      await MenuItem.updateMany(
        { name: { $in: coldNames } },
        { $set: { category: coldDrinksCat._id, categorySlug: coldDrinksCat.slug } }
      );
      console.log('Categorized cold beverages into "Cold Drinks"');
    }

    // 4. Verify Final Categories
    const finalCats = await Category.find({}).sort({ order: 1 });
    console.log('\n--- FINAL 7 CATEGORIES IN DATABASE ---');
    finalCats.forEach(c => console.log(`${c.order}. ${c.name} (${c.slug})`));

    process.exit(0);
  } catch (err) {
    console.error('Category sync error:', err);
    process.exit(1);
  }
}

sync();

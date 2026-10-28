require('dotenv').config();
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch(e) {}
const mongoose = require('mongoose');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');

const primeCafeCategories = [
  {
    name: 'Instant Hunger',
    slug: 'instant-hunger',
    description: 'Quick bites, sandwiches, bun maska, momos, burgers & maggi.',
    order: 1,
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=500&q=80'
  },
  {
    name: 'Combo',
    slug: 'combo',
    description: 'Special value combos with sandwiches, burgers, peri-peri & drinks.',
    order: 2,
    image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=500&q=80'
  },
  {
    name: 'Chinees',
    slug: 'chinees',
    description: 'Chinese rolls, chilli gravies, fried rice, chowmein, parathas & pakoras.',
    order: 3,
    image: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=500&q=80'
  },
  {
    name: 'Tea & Coffee',
    slug: 'tea-coffee',
    description: 'Aromatic teas, rich hot coffees, and refreshing thick cold coffees.',
    order: 4,
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=500&q=80'
  },
  {
    name: 'TPC Special Premium Tea',
    slug: 'tpc-special-premium-tea',
    description: 'Artisanal health teas, jaggery tea, matcha & specialty coffees.',
    order: 5,
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=500&q=80'
  },
  {
    name: 'Drinks',
    slug: 'drinks',
    description: 'Chilled mojitos, rich banana shakes, lassi, soft drinks & bottled water.',
    order: 6,
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=500&q=80'
  }
];

const primeCafeItems = [
  // --- INSTANT HUNGER ---
  { name: 'Sandwich', price: 49, categorySlug: 'instant-hunger', isVeg: true },
  { name: 'Bun Maska', price: 39, categorySlug: 'instant-hunger', isVeg: true },
  { name: 'Peri-Peri', price: 49, categorySlug: 'instant-hunger', isVeg: true },
  { name: 'Chhola Bhatura', price: 50, categorySlug: 'instant-hunger', isVeg: true },
  { name: 'Bhatura (Per Piece)', price: 20, categorySlug: 'instant-hunger', isVeg: true },
  { name: 'TPC Special Momos (Full)', price: 120, categorySlug: 'instant-hunger', isVeg: true },
  { name: 'Paneer Momos (8Pcs)', price: 150, categorySlug: 'instant-hunger', isVeg: true },
  { name: 'Kurkure Momos (Veg.) (6Pcs)', price: 120, categorySlug: 'instant-hunger', isVeg: true },
  { name: 'Dahi Bada (2Pcs)', price: 60, categorySlug: 'instant-hunger', isVeg: true },
  { name: 'Burger', price: 60, categorySlug: 'instant-hunger', isVeg: true },
  { name: 'Maggi', price: 60, categorySlug: 'instant-hunger', isVeg: true },
  { name: 'Veg. Maggi', price: 80, categorySlug: 'instant-hunger', isVeg: true },
  { name: 'Cheez Maggi', price: 90, categorySlug: 'instant-hunger', isVeg: true },
  { name: 'Butter Egg Aamlet (Full)', price: 120, categorySlug: 'instant-hunger', isVeg: false },
  { name: 'Butter Egg Aamlet (Half)', price: 70, categorySlug: 'instant-hunger', isVeg: false },

  // --- COMBO ---
  { name: 'Bun Maska+Tea/Cold Drinks', price: 59, categorySlug: 'combo', isVeg: true },
  { name: 'Sandwich+Peri-Peri', price: 89, categorySlug: 'combo', isVeg: true },
  { name: 'Sandwich+Peri-Peri+Cold Drinks', price: 109, categorySlug: 'combo', isVeg: true },
  { name: 'Peri-Peri+Cold Drinks/Tea', price: 69, categorySlug: 'combo', isVeg: true },
  { name: 'Sandwich+Cold Drinks/Tea', price: 69, categorySlug: 'combo', isVeg: true },
  { name: 'Burger+Cold Drinks/Tea', price: 79, categorySlug: 'combo', isVeg: true },

  // --- DRINKS ---
  { name: 'Mojito', price: 70, categorySlug: 'drinks', isVeg: true },
  { name: 'Soft Drinks', price: 30, categorySlug: 'drinks', isVeg: true },
  { name: 'Banana Shake', price: 80, categorySlug: 'drinks', isVeg: true },
  { name: 'Lassi / Flavour Lassi', price: 80, categorySlug: 'drinks', isVeg: true },
  { name: 'Water 1 Ltr.', price: 20, categorySlug: 'drinks', isVeg: true },
  { name: 'Water 500 ML', price: 10, categorySlug: 'drinks', isVeg: true },

  // --- CHINEES ---
  { name: 'Egg Roll Single', price: 40, categorySlug: 'chinees', isVeg: false },
  { name: 'Egg Roll Double', price: 50, categorySlug: 'chinees', isVeg: false },
  { name: 'Egg Chicken Roll Single', price: 110, categorySlug: 'chinees', isVeg: false },
  { name: 'Egg Chicken Roll Double', price: 140, categorySlug: 'chinees', isVeg: false },
  { name: 'Paneer Roll', price: 80, categorySlug: 'chinees', isVeg: true },
  { name: 'Veg Roll', price: 70, categorySlug: 'chinees', isVeg: true },
  { name: 'Paneer Chilli (Full)', price: 200, categorySlug: 'chinees', isVeg: true },
  { name: 'Paneer Chilli (Half)', price: 110, categorySlug: 'chinees', isVeg: true },
  { name: 'Paneer Pyaza (Half)', price: 120, categorySlug: 'chinees', isVeg: true },
  { name: 'Paneer Pyaza (Full)', price: 240, categorySlug: 'chinees', isVeg: true },
  { name: 'Paneer Butter Masala (Half)', price: 130, categorySlug: 'chinees', isVeg: true },
  { name: 'Paneer Butter Masala (Full)', price: 250, categorySlug: 'chinees', isVeg: true },
  { name: 'Mashroom Masala (Full)', price: 220, categorySlug: 'chinees', isVeg: true },
  { name: 'Mashroom Masala (Half)', price: 120, categorySlug: 'chinees', isVeg: true },
  { name: 'Mashroom Chilli (Full)', price: 200, categorySlug: 'chinees', isVeg: true },
  { name: 'Mashroom Chilli (Half)', price: 110, categorySlug: 'chinees', isVeg: true },
  { name: 'Chicken Chilli (Full)', price: 200, categorySlug: 'chinees', isVeg: false },
  { name: 'Chicken Chilli (Half)', price: 110, categorySlug: 'chinees', isVeg: false },
  { name: 'Veg Manchurian (Full)', price: 130, categorySlug: 'chinees', isVeg: true },
  { name: 'Veg Manchurian (Half)', price: 70, categorySlug: 'chinees', isVeg: true },
  { name: 'Paratha (1Pcs)', price: 15, categorySlug: 'chinees', isVeg: true },
  { name: 'Paneer Paratha (2Pcs)', price: 80, categorySlug: 'chinees', isVeg: true },
  { name: 'Lachchha Paratha', price: 40, categorySlug: 'chinees', isVeg: true },
  { name: 'Aloo Paratha (2Pcs)', price: 60, categorySlug: 'chinees', isVeg: true },
  { name: 'Butter Paratha (1Pcs)', price: 25, categorySlug: 'chinees', isVeg: true },
  { name: 'Sattu Paratha (2Pcs)', price: 60, categorySlug: 'chinees', isVeg: true },
  { name: 'Veg Fry Rice (Full)', price: 110, categorySlug: 'chinees', isVeg: true },
  { name: 'Veg Fry Rice (Half)', price: 70, categorySlug: 'chinees', isVeg: true },
  { name: 'Egg Fry Rice (Half)', price: 80, categorySlug: 'chinees', isVeg: false },
  { name: 'Egg Fry Rice (Full)', price: 130, categorySlug: 'chinees', isVeg: false },
  { name: 'Chicken Fry Rice (Full)', price: 160, categorySlug: 'chinees', isVeg: false },
  { name: 'Chicken Fry Rice (Half)', price: 90, categorySlug: 'chinees', isVeg: false },
  { name: 'Egg Chicken Fry Rice (Full)', price: 180, categorySlug: 'chinees', isVeg: false },
  { name: 'Egg Chicken Fry Rice (Half)', price: 100, categorySlug: 'chinees', isVeg: false },
  { name: 'Chicken Pakora (6 Piece)', price: 100, categorySlug: 'chinees', isVeg: false },
  { name: 'Chowmein (Half)', price: 40, categorySlug: 'chinees', isVeg: true },
  { name: 'Chowmein (Full)', price: 70, categorySlug: 'chinees', isVeg: true },
  { name: 'Chicken Chowmein (Half)', price: 60, categorySlug: 'chinees', isVeg: false },
  { name: 'Chicken Chowmein (Full)', price: 90, categorySlug: 'chinees', isVeg: false },
  { name: 'Paneer Chowmein (Half)', price: 70, categorySlug: 'chinees', isVeg: true },
  { name: 'Paneer Chowmein (Full)', price: 110, categorySlug: 'chinees', isVeg: true },
  { name: 'Egg Chowmein (Half)', price: 50, categorySlug: 'chinees', isVeg: false },
  { name: 'Egg Chowmein (Full)', price: 90, categorySlug: 'chinees', isVeg: false },
  { name: 'Chicken Egg Chowmein (Half)', price: 70, categorySlug: 'chinees', isVeg: false },
  { name: 'Chicken Egg Chowmein (Full)', price: 110, categorySlug: 'chinees', isVeg: false },
  { name: 'Paneer Pakaura (Full-12pcs)', price: 200, categorySlug: 'chinees', isVeg: true },
  { name: 'Paneer Pakaura (Half-6pcs)', price: 100, categorySlug: 'chinees', isVeg: true },

  // --- TEA & COFFEE ---
  { name: 'Special Milk Tea', price: 30, categorySlug: 'tea-coffee', isVeg: true },
  { name: 'Hot Coffee', price: 50, categorySlug: 'tea-coffee', isVeg: true },
  { name: 'Cold Coffee', price: 99, categorySlug: 'tea-coffee', isVeg: true },
  { name: 'Chocolate Tea / Coffee', price: 50, categorySlug: 'tea-coffee', isVeg: true },
  { name: 'Rose Tea / Coffee', price: 50, categorySlug: 'tea-coffee', isVeg: true },
  { name: 'Almond Hot Coffee', price: 50, categorySlug: 'tea-coffee', isVeg: true },
  { name: 'Butterscotch Cold Coffee', price: 99, categorySlug: 'tea-coffee', isVeg: true },
  { name: 'Caramel Cold Coffee', price: 99, categorySlug: 'tea-coffee', isVeg: true },
  { name: 'Cardamom Tea', price: 30, categorySlug: 'tea-coffee', isVeg: true },
  { name: 'Ginger Tea (Adrak Chai)', price: 30, categorySlug: 'tea-coffee', isVeg: true },
  { name: 'Kadak Chai', price: 30, categorySlug: 'tea-coffee', isVeg: true },
  { name: 'Keshar Chai', price: 30, categorySlug: 'tea-coffee', isVeg: true },
  { name: 'Mango Cold Beverage', price: 80, categorySlug: 'tea-coffee', isVeg: true },
  { name: 'Masala Chai', price: 30, categorySlug: 'tea-coffee', isVeg: true },
  { name: 'Mocha Coffee', price: 99, categorySlug: 'tea-coffee', isVeg: true },
  { name: 'Vanilla Cold Coffee', price: 99, categorySlug: 'tea-coffee', isVeg: true },
  { name: 'Green Tea', price: 30, categorySlug: 'tea-coffee', isVeg: true },
  { name: 'Lemon Honey Tea', price: 30, categorySlug: 'tea-coffee', isVeg: true },

  // --- TPC SPECIAL PREMIUM TEA ---
  { name: 'Special Jaggery Tea', price: 39, categorySlug: 'tpc-special-premium-tea', isVeg: true },
  { name: 'Immunity Booster Tea', price: 39, categorySlug: 'tpc-special-premium-tea', isVeg: true },
  { name: 'Black Coffee', price: 59, categorySlug: 'tpc-special-premium-tea', isVeg: true },
  { name: 'Flavored Cold Coffee', price: 99, categorySlug: 'tpc-special-premium-tea', isVeg: true },
  { name: 'Matcha Tea', price: 99, categorySlug: 'tpc-special-premium-tea', isVeg: true }
];

async function seed() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for syncing Prime Cafe cards...');

    const categoryMap = {};

    for (const catData of primeCafeCategories) {
      let cat = await Category.findOne({ slug: catData.slug });
      if (!cat) {
        cat = await Category.create(catData);
        console.log(`Created Category: ${cat.name}`);
      } else {
        cat.name = catData.name;
        cat.order = catData.order;
        await cat.save();
      }
      categoryMap[catData.slug] = cat._id;
    }

    let addedCount = 0;
    for (const item of primeCafeItems) {
      const catId = categoryMap[item.categorySlug];
      if (!catId) continue;

      const existing = await MenuItem.findOne({ name: item.name });
      if (!existing) {
        await MenuItem.create({
          name: item.name,
          price: item.price,
          category: catId,
          categorySlug: item.categorySlug,
          isVeg: item.isVeg,
          availability: true,
          prepTime: '10-15 mins'
        });
        addedCount++;
      } else {
        existing.price = item.price;
        existing.category = catId;
        existing.categorySlug = item.categorySlug;
        existing.isVeg = item.isVeg;
        await existing.save();
      }
    }

    console.log(`Successfully synced ${primeCafeItems.length} menu items (${addedCount} newly added)!`);
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();

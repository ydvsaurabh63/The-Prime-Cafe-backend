require('dotenv').config();
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch(e) {}
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const User = require('../models/User');
const Table = require('../models/Table');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const Offer = require('../models/Offer');
const Notification = require('../models/Notification');
const Order = require('../models/Order');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/aaj_kal_cafe';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to MongoDB for seeding...');

    // Clear existing data (optional, or upsert)
    await User.deleteMany({});
    await Table.deleteMany({});
    await Category.deleteMany({});
    await MenuItem.deleteMany({});
    await Offer.deleteMany({});
    await Notification.deleteMany({});
    await Order.deleteMany({});

    console.log('[Seed] Cleared old records.');

    // 1. Create Default Admin User
    const adminSalt = await bcrypt.genSalt(10);
    const adminPasswordHash = await bcrypt.hash('Admin@123', adminSalt);
    const adminUser = await User.create({
      name: 'The Prime Cafe Admin',
      email: 'admin@theprimecafe.com',
      phone: '+919876543210',
      passwordHash: adminPasswordHash,
      role: 'admin',
      isVerified: true,
      rewardPoints: 1000
    });
    console.log(`[Seed] Admin created: admin@theprimecafe.com / Admin@123`);

    // 2. Create Sample Customer User
    const custSalt = await bcrypt.genSalt(10);
    const custPasswordHash = await bcrypt.hash('Customer@123', custSalt);
    const customerUser = await User.create({
      name: 'Rohan Sharma',
      email: 'rohan@example.com',
      phone: '+919812345678',
      passwordHash: custPasswordHash,
      role: 'customer',
      isVerified: true,
      rewardPoints: 150
    });
    console.log(`[Seed] Demo Customer created: rohan@example.com / Customer@123`);

    // 3. Create Tables with Real QR Codes
    const tablesList = [
      { tableNumber: 'Table 01', identifier: '01', seatingCapacity: 2 },
      { tableNumber: 'Table 02', identifier: '02', seatingCapacity: 4 },
      { tableNumber: 'Table 03', identifier: '03', seatingCapacity: 4 },
      { tableNumber: 'Table 04', identifier: '04', seatingCapacity: 6 },
      { tableNumber: 'Table 05', identifier: '05', seatingCapacity: 4 }
    ];

    const frontendBase = process.env.FRONTEND_URL || 'https://the-prime-cafe-frontend.vercel.app';
    for (const t of tablesList) {
      const qrUrl = `${frontendBase}/cafe?table=${encodeURIComponent(t.identifier)}`;
      const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
        width: 350,
        margin: 2,
        color: { dark: '#3D2314', light: '#FAF7F2' }
      });
      await Table.create({
        ...t,
        isActive: true,
        qrCodeDataUrl
      });
    }
    console.log(`[Seed] 5 Tables with QR Codes created.`);

    // 4. Create Categories
    const categoriesData = [
      {
        name: 'TPC SPECIAL PREMIUM TEA',
        slug: 'tpc-special-premium-tea',
        description: 'Exclusive artisanal and handcrafted premium hot teas.',
        image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80',
        order: 1
      },
      {
        name: 'TEA & COFFEE',
        slug: 'tea-coffee',
        description: 'Classic handcrafted teas, milk teas, and hot coffee brews.',
        image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80',
        order: 2
      },
      {
        name: 'CHINEES',
        slug: 'chinees',
        description: 'Sizzling noodles, crispy momos, fried rice, and Indo-Chinese delights.',
        image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80',
        order: 3
      },
      {
        name: 'INSTANT HUNGER',
        slug: 'instant-hunger',
        description: 'Quick bites, cheesy burgers, sandwiches, crispy fries, and savory snacks.',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
        order: 4
      },
      {
        name: 'COMBO',
        slug: 'combo',
        description: 'Value-packed food and drink meal combinations.',
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
        order: 5
      },
      {
        name: 'Cold Drinks',
        slug: 'cold-drinks',
        description: 'Packaged cold drinks, sodas, and fizzy refreshments.',
        image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80',
        order: 6
      },
      {
        name: 'DRINKS',
        slug: 'drinks',
        description: 'Decadent thick shakes, cold coffee, iced frappes, and chill coolers.',
        image: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80',
        order: 7
      }
    ];

    const savedCategories = await Category.insertMany(categoriesData);
    const catMap = {};
    savedCategories.forEach(c => { catMap[c.slug] = c._id; });
    console.log(`[Seed] 5 Menu Categories created.`);

    // 5. Create Menu Items
    const menuItemsData = [
      // Coffee & Tea
      {
        name: 'Classic Hazelnut Cappuccino',
        description: 'Rich dark espresso shot, steamed velvet milk, hazelnut syrup drizzle, and cocoa dust.',
        image: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=600&q=80',
        price: 180,
        category: catMap['coffee-tea'],
        categorySlug: 'coffee-tea',
        isVeg: true,
        prepTime: '7-10 mins',
        tags: ['Bestseller', 'Hot', 'Cafe Special']
      },
      {
        name: 'The Prime Signature Espresso Macchiato',
        description: 'Double shot of single-origin Arabica coffee marked with silky micro-foam.',
        image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
        price: 140,
        category: catMap['coffee-tea'],
        categorySlug: 'coffee-tea',
        isVeg: true,
        prepTime: '5-7 mins',
        tags: ['Classic']
      },
      {
        name: 'Kullad Masala Chai with Elaichi',
        description: 'Traditional Assam CTC tea simmered with fresh cardamom, ginger, cloves, and whole milk.',
        image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
        price: 90,
        category: catMap['coffee-tea'],
        categorySlug: 'coffee-tea',
        isVeg: true,
        prepTime: '5-8 mins',
        tags: ['Desi Favourite']
      },

      // Cold Coffee & Shakes
      {
        name: 'Belgian Chocolate Thickshake',
        description: 'Dense dark Belgian chocolate shake topped with crushed waffle crisp & whipped cream.',
        image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80',
        price: 220,
        category: catMap['cold-coffee-shakes'],
        categorySlug: 'cold-coffee-shakes',
        isVeg: true,
        prepTime: '8-12 mins',
        tags: ['Bestseller', 'Kids Special']
      },
      {
        name: 'Iced Caramel Frappe',
        description: 'Blended espresso, golden caramel sauce, chilled milk, and vanilla cream swirl.',
        image: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80',
        price: 210,
        category: catMap['cold-coffee-shakes'],
        categorySlug: 'cold-coffee-shakes',
        isVeg: true,
        prepTime: '8-10 mins',
        tags: ['Popular']
      },

      // Pizza & Burger
      {
        name: 'Woodfired Margherita Pizza',
        description: 'San Marzano tomato base, fresh buffalo mozzarella, aromatic basil, and extra virgin olive oil.',
        image: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=600&q=80',
        price: 340,
        category: catMap['pizza-burger'],
        categorySlug: 'pizza-burger',
        isVeg: true,
        prepTime: '15-20 mins',
        tags: ['Chef Pick']
      },
      {
        name: 'Smoky BBQ Chicken Pepperoni Pizza',
        description: 'Loaded with sliced chicken pepperoni, smoked shredded chicken breast, jalapeños, and melted mozzarella.',
        image: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=600&q=80',
        price: 430,
        category: catMap['pizza-burger'],
        categorySlug: 'pizza-burger',
        isVeg: false,
        prepTime: '15-20 mins',
        tags: ['Non-Veg Bestseller', 'Chef Special']
      },
      {
        name: 'Gourmet Crispy Paneer Burger',
        description: 'Spiced herb-crusted paneer patty, chipotle aioli, crispy iceberg lettuce, in a brioche bun with salted fries.',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
        price: 260,
        category: catMap['pizza-burger'],
        categorySlug: 'pizza-burger',
        isVeg: true,
        prepTime: '12-15 mins',
        tags: ['Bestseller']
      },
      {
        name: 'Crispy Fried Chicken Fillet Burger',
        description: 'Double crunch golden chicken breast fillet, spicy sriracha mayo, gherkins, and cheddar in butter brioche.',
        image: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=600&q=80',
        price: 290,
        category: catMap['pizza-burger'],
        categorySlug: 'pizza-burger',
        isVeg: false,
        prepTime: '12-15 mins',
        tags: ['Non-Veg Must Try', 'Crispy']
      },
      {
        name: 'Smoky BBQ Farmhouse Pizza',
        description: 'Bell peppers, red onions, sweet corn, black olives, jalapeños, and BBQ mozzarella cheese.',
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
        price: 390,
        category: catMap['pizza-burger'],
        categorySlug: 'pizza-burger',
        isVeg: true,
        prepTime: '15-20 mins',
        tags: ['New']
      },

      // Snacks
      {
        name: 'Pull-Apart Cheese Garlic Bread',
        description: 'Toasted baguette stuffed with garlic butter, mozzarella, cheddar, and Italian herbs.',
        image: 'https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?auto=format&fit=crop&w=600&q=80',
        price: 190,
        category: catMap['snacks'],
        categorySlug: 'snacks',
        isVeg: true,
        prepTime: '10-12 mins',
        tags: ['Must Try']
      },
      {
        name: 'Crispy Hot Glazed BBQ Chicken Wings',
        description: 'Crispy fried chicken wings tossed in rich smoky Texas BBQ glaze served with creamy ranch dip.',
        image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=600&q=80',
        price: 270,
        category: catMap['snacks'],
        categorySlug: 'snacks',
        isVeg: false,
        prepTime: '12-15 mins',
        tags: ['Non-Veg Special']
      },
      {
        name: 'Peri-Peri Loaded French Fries',
        description: 'Golden potato fries tossed in hot African bird’s eye chili spice and cheesy sauce dip.',
        image: 'https://images.unsplash.com/photo-1585325701165-351af916e581?auto=format&fit=crop&w=600&q=80',
        price: 160,
        category: catMap['snacks'],
        categorySlug: 'snacks',
        isVeg: true,
        prepTime: '8-10 mins',
        tags: ['Popular']
      },

      // Desserts
      {
        name: 'Sizzling Brownie with Vanilla Bean Gelato',
        description: 'Warm fudge brownie served on a cast iron sizzler with hot melted Belgian dark chocolate sauce.',
        image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
        price: 240,
        category: catMap['desserts'],
        categorySlug: 'desserts',
        isVeg: true,
        prepTime: '7-10 mins',
        tags: ['Bestseller', 'Crowd Favourite']
      },
      {
        name: 'New York Baked Blueberry Cheesecake',
        description: 'Creamy slow-baked Philadelphia cream cheese slice topped with wild blueberry compote.',
        image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80',
        price: 250,
        category: catMap['desserts'],
        categorySlug: 'desserts',
        isVeg: true,
        prepTime: '5 mins',
        tags: ['Deluxe']
      }
    ];

    await MenuItem.insertMany(menuItemsData);
    console.log(`[Seed] ${menuItemsData.length} Premium Menu Items created (Veg & Non-Veg).`);

    // 6. Create Active Offers & Coupons
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 3);

    const offersData = [
      {
        title: 'Flat 20% Off Cafe Welcome Treat',
        description: 'Enjoy 20% off on your table order above ₹300 using coupon PRIME20.',
        image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
        discountType: 'percentage',
        discountValue: 20,
        couponCode: 'PRIME20',
        minimumOrderAmount: 300,
        maxDiscountAmount: 150,
        startDate: new Date(),
        endDate: nextMonth,
        isActive: true
      },
      {
        title: 'Instant ₹100 Off on Meals',
        description: 'Get flat ₹100 off when your order exceeds ₹500. Perfect for coffee & burger combos!',
        image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80',
        discountType: 'fixed',
        discountValue: 100,
        couponCode: 'FEAST100',
        minimumOrderAmount: 500,
        maxDiscountAmount: 100,
        startDate: new Date(),
        endDate: nextMonth,
        isActive: true
      },
      {
        title: 'Happy Hours Special 15%',
        description: 'Midday coffee booster: Flat 15% discount on all hot and cold brews.',
        image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=800&q=80',
        discountType: 'percentage',
        discountValue: 15,
        couponCode: 'HAPPYHOUR',
        minimumOrderAmount: 200,
        maxDiscountAmount: 80,
        startDate: new Date(),
        endDate: nextMonth,
        isActive: true
      }
    ];

    await Offer.insertMany(offersData);
    console.log(`[Seed] 3 Active Offers created.`);

    // 7. Create a Sample Demo Order
    const firstOrder = await Order.create({
      orderNumber: 'AKC-261021-1001',
      customer: customerUser._id,
      customerName: customerUser.name,
      customerPhone: customerUser.phone,
      tableNumber: 'Table 01',
      tableIdentifier: '01',
      items: [
        {
          menuItemId: savedCategories[0]._id, // ref placeholder
          name: 'Classic Hazelnut Cappuccino',
          price: 180,
          quantity: 2,
          subtotal: 360,
          isVeg: true
        },
        {
          menuItemId: savedCategories[1]._id,
          name: 'Pull-Apart Cheese Garlic Bread',
          price: 190,
          quantity: 1,
          subtotal: 190,
          isVeg: true
        }
      ],
      itemSubtotal: 550,
      couponCode: 'PRIME20',
      discount: 110,
      tax: 22,
      totalAmount: 462,
      paymentMethod: 'counter_upi',
      paymentStatus: 'pending',
      orderStatus: 'Accepted',
      specialInstructions: 'Less sweet for both cappuccinos please.'
    });

    // 8. Create Sample Notification
    await Notification.create({
      recipientRole: 'admin',
      type: 'new_order',
      title: 'New Order: AKC-261021-1001',
      message: `${customerUser.name} at Table 01 placed an order for ₹462`,
      order: firstOrder._id,
      orderNumber: firstOrder.orderNumber,
      isRead: false
    });

    console.log('[Seed] Database seeded with realistic cafe items, offers, and initial records.');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
};

seedData();

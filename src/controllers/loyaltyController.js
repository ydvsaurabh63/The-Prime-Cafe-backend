const Order = require('../models/Order');
const User = require('../models/User');
const Offer = require('../models/Offer');

const STAGE_CONFIGS = [
  {
    stageNumber: 1,
    stage: 'Stage 1',
    title: 'Free Regular Coffee',
    originalPrice: '₹120',
    discountedPrice: 'FREE',
    couponCode: 'FREECOFFEE',
    discountType: 'fixed',
    discountValue: 120,
    minimumOrderAmount: 120,
    requiredOrders: 1,
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=500&q=80'
  },
  {
    stageNumber: 2,
    stage: 'Stage 2',
    title: '₹50 OFF on Burgers',
    originalPrice: '₹200',
    discountedPrice: '₹150',
    couponCode: 'BURGER50',
    discountType: 'fixed',
    discountValue: 50,
    minimumOrderAmount: 150,
    requiredOrders: 2,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80'
  },
  {
    stageNumber: 3,
    stage: 'Stage 3',
    title: 'Free Garlic Bread',
    originalPrice: '₹150',
    discountedPrice: 'FREE',
    couponCode: 'FREEGARLIC',
    discountType: 'fixed',
    discountValue: 150,
    minimumOrderAmount: 150,
    requiredOrders: 3,
    image: 'https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?auto=format&fit=crop&w=500&q=80'
  },
  {
    stageNumber: 4,
    stage: 'Stage 4',
    title: '₹100 OFF on Pasta',
    originalPrice: '₹250',
    discountedPrice: '₹150',
    couponCode: 'PASTA100',
    discountType: 'fixed',
    discountValue: 100,
    minimumOrderAmount: 200,
    requiredOrders: 4,
    image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=500&q=80'
  },
  {
    stageNumber: 5,
    stage: 'Stage 5',
    title: 'Free Dessert',
    originalPrice: '₹180',
    discountedPrice: 'FREE',
    couponCode: 'FREEDESSERT',
    discountType: 'fixed',
    discountValue: 180,
    minimumOrderAmount: 180,
    requiredOrders: 5,
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=500&q=80'
  }
];

const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[d.getMonth()]}`;
};

const formatFullDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

// @desc    Get dynamic customer loyalty rewards progress
// @route   GET /api/loyalty/status
// @access  Public / Optional Auth
exports.getLoyaltyStatus = async (req, res, next) => {
  try {
    let orderCount = 0;
    let orders = [];
    let claimedRewards = [];
    let customerName = 'Guest';
    let customerPhone = '';

    if (req.user) {
      customerName = req.user.name || 'Valued Guest';
      customerPhone = req.user.phone || '';
      claimedRewards = Array.isArray(req.user.claimedRewards) ? req.user.claimedRewards : [];

      orders = await Order.find({
        customer: req.user._id,
        orderStatus: { $nin: ['Cancelled', 'Rejected'] }
      }).sort({ createdAt: 1 });

      orderCount = orders.length;
    } else if (req.query.guestOrders) {
      // Support guest session orders passed from frontend
      orderCount = Math.max(0, parseInt(req.query.guestOrders, 10) || 0);
    }

    // Build timeline milestones based on customer's actual orders
    const now = new Date();
    const steps = [1, 2, 3, 4, 5].map((orderNum) => {
      const orderIndex = orderNum - 1;
      let orderDate = '';

      if (orderIndex < orders.length) {
        orderDate = formatDate(orders[orderIndex].createdAt);
      } else {
        // Project target dates
        const offsetDays = (orderNum - Math.max(orderCount, 1)) * 6;
        const projected = new Date(now.getTime() + offsetDays * 24 * 60 * 60 * 1000);
        orderDate = formatDate(projected);
      }

      let status = 'locked';
      if (orderCount >= orderNum) {
        status = 'completed';
      } else if (orderCount === orderNum - 1) {
        status = 'active';
      }

      return {
        id: orderNum,
        label: `Order ${orderNum}`,
        date: orderDate,
        status
      };
    });

    // Build stages data tailored to this customer
    const stages = STAGE_CONFIGS.map((cfg) => {
      const isEligible = orderCount >= cfg.requiredOrders;
      const isClaimed = claimedRewards.includes(cfg.stageNumber);
      let status = 'locked';

      if (isClaimed) {
        status = 'claimed';
      } else if (isEligible) {
        status = 'available';
      }

      let date = '';
      if (cfg.requiredOrders <= orders.length) {
        date = formatFullDate(orders[cfg.requiredOrders - 1].createdAt);
      } else {
        date = `${cfg.requiredOrders} orders required`;
      }

      let requirement = '';
      if (!isEligible) {
        const remaining = cfg.requiredOrders - orderCount;
        requirement = `Complete ${remaining} more order${remaining > 1 ? 's' : ''}`;
      }

      return {
        stageNumber: cfg.stageNumber,
        stage: cfg.stage,
        title: cfg.title,
        originalPrice: cfg.originalPrice,
        discountedPrice: cfg.discountedPrice,
        couponCode: cfg.couponCode,
        image: cfg.image,
        status,
        badge: isClaimed ? 'Claimed' : (isEligible ? 'Available' : 'Locked'),
        date: isClaimed ? (date || 'Claimed') : date,
        requirement
      };
    });

    // Current active reward stage (the first available or the next locked stage)
    const activeStage = stages.find((s) => s.status === 'available') ||
      stages.find((s) => s.status === 'locked') ||
      stages[stages.length - 1];

    res.status(200).json({
      success: true,
      data: {
        isAuthenticated: !!req.user,
        customerName,
        customerPhone,
        totalOrders: orderCount,
        claimedRewards,
        steps,
        stages,
        activeStageNumber: activeStage ? activeStage.stageNumber : 1
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Claim an unlocked loyalty reward stage
// @route   POST /api/loyalty/claim
// @access  Private (Authenticated customer)
exports.claimReward = async (req, res, next) => {
  try {
    const { stageNumber } = req.body;
    const stageNum = parseInt(stageNumber, 10);

    if (!stageNum || stageNum < 1 || stageNum > 5) {
      return res.status(400).json({
        success: false,
        message: 'Invalid stage number. Must be between 1 and 5.'
      });
    }

    const stageConfig = STAGE_CONFIGS.find((s) => s.stageNumber === stageNum);
    if (!stageConfig) {
      return res.status(404).json({ success: false, message: 'Stage configuration not found' });
    }

    let claimedRewards = [stageNum];
    if (req.user) {
      const user = await User.findById(req.user._id);
      if (user) {
        // Check order count
        const completedOrders = await Order.countDocuments({
          customer: user._id,
          orderStatus: { $nin: ['Cancelled', 'Rejected'] }
        });

        if (completedOrders < stageConfig.requiredOrders) {
          return res.status(400).json({
            success: false,
            message: `You need ${stageConfig.requiredOrders} completed orders to unlock ${stageConfig.stage}. You currently have ${completedOrders}.`
          });
        }

        if (!Array.isArray(user.claimedRewards)) {
          user.claimedRewards = [];
        }

        if (!user.claimedRewards.includes(stageNum)) {
          user.claimedRewards.push(stageNum);
          await user.save();
        }
        claimedRewards = user.claimedRewards;
      }
    }


    // Ensure coupon exists in database offer table for instant checkout validity
    try {
      const existingOffer = await Offer.findOne({ couponCode: stageConfig.couponCode });
      if (!existingOffer) {
        await Offer.create({
          title: `${stageConfig.stage} Reward: ${stageConfig.title}`,
          description: `Exclusive loyalty reward for completing ${stageConfig.requiredOrders} orders at The Prime Cafe.`,
          couponCode: stageConfig.couponCode,
          discountType: stageConfig.discountType,
          discountValue: stageConfig.discountValue,
          minimumOrderAmount: stageConfig.minimumOrderAmount,
          maxDiscountAmount: stageConfig.discountValue,
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year validity
          isActive: true
        });
      }
    } catch (e) {
      // ignore offer create error
    }

    res.status(200).json({
      success: true,
      message: `🎉 Congratulations! You have claimed ${stageConfig.title}!`,
      data: {
        stageNumber: stageNum,
        couponCode: stageConfig.couponCode,
        title: stageConfig.title,
        claimedRewards: claimedRewards
      }
    });
  } catch (err) {
    next(err);
  }
};

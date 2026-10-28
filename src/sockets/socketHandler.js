let ioInstance = null;

const initSocket = (io) => {
  ioInstance = io;

  io.on('connection', (socket) => {
    // Client can join a specific table room or user room or admin room
    socket.on('join_admin', () => {
      socket.join('admin_room');
    });

    socket.on('join_order', (orderId) => {
      socket.join(`order_${orderId}`);
    });

    socket.on('join_user', (userId) => {
      socket.join(`user_${userId}`);
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });
};

const getIO = () => {
  return ioInstance;
};

// Helper to notify admin room of new order / changes
const emitNewOrder = (order) => {
  if (ioInstance) {
    ioInstance.to('admin_room').emit('new_order', order);
  }
};

// Helper to notify customer of order status change
const emitOrderStatusUpdate = (order) => {
  if (ioInstance) {
    ioInstance.to('admin_room').emit('order_status_updated', order);
    ioInstance.to(`order_${order._id}`).emit('order_status_updated', order);
    if (order.customer) {
      ioInstance.to(`user_${order.customer}`).emit('order_status_updated', order);
    }
  }
};

// Helper to broadcast notification to admin
const emitAdminNotification = (notification) => {
  if (ioInstance) {
    ioInstance.to('admin_room').emit('admin_notification', notification);
  }
};

// Helper to broadcast notification from Cafe Owner to Customers
const emitCustomerNotification = (notification) => {
  if (ioInstance) {
    // Broadcast to all connected customer clients
    ioInstance.emit('customer_notification', notification);
    if (notification.targetTable && notification.targetTable !== 'All') {
      ioInstance.emit(`table_notification_${notification.targetTable}`, notification);
    }
  }
};

// Helper to broadcast live menu updates (item added, edited, deleted, stock status changed)
const emitMenuUpdated = (data) => {
  if (ioInstance) {
    ioInstance.emit('menu_updated', data);
  }
};

// Helper to broadcast offers update
const emitOfferUpdated = (data) => {
  if (ioInstance) {
    ioInstance.emit('offer_updated', data);
  }
};

module.exports = {
  initSocket,
  getIO,
  emitNewOrder,
  emitOrderStatusUpdate,
  emitAdminNotification,
  emitCustomerNotification,
  emitMenuUpdated,
  emitOfferUpdated
};

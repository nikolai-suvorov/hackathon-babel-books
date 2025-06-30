const mockCheckoutSession = {
  id: 'cs_test_123',
  url: 'https://checkout.stripe.com/test',
  customer: 'cus_test_123',
  subscription: 'sub_test_123',
  metadata: {},
};

const mockSubscription = {
  id: 'sub_test_123',
  customer: 'cus_test_123',
  items: {
    data: [{
      price: {
        id: 'price_test_123'
      }
    }]
  },
  metadata: {},
};

const mockWebhooks = {
  constructEvent: jest.fn(),
};

const mockCheckout = {
  sessions: {
    create: jest.fn().mockResolvedValue(mockCheckoutSession),
  },
};

const mockSubscriptions = {
  retrieve: jest.fn().mockResolvedValue(mockSubscription),
  update: jest.fn().mockResolvedValue(mockSubscription),
  cancel: jest.fn().mockResolvedValue(mockSubscription),
};

class Stripe {
  constructor() {
    this.webhooks = mockWebhooks;
    this.checkout = mockCheckout;
    this.subscriptions = mockSubscriptions;
  }
}

Stripe.mockCheckoutSession = mockCheckoutSession;
Stripe.mockSubscription = mockSubscription;
Stripe.mockWebhooks = mockWebhooks;
Stripe.mockCheckout = mockCheckout;
Stripe.mockSubscriptions = mockSubscriptions;

module.exports = Stripe;
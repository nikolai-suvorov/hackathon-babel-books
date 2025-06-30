import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { UserService } from '@/lib/services/userService';
import { SubscriptionTier } from '@/lib/models/user';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tier = searchParams.get('tier') as SubscriptionTier;
    const sessionId = searchParams.get('session_id');
    
    if (!tier || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Mock checkout page
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Mock Stripe Checkout - BabelBooks</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 0;
      background: #f6f9fc;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .checkout-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 14px rgba(0, 0, 0, 0.1);
      max-width: 500px;
      width: 100%;
      padding: 40px;
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo h1 {
      color: #5850EC;
      margin: 0;
    }
    .plan-info {
      background: #f6f9fc;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }
    .plan-name {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 10px;
    }
    .plan-price {
      font-size: 36px;
      font-weight: 700;
      color: #5850EC;
      margin-bottom: 5px;
    }
    .plan-features {
      color: #666;
      line-height: 1.6;
    }
    .form-section {
      margin-bottom: 30px;
    }
    .form-section h3 {
      margin-bottom: 15px;
      color: #333;
    }
    .form-group {
      margin-bottom: 15px;
    }
    .form-group label {
      display: block;
      margin-bottom: 5px;
      color: #666;
      font-size: 14px;
    }
    .form-group input {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 16px;
      box-sizing: border-box;
    }
    .button-group {
      display: flex;
      gap: 10px;
      margin-top: 30px;
    }
    .btn {
      flex: 1;
      padding: 12px 24px;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      text-decoration: none;
      display: inline-block;
    }
    .btn-primary {
      background: #5850EC;
      color: white;
    }
    .btn-primary:hover {
      background: #4338CA;
    }
    .btn-secondary {
      background: #fff;
      color: #666;
      border: 1px solid #ddd;
    }
    .btn-secondary:hover {
      background: #f6f9fc;
    }
    .notice {
      background: #FEF3C7;
      border: 1px solid #F59E0B;
      border-radius: 4px;
      padding: 12px;
      margin-bottom: 20px;
      color: #92400E;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="checkout-container">
    <div class="logo">
      <h1>BabelBooks</h1>
      <p style="color: #666; margin: 5px 0;">Mock Checkout (Development)</p>
    </div>
    
    <div class="notice">
      <strong>Development Mode:</strong> This is a mock checkout for testing. No real payment will be processed.
    </div>
    
    <div class="plan-info">
      <div class="plan-name">${tier === SubscriptionTier.INDIVIDUAL ? 'Individual' : 'Family'} Plan</div>
      <div class="plan-price">${tier === SubscriptionTier.INDIVIDUAL ? '$9.99' : '$19.99'}/month</div>
      <div class="plan-features">
        ${tier === SubscriptionTier.INDIVIDUAL ? 
          '• 15 stories per month<br>• Unlimited replays<br>• Access to Essential Collection' : 
          '• 30 stories per month<br>• Up to 4 family members<br>• Unlimited replays for all<br>• Access to Essential Collection'}
      </div>
    </div>
    
    <form onsubmit="return handleSubmit(event)">
      <div class="form-section">
        <h3>Mock Payment Details</h3>
        <div class="form-group">
          <label>Email</label>
          <input type="email" value="${session.email}" readonly>
        </div>
        <div class="form-group">
          <label>Card Number</label>
          <input type="text" placeholder="4242 4242 4242 4242" value="4242 4242 4242 4242" readonly>
        </div>
        <div class="form-group" style="display: flex; gap: 10px;">
          <div style="flex: 1;">
            <label>Expiry</label>
            <input type="text" placeholder="MM/YY" value="12/34" readonly>
          </div>
          <div style="flex: 1;">
            <label>CVC</label>
            <input type="text" placeholder="123" value="123" readonly>
          </div>
        </div>
      </div>
      
      <div class="button-group">
        <button type="submit" class="btn btn-primary">Complete Purchase</button>
        <a href="/subscription" class="btn btn-secondary">Cancel</a>
      </div>
    </form>
  </div>
  
  <script>
    async function handleSubmit(event) {
      event.preventDefault();
      // Simulate processing
      const button = event.target.querySelector('.btn-primary');
      button.textContent = 'Processing...';
      button.disabled = true;
      
      try {
        // Complete the mock checkout
        const response = await fetch('/api/checkout/mock/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: '${sessionId}',
            tier: '${tier}'
          }),
          credentials: 'include'
        });
        
        if (response.ok) {
          // Redirect to success page
          window.location.href = '/subscription/success?session_id=${sessionId}&mock=true&tier=${tier}';
        } else {
          const error = await response.json();
          alert('Error: ' + (error.error || 'Failed to complete checkout'));
          button.textContent = 'Complete Purchase';
          button.disabled = false;
        }
      } catch (error) {
        console.error('Checkout error:', error);
        alert('Failed to complete checkout. Please try again.');
        button.textContent = 'Complete Purchase';
        button.disabled = false;
      }
      
      return false;
    }
  </script>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Mock checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to load checkout' },
      { status: 500 }
    );
  }
}
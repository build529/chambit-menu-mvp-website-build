const LEVANT_STORAGE_KEY = 'chambit_levant_student_code';

async function claimOrFetchLevantCoupon() {
  // 1. Track event in GA4
  if (typeof gtag === 'function') {
    gtag('event', 'ad_click', {
      'slot_location': 'top_banner',
      'sponsor_name': 'levant_code'
    });
  }

  const actionButton = document.getElementById('levant-claim-btn');

  // LAYER 1: CHECK LOCALSTORAGE FIRST
  let code = localStorage.getItem(LEVANT_STORAGE_KEY);

  if (!code) {
    try {
      if (actionButton) {
        actionButton.textContent = "Fetching...";
        actionButton.disabled = true;
      }

      // FETCH FROM FASTAPI BACKEND
      const response = await fetch('/api/claim-levant-coupon', { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        code = data.code;
        localStorage.setItem(LEVANT_STORAGE_KEY, code);
      } else {
        alert(data.message || "Coupons temporarily unavailable.");
        if (actionButton) {
          actionButton.textContent = "Get Discount Code!";
          actionButton.disabled = false;
        }
        return;
      }
    } catch (error) {
      console.error("Coupon claim failed:", error);
      alert("Connection error. Please try again.");
      if (actionButton) {
        actionButton.textContent = "Get Discount Code!";
        actionButton.disabled = false;
      }
      return;
    }
  }

  // Restore button state
  if (actionButton) {
    actionButton.textContent = "Get Discount Code!";
    actionButton.disabled = false;
  }

  // 2. OPEN CLEAN DIGITAL VOUCHER IN A NEW TAB
  openVoucherTab(code);
}

function openVoucherTab(code) {
  const voucherWindow = window.open("", "_blank");
  if (!voucherWindow) {
    alert(`Your Levant Coupon Code is: ${code}\n\n(Please allow popups to view your full voucher card)`);
    return;
  }

  voucherWindow.document.open();
  voucherWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>Levant Student Coupon Pass</title>
      <style>
        * { box-sizing: border-box; }
        html, body {
          width: 100%;
          min-height: 100vh;
          margin: 0;
          padding: 0;
          background-color: #f1f5f9;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .container {
          width: 100%;
          max-width: 440px;
          padding: 20px 16px;
          display: flex;
          justify-content: center;
        }
        .card {
          width: 100%;
          background: #ffffff;
          border-radius: 20px;
          border: 2px solid #16a34a;
          box-shadow: 0 12px 30px rgba(22, 163, 74, 0.18);
          padding: 24px 20px;
          text-align: center;
        }
        .badge {
          display: inline-block;
          background: #dcfce7;
          color: #15803d;
          font-size: 11px;
          font-weight: 800;
          padding: 5px 12px;
          border-radius: 12px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .title {
          font-size: 24px;
          color: #0f172a;
          margin: 12px 0 4px 0;
          font-weight: 900;
        }
        .sub {
          font-size: 14px;
          color: #16a34a;
          font-weight: 700;
          margin: 0 0 18px 0;
        }
        .code-box {
          background: #f8fafc;
          border: 2px dashed #16a34a;
          border-radius: 14px;
          padding: 18px 12px;
          margin: 16px 0;
        }
        .code-title {
          font-size: 11px;
          color: #64748b;
          font-weight: 700;
          letter-spacing: 1px;
          display: block;
        }
        .code-text {
          font-size: 28px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: 2px;
          margin-top: 6px;
          display: block;
        }
        .copy-btn {
          width: 100%;
          background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
          color: #ffffff;
          border: none;
          padding: 14px;
          border-radius: 12px;
          font-weight: 800;
          font-size: 15px;
          cursor: pointer;
          margin-bottom: 18px;
          box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3);
          transition: transform 0.1s ease;
        }
        .copy-btn:active {
          transform: scale(0.98);
        }
        .instructions {
          text-align: left;
          font-size: 12px;
          color: #334155;
          line-height: 1.6;
          background: #f1f5f9;
          padding: 14px;
          border-radius: 10px;
        }
        .instructions ol {
          margin: 6px 0 0 0;
          padding-left: 20px;
        }
        .instructions li {
          margin-bottom: 4px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <span class="badge">JBNU STUDENT SPECIAL</span>
          <h1 class="title">Levant</h1>
          <p class="sub">₩1,000 OFF Any Student Meal</p>

          <div class="code-box">
            <span class="code-title">YOUR ONE-TIME COUPON CODE</span>
            <span class="code-text" id="code-val">${code}</span>
          </div>

          <button class="copy-btn" id="copy-action-btn" onclick="
            navigator.clipboard.writeText('${code}');
            this.textContent = '✅ Code Copied!';
            this.style.background = '#15803d';
            alert('Code copied to clipboard! Enter it in your cart when scanning table QR code.');
          ">
            📋 Copy Code
          </button>

          <div class="instructions">
            <strong>How to redeem at Levant:</strong>
            <ol>
              <li>Scan the QR code on your table inside Levant.</li>
              <li>Select your Student Meal in the digital cart.</li>
              <li>Paste this coupon code at checkout to claim ₩1,000 off!</li>
            </ol>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
  
  // CRITICAL FOR CHROME: Signal that HTML parsing is complete so responsive viewport renders properly
  voucherWindow.document.close();
}
// routes/payment.js
import express from "express";
import { getCollections } from "../utils/database.js";
import { calculateDiscountedPrice, generateToken } from "../utils/helpers.js";

const router = express.Router();
const { doubleCollection, urlShortenerCollection } = getCollections();

// 🔹 Enhanced Payment Page with MythoPoints Discount
router.get("/payment", (req, res) => {
  const { amount, upi, channel, admin, mythopoints } = req.query;
  
  // Default values if not provided
  const baseAmount = amount || 49;
  const upiId = upi || "sandip10x@fam";
  const channelName = channel || "MythoBot Premium";
  const adminUsername = admin || "MythoSerialBot";
  const mythoPointsApplied = mythopoints === "true";

  // Calculate discounted price
  const finalAmount = calculateDiscountedPrice(parseInt(baseAmount), mythoPointsApplied);
  const originalAmount = parseInt(baseAmount);
  const discountAmount = originalAmount - finalAmount;

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MythoBot Premium Access</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
        <link rel="icon" type="image/png" href="https://i.postimg.cc/Y0MsZM32/favicon.jpg">
        <style>
            .loader { border: 4px solid #f3f3f3; border-radius: 50%; border-top: 4px solid #8b5cf6; width: 40px; height: 40px; animation: spin 1.5s linear infinite; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; -webkit-user-select: none; -ms-user-select: none; user-select: none; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
            .mytho-glow { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); }
            .upi-app { transition: all 0.3s ease; }
            .upi-app:hover { transform: scale(1.05); }
            .discount-badge { background: linear-gradient(135deg, #10b981, #059669); }
            .mythopoints-active { border: 3px solid #f59e0b; box-shadow: 0 0 20px rgba(245, 158, 11, 0.5); }
        </style>
    </head>
    <body class="flex items-center justify-center min-h-screen p-4">
        <main class="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden mytho-glow ${mythoPointsApplied ? 'mythopoints-active' : ''}">
            
            <!-- Header Section -->
            <div class="p-8 text-center border-b bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                <div class="flex justify-center mb-4">
                    <i class="fa-solid fa-robot fa-3x text-white"></i>
                </div>
                <h1 class="text-2xl font-bold">MythoBot Premium Access</h1>
                <p class="text-purple-200 mt-2">Unlock Exclusive Features & Double Points</p>
                
                ${mythoPointsApplied ? `
                <div class="discount-badge inline-flex items-center px-4 py-2 rounded-full text-white font-bold mt-3">
                    <i class="fa-solid fa-star mr-2"></i>
                    30% MythoPoints Discount Applied!
                </div>
                ` : ''}
            </div>

            <!-- Payment Details Section -->
            <div class="p-6 sm:p-8 text-center">
                ${mythoPointsApplied ? `
                <div class="flex justify-center items-center gap-4 mb-4">
                    <span class="text-2xl text-slate-400 line-through">₹${originalAmount}</span>
                    <i class="fa-solid fa-arrow-right text-slate-400"></i>
                    <span class="text-5xl font-extrabold text-green-600">₹${finalAmount}</span>
                </div>
                <p class="text-sm text-green-600 font-bold mb-2">
                    🎉 You saved ₹${discountAmount} with MythoPoints!
                </p>
                ` : `
                <p class="text-5xl font-extrabold text-purple-600 my-2">₹${finalAmount}</p>
                `}
                
                <p class="text-xs text-slate-500 mb-6">Unique amount for your transaction</p>
                
                <div id="qr-code-container" class="flex justify-center items-center h-52 w-52 mx-auto bg-slate-50 rounded-lg p-2 border-2 border-dashed border-purple-200">
                    <div id="loader" class="loader"></div>
                </div>
                <p class="text-sm text-slate-600 mt-4 font-semibold">Scan QR to pay via any UPI App</p>

                <!-- MythoPoints Info -->
                ${!mythoPointsApplied ? `
                <div class="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div class="flex items-center justify-center gap-2">
                        <i class="fa-solid fa-coins text-amber-600"></i>
                        <span class="text-sm text-amber-800 font-semibold">
                            Have MythoPoints? Get 30% discount!
                        </span>
                    </div>
                    <a href="/payment?amount=${baseAmount}&upi=${upiId}&channel=${encodeURIComponent(channelName)}&admin=${adminUsername}&mythopoints=true" 
                       class="inline-block mt-2 bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-600 transition-all">
                       Apply 30% MythoPoints Discount
                    </a>
                </div>
                ` : ''}

                <!-- UPI Apps Direct Links -->
                <div class="mt-6">
                    <p class="text-sm font-semibold text-slate-600 mb-3">Or open directly in:</p>
                    <div class="grid grid-cols-4 gap-3 mb-4" id="upi-apps-container">
                        <!-- UPI apps will be dynamically added here -->
                    </div>
                </div>

                <div class="flex items-center my-6">
                    <hr class="w-full border-slate-200"><span class="px-2 text-xs font-medium text-slate-400">OR</span><hr class="w-full border-slate-200">
                </div>

                <p class="text-sm text-slate-600 font-semibold mb-2">Copy UPI ID</p>
                <div class="flex items-center justify-between bg-slate-100 p-3 rounded-lg border border-slate-200">
                    <span class="font-mono text-slate-700 text-lg break-all" id="upi-id-text">${upiId}</span>
                    <button id="copy-button" class="bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-purple-700 transition-all flex-shrink-0 w-28">
                        <span class="copy-text-span"><i class="fa-regular fa-copy mr-2"></i>Copy</span>
                    </button>
                </div>
            </div>
            
            <!-- Instructions Section -->
            <div class="bg-purple-50 p-6 sm:p-8">
                <h3 class="text-lg font-bold text-slate-800 text-center">What happens next?</h3>
                <p class="text-slate-600 text-center mt-2 text-sm">After successful payment, send screenshot to @${adminUsername} on Telegram to activate your premium features.</p>
                
                <div class="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p class="text-xs text-yellow-700 text-center">
                        <i class="fa-solid fa-shield-alt mr-1"></i>
                        <strong>Secure Payment:</strong> Your transaction is protected
                    </p>
                </div>

                <a href="https://t.me/${adminUsername}" class="mt-6 w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-transform hover:scale-105 shadow-lg">
                    <i class="fa-brands fa-telegram fa-lg"></i>
                    <span>Contact @${adminUsername}</span>
                </a>
            </div>
        </main>

        <script>
            document.addEventListener('DOMContentLoaded', () => {
                const loader = document.getElementById('loader');
                const qrContainer = document.getElementById('qr-code-container');
                const upiIdElement = document.getElementById('upi-id-text');
                const copyButton = document.getElementById('copy-button');
                const copySpan = copyButton.querySelector('.copy-text-span');
                const originalCopyHTML = copySpan.innerHTML;
                const upiAppsContainer = document.getElementById('upi-apps-container');

                // Use the final amount from server calculation
                const finalAmount = ${finalAmount};
                
                // Generate UPI link
                const upiLink = \`upi://pay?pa=\${upiIdElement.textContent}&pn=\${encodeURIComponent("${channelName}")}&am=\${finalAmount}.00&cu=INR\`;
                const qrApiUrl = \`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=\${encodeURIComponent(upiLink)}&qzone=1\`;
                
                // Load QR Code
                const qrImage = new Image();
                qrImage.src = qrApiUrl;
                qrImage.alt = 'Scan to Pay';
                qrImage.className = 'rounded-lg';
                qrImage.onload = () => { 
                    if (loader) loader.style.display = 'none';
                    qrContainer.appendChild(qrImage);
                };

                qrImage.onerror = () => {
                    if (loader) loader.style.display = 'none';
                    qrContainer.innerHTML = '<p class="text-red-500 text-sm">QR Code failed to load</p>';
                };

                // UPI Apps Configuration
                const upiApps = [
                    {
                        name: "GPay",
                        package: "com.google.android.apps.nbu.paisa.user",
                        icon: "fa-brands fa-google-pay",
                        color: "bg-gradient-to-r from-blue-500 to-purple-600"
                    },
                    {
                        name: "Paytm",
                        package: "net.one97.paytm",
                        icon: "fa-solid fa-mobile-screen-button",
                        color: "bg-gradient-to-r from-blue-600 to-blue-800"
                    },
                    {
                        name: "PhonePe",
                        package: "com.phonepe.app",
                        icon: "fa-solid fa-phone",
                        color: "bg-gradient-to-r from-purple-600 to-purple-800"
                    },
                    {
                        name: "BHIM",
                        package: "in.org.npci.upiapp",
                        icon: "fa-solid fa-indian-rupee-sign",
                        color: "bg-gradient-to-r from-green-600 to-green-800"
                    },
                    {
                        name: "Amazon Pay",
                        package: "in.amazon.mShop.android.shopping",
                        icon: "fa-brands fa-amazon",
                        color: "bg-gradient-to-r from-yellow-500 to-orange-500"
                    },
                    {
                        name: "WhatsApp",
                        package: "com.whatsapp",
                        icon: "fa-brands fa-whatsapp",
                        color: "bg-gradient-to-r from-green-500 to-green-600"
                    },
                    {
                        name: "Cred",
                        package: "com.dreamplug.androidapp",
                        icon: "fa-solid fa-gem",
                        color: "bg-gradient-to-r from-purple-700 to-purple-900"
                    },
                    {
                        name: "Any UPI",
                        package: "",
                        icon: "fa-solid fa-wallet",
                        color: "bg-gradient-to-r from-gray-600 to-gray-800"
                    }
                ];

                // Create UPI App buttons
                upiApps.forEach(app => {
                    const appButton = document.createElement('button');
                    appButton.className = \`upi-app \${app.color} text-white rounded-lg p-3 flex flex-col items-center justify-center\`;
                    appButton.innerHTML = \`
                        <i class="\${app.icon} text-xl mb-1"></i>
                        <span class="text-xs font-medium">\${app.name}</span>
                    \`;
                    
                    appButton.onclick = () => {
                        if (app.package) {
                            // Try to open in app first, then fallback to UPI link
                            const intentUrl = \`intent://pay?pa=\${upiIdElement.textContent}&pn=\${encodeURIComponent("${channelName}")}&am=\${finalAmount}.00&cu=INR#Intent;package=\${app.package};scheme=upi;end;\`;
                            const upiUrl = \`upi://pay?pa=\${upiIdElement.textContent}&pn=\${encodeURIComponent("${channelName}")}&am=\${finalAmount}.00&cu=INR\`;
                            
                            // Try app intent first
                            window.location.href = intentUrl;
                            
                            // Fallback after delay
                            setTimeout(() => {
                                window.location.href = upiUrl;
                            }, 500);
                        } else {
                            // Direct UPI link for "Any UPI"
                            window.location.href = upiLink;
                        }
                    };
                    
                    upiAppsContainer.appendChild(appButton);
                });

                // Copy UPI ID functionality
                copyButton.addEventListener('click', () => {
                    navigator.clipboard.writeText(upiIdElement.textContent).then(() => {
                        copySpan.innerHTML = '<i class="fa-solid fa-check mr-2"></i>Copied!';
                        copyButton.classList.remove('bg-purple-600', 'hover:bg-purple-700');
                        copyButton.classList.add('bg-green-600');
                        setTimeout(() => {
                            copySpan.innerHTML = originalCopyHTML;
                            copyButton.classList.remove('bg-green-600');
                            copyButton.classList.add('bg-purple-600', 'hover:bg-purple-700');
                        }, 2000);
                    }).catch(() => {
                        copySpan.innerHTML = '<i class="fa-solid fa-xmark mr-2"></i>Failed!';
                        setTimeout(() => {
                            copySpan.innerHTML = originalCopyHTML;
                        }, 2000);
                    });
                });
            });
        </script>
        
        <script>
            // Security features
            document.addEventListener('DOMContentLoaded', function() {
                // Disable Right-Click Context Menu
                document.addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                });

                // Disable Keyboard Shortcuts
                document.addEventListener('keydown', function(e) {
                    if (e.ctrlKey && (e.key === 'c' || e.key === 'u')) {
                        e.preventDefault();
                    }
                    if (e.key === 'F12') {
                        e.preventDefault();
                    }
                });

                // Disable Dragging
                document.addEventListener('dragstart', function(e) {
                    e.preventDefault();
                });
            });
        </script>
    </body>
    </html>
  `);
});

// 🔹 UPI Deep Link API
router.get("/upi-redirect", (req, res) => {
  const { upi, amount, name } = req.query;
  
  const upiId = upi || "sandip10x@fam";
  const paymentAmount = amount || 49;
  const receiverName = name || "MythoBot Premium";
  
  const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(receiverName)}&am=${paymentAmount}.00&cu=INR`;
  
  res.redirect(upiLink);
});

// 🔹 Payment API endpoint
router.get("/payment/api", (req, res) => {
  const { amount, upi, channel, admin } = req.query;
  
  res.json({
    success: true,
    payment_page: `https://${req.hostname}/payment?amount=${amount || 49}&upi=${upi || "sandip10x@fam"}&channel=${channel || "MythoBot Premium"}&admin=${admin || "MythoSerialBot"}`,
    upi_redirect: `https://${req.hostname}/upi-redirect?upi=${upi || "sandip10x@fam"}&amount=${amount || 49}&name=${channel || "MythoBot Premium"}`,
    config: {
      amount: amount || 49,
      upi_id: upi || "sandip10x@fam",
      channel_name: channel || "MythoBot Premium", 
      admin_username: admin || "MythoSerialBot"
    },
    message: "MythoBot Premium Access Payment"
  });
});

export default router;

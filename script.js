// --- Session Management (Session-Level Persistence) ---
function toggleDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    dropdown.classList.toggle('show');
}

document.addEventListener('click', function (e) {
    const dropdown = document.getElementById('profileDropdown');
    const btn = document.querySelector('.profile-btn');
    if (dropdown && dropdown.classList.contains('show') && !dropdown.contains(e.target) && e.target !== btn) {
        dropdown.classList.remove('show');
    }
});

document.getElementById('authForm')?.addEventListener('submit', function (e) {
    e.preventDefault();
    const usernameInput = document.getElementById('username').value;
    const passwordInput = document.getElementById('password').value;
    const authError = document.getElementById('auth-error');

    const ADMIN_USER = "ambalavanan@admin";
    const ADMIN_EMAIL = "ambalavanan275@gmail.com";
    const ADMIN_PASS = "Am@20070115";

    if ((usernameInput === ADMIN_USER || usernameInput === ADMIN_EMAIL) && passwordInput === ADMIN_PASS) {
        authError.style.display = 'none';
        const user = { email: ADMIN_EMAIL, username: ADMIN_USER };
        sessionStorage.setItem('loan_app_session', JSON.stringify(user));
        initializeUI();
    } else {
        authError.style.display = 'block';
    }
});

function logout() {
    sessionStorage.removeItem('loan_app_session');
    document.getElementById('profileDropdown')?.classList.remove('show');
    // If we're on history.html, go back to index.html on logout
    if (window.location.pathname.includes('history.html')) {
        window.location.href = 'index.html';
    } else {
        initializeUI();
    }
}

function initializeUI() {
    const user = JSON.parse(sessionStorage.getItem('loan_app_session'));
    const authOverlay = document.getElementById('auth-overlay');
    const userBadge = document.getElementById('userBadge');

    if (user) {
        if (authOverlay) authOverlay.style.display = 'none';
        if (userBadge) userBadge.style.display = 'block';
    } else {
        if (authOverlay) authOverlay.style.display = 'flex';
        if (userBadge) userBadge.style.display = 'none';
    }
}

// --- Core Prediction Logic ---
document.getElementById('predictionForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const resultContainer = document.getElementById('result-container');

    submitBtn.classList.add('button-loading');
    submitBtn.disabled = true;
    resultContainer.classList.remove('show', 'result-success', 'result-error');
    resultContainer.style.display = 'none';

    try {
        const loanAmountFull = parseFloat(document.getElementById('loanAmount').value);
        const customerData = {
            name: document.getElementById('customerName').value,
            email: document.getElementById('customerEmail').value,
            phone: document.getElementById('customerPhone').value
        };

        const features = [
            parseFloat(document.getElementById('gender').value),
            parseFloat(document.getElementById('maritalStatus').value),
            parseFloat(document.getElementById('education').value),
            parseFloat(document.getElementById('selfEmployed').value),
            parseFloat(document.getElementById('applicantIncome').value),
            parseFloat(document.getElementById('coapplicantIncome').value),
            loanAmountFull / 1000,
            parseFloat(document.getElementById('loanTermYears').value),
            parseFloat(document.getElementById('creditHistory').value),
            parseFloat(document.getElementById('existingLoans').value)
        ];

        const apiUrl = 'https://nie7ebw775.execute-api.eu-north-1.amazonaws.com/prod/predict';
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                features: features,
                metadata: customerData
            })
        });

        if (!response.ok) throw new Error('API request failed');

        const data = await response.json();
        const formattedAmount = loanAmountFull.toLocaleString('en-IN');
        resultContainer.innerHTML = `
            <div style="font-size: 1.1rem; margin-bottom: 0.5rem; opacity: 0.8;">Loan for ₹${formattedAmount}</div>
            <div>Result: ${data.prediction || 'Unknown'}</div>
        `;
        resultContainer.style.display = 'block';

        if (data.prediction?.toLowerCase() === 'approved') {
            resultContainer.className = 'result-success show';
        } else {
            resultContainer.className = 'result-error show';
        }

        // Note: No localStorage saving here per user request

    } catch (error) {
        console.error(error);
        resultContainer.textContent = 'Connection Error: Please check if the API is active or if there are CORS restrictions.';
        resultContainer.style.display = 'block';
        resultContainer.className = 'result-error show';
    } finally {
        submitBtn.classList.remove('button-loading');
        submitBtn.disabled = false;
    }
});

// Bootstrap the app
initializeUI();

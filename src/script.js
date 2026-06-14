// FIX: Import the unified bundle to prevent duplicate registry errors
import '@material/web/all.js';

import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    OAuthProvider, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut 
} from 'firebase/auth';
import * as ciap from 'gcip-iap';

// 1. CONFIGURATION
async function initApp() {
const response = await fetch('config.json');
const DEFAULT_CONFIG = await response.json();

let APP_CONFIG = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
const urlParams = new URLSearchParams(window.location.search);

if (urlParams.has('enableEmail')) APP_CONFIG.loginOptions.enableEmail = urlParams.get('enableEmail') === 'true';
if (urlParams.has('enableAuth0')) APP_CONFIG.loginOptions.enableAuth0 = urlParams.get('enableAuth0') === 'true';
if (urlParams.has('enableGoogle')) APP_CONFIG.loginOptions.enableGoogle = urlParams.get('enableGoogle') === 'true';

if (urlParams.has('apiKey')) APP_CONFIG.firebase.apiKey = urlParams.get('apiKey');
if (urlParams.has('authDomain')) APP_CONFIG.firebase.authDomain = urlParams.get('authDomain');
if (urlParams.has('auth0Provider')) APP_CONFIG.providers.auth0 = urlParams.get('auth0Provider');

const app = initializeApp(APP_CONFIG.firebase);
const auth = getAuth(app);

// 2. DEFINE THE IAP HANDLER
class CustomIAPHandler {
    
    getAuth(apiKey, tenantId) {
        return auth;
    }

    startSignIn(authInstance, tenantId) {
        return new Promise((resolve, reject) => {
            const messageDiv = document.getElementById('message');

            const showMessage = (text, color = "#b3261e") => {
                messageDiv.style.color = color;
                messageDiv.innerText = text;
                // Reset animation by triggering reflow
                messageDiv.classList.remove('show-message');
                void messageDiv.offsetWidth; 
                messageDiv.classList.add('show-message');
            };

            // Dismiss the message overlay on click
            messageDiv.onclick = () => {
                messageDiv.classList.remove('show-message');
            };

            const unsubscribe = authInstance.onAuthStateChanged((user) => {
                unsubscribe(); 

                if (user) {
                    showMessage("Session found. Redirecting...", "green");
                    resolve({ user: user }); 
                    return;
                }

                // Completely fresh visitor. Show the UI using FLEX instead of BLOCK
                document.getElementById('ui-container').style.display = 'flex';

                // Apply login options
                if (!APP_CONFIG.loginOptions.enableEmail) {
                    document.getElementById('emailSection').style.display = 'none';
                }
                if (!APP_CONFIG.loginOptions.enableAuth0) {
                    document.getElementById('btnAuth0').style.display = 'none';
                }
                if (!APP_CONFIG.loginOptions.enableGoogle) {
                    document.getElementById('btnGoogle').style.display = 'none';
                }
                
                // Hide OR divider if needed
                if (!APP_CONFIG.loginOptions.enableEmail || (!APP_CONFIG.loginOptions.enableAuth0 && !APP_CONFIG.loginOptions.enableGoogle)) {
                    document.getElementById('orDivider').style.display = 'none';
                }

                // --- Email/Password ---
                document.getElementById('btnLogin').onclick = () => {
                    const email = document.getElementById('email').value;
                    const password = document.getElementById('password').value;
                    showMessage("Authenticating...", "#b3261e");
                    
                    signInWithEmailAndPassword(authInstance, email, password)
                        .then(credential => resolve(credential))
                        .catch(err => showMessage(err.message));
                };

                // --- Auth0 Popup ---
                document.getElementById('btnAuth0').onclick = () => {
                    const provider = new OAuthProvider(APP_CONFIG.providers.auth0);
                    showMessage("Opening Auth0 securely...", "#1f1f1f");
                    
                    signInWithPopup(authInstance, provider)
                        .then(credential => {
                            showMessage("Auth0 Success! Redirecting to app...", "green");
                            resolve(credential);
                        })
                        .catch(err => showMessage(err.message));
                };

                // --- Google Cloud Popup ---
                document.getElementById('btnGoogle').onclick = () => {
                    const provider = new GoogleAuthProvider();
                    showMessage("Opening Google securely...", "#1f1f1f");
                    
                    signInWithPopup(authInstance, provider)
                        .then(credential => resolve(credential))
                        .catch(err => showMessage(err.message));
                };
            });
        });
    }

    completeSignOut() {
        return signOut(auth);
    }
}

// 3. START THE IAP LISTENER
const handler = new CustomIAPHandler();
const ciapInstance = new ciap.Authentication(handler);
ciapInstance.start();

}

initApp();
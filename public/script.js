document.addEventListener('DOMContentLoaded', () => {
    // --- Éléments du DOM ---
    const loginScreen = document.getElementById('login-screen');
    const appScreen = document.getElementById('app-screen');
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    const userEmailDisplay = document.getElementById('user-email');
    const logoutButton = document.getElementById('logout-button');
    
    const callStatusText = document.getElementById('call-status-text');
    const callTimer = document.getElementById('call-timer');
    const phoneNumberInput = document.getElementById('phone-number-input');
    const callButton = document.getElementById('call-button');
    const hangupButton = document.getElementById('hangup-button');
    const transcript = document.getElementById('transcript');
    const knowledgeBaseContainer = document.getElementById('knowledge-base');

    // --- État de l'application ---
    let twilioDevice;
    let activeCall;
    let timerInterval;

    // --- Base de Connaissances (pour affichage) ---
    const knowledgeBase = {
        "Contexte Événementiel": {
            "Nom": "Afri Health & Afri Lab Innovation Expo 2025",
            "Lieu & Date": "Parc des Expositions International de Sousse, 29 Oct - 1 Nov 2025",
            "Thème": "IA pour le Diagnostic et la Télémédecine",
        },
        "Profil Exposant": {
            "Industries Cibles": "Dispositifs médicaux, startups e-santé, laboratoires pharmaceutiques.",
            "Bénéfices Clés": "Accès direct aux décideurs, visibilité panafricaine.",
        },
        "Tarifs": {
            "Stand Équipé (9m²)": "250 €/m²",
            "Espace Nu": "200 €/m²",
        }
    };

    function renderKnowledgeBase() {
        knowledgeBaseContainer.innerHTML = '';
        for (const [section, data] of Object.entries(knowledgeBase)) {
            const sectionEl = document.createElement('div');
            sectionEl.className = 'bg-gray-700/50 p-3 rounded-lg';
            let contentHTML = `<h4 class="font-semibold text-indigo-300 mb-2">${section}</h4><div class="space-y-1">`;
            for (const [key, value] of Object.entries(data)) {
                contentHTML += `<p class="text-xs"><strong class="text-gray-300">${key}:</strong> <span class="text-gray-400">${value}</span></p>`;
            }
            contentHTML += `</div>`;
            sectionEl.innerHTML = contentHTML;
            knowledgeBaseContainer.appendChild(sectionEl);
        }
    }

    // --- Fonctions d'Authentification ---
    async function handleLogin(e) {
        e.preventDefault();
        errorMessage.textContent = '';
        try {
            const response = await fetch('/api/1-auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailInput.value, password: passwordInput.value })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Erreur de connexion.');
            
            localStorage.setItem('jwtToken', data.token);
            initializeApp(emailInput.value);
        } catch (error) {
            errorMessage.textContent = error.message;
        }
    }

    function handleLogout() {
        if (twilioDevice) twilioDevice.destroy();
        if (activeCall) activeCall.disconnect();
        localStorage.removeItem('jwtToken');
        loginScreen.classList.remove('hidden');
        appScreen.classList.add('hidden');
        emailInput.value = '';
        passwordInput.value = '';
    }

    // --- Initialisation de l'Application ---
    async function initializeApp(email) {
        loginScreen.classList.add('hidden');
        appScreen.classList.remove('hidden');
        userEmailDisplay.textContent = email;
        renderKnowledgeBase();
        await setupTwilioDevice();
    }

    // --- Fonctions Twilio ---
    async function setupTwilioDevice() {
        try {
            updateCallStatus('Initialisation...', 'bg-yellow-500');
            const token = localStorage.getItem('jwtToken');
            const response = await fetch('/api/2-get-token', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Impossible d\'obtenir le jeton Twilio.');

            twilioDevice = new twilio.Device(data.token, {
                codecPreferences: ['opus', 'pcmu']
            });
            
            twilioDevice.on('ready', () => {
                updateCallStatus('Prêt à appeler', 'bg-green-600');
                callButton.disabled = false;
            });

            twilioDevice.on('error', (error) => {
                console.error('Erreur Twilio Device:', error);
                updateCallStatus(`Erreur: ${error.message}`, 'bg-red-600');
            });

            twilioDevice.on('connect', (call) => {
                activeCall = call;
                addTranscriptMessage('Système', `Appel vers ${call.parameters.To} connecté.`);
                updateCallStatus('En communication', 'bg-blue-500');
                toggleCallControls(true);
                startTimer();
                call.on('disconnect', () => endCall());
                call.on('cancel', () => endCall());
            });

        } catch (error) {
            console.error('Erreur de configuration Twilio:', error);
            updateCallStatus(`Erreur de configuration: ${error.message}`, 'bg-red-600');
        }
    }

    async function makeCall() {
        const phoneNumber = phoneNumberInput.value.trim();
        if (!phoneNumber || !twilioDevice) {
            addTranscriptMessage('Système', 'Numéro de téléphone invalide ou appareil non prêt.');
            return;
        }
        
        addTranscriptMessage('Système', `Appel vers ${phoneNumber}...`);
        updateCallStatus('Appel en cours...', 'bg-yellow-500');
        try {
            await twilioDevice.connect({ params: { To: phoneNumber } });
        } catch (error) {
            console.error('Erreur lors de l\'appel:', error);
            updateCallStatus('Échec de l\'appel', 'bg-red-600');
        }
    }

    function endCall() {
        if (twilioDevice) twilioDevice.disconnectAll();
        activeCall = null;
        stopTimer();
        updateCallStatus('Appel terminé', 'bg-gray-700');
        toggleCallControls(false);
        addTranscriptMessage('Système', 'L\'appel a été terminé.');
    }

    // --- Fonctions d'UI ---
    function updateCallStatus(text, bgColorClass) {
        callStatusText.textContent = text;
        const statusBar = document.getElementById('call-status-bar');
        statusBar.className = `mt-2 p-2 rounded-lg flex items-center justify-between transition-colors ${bgColorClass}`;
    }

    function toggleCallControls(inCall) {
        hangupButton.classList.toggle('hidden', !inCall);
        callButton.classList.toggle('hidden', inCall);
        phoneNumberInput.disabled = inCall;
    }

    function addTranscriptMessage(sender, message) {
        const messageElement = document.createElement('div');
        const isSystem = sender === 'Système';
        messageElement.className = `text-sm ${isSystem ? 'text-yellow-400 italic' : 'text-gray-200'}`;
        messageElement.innerHTML = `<strong class="mr-2">${sender}:</strong> ${message}`;
        transcript.appendChild(messageElement);
        transcript.scrollTop = transcript.scrollHeight;
    }

    function startTimer() {
        let seconds = 0;
        callTimer.textContent = '00:00';
        timerInterval = setInterval(() => {
            seconds++;
            const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
            const secs = (seconds % 60).toString().padStart(2, '0');
            callTimer.textContent = `${mins}:${secs}`;
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timerInterval);
    }

    // --- Écouteurs d'Événements ---
    loginForm.addEventListener('submit', handleLogin);
    logoutButton.addEventListener('click', handleLogout);
    callButton.addEventListener('click', makeCall);
    hangupButton.addEventListener('click', endCall);

    // --- Initialisation au chargement ---
    const storedToken = localStorage.getItem('jwtToken');
    if (storedToken) {
        try {
            const payload = JSON.parse(atob(storedToken.split('.')[1]));
            initializeApp(payload.email);
        } catch (e) {
            console.error("Impossible de décoder le jeton stocké.");
            localStorage.removeItem('jwtToken');
        }
    }
});

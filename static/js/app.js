// IMPORTANT: For GitHub/Railway Deployment, change this to your Node.js API Service URL!
// Example: const API_BASE_URL = 'https://agrimind-api-production.up.railway.app';
const API_BASE_URL = 'http://localhost:3001';

document.addEventListener('DOMContentLoaded', () => {
    // Fetch Recent Campaigns from Database
    fetchRecentCampaigns();

    // Navigation
    const navItems = document.querySelectorAll('.nav-item');
    const pageSections = document.querySelectorAll('.page-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('data-target');
            if (targetId) {
                switchTab(targetId);
            }
        });
    });

    // Content Tabs (WhatsApp, SMS, etc.)
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const targetTab = btn.getAttribute('data-tab');
            document.getElementById('tab-' + targetTab).classList.add('active');
        });
    });

    // Form Submission
    const campaignForm = document.getElementById('campaign-form');
    if (campaignForm) {
        campaignForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Show Loader
            const loader = document.getElementById('loader');
            loader.classList.add('show');

            // Gather Data
            const formData = new FormData(campaignForm);
            const data = Object.fromEntries(formData.entries());

            try {
                // Call Node.js Backend API
                const response = await fetch(`${API_BASE_URL}/api/generate-campaign`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.status === 'success') {
                    // Store globally for persona switching
                    window.campaignData = result;
                    populateResults(result);
                    // Hide loader and switch to results tab
                    setTimeout(() => {
                        loader.classList.remove('show');
                        switchTab('campaign-results');
                    }, 500); 
                }

            } catch (error) {
                console.error("Error generating campaign:", error);
                alert("Failed to connect to the AI Engine. Please ensure the Node.js server is running on port 3001.");
                loader.classList.remove('show');
            }
        });
    }

    // Persona Switching Logic
    const personaBtns = document.querySelectorAll('.persona-btn');
    personaBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            personaBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const pKey = btn.getAttribute('data-persona');
            if (window.campaignData && window.campaignData.personas) {
                updatePersonaDisplay(window.campaignData.personas[pKey], pKey);
            }
        });
    });

    // Handle Audio Language switching
    const voiceLangSelect = document.getElementById('voice-lang');
    if (voiceLangSelect) {
        voiceLangSelect.addEventListener('change', (e) => {
            const lang = e.target.value;
            const audioEl = document.getElementById('voice-audio');
            if (audioEl && ['hi', 'mr', 'ta'].includes(lang)) {
                audioEl.src = `/static/audio/voice_campaign_${lang}.mp3`;
                audioEl.load();
            }
        });
    }
});

function switchTab(targetId) {
    document.querySelectorAll('.nav-item').forEach(n => {
        n.classList.remove('active');
        if (n.getAttribute('data-target') === targetId) {
            n.classList.add('active');
        }
    });

    document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');
}

async function fetchRecentCampaigns() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/campaigns`);
        const campaigns = await response.json();
        
        const tbody = document.getElementById('recent-campaigns-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        campaigns.forEach(camp => {
            const date = new Date(camp.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            
            // Determine badge color
            let badgeClass = 'success';
            if (camp.engagement_prediction < 70) badgeClass = 'warning';
            if (camp.engagement_prediction < 50) badgeClass = 'danger'; // Assuming red for low

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${camp.campaign_name}</td>
                <td>${camp.crop}</td>
                <td>${camp.region}</td>
                <td>${camp.language}</td>
                <td>${date}</td>
                <td><span class="badge ${badgeClass}">${camp.engagement_prediction}%</span></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("Failed to fetch campaigns:", err);
    }
}

function updatePersonaDisplay(personaData, personaId) {
    if (!personaData) return;
    document.getElementById('res-p-name').innerText = personaData.name;
    document.getElementById('res-p-channel').innerText = personaData.channel;
    document.getElementById('res-p-profile').innerText = personaData.profile;
    document.getElementById('res-p-content').innerText = personaData.content;
    document.getElementById('res-p-engagement').innerText = personaData.engagement + "%";

    // Show audio player only for Low Literacy persona
    const audioContainer = document.getElementById('voice-player-container');
    if (audioContainer) {
        if (personaId === 'lowLiteracy') {
            audioContainer.style.display = 'block';
        } else {
            audioContainer.style.display = 'none';
            const audioEl = document.getElementById('voice-audio');
            if (audioEl) audioEl.pause();
        }
    }
}

function populateResults(data) {
    const details = data.campaignDetails;

    // Subtitle
    document.getElementById('results-subtitle').innerText = 
        `Here's your AI-powered campaign for ${details.crop} farmers in ${details.district}, ${details.state}.`;

    // 1. Init Persona Display (Default to traditional)
    if (data.personas && data.personas.traditional) {
        updatePersonaDisplay(data.personas.traditional, 'traditional');
    }
    
    // 1.5 Update AI Intelligence Panel (ML Model) & ROI Panel
    if (data.mlIntelligence) {
        document.getElementById('res-ml-score').innerText = data.mlIntelligence.score + '%';
        const hList = document.getElementById('res-ml-heuristics');
        if (hList) {
            hList.innerHTML = '';
            data.mlIntelligence.heuristics.forEach(h => {
                const li = document.createElement('li');
                li.style.marginBottom = '6px';
                li.innerHTML = `<i class="fa-solid fa-check text-success" style="margin-right: 8px;"></i> ${h}`;
                hList.appendChild(li);
            });
        }

        // --- Calculate Executive Business Decision Metrics (ROI) ---
        const score = data.mlIntelligence.score; // e.g. 74
        const reach = 50000;
        const predictedEngagement = Math.floor(reach * (score / 100));
        const expectedLeads = Math.floor(predictedEngagement * 0.15); // 15% of engaged become leads
        const inquiries = Math.floor(expectedLeads * 0.45); // 45% of leads inquire
        
        // Let's assume average product order value is ₹400
        const revenue = inquiries * 400; 
        const revenueLakhs = (revenue / 100000).toFixed(1);

        const roiReach = document.getElementById('roi-reach');
        const roiEng = document.getElementById('roi-engagement');
        const roiLeads = document.getElementById('roi-leads');
        const roiInq = document.getElementById('roi-inquiries');
        const roiRev = document.getElementById('roi-revenue');

        if (roiReach) roiReach.innerText = reach.toLocaleString();
        if (roiEng) roiEng.innerText = predictedEngagement.toLocaleString();
        if (roiLeads) roiLeads.innerText = expectedLeads.toLocaleString();
        if (roiInq) roiInq.innerText = inquiries.toLocaleString();
        if (roiRev) roiRev.innerText = `₹${revenueLakhs} Lakhs`;
        
        // Also update the Timeline Simulation dynamic numbers
        const tEng = document.querySelector('.t-animate-eng');
        const tRev = document.querySelector('.t-animate-rev');
        if (tEng) tEng.innerText = `${score}% Opened`;
        if (tRev) tRev.innerText = `₹${revenueLakhs} Lakhs`;
    }

    // 2. Build Battle Arena
    const arenaContainer = document.getElementById('res-battle-arena');
    arenaContainer.innerHTML = '';
    
    // Find highest score to mark as winner
    let maxScore = 0;
    data.battleArena.forEach(b => { if (b.score > maxScore) maxScore = b.score; });

    data.battleArena.forEach(variant => {
        const isWinner = variant.score === maxScore ? 'winner' : '';
        const card = document.createElement('div');
        card.className = `arena-card ${isWinner}`;
        card.innerHTML = `
            <div class="arena-header">${variant.variant} ${isWinner ? '<i class="fa-solid fa-trophy text-success ml-2"></i>' : ''}</div>
            <div class="arena-msg">"${variant.message}"</div>
            <div class="progress-container">
                <div class="progress-bar bg-${variant.color}" style="width: ${variant.score}%"></div>
            </div>
            <div class="arena-score text-${variant.color}">${variant.score}% Predicted Engagement</div>
        `;
        arenaContainer.appendChild(card);
    });

    // 3. Build Explainability Flow
    const flowContainer = document.getElementById('res-explain-flow');
    flowContainer.innerHTML = '';
    
    data.explainabilityFlow.forEach((node, index) => {
        const flowNode = document.createElement('div');
        flowNode.className = 'flow-node';
        flowNode.innerHTML = `
            <div class="node-icon"><i class="fa-solid ${node.icon}"></i></div>
            <div class="node-content">
                <h4>${node.step}</h4>
                <p><strong>${node.title}</strong><br>${node.desc}</p>
            </div>
        `;
        flowContainer.appendChild(flowNode);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const leadForm = document.getElementById('leadForm');
    const submitBtn = document.getElementById('submitBtn');
    const leadList = document.getElementById('leadList');
    const activityCount = document.getElementById('activityCount');
    const llmPreview = document.getElementById('llmPreview');
    const llmText = document.getElementById('llmText');
    
    let leads = [];

    // Configuration: AUTO-DETECT or Manual Toggle
    const N8N_HOST = 'https://primary-production-c389.up.railway.app';
    const USE_PRODUCTION = true; // Set to false when clicking "Execute Workflow" in n8n for testing

    const WEBHOOK_PATH = USE_PRODUCTION ? '/webhook/lead' : '/webhook-test/lead';
    const GET_LEADS_PATH = USE_PRODUCTION ? '/webhook/get-leads' : '/webhook-test/get-leads';

    let WEBHOOK_URL = `${N8N_HOST}${WEBHOOK_PATH}`;
    let GET_LEADS_URL = `${N8N_HOST}${GET_LEADS_PATH}`;

    console.log(`Nexus Lead UI: Running in ${USE_PRODUCTION ? 'PRODUCTION' : 'TEST'} mode.`);

    leadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Disable button and show loading state
        submitBtn.disabled = true;
        submitBtn.innerText = 'Initializing Automation...';

        const formData = new FormData(leadForm);
        const data = Object.fromEntries(formData.entries());

        try {
            // 1. Send data to n8n Webhook
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                // Success!
                addLeadToDashboard(data);
                showAIPrefix(data);
                leadForm.reset();
                showSuccessMessage('Automation Triggered Successfully!');
            } else {
                const errorData = await response.json();
                console.error('n8n Error:', errorData);
                if (response.status === 404) {
                    throw new Error('Webhook not registered. Did you click "Execute Workflow" in n8n?');
                }
                throw new Error(errorData.message || 'Webhook rejected the request');
            }
        } catch (error) {
            console.error('Automation Error:', error);
            showErrorMessage(error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Generate Intelligent Response';
        }
    });

    // Sync Button Event Listener
    const syncBtn = document.getElementById('syncBtn');
    syncBtn.addEventListener('click', async () => {
        syncBtn.disabled = true;
        syncBtn.innerHTML = '<span>Syncing...</span>';
        await fetchHistoricalLeads();
        syncBtn.disabled = false;
        syncBtn.innerHTML = '<span>Sync All Leads</span>';
    });

    async function fetchHistoricalLeads() {
        try {
            const response = await fetch(GET_LEADS_URL);
            if (response.ok) {
                const sheetData = await response.json();
                console.log('Fetched Leads:', sheetData);
                
                // Clear and repopulate
                leads = [];
                leadList.innerHTML = '';
                
                if (Array.isArray(sheetData) && sheetData.length > 0) {
                    sheetData.reverse().forEach(row => {
                        // Assuming sheet columns match n8n data
                        const leadItem = {
                            name: row.Name || row.name || 'Unknown',
                            email: row.Email || row.email || 'No Email',
                            interest: row.Interest || row.interest || 'Medium',
                            status: row.Status || row.status || 'New'
                        };
                        addLeadToDashboard(leadItem);
                    });
                    showSuccessMessage(`${sheetData.length} leads synced from Google Sheets`);
                } else {
                    leadList.innerHTML = '<div class="empty-state">No leads found in the sheet.</div>';
                }
            } else {
                throw new Error('Could not fetch data from Google Sheets');
            }
        } catch (error) {
            console.error('Fetch Error:', error);
            showErrorMessage('Sync failed: Webhook not active or sheet empty.');
        }
    }

    function addLeadToDashboard(lead) {
        // Remove empty state if it's the first lead
        if (leads.length === 0) {
            leadList.innerHTML = '';
        }

        leads.push(lead);
        activityCount.innerText = `${leads.length} Leads`;

        const leadItem = document.createElement('div');
        leadItem.className = 'lead-item';
        
        const interestClass = `badge-${lead.interest.toLowerCase()}`;

        leadItem.innerHTML = `
            <div class="lead-info">
                <span class="lead-name">${lead.name}</span>
                <span class="lead-email">${lead.email}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
                <span class="badge ${interestClass}">${lead.interest}</span>
                <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
        `;

        leadList.prepend(leadItem);
    }

    function showAIPrefix(lead) {
        llmPreview.style.display = 'block';
        llmText.innerText = 'AI is analyzing interest levels and drafting a personalized email...';
        
        // Simulate LLM processing time for better UX
        setTimeout(() => {
            llmText.innerText = `Intelligent draft created for "${lead.name}". Syncing with CRM and ERP pipelines... Status: ${lead.status === 'New' ? 'Hot' : 'Active'}`;
        }, 2000);
    }

    function showSuccessMessage(msg) {
        showToast(msg, 'var(--success)');
    }

    function showErrorMessage(msg) {
        showToast(`Error: ${msg}`, 'var(--danger)');
    }

    function showToast(msg, color) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            background: ${color};
            color: white;
            padding: 1rem 2rem;
            border-radius: 1rem;
            box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            animation: fadeIn 0.3s ease-out;
            max-width: 300px;
        `;
        toast.innerText = msg;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.5s ease';
            setTimeout(() => toast.remove(), 500);
        }, 5000);
    }
});

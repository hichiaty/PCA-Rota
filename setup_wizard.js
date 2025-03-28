class SetupWizard {
    constructor() {
        this.hasCompletedSetup = localStorage.getItem('setupComplete') === 'true';
        this.steps = [
            { id: 'welcome', title: 'Welcome to PCA Rota' },
            { id: 'user', title: 'Your Details' },
            { id: 'shifts', title: 'Configure Shifts' },
            { id: 'staff', title: 'Add Staff' },
            { id: 'complete', title: 'Setup Complete' }
        ];
        this.currentStep = 0;
        this.shiftCount = 0; // Start with no shifts
        this.shifts = []; // Empty array instead of default shifts
        this.userName = localStorage.getItem('userName') || ''; // Store user name

        // Try to load existing staff members from localStorage
        try {
            const savedStaff = localStorage.getItem('staffMembers');
            this.staffMembers = savedStaff ? JSON.parse(savedStaff) : [];
        } catch (error) {
            console.warn('Error loading staff members from localStorage:', error);
            this.staffMembers = [];
        }
    }

    init() {
        // Check if setup has already been completed
        if (this.hasCompletedSetup) {
            return;
        }

        // Try to load shift patterns if they exist
        try {
            const savedShifts = localStorage.getItem('shiftPatterns');
            if (savedShifts) {
                this.shifts = JSON.parse(savedShifts);
            }
        } catch (error) {
            console.warn('Error loading shift patterns from localStorage:', error);
        }

        // Create a global reference to this instance
        window.wizardInstance = this;

        this.createWizardUI();
        this.renderCurrentStep();
    }

    createWizardUI() {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'setup-overlay';

        // Create wizard container
        const wizard = document.createElement('div');
        wizard.className = 'setup-wizard';
        wizard.id = 'setupWizard';

        // Create header with progress
        const header = document.createElement('div');
        header.className = 'wizard-header';

        const progressContainer = document.createElement('div');
        progressContainer.className = 'wizard-progress';

        this.steps.forEach((step, index) => {
            const stepIndicator = document.createElement('div');
            stepIndicator.className = 'wizard-step-indicator';
            stepIndicator.dataset.stepId = step.id;
            stepIndicator.innerHTML = `
                <div class="step-number">${index + 1}</div>
                <div class="step-title">${step.title}</div>
            `;
            progressContainer.appendChild(stepIndicator);

            // Add connector except for the last step
            if (index < this.steps.length - 1) {
                const connector = document.createElement('div');
                connector.className = 'step-connector';
                progressContainer.appendChild(connector);
            }
        });

        header.appendChild(progressContainer);

        // Create body
        const body = document.createElement('div');
        body.className = 'wizard-body';
        body.id = 'wizardBody';

        // Create footer
        const footer = document.createElement('div');
        footer.className = 'wizard-footer';

        const backBtn = document.createElement('button');
        backBtn.className = 'btn btn-outline-secondary wizard-back-btn';
        backBtn.textContent = 'Back';
        backBtn.id = 'wizardBackBtn';
        backBtn.addEventListener('click', () => this.goToPreviousStep());

        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-primary wizard-next-btn';
        nextBtn.textContent = 'Next';
        nextBtn.id = 'wizardNextBtn';
        nextBtn.addEventListener('click', () => this.goToNextStep());

        footer.appendChild(backBtn);
        footer.appendChild(nextBtn);

        // Assemble wizard
        wizard.appendChild(header);
        wizard.appendChild(body);
        wizard.appendChild(footer);
        overlay.appendChild(wizard);

        // Add styles
        this.addStyles();

        // Add to body
        document.body.appendChild(overlay);
    }

    addStyles() {
        const styleEl = document.createElement('style');
        styleEl.innerHTML = `
            .setup-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            }
            
            .setup-wizard {
                background: white;
                border-radius: 10px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                width: 80%;
                max-width: 800px;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                animation: slide-up 0.4s ease-out;
            }
            
            @keyframes slide-up {
                from { transform: translateY(50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            .wizard-header {
                padding: 20px;
                background: #f8f9fa;
                border-bottom: 1px solid #dee2e6;
            }
            
            .wizard-progress {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .wizard-step-indicator {
                display: flex;
                flex-direction: column;
                align-items: center;
                position: relative;
                z-index: 2;
            }
            
            .step-number {
                width: 30px;
                height: 30px;
                border-radius: 50%;
                background: #dee2e6;
                color: #495057;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                margin-bottom: 5px;
                transition: all 0.3s ease;
            }
            
            .step-title {
                font-size: 0.8rem;
                color: #6c757d;
                text-align: center;
                transition: all 0.3s ease;
            }
            
            .step-connector {
                flex: 1;
                height: 2px;
                background: #dee2e6;
                position: relative;
                z-index: 1;
                margin: 0 10px;
                margin-top: -25px;
            }
            
            .wizard-step-indicator.active .step-number {
                background: #007bff;
                color: white;
            }
            
            .wizard-step-indicator.active .step-title {
                color: #007bff;
                font-weight: bold;
            }
            
            .wizard-step-indicator.completed .step-number {
                background: #28a745;
                color: white;
            }
            
            .wizard-body {
                padding: 30px;
                overflow-y: auto;
                flex: 1;
            }
            
            .wizard-footer {
                padding: 20px;
                background: #f8f9fa;
                border-top: 1px solid #dee2e6;
                display: flex;
                justify-content: space-between;
            }
            
            .wizard-section {
                margin-bottom: 20px;
            }
            
            .wizard-section h3 {
                margin-bottom: 15px;
                color: #212529;
            }
            
            .shift-item {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 15px;
                border: 1px solid #dee2e6;
                position: relative;
            }
            
            .shift-item .remove-shift {
                position: absolute;
                top: 8px;
                right: 8px;
                cursor: pointer;
                color: #dc3545;
                font-size: 1.2rem;
                opacity: 0.7;
                transition: opacity 0.2s;
            }
            
            .shift-item .remove-shift:hover {
                opacity: 1;
            }
            
            .time-inputs {
                display: flex;
                gap: 10px;
                align-items: center;
            }
            
            .staff-list {
                max-height: 300px;
                overflow-y: auto;
                margin-top: 15px;
            }
            
            .staff-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                background: #f8f9fa;
                border-radius: 6px;
                margin-bottom: 8px;
                border: 1px solid #dee2e6;
            }
            
            .staff-item .remove-staff {
                background: none;
                border: none;
                padding: 0;
                cursor: pointer;
                color: #dc3545;
                opacity: 0.7;
                transition: opacity 0.2s;
            }
            
            .staff-item .remove-staff:hover {
                opacity: 1;
            }
            
            .completion-message {
                text-align: center;
                padding: 20px 0;
            }
            
            .completion-message i {
                font-size: 4rem;
                color: #28a745;
                margin-bottom: 20px;
                display: block;
            }
            
            .highlight {
                color: #007bff;
                font-weight: 500;
            }
            
            /* Animation for adding items */
            @keyframes fade-in {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .fade-in {
                animation: fade-in 0.3s ease-out;
            }
        `;
        document.head.appendChild(styleEl);
    }

    renderCurrentStep() {
        // Update progress indicators
        document.querySelectorAll('.wizard-step-indicator').forEach((indicator, index) => {
            indicator.classList.remove('active', 'completed');
            if (index === this.currentStep) {
                indicator.classList.add('active');
            } else if (index < this.currentStep) {
                indicator.classList.add('completed');
            }
        });

        const body = document.getElementById('wizardBody');
        body.innerHTML = '';

        const backBtn = document.getElementById('wizardBackBtn');
        const nextBtn = document.getElementById('wizardNextBtn');
        const footer = document.querySelector('.wizard-footer');

        // Show/hide footer based on current step
        footer.style.display = this.currentStep === 0 ? 'none' : 'flex';

        // Show/hide back button based on current step
        backBtn.style.visibility = this.currentStep === 0 ? 'hidden' : 'visible';

        // Show/hide next button based on current step
        nextBtn.style.display = this.currentStep === 0 ? 'none' : 'block';

        // Update next button text for final step
        if (this.currentStep === this.steps.length - 1) {
            nextBtn.textContent = 'Finish Setup';
        } else {
            nextBtn.textContent = 'Next';
        }

        // Render content based on current step
        switch (this.steps[this.currentStep].id) {
            case 'welcome':
                this.renderWelcomeStep(body);
                break;
            case 'user':
                this.renderUserStep(body);
                break;
            case 'shifts':
                this.renderShiftsStep(body);
                break;
            case 'staff':
                this.renderStaffStep(body);
                break;
            case 'complete':
                this.renderCompleteStep(body);
                break;
        }
    }

    renderWelcomeStep(container) {
        container.innerHTML = `
            <div class="wizard-section text-center">
                <h2 class="mb-4">Welcome to the PCA Rota Setup</h2>
                <div class="mb-4">
                    <i class="bi bi-calendar-check" style="font-size: 3rem; color: #007bff;"></i>
                </div>
                <p class="lead mb-4">This setup will help you configure your PCA scheduling system.</p>
                
                <div class="setup-options">
                    <div class="row">
                        <div class="col-md-6 mb-4">
                            <div class="card h-100 setup-card clickable" id="new-setup-card" role="button" tabindex="0">
                                <div class="card-body text-center">
                                    <i class="bi bi-plus-circle" style="font-size: 2.5rem; color: #28a745;"></i>
                                    <h5 class="card-title mt-3">New Setup</h5>
                                    <p class="card-text">Configure your rota system from scratch:</p>
                                    <ul class="text-start">
                                        <li><i class="bi bi-check-circle-fill text-success"></i> Shift patterns and times</li>
                                        <li><i class="bi bi-check-circle-fill text-success"></i> Staff members</li>
                                        <li><i class="bi bi-check-circle-fill text-success"></i> Other essential settings</li>
                                    </ul>
                                </div>
                                <div class="card-footer bg-transparent border-0">
                                    <span class="btn btn-primary w-100">Continue with Setup</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-6 mb-4">
                            <div class="card h-100 setup-card clickable" id="import-card" role="button" tabindex="0">
                                <div class="card-body text-center">
                                    <i class="bi bi-upload" style="font-size: 2.5rem; "></i>
                                    <h5 class="card-title mt-3">Import Configuration</h5>
                                    <p class="card-text">Restore from a backup file including:</p>
                                    <ul class="text-start">
                                        <li><i class="bi bi-check-circle-fill text-success"></i> Shift patterns</li>
                                        <li><i class="bi bi-check-circle-fill text-success"></i> Staff members</li>
                                        <li><i class="bi bi-check-circle-fill text-success"></i> All assignments (optional)</li>
                                    </ul>
                                </div>
                                <div class="card-footer bg-transparent border-0">
                                    <span class="btn btn-dark w-100">Import from Backup</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div id="importSection" class="mt-4" style="display: none;">
                        <div class="alert alert-light border">
                            <i class="bi bi-info-circle-fill me-2"></i>
                            Select a backup file (.json) to restore your configuration
                        </div>
                        
                        <div class="custom-file-upload">
                            <div class="upload-area" id="uploadArea">
                                <i class="bi bi-cloud-arrow-up-fill"></i>
                                <p>Drag & drop your backup file here or click to browse</p>
                                <input type="file" id="fileInput" accept="application/json" style="display: none;">
                            </div>
                            <div id="fileDetails" class="mt-3 text-center" style="display: none;">
                                <div class="selected-file alert alert-success">
                                    <i class="bi bi-file-earmark-text me-2"></i>
                                    <span id="fileName">No file selected</span>
                                </div>
                                <button class="btn btn-success mt-2" id="processImportBtn">
                                    <i class="bi bi-check-circle me-2"></i>Import Configuration
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add styles for the welcome page
        const styleEl = document.createElement('style');
        styleEl.innerHTML = `
            .setup-card {
                transition: all 0.3s ease;
                border: 2px solid #dee2e6;
            }
            
            .setup-card.clickable {
                cursor: pointer;
            }
            
            .setup-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 20px rgba(0,0,0,0.1);
                border-color: #007bff;
            }
            
            .setup-card.selected {
                border-color: #007bff;
                box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
            }
            
            .setup-card:focus {
                outline: none;
                border-color: #007bff;
                box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
            }
            
            .custom-file-upload {
                margin-top: 20px;
            }
            
            .upload-area {
                border: 2px dashed #ccc;
                border-radius: 8px;
                padding: 30px;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .upload-area:hover {
                
                background-color: rgba(111, 66, 193, 0.05);
            }
            
            .upload-area i {
                font-size: 3rem;

                margin-bottom: 15px;
            }
            
            .upload-area.drag-over {
                border-color: #28a745;
                background-color: rgba(40, 167, 69, 0.05);
            }
            
            .selected-file {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .btn-purple {
                color: white;
            }
            
            .btn-purple:hover {
                
                color: white;
            }
        `;
        document.head.appendChild(styleEl);

        // Setup event listeners for the entire cards
        const setupCard = document.getElementById('new-setup-card');
        const importCard = document.getElementById('import-card');

        // Make the entire new setup card clickable
        setupCard.addEventListener('click', () => {
            this.currentStep++;
            this.renderCurrentStep();
        });

        // Add keyboard accessibility for the new setup card
        setupCard.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.currentStep++;
                this.renderCurrentStep();
            }
        });

        // Make the entire import card clickable
        importCard.addEventListener('click', () => {
            showImportSection();
        });

        // Add keyboard accessibility for the import card
        importCard.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showImportSection();
            }
        });

        // Function to show import section
        const showImportSection = () => {
            document.getElementById('importSection').style.display = 'block';

            // Highlight the import card
            importCard.classList.add('selected');
            setupCard.classList.remove('selected');

            // Smooth scroll to the import section
            document.getElementById('importSection').scrollIntoView({ behavior: 'smooth' });
        };

        // Set up the file upload functionality
        const fileInput = document.getElementById('fileInput');
        const uploadArea = document.getElementById('uploadArea');
        const fileDetails = document.getElementById('fileDetails');
        const fileName = document.getElementById('fileName');
        const processImportBtn = document.getElementById('processImportBtn');

        // Handle click on upload area
        uploadArea.addEventListener('click', (e) => {
            // Stop propagation to prevent the card click handler from being triggered
            e.stopPropagation();
            fileInput.click();
        });

        // Handle drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');

            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                handleFileSelected(e.dataTransfer.files[0]);
            }
        });

        // Handle file selection
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length) {
                handleFileSelected(fileInput.files[0]);
            }
        });

        // Function to handle selected file
        const handleFileSelected = (file) => {
            fileName.textContent = file.name;
            fileDetails.style.display = 'block';

            // Preview animation
            uploadArea.innerHTML = '<i class="bi bi-check-circle-fill" style="color: #28a745;"></i><p>File selected successfully!</p>';
        };

        // Process the import
        processImportBtn.addEventListener('click', (e) => {
            // Stop propagation to prevent the card click handler from being triggered
            e.stopPropagation();

            if (fileInput.files.length === 0) {
                alert('Please select a file first.');
                return;
            }

            const file = fileInput.files[0];
            const reader = new FileReader();

            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);

                    // Validate the data structure
                    if (!data.staff && !data.shiftPatterns) {
                        throw new Error('Invalid backup file format. Missing staff or shift patterns.');
                    }

                    // Visual feedback during processing
                    processImportBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Processing...';
                    processImportBtn.disabled = true;

                    // Process the import with a slight delay to show the processing state
                    setTimeout(() => {
                        // Import the data
                        this.importBackupData(data);
                    }, 800);

                } catch (error) {
                    alert('Error importing data: ' + error.message);
                    uploadArea.innerHTML = '<i class="bi bi-exclamation-triangle-fill" style="color: #dc3545;"></i><p>Invalid file format. Please try again.</p>';

                    // Reset after 2 seconds
                    setTimeout(() => {
                        uploadArea.innerHTML = '<i class="bi bi-cloud-arrow-up-fill"></i><p>Drag & drop your backup file here or click to browse</p>';
                    }, 2000);
                }
            };

            reader.readAsText(file);
        });
    }

    // Add new method to handle import data
    importBackupData(data) {
        // Check what data we have available
        const hasStaff = data.staff && Array.isArray(data.staff);
        const hasShiftPatterns = data.shiftPatterns && Array.isArray(data.shiftPatterns);
        const hasAssignments = data.assignments && typeof data.assignments === 'object';
        const hasUserName = data.userName && typeof data.userName === 'string';
        const hasStaffSettings = data.staffSettings && typeof data.staffSettings === 'object';

        // Create a temporary container to store our import results
        const importResults = {
            staff: hasStaff ? data.staff : [],
            shiftPatterns: hasShiftPatterns ? data.shiftPatterns : [],
            assignments: hasAssignments ? data.assignments : {},
            userName: hasUserName ? data.userName : this.userName || '',
            staffSettings: hasStaffSettings ? data.staffSettings : {}
        };

        // Show missing data form if necessary
        if (!hasUserName || !hasShiftPatterns || !hasStaff) {
            this.showMissingDataForm(importResults, data);
        } else {
            // All data is present, apply import directly
            this.applyImportedData(importResults);
        }
    }

    // New method to show a form for missing data
    showMissingDataForm(importResults, originalData) {
        const importSection = document.getElementById('importSection');

        // Create clear indicators of what was found and what's missing
        const foundItems = [];
        const missingItems = [];

        if (importResults.userName) foundItems.push('User name');
        else missingItems.push('User name');

        if (importResults.shiftPatterns.length > 0) foundItems.push('Shift patterns');
        else missingItems.push('Shift patterns');

        if (importResults.staff.length > 0) foundItems.push('Staff members');
        else missingItems.push('Staff members');

        if (Object.keys(importResults.assignments).length > 0) foundItems.push('Shift assignments');
        else missingItems.push('Shift assignments');

        // Add staff settings to the found items if available
        if (Object.keys(importResults.staffSettings).length > 0) {
            const settingsCount = Object.keys(importResults.staffSettings).length;
            foundItems.push(`Staff settings (${settingsCount} staff members)`);
        } else {
            missingItems.push('Staff settings');
        }

        importSection.innerHTML = `
            <div class="import-review p-4">
                <div class="row mb-4">
                    <div class="col-md-12">
                        <div class="alert alert-info">
                            <h5 class="alert-heading">
                                <i class="bi bi-info-circle-fill me-2"></i>
                                Missing Information
                            </h5>
                            <p>Your backup file is missing some information. Please complete the form below to continue with the setup.</p>
                        </div>
                    </div>
                </div>
                
                <div class="row mb-4">
                    <div class="col-md-6">
                        <div class="card border-success h-100">
                            <div class="card-header bg-success text-white">
                                <i class="bi bi-check-circle-fill me-2"></i>
                                Found in Backup
                            </div>
                            <div class="card-body">
                                ${foundItems.length > 0 ?
                `<ul class="list-group list-group-flush">
                                        ${foundItems.map(item => `
                                            <li class="list-group-item bg-transparent">
                                                <i class="bi bi-check-circle-fill text-success me-2"></i>
                                                ${item}
                                            </li>
                                        `).join('')}
                                    </ul>` :
                `<p class="text-muted text-center mt-3">No valid data found in backup</p>`
            }
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="card border-warning h-100">
                            <div class="card-header bg-warning text-dark">
                                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                                Missing Information
                            </div>
                            <div class="card-body">
                                ${missingItems.length > 0 ?
                `<ul class="list-group list-group-flush">
                                        ${missingItems.map(item => `
                                            <li class="list-group-item bg-transparent">
                                                <i class="bi bi-x-circle-fill text-warning me-2"></i>
                                                ${item}
                                            </li>
                                        `).join('')}
                                    </ul>` :
                `<p class="text-success text-center mt-3">All required data found!</p>`
            }
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="missing-data-form mt-4">
                    <h5 class="border-bottom pb-3 mb-4">Complete Missing Information</h5>
                    
                    ${!importResults.userName ? `
                        <div class="mb-4 form-floating data-field fade-in">
                            <input type="text" class="form-control" id="importUserName" placeholder="Your name" 
                                value="${this.userName || ''}">
                            <label for="importUserName">Your Name <span class="text-danger">*</span></label>
                            <div class="form-text">
                                <i class="bi bi-info-circle me-1"></i>
                                Your name will be used when generating calendar files
                            </div>
                        </div>
                    ` : ''}
                    
                    ${importResults.shiftPatterns.length === 0 ? `
                        <div class="mb-4 fade-in">
                            <label class="form-label">Shift Patterns <span class="text-danger">*</span></label>
                            <div class="alert alert-light border">
                                <i class="bi bi-lightbulb-fill text-warning me-2"></i>
                                No shift patterns found in the backup. You'll need to configure them in the next step.
                            </div>
                        </div>
                    ` : ''}
                    
                    ${importResults.staff.length === 0 ? `
                        <div class="mb-4 fade-in">
                            <label class="form-label">Staff Members</label>
                            <div class="alert alert-light border">
                                <i class="bi bi-lightbulb-fill text-warning me-2"></i>
                                No staff members found in the backup. You'll need to add them later in the setup.
                            </div>
                        </div>
                    ` : ''}
                    
                    ${Object.keys(importResults.staffSettings).length === 0 && importResults.staff.length > 0 ? `
                        <div class="mb-4 fade-in">
                            <label class="form-label">Staff Settings</label>
                            <div class="alert alert-light border">
                                <i class="bi bi-lightbulb-fill text-warning me-2"></i>
                                No staff settings found in the backup. Staff preferences and holidays will need to be configured later.
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="d-flex justify-content-between mt-5">
                        <button class="btn btn-outline-secondary" id="backToImportBtn">
                            <i class="bi bi-arrow-left me-2"></i>Back
                        </button>
                        <button class="btn btn-primary" id="continueMissingDataBtn">
                            <i class="bi bi-check2 me-2"></i>Continue
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add animation styles
        const styleEl = document.createElement('style');
        styleEl.innerHTML = `
            .data-field {
                transition: all 0.3s ease;
            }
            .data-field:focus-within {
                transform: translateY(-3px);
            }
            
            @keyframes fade-slide-in {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .fade-in {
                animation: fade-slide-in 0.4s ease-out forwards;
            }
            
            .fade-in:nth-child(2) {
                animation-delay: 0.1s;
            }
            
            .fade-in:nth-child(3) {
                animation-delay: 0.2s;
            }
            
            .fade-in:nth-child(4) {
                animation-delay: 0.3s;
            }
        `;
        document.head.appendChild(styleEl);

        // Add event listeners
        document.getElementById('backToImportBtn').addEventListener('click', () => {
            // Return to the import section
            this.renderWelcomeStep(document.getElementById('wizardBody'));

            // Show the import section
            document.getElementById('importSection').style.display = 'block';
            document.getElementById('import-card').classList.add('selected');
            document.getElementById('new-setup-card').classList.remove('selected');
        });

        document.getElementById('continueMissingDataBtn').addEventListener('click', () => {
            // Update the import results with user-provided data
            if (!importResults.userName) {
                const userNameInput = document.getElementById('importUserName');
                importResults.userName = userNameInput.value.trim();

                if (!importResults.userName) {
                    alert('Please enter your name to continue.');
                    userNameInput.focus();
                    return;
                }
            }

            // Apply the imported data with the added missing information
            this.applyImportedData(importResults);
        });
    }

    // New method to apply the imported data
    applyImportedData(importResults) {
        // Save the data to the wizard and localStorage
        if (importResults.shiftPatterns.length > 0) {
            this.shifts = importResults.shiftPatterns;
            localStorage.setItem('shiftPatterns', JSON.stringify(importResults.shiftPatterns));
        }

        if (importResults.staff.length > 0) {
            this.staffMembers = importResults.staff;
            localStorage.setItem('staffMembers', JSON.stringify(importResults.staff));
        }

        if (Object.keys(importResults.assignments).length > 0) {
            localStorage.setItem('shiftAssignments', JSON.stringify(importResults.assignments));
        }

        // Save staff settings if they exist
        const hasStaffSettings = Object.keys(importResults.staffSettings).length > 0;
        if (hasStaffSettings) {
            Object.keys(importResults.staffSettings).forEach(worker => {
                localStorage.setItem(`staffSettings_${worker}`, JSON.stringify(importResults.staffSettings[worker]));
            });
        }

        this.userName = importResults.userName;
        localStorage.setItem('userName', importResults.userName);

        // Show success message
        const importSection = document.getElementById('importSection');
        importSection.innerHTML = `
            <div class="import-success text-center p-4">
                <i class="bi bi-check-circle-fill" style="font-size: 4rem; color: #28a745;"></i>
                <h4 class="mt-3">Import Successful!</h4>
                <div class="mt-3 text-start">
                    <p>Successfully imported or configured:</p>
                    <ul>
                        <li><i class="bi bi-check-circle-fill text-success me-2"></i>User details (${importResults.userName})</li>
                        <li><i class="bi bi-check-circle-fill text-success me-2"></i>${importResults.shiftPatterns.length} shift patterns ${importResults.shiftPatterns.length === 0 ? '(will configure next)' : ''}</li>
                        <li><i class="bi bi-check-circle-fill text-success me-2"></i>${importResults.staff.length} staff members ${importResults.staff.length === 0 ? '(will add later)' : ''}</li>
                        ${Object.keys(importResults.assignments).length > 0 ?
                `<li><i class="bi bi-check-circle-fill text-success me-2"></i>All shift assignments</li>` : ''}
                        ${hasStaffSettings ?
                `<li><i class="bi bi-check-circle-fill text-success me-2"></i>Staff settings for ${Object.keys(importResults.staffSettings).length} staff members
                    <ul class="mt-2 ms-4 small">
                        <li>Shift preferences by day</li>
                        <li>Holiday/time-off schedules</li>
                    </ul>
                </li>` : ''}
                    </ul>
                </div>
                
                <div class="mt-4">
                    ${importResults.shiftPatterns.length === 0 || importResults.staff.length === 0 ?
                `<p class="alert alert-info">
                        <i class="bi bi-info-circle-fill me-2"></i>
                        You'll need to complete the setup process to configure the missing information.
                    </p>` : ''
            }
                    <button class="btn btn-success" id="completeImportBtn">
                        <i class="bi bi-check2-all me-2"></i>Continue with Setup
                </button>
                </div>
            </div>
        `;

        // Add animation
        const successEl = document.createElement('style');
        successEl.innerHTML = `
            @keyframes scale-in {
                0% { transform: scale(0.8); opacity: 0; }
                100% { transform: scale(1); opacity: 1; }
            }
            .import-success {
                animation: scale-in 0.5s ease-out forwards;
            }
        `;
        document.head.appendChild(successEl);

        // Add event listener to continue setup button
        document.getElementById('completeImportBtn').addEventListener('click', () => {
            if (importResults.shiftPatterns.length === 0 || importResults.staff.length === 0) {
                // Continue to the next step if there are missing configurations
                this.currentStep++;
                this.renderCurrentStep();
            } else {
                // Complete the setup if all data is available
                this.completeSetup();
            }
        });
    }

    renderShiftsStep(container) {
        container.innerHTML = `
            <div class="wizard-section">
                <h3>Configure Shift Patterns</h3>
                <p>Define the shifts that will be used in your rota schedule. <span class="text-danger">You must add at least one shift.</span></p>
                
                <div id="shiftsContainer"></div>
                
                <button class="btn btn-outline-primary mt-3" id="addShiftBtn">
                    <i class="bi bi-plus-circle"></i> Add Shift
                </button>
            </div>
        `;

        const shiftsContainer = document.getElementById('shiftsContainer');

        // If no shifts defined yet, prompt user to add one
        if (this.shifts.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'alert alert-info mt-3 mb-3';
            emptyMessage.innerHTML = 'No shifts defined yet. Click "Add Shift" to create your first shift pattern.';
            shiftsContainer.appendChild(emptyMessage);
        } else {
            // Render each shift
            this.shifts.forEach((shift, index) => {
                this.addShiftToUI(shiftsContainer, shift, index);
            });
        }

        // Setup event listener for add shift button
        document.getElementById('addShiftBtn').addEventListener('click', () => {
            // Remove empty message if it exists
            const emptyMessage = shiftsContainer.querySelector('.alert');
            if (emptyMessage) {
                emptyMessage.remove();
            }

            const newShift = {
                id: this.shifts.length + 1,
                name: `Shift ${this.shifts.length + 1}`,
                startTime: '09:00',
                endTime: '17:00'
            };
            this.shifts.push(newShift);
            this.addShiftToUI(shiftsContainer, newShift, this.shifts.length - 1);
        });
    }

    addShiftToUI(container, shift, index) {
        const shiftEl = document.createElement('div');
        shiftEl.className = 'shift-item fade-in';
        shiftEl.dataset.shiftIndex = index;

        shiftEl.innerHTML = `
            <div class="remove-shift" title="Remove this shift"><i class="bi bi-x-circle-fill"></i></div>
            <div class="mb-3">
                <label for="shiftName${index}" class="form-label">Shift Name</label>
                <input type="text" class="form-control" id="shiftName${index}" value="${shift.name}" placeholder="e.g., Morning Shift">
            </div>
            <div class="mb-3">
                <label class="form-label">Shift Times</label>
                <div class="time-inputs">
                    <input type="time" class="form-control" id="startTime${index}" value="${shift.startTime}">
                    <span>to</span>
                    <input type="time" class="form-control" id="endTime${index}" value="${shift.endTime}">
                </div>
            </div>
        `;

        container.appendChild(shiftEl);

        // Setup event listeners for inputs to update shift data
        document.getElementById(`shiftName${index}`).addEventListener('change', (e) => {
            this.shifts[index].name = e.target.value;
        });

        document.getElementById(`startTime${index}`).addEventListener('change', (e) => {
            this.shifts[index].startTime = e.target.value;
        });

        document.getElementById(`endTime${index}`).addEventListener('change', (e) => {
            this.shifts[index].endTime = e.target.value;
        });

        // Setup event listener for remove button (only if there's more than one shift)
        const removeBtn = shiftEl.querySelector('.remove-shift');
        if (this.shifts.length > 1) {
            removeBtn.addEventListener('click', () => {
                this.shifts.splice(index, 1);
                // Re-render all shifts
                const shiftsContainer = document.getElementById('shiftsContainer');
                shiftsContainer.innerHTML = '';
                this.shifts.forEach((shift, i) => {
                    this.addShiftToUI(shiftsContainer, shift, i);
                });
            });
        } else {
            removeBtn.style.display = 'none'; // Hide remove button if only one shift
        }
    }

    renderStaffStep(container) {

        // Clean HTML with unique ID for input
        container.innerHTML = `
            <div class="wizard-section">
                <h3>Add Staff Members</h3>
                <p>Add the staff members who will be assigned to shifts.</p>
                
                <div class="input-group mb-3">
                    <input type="text" class="form-control" id="wizardStaffInput" placeholder="Enter staff name...">
                    <button class="btn btn-primary" type="button" id="wizardAddStaffBtn">Add</button>
                </div>
                
                <div id="staffListContainer" class="staff-list mt-3">
                    <p class="text-muted" id="emptyStaffMessage">No staff members added yet.</p>
                </div>
            </div>
        `;

        // Add event listener for add button
        document.getElementById('wizardAddStaffBtn').addEventListener('click', () => {
            this.addStaffMember();
        });

        // Add event listener for Enter key on input
        const staffInput = document.getElementById('wizardStaffInput');
        staffInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addStaffMember();
            }
        });

        // Focus the input for immediate typing
        staffInput.focus();

        // Add existing staff members
        const staffList = document.getElementById('staffListContainer');
        const emptyMessage = document.getElementById('emptyStaffMessage');
        emptyMessage.style.display = this.staffMembers.length ? 'none' : 'block';

        this.staffMembers.forEach((staffName, index) => {
            this.addStaffToUI(staffList, staffName, index);
        });
    }

    // Clean, straightforward method to add staff members with duplication check
    addStaffMember() {
        const input = document.getElementById('wizardStaffInput');
        const staffName = input.value.trim();

        if (staffName) {
            // Check if staff member already exists (case-insensitive comparison)
            const isDuplicate = this.staffMembers.some(existingStaff =>
                existingStaff.toLowerCase() === staffName.toLowerCase()
            );

            if (isDuplicate) {
                alert(`Staff member "${staffName}" already exists`);
                // Select the text in the input for easy editing
                input.select();
                return;
            }

            // Add to staff members array
            this.staffMembers.push(staffName);

            // Add to UI
            const staffList = document.getElementById('staffListContainer');
            this.addStaffToUI(staffList, staffName, this.staffMembers.length - 1);

            // Clear input
            input.value = '';

            // Hide empty message
            const emptyMessage = document.getElementById('emptyStaffMessage');
            emptyMessage.style.display = 'none';

            // Focus the input for another entry
            input.focus();
        } else {
            alert("Please enter a staff name");
        }
    }

    // Clean method to add staff to the UI
    addStaffToUI(container, staffName, index) {
        const staffEl = document.createElement('div');
        staffEl.className = 'staff-item fade-in';
        staffEl.dataset.staffIndex = index;

        staffEl.innerHTML = `
            <span>${staffName}</span>
            <button class="remove-staff" title="Remove staff member" style="background: none; border: none; padding: 0; cursor: pointer;">
                <i class="bi bi-trash"></i>
            </button>
        `;

        // Add remove functionality
        const removeBtn = staffEl.querySelector('.remove-staff');
        removeBtn.addEventListener('click', () => {
            this.removeStaffMember(index);
            staffEl.remove();

            // Show empty message if no staff left
            if (this.staffMembers.length === 0) {
                document.getElementById('emptyStaffMessage').style.display = 'block';
            }
        });

        container.appendChild(staffEl);
    }

    // Method to remove staff members
    removeStaffMember(index) {
        if (index >= 0 && index < this.staffMembers.length) {
            this.staffMembers.splice(index, 1);
        }
    }

    renderUserStep(container) {
        container.innerHTML = `
            <div class="wizard-section">
                <div class="row">
                    <div class="col-md-12 mb-4">
                        <div class="user-details-card p-4 border rounded bg-light">
                            <div class="text-center mb-4">
                                <i class="bi bi-person-circle" style="font-size: 4rem;"></i>
                                <h3 class="mt-3">Your Details</h3>
                                <p class="text-muted">Please provide your information for personalized features</p>
                            </div>
                            
                            <div class="form-floating mb-4">
                                <input type="text" class="form-control" id="userNameInput" placeholder="Your name" value="${this.userName || ''}">
                                <label for="userNameInput">Your Name <span class="text-danger">*</span></label>
                                <div class="form-text mt-2">
                                    <i class="bi bi-info-circle"></i> 
                                    Your name is required and will be used when generating ICS calendar files
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add some animations for visual appeal
        const styleEl = document.createElement('style');
        styleEl.innerHTML = `
            .user-details-card {
                box-shadow: 0 6px 15px rgba(0,0,0,0.1);
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }
            
            .user-details-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 20px rgba(0,0,0,0.15);
            }
            
            .animation-container {
                padding: 20px;
                background: rgba(111, 66, 193, 0.05);
                border-radius: 8px;
            }
            
            .animation-element {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
            
            .animation-element i {
                animation: pulse 2s infinite ease-in-out;
            }
            
            .animation-element i:nth-child(2) {
                animation-delay: 0.3s;
            }
            
            .animation-element i:nth-child(3) {
                animation-delay: 0.6s;
            }
            
            .form-floating label {
                font-weight: 500;
            }
        `;
        document.head.appendChild(styleEl);

        // Add event listener to save the user name when it changes
        document.getElementById('userNameInput').addEventListener('change', (e) => {
            this.userName = e.target.value.trim();
            localStorage.setItem('userName', this.userName);
        });
    }

    renderCompleteStep(container) {
        // Count staff settings in localStorage
        let staffSettingsCount = 0;
        this.staffMembers.forEach(worker => {
            if (localStorage.getItem(`staffSettings_${worker}`)) {
                staffSettingsCount++;
            }
        });

        container.innerHTML = `
            <div class="completion-message">
                <i class="bi bi-check-circle"></i>
                <h3>Setup Complete!</h3>
                <p class="lead">Your rota system is now configured and ready to use.</p>
                
                <div class="setup-summary mt-4">
                    <h4>Configuration Summary</h4>
                    
                    <div class="card mb-3">
                        <div class="card-header">
                            <strong>User Details</strong>
                        </div>
                        <div class="card-body">
                            <h5 class="mb-0">${this.userName}</h5>
                            <small class="text-muted">This will be used for calendar exports</small>
                        </div>
                    </div>
                    
                    <div class="card mb-3">
                        <div class="card-header">
                            <strong>Shifts (${this.shifts.length})</strong>
                        </div>
                        <ul class="list-group list-group-flush">
                            ${this.shifts.map(shift => `
                                <li class="list-group-item">
                                    <strong>${shift.name}</strong>: ${shift.startTime} to ${shift.endTime}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    
                    <div class="card mb-3">
                        <div class="card-header">
                            <strong>Staff Members (${this.staffMembers.length})</strong>
                        </div>
                        <ul class="list-group list-group-flush">
                            ${this.staffMembers.length ? this.staffMembers.map(staff => `
                                <li class="list-group-item">${staff}</li>
                            `).join('') : '<li class="list-group-item text-muted">No staff members added</li>'}
                        </ul>
                    </div>
                    
                    ${staffSettingsCount > 0 ? `
                    <div class="card mb-3">
                        <div class="card-header">
                            <strong>Staff Settings</strong>
                        </div>
                        <div class="card-body">
                            <p class="mb-0">Imported settings for ${staffSettingsCount} staff members including preferences and holidays</p>
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <p class="mt-4">Click 'Finish Setup' to start using your rota system.</p>
            </div>
        `;

        // Add animation for the completion step
        const styleEl = document.createElement('style');
        styleEl.innerHTML = `
            .completion-message i {
                animation: checkmark 0.5s ease-in-out forwards;
                transform-origin: center;
                opacity: 0;
            }
            
            @keyframes checkmark {
                0% { transform: scale(0.5); opacity: 0; }
                50% { transform: scale(1.2); opacity: 1; }
                100% { transform: scale(1); opacity: 1; }
            }
            
            .setup-summary .card {
                transition: all 0.3s ease;
                opacity: 0;
                transform: translateY(20px);
                animation: summary-item 0.5s ease-out forwards;
            }
            
            .setup-summary .card:nth-child(2) {
                animation-delay: 0.2s;
            }
            
            .setup-summary .card:nth-child(3) {
                animation-delay: 0.4s;
            }
            
            .setup-summary .card:nth-child(4) {
                animation-delay: 0.6s;
            }
            
            @keyframes summary-item {
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(styleEl);
    }

    goToNextStep() {
        // Validate current step before proceeding
        if (!this.validateCurrentStep()) {
            return;
        }

        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.renderCurrentStep();
        } else {
            this.completeSetup();
        }
    }

    goToPreviousStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.renderCurrentStep();
        }
    }

    validateCurrentStep() {
        switch (this.steps[this.currentStep].id) {
            case 'user':
                // Make user name compulsory
                if (!this.userName.trim()) {
                    alert('Please enter your name. This is required for calendar exports.');
                    document.getElementById('userNameInput').focus();
                    return false;
                }
                return true;

            case 'shifts':
                // Ensure there's at least one shift
                if (this.shifts.length === 0) {
                    alert('You must define at least one shift before continuing.');
                    return false;
                }

                // Ensure all shifts have names and valid times
                for (let i = 0; i < this.shifts.length; i++) {
                    const shift = this.shifts[i];
                    if (!shift.name.trim()) {
                        alert('All shifts must have a name.');
                        return false;
                    }
                    if (!shift.startTime || !shift.endTime) {
                        alert('All shifts must have start and end times.');
                        return false;
                    }
                }
                return true;

            case 'staff':
                // Staff step is optional, but we'll show a confirmation if no staff
                if (this.staffMembers.length === 0) {
                    return confirm('You haven\'t added any staff members. You can add them later. Continue?');
                }
                return true;

            default:
                return true;
        }
    }

    completeSetup() {
        // Save all configuration data to localStorage
        localStorage.setItem('setupComplete', 'true');
        localStorage.setItem('shiftPatterns', JSON.stringify(this.shifts));
        localStorage.setItem('staffMembers', JSON.stringify(this.staffMembers));
        localStorage.setItem('userName', this.userName || '');

        // Remove wizard from DOM
        document.querySelector('.setup-overlay').remove();

        // Reload the page to apply new settings
        window.location.reload();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const wizard = new SetupWizard();
    wizard.init();
}); 
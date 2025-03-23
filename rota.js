class ShiftCalendar {
    constructor() {
        this.calendarGrid = document.getElementById('calendar-grid');
        this.currentDate = new Date();
        this.filterWorker = null;

        // Load shift patterns from localStorage without defaults
        this.shiftPatterns = JSON.parse(localStorage.getItem('shiftPatterns')) || [];

        // If no shift patterns have been defined, trigger the setup wizard
        if (this.shiftPatterns.length === 0) {
            localStorage.removeItem('setupComplete');
        }

        this.initializeCalendar();
        this.setupDragAndDrop();
        this.setupMonthNavigation();
        this.modal = new bootstrap.Modal(document.getElementById('shiftModal'));
        this.setupModal();
        this.loadWorkers(); // Load workers from localStorage
        this.updateWorkerCounts();
        this.setupStaffManagement(); // Setup staff management UI
    }

    setupMonthNavigation() {
        const calendar = document.querySelector('.calendar');
        const headerDiv = document.createElement('div');
        headerDiv.className = 'calendar-header';

        const prevButton = document.createElement('button');
        prevButton.className = 'month-nav';
        prevButton.innerHTML = '&lt;';
        prevButton.addEventListener('click', () => this.changeMonth(-1));

        const nextButton = document.createElement('button');
        nextButton.className = 'month-nav';
        nextButton.innerHTML = '&gt;';
        nextButton.addEventListener('click', () => this.changeMonth(1));

        const todayButton = document.createElement('button');
        todayButton.className = 'today-nav';
        todayButton.textContent = 'Today';
        todayButton.addEventListener('click', () => this.goToToday());

        const exportButton = document.createElement('button');
        exportButton.className = 'export-nav';
        exportButton.textContent = 'Export Month TXT';
        exportButton.addEventListener('click', () => this.exportMonthAssignments());

        this.monthDisplay = document.createElement('h2');
        this.updateMonthDisplay();

        headerDiv.appendChild(prevButton);
        headerDiv.appendChild(this.monthDisplay);
        headerDiv.appendChild(todayButton);
        headerDiv.appendChild(exportButton);
        headerDiv.appendChild(nextButton);

        calendar.insertBefore(headerDiv, this.calendarGrid);
    }

    updateMonthDisplay() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        this.monthDisplay.textContent = `${months[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
    }

    changeMonth(delta) {
        this.currentDate.setMonth(this.currentDate.getMonth() + delta);
        this.updateMonthDisplay();
        this.calendarGrid.innerHTML = '';
        this.initializeCalendar();
        this.setupDragAndDrop();
        this.updateWorkerCounts();
    }

    goToToday() {
        this.currentDate = new Date();
        this.updateMonthDisplay();
        this.calendarGrid.innerHTML = '';
        this.initializeCalendar();
        this.setupDragAndDrop();
        this.updateWorkerCounts();
    }

    initializeCalendar() {
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const totalDays = lastDay.getDate();

        // Adjust starting day to make Monday the first day (0 = Monday, 6 = Sunday)
        let startingDay = firstDay.getDay() - 1;
        if (startingDay === -1) startingDay = 6; // If Sunday, set to 6

        // Add day headers (Monday to Sunday)
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        days.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day header';
            dayHeader.textContent = day;
            this.calendarGrid.appendChild(dayHeader);
        });

        // Get last month's days that should appear
        const prevMonth = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 0);
        const prevMonthDays = prevMonth.getDate();

        // Add days from previous month
        for (let i = 0; i < startingDay; i++) {
            const day = prevMonthDays - startingDay + i + 1;
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day other-month';
            dayCell.innerHTML = this.createDayCellContent(day, false);
            this.calendarGrid.appendChild(dayCell);
        }

        // Create calendar days for current month
        for (let day = 1; day <= totalDays; day++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day';

            if (day === new Date().getDate() &&
                this.currentDate.getMonth() === new Date().getMonth() &&
                this.currentDate.getFullYear() === new Date().getFullYear()) {
                dayCell.classList.add('today');
            }

            dayCell.innerHTML = this.createDayCellContent(day, true);
            this.calendarGrid.appendChild(dayCell);
        }

        // Add days from next month
        const totalCells = Math.ceil((startingDay + totalDays) / 7) * 7;
        const remainingCells = totalCells - (startingDay + totalDays);

        for (let day = 1; day <= remainingCells; day++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day other-month';
            dayCell.innerHTML = this.createDayCellContent(day, false);
            this.calendarGrid.appendChild(dayCell);
        }
    }

    createDayCellContent(day, isCurrentMonth = true) {
        const date = new Date(this.currentDate);
        if (!isCurrentMonth) {
            if (day > 15) { // Previous month
                date.setMonth(date.getMonth() - 1);
            } else { // Next month
                date.setMonth(date.getMonth() + 1);
            }
        }
        date.setDate(day);

        // Use dynamic shifts from this.shiftPatterns
        const shiftSlots = this.shiftPatterns.map(shift => {
            const assignment = this.getAssignment(date, shift.id);
            const assignedClass = assignment === 'unassigned' ? 'unassigned' : '';
            return `
                <div class="shift-slot ${assignedClass}" data-day="${day}" 
                     data-shift="${shift.id}" data-date="${date.toISOString()}"
                     data-bs-toggle="modal" data-bs-target="#shiftModal"
                     style="cursor: pointer">
                    <span class="shift-time">${shift.startTime} - ${shift.endTime}</span>
                    ${assignment}
                </div>
            `;
        }).join('');

        return `
            <div class="day-number">${day}</div>
            ${shiftSlots}
        `;
    }

    setupDragAndDrop() {
        const workerTags = document.querySelectorAll('.worker-tag');
        const shiftSlots = document.querySelectorAll('.shift-slot');
        const workersList = document.querySelector('.workers-list');

        workerTags.forEach(worker => {
            worker.addEventListener('dragstart', (e) => {
                worker.classList.add('dragging');
                const workerName = worker.querySelector('span').textContent;
                e.dataTransfer.setData('text/plain', workerName);
                e.dataTransfer.effectAllowed = 'move';
            });

            worker.addEventListener('dragend', () => {
                worker.classList.remove('dragging');
            });
        });

        // Add dragover handler to entire workers list section
        workersList.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            workersList.classList.add('dragover');
        });

        workersList.addEventListener('dragleave', () => {
            workersList.classList.remove('dragover');
        });

        workersList.addEventListener('drop', (e) => {
            e.preventDefault();
            workersList.classList.remove('dragover');
            const draggedSlot = document.querySelector('.shift-slot.dragging');
            if (draggedSlot) {
                const date = new Date(draggedSlot.dataset.date);
                const shift = draggedSlot.dataset.shift;
                this.unassignWorker(draggedSlot, date, shift);
            }
        });

        shiftSlots.forEach(slot => {
            slot.setAttribute('draggable', true);

            slot.addEventListener('dragstart', (e) => {
                if (!slot.classList.contains('unassigned')) {
                    const workerName = slot.textContent.replace(slot.querySelector('.shift-time').textContent, '').trim();
                    e.dataTransfer.setData('text/plain', workerName);
                    e.dataTransfer.effectAllowed = 'move';
                    slot.classList.add('dragging');
                } else {
                    e.preventDefault();
                }
            });

            slot.addEventListener('dragend', () => {
                slot.classList.remove('dragging');
            });

            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });

            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                const workerName = e.dataTransfer.getData('text/plain');
                const date = new Date(slot.dataset.date);
                const shift = slot.dataset.shift;

                // Only proceed if assignment is successful
                if (this.assignWorker(slot, workerName, date, shift)) {
                    // Clear the dragged slot if this was a move from another slot
                    const draggedSlot = document.querySelector('.shift-slot.dragging');
                    if (draggedSlot) {
                        this.unassignWorker(draggedSlot, new Date(draggedSlot.dataset.date), draggedSlot.dataset.shift);
                    }
                }
            });
        });
    }

    // Add methods for storage handling
    saveAssignment(date, shift, worker) {
        const assignments = this.getStoredAssignments();
        const key = this.getStorageKey(date, shift);
        assignments[key] = worker;
        console.log('Saving assignment:', { key, worker, allAssignments: assignments });
        localStorage.setItem('shiftAssignments', JSON.stringify(assignments));
    }

    getStorageKey(date, shift) {
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${shift}`;
    }

    getStoredAssignments() {
        const stored = localStorage.getItem('shiftAssignments');
        return stored ? JSON.parse(stored) : {};
    }

    getAssignment(date, shift) {
        const assignments = this.getStoredAssignments();
        const key = this.getStorageKey(date, shift);
        return assignments[key] || 'unassigned';
    }

    setupModal() {
        const modalElement = document.getElementById('shiftModal');
        const workerOptions = modalElement.querySelector('.worker-options');
        const unassignBtn = modalElement.querySelector('.unassign-btn');

        // Add search input before worker options
        workerOptions.insertAdjacentHTML('beforebegin', `
            <div class="mb-3">
                <input type="text" class="form-control" placeholder="Search staff..." id="workerSearch">
            </div>
        `);

        const searchInput = modalElement.querySelector('#workerSearch');

        // Generate worker options from localStorage
        this.updateModalWorkerOptions();

        // Add search functionality
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const options = workerOptions.querySelectorAll('.worker-option');

            options.forEach(option => {
                const workerName = option.textContent.trim().toLowerCase();
                option.style.display = workerName.includes(searchTerm) ? 'block' : 'none';
            });
        });

        // Clear search when modal opens
        modalElement.addEventListener('show.bs.modal', () => {
            searchInput.value = '';
            const options = workerOptions.querySelectorAll('.worker-option');
            options.forEach(option => option.style.display = 'block');
        });

        let currentSlot = null;

        // Handle modal events
        modalElement.addEventListener('show.bs.modal', (event) => {
            currentSlot = event.relatedTarget;
            const date = new Date(currentSlot.dataset.date);
            const shift = currentSlot.dataset.shift;
            const currentWorker = this.getAssignment(date, shift);

            // Update modal title with shift details using dynamic shift pattern
            const shiftPattern = this.shiftPatterns.find(sp => sp.id === parseInt(shift));

            if (shiftPattern) {
                modalElement.querySelector('.shift-details').textContent =
                    `${date.toDateString()} - ${shiftPattern.name} (${shiftPattern.startTime} - ${shiftPattern.endTime})`;
            } else {
                // Fallback if shift pattern not found
                modalElement.querySelector('.shift-details').textContent =
                    `${date.toDateString()} - Shift ${shift}`;
            }

            // Clear previous selection
            workerOptions.querySelectorAll('input').forEach(input => {
                input.checked = input.value === currentWorker;
            });

            // Show/hide unassign button
            unassignBtn.style.display = currentWorker === 'unassigned' ? 'none' : 'block';
        });

        // Handle worker selection by clicking anywhere in the row
        workerOptions.addEventListener('click', (e) => {
            const workerOption = e.target.closest('.worker-option');
            if (workerOption) {
                const radio = workerOption.querySelector('input');
                const worker = radio.value;
                const date = new Date(currentSlot.dataset.date);
                const shift = currentSlot.dataset.shift;

                // Only proceed if assignment is successful
                if (this.assignWorker(currentSlot, worker, date, shift)) {
                    radio.checked = true;
                    this.modal.hide();
                }
            }
        });

        // Handle unassign button
        unassignBtn.addEventListener('click', () => {
            const date = new Date(currentSlot.dataset.date);
            const shift = currentSlot.dataset.shift;

            this.unassignWorker(currentSlot, date, shift);
            this.modal.hide();
        });
    }

    assignWorker(slot, worker, date, shift) {
        // Check if trying to assign to Night1 or Night2
        if (shift === '2' || shift === '3') {
            // Get the other night shift assignment
            const otherNightShift = shift === '2' ? '3' : '2';
            const otherAssignment = this.getAssignment(date, otherNightShift);

            // If worker is already assigned to the other night shift, prevent assignment
            if (otherAssignment === worker) {
                alert(`${worker} is already assigned to the other night shift on this day`);
                return false;
            }
        }

        const timeSpan = slot.querySelector('.shift-time');
        slot.textContent = '';
        slot.appendChild(timeSpan);
        slot.appendChild(document.createTextNode(worker));
        slot.classList.remove('unassigned');
        this.saveAssignment(date, shift, worker);
        this.updateWorkerCounts();
        return true;
    }

    unassignWorker(slot, date, shift) {
        const timeSpan = slot.querySelector('.shift-time');
        slot.textContent = '';
        slot.appendChild(timeSpan);
        slot.appendChild(document.createTextNode('unassigned'));
        slot.classList.add('unassigned');
        this.saveAssignment(date, shift, 'unassigned');
        this.updateWorkerCounts();
    }

    generateWorkerICS(worker) {
        const assignments = this.getStoredAssignments();
        const events = [];

        // Get the user name for the calendar organizer and event descriptions
        const userName = localStorage.getItem('userName') || 'Rota Manager';

        // Get the shift patterns for names and times
        const shiftPatterns = this.shiftPatterns;

        console.log('Generating ICS for:', worker);
        console.log('All assignments:', assignments);

        // Go through all assignments to find this worker's shifts
        for (let key in assignments) {
            if (assignments[key] === worker) {
                console.log('Found shift:', key);
                const [year, month, day, shiftId] = key.split('-').map(Number);

                // Find the shift pattern details
                const shiftPattern = shiftPatterns.find(sp => sp.id === shiftId);

                if (!shiftPattern) {
                    console.warn(`Shift pattern ${shiftId} not found for assignment ${key}`);
                    continue;
                }

                // Create dates in UTC to avoid timezone issues
                const startDate = new Date(Date.UTC(year, month - 1, day));

                // Parse start and end times
                let [startHour, startMinute] = shiftPattern.startTime.split(':').map(Number);
                let [endHour, endMinute] = shiftPattern.endTime.split(':').map(Number);

                // Calculate if the shift goes past midnight
                const isPastMidnight = (endHour < startHour) ||
                    (endHour === startHour && endMinute < startMinute);

                // Create end date (next day if the shift goes past midnight)
                const endDate = new Date(Date.UTC(year, month - 1, day));
                if (isPastMidnight) {
                    endDate.setUTCDate(endDate.getUTCDate() + 1);
                }

                // Format times for ICS (convert HH:MM to HHMMSS)
                // Pad to ensure 2 digits for hours and minutes
                const formattedStartHour = String(startHour).padStart(2, '0');
                const formattedStartMinute = String(startMinute).padStart(2, '0');
                const formattedEndHour = String(endHour).padStart(2, '0');
                const formattedEndMinute = String(endMinute).padStart(2, '0');

                const startTime = `${formattedStartHour}${formattedStartMinute}00`;
                const endTime = `${formattedEndHour}${formattedEndMinute}00`;

                // Create event with dynamic shift information
                const event = {
                    start: `${this.formatDate(startDate)}T${startTime}Z`,
                    end: `${this.formatDate(endDate)}T${endTime}Z`,
                    summary: `${shiftPattern.name}`,
                    description: `${worker}'s shift for ${userName}`,
                    organizer: userName,
                    // Add display info for logging
                    displayInfo: `From ${shiftPattern.startTime} ${startDate.toDateString()} to ${shiftPattern.endTime} ${endDate.toDateString()}`
                };
                events.push(event);
                console.log('Added event:', event);
                console.log('Shift duration:', event.displayInfo);
            }
        }

        // Generate ICS content with proper line endings and UID for each event
        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            `PRODID:-//${userName} Rota//EN`,
            'CALSCALE:GREGORIAN',
            ...events.map(event => [
                'BEGIN:VEVENT',
                `UID:${this.generateUID(event)}`,
                `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
                `DTSTART:${event.start}`,
                `DTEND:${event.end}`,
                `SUMMARY:${event.summary}`,
                `DESCRIPTION:${event.description}`,
                `ORGANIZER;CN=${event.organizer}:mailto:noreply@example.com`,
                'END:VEVENT'
            ].join('\r\n')),
            'END:VCALENDAR'
        ].join('\r\n');

        console.log('Generated ICS content:', icsContent);
        return icsContent;
    }

    generateUID(event) {
        // Generate a unique ID for each event based on its details
        const str = `${event.start}-${event.end}-${event.summary}-${event.description}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }

        // Use the user name in the UID domain
        const userName = localStorage.getItem('userName') || 'rota';
        const cleanUserName = userName.toLowerCase().replace(/[^a-z0-9]/g, '');
        return `${hash}@${cleanUserName}.calendar`;
    }

    formatDate(date) {
        // Format date as YYYYMMDD
        return date.toISOString().split('T')[0].replace(/-/g, '');
    }

    downloadICS(worker) {
        const icsContent = this.generateWorkerICS(worker);
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);

        // Include user name in the file name
        const userName = localStorage.getItem('userName') || 'rota';
        const cleanUserName = userName.toLowerCase().replace(/[^a-z0-9]/g, '');
        link.download = `${worker.replace(/\s+/g, '_')}_shifts_${cleanUserName}.ics`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    exportMonthAssignments() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth() + 1;
        const lastDay = new Date(year, month, 0).getDate();
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        // Create a header with month and year
        let content = `# ${months[month - 1]} ${year} Schedule\n\n`;

        // If no shift patterns exist, show an error
        if (this.shiftPatterns.length === 0) {
            content += "No shift patterns defined. Please set up shifts in the setup wizard.\n";
        } else {
            // Process each day in the month
            for (let day = 1; day <= lastDay; day++) {
                const suffix = this.getDaySuffix(day);
                // Add the day header
                content += `## ${day}${suffix}\n`;

                const date = new Date(year, month - 1, day);

                // Process each shift pattern for this day
                this.shiftPatterns.forEach(shift => {
                    const assignment = this.getAssignment(date, shift.id);
                    // Format the shift time nicely
                    content += `- **${shift.name}** (${shift.startTime} - ${shift.endTime}): ${assignment}\n`;
                });

                // Add an empty line between days
                content += '\n';
            }
        }

        // Create a download link for the text file
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `${months[month - 1]}_${year}_schedule.txt`;

        // Trigger the download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    getDaySuffix(day) {
        if (day > 3 && day < 21) return 'th';
        switch (day % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    }

    updateWorkerCounts() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth() + 1;
        const assignments = this.getStoredAssignments();
        const counts = {};

        // Initialize counts for all workers
        document.querySelectorAll('.worker-tag span').forEach(span => {
            counts[span.textContent] = 0;
        });

        // Count assignments for the current month
        for (let key in assignments) {
            const [assignYear, assignMonth] = key.split('-').map(Number);
            if (assignYear === year && assignMonth === month && assignments[key] !== 'unassigned') {
                counts[assignments[key]] = (counts[assignments[key]] || 0) + 1;
            }
        }

        // Update the display
        document.querySelectorAll('.worker-tag').forEach(tag => {
            const name = tag.querySelector('span').textContent;
            const countSpan = tag.querySelector('.shift-count');
            if (countSpan) {
                countSpan.textContent = counts[name];
            } else {
                const newCountSpan = document.createElement('span');
                newCountSpan.className = 'shift-count';
                newCountSpan.textContent = counts[name];
                tag.insertBefore(newCountSpan, tag.querySelector('.export-btn'));
            }
        });
    }

    filterShifts(workerName = null) {
        const slots = document.querySelectorAll('.shift-slot');

        // Reset all buttons first
        document.querySelectorAll('.show-only-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.textContent = '👁️';
        });

        if (workerName === null) {
            // Show all shifts
            slots.forEach(slot => {
                slot.style.opacity = '1';
                slot.style.filter = 'none';
            });
        } else {
            // Show only selected worker's shifts
            slots.forEach(slot => {
                const assignment = slot.textContent.replace(slot.querySelector('.shift-time').textContent, '').trim();
                if (assignment === workerName || assignment === 'unassigned') {
                    slot.style.opacity = '1';
                    slot.style.filter = 'none';
                } else {
                    slot.style.opacity = '0.1';
                    slot.style.filter = 'grayscale(100%)';
                }
            });

            // Update the clicked button
            const activeBtn = document.querySelector(`.show-only-btn[data-worker="${workerName}"]`);
            if (activeBtn) {
                activeBtn.classList.add('active');
                activeBtn.textContent = '👁️‍🗨️';
            }
        }
    }

    // Modified loadWorkers method to handle null/empty staff list properly
    loadWorkers() {
        let workers = JSON.parse(localStorage.getItem('staffMembers')) || [];

        // Initialize as empty array if it's null
        if (!Array.isArray(workers)) {
            workers = [];
            localStorage.setItem('staffMembers', JSON.stringify(workers));
        }

        // Clear the current workers list
        const workersContainer = document.getElementById('workers');
        workersContainer.innerHTML = '';

        // Add each worker to the UI if there are any
        workers.forEach(worker => {
            this.addWorkerToUI(worker);
        });

        // If no workers, add a message
        if (workers.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'text-muted text-center my-3';
            emptyMessage.innerHTML = '<em>No staff added yet.<br>Add your first staff member below.</em>';
            workersContainer.appendChild(emptyMessage);
        }
    }

    // Fix the addNewStaff method to properly handle empty/null staffMembers
    addNewStaff() {
        const input = document.getElementById('newStaffInput');
        const newStaffName = input.value.trim();

        if (newStaffName) {
            // Get current staff list
            let workers = JSON.parse(localStorage.getItem('staffMembers')) || [];

            // Initialize as array if it's null
            if (!Array.isArray(workers)) {
                workers = [];
            }

            // Check if the staff member already exists
            if (!workers.includes(newStaffName)) {
                // Add to array
                workers.push(newStaffName);

                // Save to localStorage
                localStorage.setItem('staffMembers', JSON.stringify(workers));

                // Remove the empty message if present
                const emptyMessage = document.querySelector('#workers .text-muted');
                if (emptyMessage) {
                    emptyMessage.remove();
                }

                // Add to UI
                this.addWorkerToUI(newStaffName);

                // Update modal options
                this.updateModalWorkerOptions();

                // Clear input
                input.value = '';

                // Update worker counts
                this.updateWorkerCounts();
            } else {
                alert('This staff member already exists!');
            }
        }
    }

    // Add this method to handle adding workers to the UI
    addWorkerToUI(workerName) {
        const workersContainer = document.getElementById('workers');
        const workerTag = document.createElement('div');
        workerTag.className = 'worker-tag';
        workerTag.setAttribute('draggable', 'true');

        workerTag.innerHTML = `
            <span>${workerName}</span>
            <div class="worker-buttons">
                <span class="shift-count">0</span>
                <button class="show-only-btn" 
                        onclick="event.stopPropagation(); calendar.filterShifts(this.classList.contains('active') ? null : '${workerName}')" 
                        data-worker="${workerName}" 
                        title="Show only this worker's shifts">👁️</button>
                <button class="export-btn" 
                        onclick="event.stopPropagation(); calendar.downloadICS('${workerName}')" 
                        title="Export calendar">📅</button>
                <button class="remove-worker-btn" 
                        onclick="event.stopPropagation(); calendar.removeWorker('${workerName}')" 
                        title="Remove staff member">❌</button>
            </div>
        `;

        workersContainer.appendChild(workerTag);

        // Re-setup drag and drop for the new worker
        this.setupWorkerDragEvents(workerTag);
    }

    // Add method to setup drag events for a worker tag
    setupWorkerDragEvents(workerTag) {
        workerTag.addEventListener('dragstart', (e) => {
            workerTag.classList.add('dragging');
            const workerName = workerTag.querySelector('span').textContent;
            e.dataTransfer.setData('text/plain', workerName);
            e.dataTransfer.effectAllowed = 'move';
        });

        workerTag.addEventListener('dragend', () => {
            workerTag.classList.remove('dragging');
        });
    }

    // Add this method to set up the staff management UI
    setupStaffManagement() {
        const workersListDiv = document.querySelector('.workers-list');

        // Create and append the staff management UI
        const staffManagementHTML = `
            <div class="staff-management mt-4">
                <h3 class="h5">Add Staff</h3>
                <div class="input-group mb-3">
                    <input type="text" class="form-control" id="newStaffInput" placeholder="Staff name">
                    <button class="btn btn-primary" id="addStaffBtn">Add</button>
                </div>
                <div class="d-flex justify-content-between mt-3">
                    <button class="btn btn-sm btn-success" id="saveDataBtn">
                        <i class="bi bi-download"></i> Export Data
                    </button>
                    <button class="btn btn-sm btn-warning" id="loadDataBtn">
                        <i class="bi bi-upload"></i> Import Data
                    </button>
                </div>
            </div>
        `;

        workersListDiv.insertAdjacentHTML('beforeend', staffManagementHTML);

        // Add event listeners for staff management
        document.getElementById('addStaffBtn').addEventListener('click', () => this.addNewStaff());
        document.getElementById('newStaffInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addNewStaff();
        });

        // Add event listeners for data save/load
        document.getElementById('saveDataBtn').addEventListener('click', () => this.saveAllData());
        document.getElementById('loadDataBtn').addEventListener('click', () => this.loadDataFromFile());
    }

    // Method to remove a staff member
    removeWorker(workerName) {
        if (confirm(`Are you sure you want to remove ${workerName}? This will also remove all their shifts from the calendar.`)) {
            // Get current staff list
            let workers = JSON.parse(localStorage.getItem('staffMembers')) || [];

            // Remove from array
            workers = workers.filter(w => w !== workerName);

            // Save to localStorage
            localStorage.setItem('staffMembers', JSON.stringify(workers));

            // Remove from UI - Fix the selector
            const workerTags = document.querySelectorAll('.worker-tag');
            for (const tag of workerTags) {
                const nameSpan = tag.querySelector('span');
                if (nameSpan && nameSpan.textContent === workerName) {
                    tag.remove();
                    break;
                }
            }

            // Update modal options
            this.updateModalWorkerOptions();

            // Reassign any shifts assigned to this worker
            this.reassignWorkerShifts(workerName);
        }
    }

    // Helper method to update the modal worker options
    updateModalWorkerOptions() {
        const workers = JSON.parse(localStorage.getItem('staffMembers')) || [];
        const workerOptions = document.querySelector('.worker-options');

        workerOptions.innerHTML = workers.map(worker => `
            <div class="form-check worker-option">
                <label class="form-check-label w-100">
                    <input class="form-check-input worker-radio" type="radio" name="worker" value="${worker}">
                    ${worker}
                </label>
            </div>
        `).join('');
    }

    // Update any shift assignments when a worker is removed
    reassignWorkerShifts(workerName) {
        const assignments = this.getStoredAssignments();
        let updated = false;

        for (let key in assignments) {
            if (assignments[key] === workerName) {
                assignments[key] = 'unassigned';
                updated = true;
            }
        }

        if (updated) {
            localStorage.setItem('shiftAssignments', JSON.stringify(assignments));

            // Refresh the calendar to show changes
            this.calendarGrid.innerHTML = '';
            this.initializeCalendar();
            this.setupDragAndDrop();
            this.updateWorkerCounts();
        }
    }

    // Update the saveAllData method to include userName and setupComplete flag
    saveAllData() {
        const currentData = {
            assignments: this.getStoredAssignments(),
            staff: JSON.parse(localStorage.getItem('staffMembers')) || [],
            shiftPatterns: this.shiftPatterns,
            userName: localStorage.getItem('userName') || '',
            setupComplete: localStorage.getItem('setupComplete') === 'true',
            timestamp: new Date().toISOString()
        };

        // Create a download of the data
        const dataStr = JSON.stringify(currentData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);

        // Include username in the filename if available
        const userName = localStorage.getItem('userName');
        const userPart = userName ? `_${userName.toLowerCase().replace(/[^a-z0-9]/g, '')}` : '';
        link.download = `rota_backup${userPart}_${this.formatDateForFilename(new Date())}.json`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Add helper method to format date for filename
    formatDateForFilename(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Update the loadDataFromFile method to handle userName and setupComplete flag
    loadDataFromFile() {
        // Create a file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'application/json';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) {
                document.body.removeChild(fileInput);
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);

                    // Validate the data structure
                    if (!data.assignments || !data.staff) {
                        throw new Error('Invalid backup file format');
                    }

                    // Show a more detailed confirmation message
                    const message = `This will replace your current configuration with:
                    ${data.userName ? `• User name: ${data.userName}` : ''}
                    • ${data.staff.length} staff member(s)
                    • ${data.shiftPatterns ? data.shiftPatterns.length : 0} shift pattern(s)
                    • All shift assignments
                    
                    Continue?`;

                    if (confirm(message)) {
                        // Save assignments
                        localStorage.setItem('shiftAssignments', JSON.stringify(data.assignments));

                        // Save staff list
                        localStorage.setItem('staffMembers', JSON.stringify(data.staff));

                        // Save shift patterns if they exist in the backup
                        if (data.shiftPatterns && Array.isArray(data.shiftPatterns) && data.shiftPatterns.length > 0) {
                            localStorage.setItem('shiftPatterns', JSON.stringify(data.shiftPatterns));
                            // Update the current shift patterns in memory
                            this.shiftPatterns = data.shiftPatterns;
                        }

                        // Save user name if it exists in the backup
                        if (data.userName) {
                            localStorage.setItem('userName', data.userName);
                        }

                        // Set the setupComplete flag if it exists in the backup
                        if (typeof data.setupComplete === 'boolean') {
                            localStorage.setItem('setupComplete', data.setupComplete.toString());
                        }

                        // Reload the UI
                        this.loadWorkers();
                        this.calendarGrid.innerHTML = '';
                        this.initializeCalendar();
                        this.setupDragAndDrop();
                        this.updateWorkerCounts();
                        this.updateModalWorkerOptions();

                        // Show success message with additional details
                        const successMsg = data.userName
                            ? `Rota data for ${data.userName} restored successfully!`
                            : 'Rota data restored successfully!';
                        alert(successMsg);

                        // If setup wasn't complete in the backup, reload to trigger the setup wizard
                        if (data.setupComplete === false) {
                            if (confirm('The imported configuration indicates setup is not complete. Would you like to run the setup wizard?')) {
                                window.location.reload();
                            }
                        }
                    }
                } catch (error) {
                    alert('Error loading data: ' + error.message);
                }

                document.body.removeChild(fileInput);
            };

            reader.readAsText(file);
        });

        fileInput.click();
    }
}

// Initialize the calendar when the page loads
let calendar;
document.addEventListener('DOMContentLoaded', () => {
    calendar = new ShiftCalendar();
});

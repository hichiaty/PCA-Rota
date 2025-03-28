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
        this.setupHolidayButtonListeners(); // Setup holiday removal button listeners

        // Update CSS for holiday warnings and add preference highlights
        const style = document.createElement('style');
        style.textContent = `
            .shift-slot.holiday-warning {
                background-color: rgba(255, 105, 97, 0.2) !important;
                border: 2px solid #ff6961 !important;
                position: relative;
                box-shadow: 0 0 8px rgba(255, 105, 97, 0.4);
                transition: all 0.3s ease;
            }
            
            .shift-slot.holiday-warning::before {
                content: "⚠️";
                position: absolute;
                top: 2px;
                right: 2px;
                font-size: 10px;
                opacity: 0.9;
                z-index: 10;
            }
            
            .shift-slot.holiday-warning::after {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: repeating-linear-gradient(
                    45deg,
                    rgba(255, 105, 97, 0.1),
                    rgba(255, 105, 97, 0.1) 10px,
                    rgba(255, 105, 97, 0.2) 10px,
                    rgba(255, 105, 97, 0.2) 20px
                );
                border-radius: 3px;
                pointer-events: none;
            }
            
            /* Make the day cell subtly highlight as well */
            .calendar-day:has(.shift-slot.holiday-warning) {
                background-color: rgba(255, 240, 240, 0.5);
            }

            /* New style for preferred shifts */
            .shift-slot.preference-highlight {
                background-color: rgba(144, 238, 144, 0.25) !important;
                border: 2px dashed #4caf50 !important;
                position: relative;
                transition: all 0.3s ease;
            }
            
            .shift-slot.preference-highlight::before {
                content: "👍";
                position: absolute;
                top: 2px;
                right: 2px;
                font-size: 10px;
                opacity: 0.9;
                z-index: 10;
            }
        `;
        document.head.appendChild(style);

        // Ensure holiday highlighting is properly initialized after everything else
        setTimeout(() => {
            this.initializeHolidayHighlighting();
        }, 500);
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

        // Ensure shift slots have properly formatted dates to fix highlighting issues
        this.normalizeShiftSlotDates();
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
        const workersList = document.querySelector('.workers-list');

        // Handle drag events on worker tags
        workerTags.forEach(worker => {
            worker.addEventListener('dragstart', (e) => {
                worker.classList.add('dragging');
                const workerName = worker.querySelector('span').textContent;
                e.dataTransfer.setData('text/plain', workerName);
                e.dataTransfer.effectAllowed = 'move';

                // Use the renamed method
                setTimeout(() => {
                    this.highlightWorkerAvailability(workerName, true);
                }, 0);
            });

            worker.addEventListener('dragend', () => {
                worker.classList.remove('dragging');
                // Use the renamed method
                this.highlightWorkerAvailability(null, false);
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

        // Use event delegation for all shift slots to improve performance and ensure it works with dynamically added elements
        this.calendarGrid.addEventListener('dragstart', (e) => {
            const slot = e.target.closest('.shift-slot');
            if (!slot) return;

            if (!slot.classList.contains('unassigned')) {
                const workerName = slot.textContent.replace(slot.querySelector('.shift-time').textContent, '').trim();
                e.dataTransfer.setData('text/plain', workerName);
                e.dataTransfer.effectAllowed = 'move';
                slot.classList.add('dragging');

                // Use the renamed method
                setTimeout(() => {
                    this.highlightWorkerAvailability(workerName, true);
                }, 0);
            } else {
                e.preventDefault();
            }
        });

        this.calendarGrid.addEventListener('dragend', (e) => {
            const slot = e.target.closest('.shift-slot');
            if (!slot) return;

            slot.classList.remove('dragging');
            // Use the renamed method
            this.highlightWorkerAvailability(null, false);
        });

        // Set up individual shift slots for drag operations
        const shiftSlots = document.querySelectorAll('.shift-slot');
        shiftSlots.forEach(slot => {
            slot.setAttribute('draggable', true);

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
            <div class="mb-3">
                <div class="d-flex gap-2 flex-wrap">
                    <div class="badge bg-light border text-dark p-2 d-flex align-items-center">
                        <span class="preference-indicator">👍</span>
                        <span class="ms-1">Preferred shift</span>
                    </div>
                    <div class="badge bg-light border text-dark p-2 d-flex align-items-center">
                        <span class="holiday-indicator">⚠️</span>
                        <span class="ms-1">On holiday</span>
                    </div>
                </div>
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

            // Update worker options with preference and holiday indicators
            this.updateWorkerOptionsWithAvailability(date, shift);
        });

        // Handle worker selection by clicking anywhere in the row
        workerOptions.addEventListener('click', (e) => {
            const workerOption = e.target.closest('.worker-option');
            if (workerOption) {
                // Don't select if the worker is on holiday
                if (workerOption.classList.contains('worker-on-holiday')) {
                    this.showToast(`Cannot assign staff member on holiday`, 'warning');
                    return;
                }

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
        // Check if the worker is on holiday for this date
        const dateStr = date.toISOString().split('T')[0];
        const workerSettings = this.getStaffSettings(worker);

        if (workerSettings.holidays && workerSettings.holidays.includes(dateStr)) {
            // Show an error message
            this.showToast(`Cannot assign ${worker} on ${date.toDateString()} - they are on holiday`, 'warning');
            return false;
        }

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
                    // Format the shift time nicely and add exclamation emoji for unassigned shifts
                    const displayAssignment = assignment === 'unassigned' ? '❗unassigned ❗' : assignment;
                    content += `- **${shift.name}** (${shift.startTime} - ${shift.endTime}): ${displayAssignment}\n`;
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
                <button class="settings-btn" 
                        onclick="event.stopPropagation(); calendar.openStaffSettings('${workerName}')" 
                        title="Staff settings">⚙️</button>
                <button class="export-btn" 
                        onclick="event.stopPropagation(); calendar.downloadICS('${workerName}')" 
                        title="Export calendar">📅</button>
                <button class="remove-worker-btn" 
                        onclick="event.stopPropagation(); calendar.removeWorker('${workerName}')" 
                        title="Remove staff member">❌</button>
            </div>
        `;

        workersContainer.appendChild(workerTag);

        // Add proper drag event handling for the new worker
        workerTag.addEventListener('dragstart', (e) => {
            workerTag.classList.add('dragging');
            e.dataTransfer.setData('text/plain', workerName);
            e.dataTransfer.effectAllowed = 'move';

            // Use the renamed method
            requestAnimationFrame(() => {
                this.highlightWorkerAvailability(workerName, true);
            });
        });

        workerTag.addEventListener('dragend', () => {
            workerTag.classList.remove('dragging');
            // Use the renamed method
            this.highlightWorkerAvailability(null, false);
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

    // Updated method to remove a staff member and their settings
    removeWorker(workerName) {
        if (confirm(`Are you sure you want to remove ${workerName}? This will also remove all their shifts from the calendar and their settings.`)) {
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

            // Also remove the staff settings from localStorage
            localStorage.removeItem(`staffSettings_${workerName}`);

            // Show a confirmation toast
            this.showToast(`${workerName} has been removed`);
        }
    }

    // Helper method to update the modal worker options
    updateModalWorkerOptions() {
        const workers = JSON.parse(localStorage.getItem('staffMembers')) || [];
        const workerOptions = document.querySelector('.worker-options');

        // Include summary information at the top of the modal
        let summaryHtml = `
            <div class="staff-summary mb-3">
                <div class="alert alert-info">
                    <h6 class="mb-1">Staff Assignment Helper</h6>
                    <p class="mb-0 small">Staff are sorted with preferred shifts at the top. Staff on holiday cannot be assigned.</p>
                </div>
            </div>
        `;

        workerOptions.innerHTML = summaryHtml + workers.map(worker => `
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

    // Update the saveAllData method to include staff settings
    saveAllData() {
        // Get all staff settings from localStorage
        const staffSettings = {};
        const staffMembers = JSON.parse(localStorage.getItem('staffMembers')) || [];

        // Collect settings for each staff member
        staffMembers.forEach(worker => {
            const settings = localStorage.getItem(`staffSettings_${worker}`);
            if (settings) {
                staffSettings[worker] = JSON.parse(settings);
            }
        });

        const currentData = {
            assignments: this.getStoredAssignments(),
            staff: staffMembers,
            shiftPatterns: this.shiftPatterns,
            userName: localStorage.getItem('userName') || '',
            setupComplete: localStorage.getItem('setupComplete') === 'true',
            staffSettings: staffSettings, // Add staff settings to the export data
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

    // Update the loadDataFromFile method to handle staff settings
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

                    // Check if staff settings are included in the backup
                    const hasStaffSettings = data.staffSettings && typeof data.staffSettings === 'object';

                    // Show a more detailed confirmation message
                    const message = `This will replace your current configuration with:
                    ${data.userName ? `• User name: ${data.userName}` : ''}
                    • ${data.staff.length} staff member(s)
                    • ${data.shiftPatterns ? data.shiftPatterns.length : 0} shift pattern(s)
                    • All shift assignments
                    ${hasStaffSettings ? `• Staff settings (preferences & holidays)` : ''}
                    
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

                        // Save staff settings if they exist in the backup
                        if (hasStaffSettings) {
                            Object.keys(data.staffSettings).forEach(worker => {
                                localStorage.setItem(`staffSettings_${worker}`, JSON.stringify(data.staffSettings[worker]));
                            });
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

    // Replace the openStaffSettings method to remove the auto-save status message
    openStaffSettings(workerName) {
        // Get existing settings or create default ones
        const staffSettings = this.getStaffSettings(workerName);

        // Create and show the modal
        const modalHTML = `
            <div class="modal fade" id="staffSettingsModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Settings for ${workerName}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <ul class="nav nav-tabs mb-3" id="settingsTabs" role="tablist">
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link active" id="preferences-tab" data-bs-toggle="tab" 
                                        data-bs-target="#preferences" type="button" role="tab" 
                                        aria-controls="preferences" aria-selected="true">Shift Preferences</button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="holidays-tab" data-bs-toggle="tab" 
                                        data-bs-target="#holidays" type="button" role="tab" 
                                        aria-controls="holidays" aria-selected="false">Holidays</button>
                                </li>
                            </ul>
                            
                            <div class="tab-content">
                                <div class="tab-pane fade show active" id="preferences" role="tabpanel" 
                                     aria-labelledby="preferences-tab">
                                    <div class="shift-preferences">
                                        <p class="text-muted mb-3">
                                            Select which shifts ${workerName} prefers to work on specific days.
                                        </p>
                                        <div class="table-responsive">
                                            <table class="table table-bordered preference-table">
                                                <thead class="table-light">
                                                    <tr>
                                                        <th>Shift</th>
                                                        <th>Mon</th>
                                                        <th>Tue</th>
                                                        <th>Wed</th>
                                                        <th>Thu</th>
                                                        <th>Fri</th>
                                                        <th>Sat</th>
                                                        <th>Sun</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${this.shiftPatterns.map(shift => this.createShiftPreferenceRow(shift, staffSettings)).join('')}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="tab-pane fade" id="holidays" role="tabpanel" aria-labelledby="holidays-tab">
                                    <div class="holidays-section">
                                        <p class="text-muted mb-3">
                                            Add dates when ${workerName} is not available to work.
                                        </p>
                                        
                                        <div class="card mb-4">
                                            <div class="card-header bg-light">
                                                <h6 class="mb-0">Add Holiday</h6>
                                            </div>
                                            <div class="card-body">
                                                <div class="row g-3">
                                                    <div class="col-md-12 mb-2">
                                                        <div class="d-flex flex-wrap gap-2">
                                                            <button class="btn btn-outline-secondary btn-sm" onclick="calendar.addQuickHoliday('${workerName}', 'today')">
                                                                Today
                                                            </button>
                                                            <button class="btn btn-outline-secondary btn-sm" onclick="calendar.addQuickHoliday('${workerName}', 'tomorrow')">
                                                                Tomorrow
                                                            </button>
                                                            <button class="btn btn-outline-secondary btn-sm" onclick="calendar.addQuickHoliday('${workerName}', 'weekend')">
                                                                This Weekend
                                                            </button>
                                                            <button class="btn btn-outline-secondary btn-sm" onclick="calendar.addQuickHoliday('${workerName}', 'nextWeek')">
                                                                Next Week
                                                            </button>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="col-md-6">
                                                        <label for="holidayStart" class="form-label">Start Date</label>
                                                        <input type="date" class="form-control" id="holidayStart" onchange="calendar.updateEndDate(this.value)">
                                                    </div>
                                                    <div class="col-md-6">
                                                        <label for="holidayEnd" class="form-label">End Date <span class="text-muted">(Optional)</span></label>
                                                        <input type="date" class="form-control" id="holidayEnd">
                                                    </div>
                                                    <div class="col-12 text-end">
                                                        <button class="btn btn-primary" onclick="calendar.addHolidayRange('${workerName}')">
                                                            Add to Calendar
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="card">
                                            <div class="card-header bg-light d-flex justify-content-between align-items-center">
                                                <h6 class="mb-0">Scheduled Holidays</h6>
                                                <span class="badge bg-primary holiday-count">${staffSettings.holidays ? staffSettings.holidays.length : 0}</span>
                                            </div>
                                            <div class="card-body p-0">
                                                <div class="holiday-list">
                                                    ${this.generateHolidaysList(staffSettings.holidays)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if present
        const existingModal = document.getElementById('staffSettingsModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to document
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add event listeners for auto-saving preferences
        setTimeout(() => {
            const preferenceCheckboxes = document.querySelectorAll('.preference-checkbox');
            preferenceCheckboxes.forEach(checkbox => {
                checkbox.addEventListener('change', () => {
                    this.autoSaveStaffPreferences(workerName);
                });
            });
        }, 100);

        // Initialize and show modal
        const modal = new bootstrap.Modal(document.getElementById('staffSettingsModal'));
        modal.show();
    }

    createShiftPreferenceRow(shift, staffSettings) {
        const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

        // Check if the day-specific preferences exist, initialize if not
        if (!staffSettings.dayPreferences) {
            staffSettings.dayPreferences = {};
        }

        return `
            <tr>
                <td class="align-middle">
                    <strong>${shift.name}</strong><br>
                    <small class="text-muted">${shift.startTime} - ${shift.endTime}</small>
                </td>
                ${days.map(day => {
            const prefKey = `${shift.id}_${day}`;
            const isPreferred = staffSettings.dayPreferences[prefKey] === true;

            return `
                        <td class="text-center align-middle">
                            <div class="form-check d-flex justify-content-center">
                                <input class="form-check-input preference-checkbox" type="checkbox" 
                                    id="${prefKey}" 
                                    data-shift="${shift.id}" 
                                    data-day="${day}" 
                                    ${isPreferred ? 'checked' : ''}>
                            </div>
                        </td>
                    `;
        }).join('')}
            </tr>
        `;
    }

    getStaffSettings(workerName) {
        const settings = localStorage.getItem(`staffSettings_${workerName}`);
        return settings ? JSON.parse(settings) : {
            dayPreferences: {},
            holidays: []
        };
    }

    generateHolidaysList(holidays) {
        if (!holidays || holidays.length === 0) {
            return `<div class="text-center py-4">
                        <div class="text-muted">
                            <i class="bi bi-calendar-check" style="font-size: 2rem;"></i>
                            <p class="mt-2">No holidays scheduled</p>
                        </div>
                    </div>`;
        }

        // Group holidays by month
        const groupedHolidays = {};
        holidays.sort((a, b) => new Date(a) - new Date(b)).forEach(date => {
            const d = new Date(date);
            const monthYear = `${d.getFullYear()}-${d.getMonth()}`;
            if (!groupedHolidays[monthYear]) {
                groupedHolidays[monthYear] = [];
            }
            groupedHolidays[monthYear].push(date);
        });

        let html = '<div class="list-group list-group-flush">';

        // For each month, create a section
        Object.keys(groupedHolidays).sort().forEach(monthYear => {
            const dates = groupedHolidays[monthYear];
            const [year, month] = monthYear.split('-');
            const monthName = new Date(parseInt(year), parseInt(month), 1).toLocaleString('default', { month: 'long' });

            html += `
                <div class="list-group-item px-0">
                    <h6 class="mb-2 text-muted">${monthName} ${year}</h6>
                    <div class="d-flex flex-wrap gap-2">
                        ${dates.map(date => {
                const d = new Date(date);
                const formattedDate = d.toLocaleDateString(undefined, {
                    weekday: 'short',
                    day: 'numeric'
                });
                // Use data attribute instead of onclick with string parameter
                return `
                                <div class="holiday-badge">
                                    <span class="badge bg-light text-dark">
                                        ${formattedDate}
                                        <button type="button" class="btn-close holiday-remove" 
                                                data-date="${date}" 
                                                aria-label="Remove"></button>
                                    </span>
                                </div>`;
            }).join('')}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    updateHolidayCount(count) {
        const countBadge = document.querySelector('.holiday-count');
        if (countBadge) {
            countBadge.textContent = count;
        }
    }

    addQuickHoliday(workerName, type) {
        const settings = this.getStaffSettings(workerName);

        // Get today's date
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Format as ISO date string
        const formatDate = (date) => {
            return date.toISOString().split('T')[0];
        };

        let dates = [];

        switch (type) {
            case 'today':
                dates.push(formatDate(today));
                break;
            case 'tomorrow':
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                dates.push(formatDate(tomorrow));
                break;
            case 'weekend':
                // Find coming weekend days (Saturday and Sunday)
                const saturdayOffset = (6 - today.getDay()) % 7; // Days until Saturday
                const saturday = new Date(today);
                saturday.setDate(saturday.getDate() + saturdayOffset);

                const sunday = new Date(saturday);
                sunday.setDate(sunday.getDate() + 1);

                dates.push(formatDate(saturday));
                dates.push(formatDate(sunday));
                break;
            case 'nextWeek':
                // Add all days of next week (Monday to Sunday)
                const nextMonday = new Date(today);
                nextMonday.setDate(nextMonday.getDate() + (1 + 7 - today.getDay()) % 7);

                for (let i = 0; i < 7; i++) {
                    const day = new Date(nextMonday);
                    day.setDate(day.getDate() + i);
                    dates.push(formatDate(day));
                }
                break;
        }

        // Add all dates that aren't already in the settings
        let added = 0;
        dates.forEach(date => {
            if (!settings.holidays.includes(date)) {
                settings.holidays.push(date);
                added++;
            }
        });

        if (added > 0) {
            localStorage.setItem(`staffSettings_${workerName}`, JSON.stringify(settings));

            // Update the UI
            const holidayList = document.querySelector('.holiday-list');
            holidayList.innerHTML = this.generateHolidaysList(settings.holidays);

            // Update the holiday count
            this.updateHolidayCount(settings.holidays.length);

            // Show success message
            const msg = added === 1 ? '1 day' : `${added} days`;
            this.showToast(`Added ${msg} to holidays`);
        } else {
            this.showToast('These dates are already in holidays', 'warning');
        }
    }

    addHolidayRange(workerName) {
        const startInput = document.getElementById('holidayStart');
        const endInput = document.getElementById('holidayEnd');

        const startDate = startInput.value;
        const endDate = endInput.value;

        if (!startDate) {
            this.showToast('Please select a start date', 'warning');
            return;
        }

        const settings = this.getStaffSettings(workerName);
        let dates = [];

        if (!endDate || startDate === endDate) {
            // Single day
            dates.push(startDate);
        } else {
            // Date range
            const start = new Date(startDate);
            const end = new Date(endDate);

            if (start > end) {
                this.showToast('End date must be after start date', 'warning');
                return;
            }

            // Generate all dates in the range
            const current = new Date(start);
            while (current <= end) {
                dates.push(current.toISOString().split('T')[0]);
                current.setDate(current.getDate() + 1);
            }
        }

        // Add dates that aren't already in holidays
        let added = 0;
        dates.forEach(date => {
            if (!settings.holidays.includes(date)) {
                settings.holidays.push(date);
                added++;
            }
        });

        if (added > 0) {
            localStorage.setItem(`staffSettings_${workerName}`, JSON.stringify(settings));

            // Update the UI
            const holidayList = document.querySelector('.holiday-list');
            holidayList.innerHTML = this.generateHolidaysList(settings.holidays);

            // Update the holiday count
            this.updateHolidayCount(settings.holidays.length);

            // Clear the inputs
            startInput.value = '';
            endInput.value = '';

            // Show success message
            const msg = added === 1 ? '1 day' : `${added} days`;
            this.showToast(`Added ${msg} to holidays`);
        } else {
            this.showToast('These dates are already in holidays', 'warning');
        }
    }

    showToast(message, type = 'success') {
        // Create toast container if it doesn't exist
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }

        // Create unique ID for this toast
        const toastId = 'toast-' + Date.now();

        // Create toast HTML
        const toastHtml = `
            <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header ${type === 'success' ? 'bg-success text-white' : 'bg-warning text-dark'}">
                    <strong class="me-auto">${type === 'success' ? 'Success' : 'Warning'}</strong>
                    <button type="button" class="btn-close ${type === 'success' ? 'btn-close-white' : ''}" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;

        // Add toast to container
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);

        // Initialize and show the toast
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
        toast.show();

        // Remove toast after it's hidden
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    // Update the autoSaveStaffPreferences method to remove the status message display
    autoSaveStaffPreferences(workerName) {
        const settings = this.getStaffSettings(workerName);

        // Save preferred shifts by day
        settings.dayPreferences = {};

        // Get all preference checkboxes
        const preferenceCheckboxes = document.querySelectorAll('.preference-checkbox');
        preferenceCheckboxes.forEach(checkbox => {
            const shiftId = checkbox.dataset.shift;
            const day = checkbox.dataset.day;
            const prefKey = `${shiftId}_${day}`;

            // Store preference state in settings
            settings.dayPreferences[prefKey] = checkbox.checked;
        });

        // Save to localStorage
        localStorage.setItem(`staffSettings_${workerName}`, JSON.stringify(settings));

        // No status message displayed anymore
    }

    // Update the removeHoliday method to work with the event instead of direct string
    removeHoliday(dateOrEvent) {
        // Check if this is an event or direct date call
        let date;
        if (typeof dateOrEvent === 'string') {
            // Direct call with date string
            date = dateOrEvent;
        } else {
            // Called from click event, get date from data attribute
            const button = dateOrEvent.target || dateOrEvent.srcElement;
            date = button.getAttribute('data-date');
        }

        const modal = document.getElementById('staffSettingsModal');
        const workerName = modal.querySelector('.modal-title').textContent.replace('Settings for ', '');

        const settings = this.getStaffSettings(workerName);

        // Only proceed if we have a valid date
        if (date) {
            // Filter out the removed date
            settings.holidays = settings.holidays.filter(h => h !== date);
            localStorage.setItem(`staffSettings_${workerName}`, JSON.stringify(settings));

            // Update the holiday list
            const holidayList = document.querySelector('.holiday-list');
            holidayList.innerHTML = this.generateHolidaysList(settings.holidays);

            // Update the holiday count
            this.updateHolidayCount(settings.holidays.length);

            // Show a toast notification
            this.showToast('Holiday removed');
        }
    }

    // Add this method to the class to setup event listeners for holiday removal buttons
    setupHolidayButtonListeners() {
        // Use event delegation since the buttons are dynamically added
        document.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('holiday-remove')) {
                // Call removeHoliday with the event object
                this.removeHoliday(e);
            }
        });
    }

    // Add this new method to update the end date when start date changes
    updateEndDate(startDate) {
        if (startDate) {
            const endDateInput = document.getElementById('holidayEnd');
            endDateInput.value = startDate;
        }
    }

    // Completely revised highlightWorkerAvailability method with additional logging and safeguards
    highlightWorkerAvailability(workerName, highlight) {
        // Clear any existing highlights first
        document.querySelectorAll('.shift-slot.holiday-warning, .shift-slot.preference-highlight').forEach(slot => {
            slot.classList.remove('holiday-warning', 'preference-highlight');
        });

        // If not highlighting or no worker specified, just return
        if (!highlight || !workerName) return;

        // Get worker's settings
        const workerSettings = this.getStaffSettings(workerName);

        // Process all shift slots
        const allShiftSlots = document.querySelectorAll('.shift-slot');
        allShiftSlots.forEach(slot => {
            if (!slot.dataset.date) return;

            try {
                // Get the date from the slot
                const slotDate = new Date(slot.dataset.date);
                if (isNaN(slotDate.getTime())) return;

                const dateStr = slotDate.toISOString().split('T')[0];
                const shiftId = slot.dataset.shift;

                // Check if the date is a holiday
                if (workerSettings.holidays && workerSettings.holidays.includes(dateStr)) {
                    slot.classList.add('holiday-warning');
                    return; // If it's a holiday, no need to check preferences
                }

                // Check if it's a preferred shift
                if (workerSettings.dayPreferences) {
                    // Get the day of week (0 = Sunday, 1 = Monday, etc.)
                    const dayOfWeek = slotDate.getDay();
                    // Convert to the format used in preferences (mon, tue, etc.)
                    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
                    const dayKey = days[dayOfWeek];

                    // Check if this shift on this day is preferred
                    const prefKey = `${shiftId}_${dayKey}`;
                    if (workerSettings.dayPreferences[prefKey] === true) {
                        slot.classList.add('preference-highlight');
                    }
                }
            } catch (error) {
                // Silent error handling
            }
        });
    }

    // Add this new method to ensure consistent date formatting across all shift slots
    normalizeShiftSlotDates() {
        const shiftSlots = document.querySelectorAll('.shift-slot');
        shiftSlots.forEach(slot => {
            if (slot.dataset.date) {
                // Ensure the date is properly formatted in ISO format
                const date = new Date(slot.dataset.date);
                if (!isNaN(date.getTime())) {
                    slot.dataset.date = date.toISOString();
                }
            }
        });
    }

    // Add this method to the ShiftCalendar class
    initializeHolidayHighlighting() {
        // Make sure all worker tags are properly initialized for highlight detection
        const workerTags = document.querySelectorAll('.worker-tag');

        // Remove any existing dragstart listeners to prevent duplicates
        workerTags.forEach(worker => {
            const oldWorker = worker.cloneNode(true);
            worker.parentNode.replaceChild(oldWorker, worker);

            // Re-add the dragstart event with proper highlighting
            oldWorker.addEventListener('dragstart', (e) => {
                oldWorker.classList.add('dragging');
                const workerName = oldWorker.querySelector('span').textContent;
                e.dataTransfer.setData('text/plain', workerName);
                e.dataTransfer.effectAllowed = 'move';

                // Use the renamed method
                requestAnimationFrame(() => {
                    this.highlightWorkerAvailability(workerName, true);
                });
            });

            oldWorker.addEventListener('dragend', () => {
                oldWorker.classList.remove('dragging');
                // Use the renamed method
                this.highlightWorkerAvailability(null, false);
            });
        });

        // Ensure all shift slots are properly formatted
        this.normalizeShiftSlotDates();
    }

    // Add this new method to update the worker options in the modal with availability information
    updateWorkerOptionsWithAvailability(date, shift) {
        const dateStr = date.toISOString().split('T')[0];
        const dayOfWeek = date.getDay();
        const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const dayKey = days[dayOfWeek];
        const workerOptions = document.querySelectorAll('.worker-option');
        const shiftId = shift;

        // Define styles for the modal
        const style = document.createElement('style');
        if (!document.getElementById('worker-option-styles')) {
            style.id = 'worker-option-styles';
            style.textContent = `
                .worker-option {
                    transition: all 0.2s;
                    padding: 8px;
                    border-radius: 4px;
                    margin-bottom: 4px;
                    position: relative;
                }
                .worker-option:hover {
                    background-color: #f8f9fa;
                }
                .worker-preferred {
                    background-color: rgba(144, 238, 144, 0.15);
                    border-left: 3px solid #4caf50;
                }
                .worker-on-holiday {
                    background-color: rgba(255, 105, 97, 0.1);
                    border-left: 3px solid #ff6961;
                    opacity: 0.65;
                }
                .availability-indicator {
                    position: absolute;
                    right: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                .preference-icon {
                    color: #4caf50;
                    font-size: 16px;
                }
                .holiday-icon {
                    color: #ff6961;
                    font-size: 16px;
                }
            `;
            document.head.appendChild(style);
        }

        // Process each worker option
        workerOptions.forEach(option => {
            // Clear any existing indicators
            const existingIndicator = option.querySelector('.availability-indicator');
            if (existingIndicator) {
                existingIndicator.remove();
            }

            // Reset classes
            option.classList.remove('worker-preferred', 'worker-on-holiday');

            const workerName = option.querySelector('input').value;
            const workerSettings = this.getStaffSettings(workerName);

            // Create indicator container
            const indicatorDiv = document.createElement('div');
            indicatorDiv.className = 'availability-indicator';

            let isOnHoliday = false;
            let isPreferred = false;

            // Check if worker is on holiday
            if (workerSettings.holidays && workerSettings.holidays.includes(dateStr)) {
                isOnHoliday = true;
                option.classList.add('worker-on-holiday');

                const holidayIcon = document.createElement('span');
                holidayIcon.className = 'holiday-icon';
                holidayIcon.textContent = '⚠️';
                holidayIcon.title = 'On holiday';
                indicatorDiv.appendChild(holidayIcon);
            }

            // Check if this is a preferred shift
            if (!isOnHoliday && workerSettings.dayPreferences) {
                const prefKey = `${shiftId}_${dayKey}`;
                if (workerSettings.dayPreferences[prefKey] === true) {
                    isPreferred = true;
                    option.classList.add('worker-preferred');

                    const preferenceIcon = document.createElement('span');
                    preferenceIcon.className = 'preference-icon';
                    preferenceIcon.textContent = '👍';
                    preferenceIcon.title = 'Preferred shift';
                    indicatorDiv.appendChild(preferenceIcon);
                }
            }

            // Only append indicator if we have at least one icon
            if (isOnHoliday || isPreferred) {
                option.appendChild(indicatorDiv);
            }
        });

        // Sort options to show preferred staff first, holiday staff last
        const workerOptionsContainer = document.querySelector('.worker-options');
        const options = Array.from(workerOptionsContainer.querySelectorAll('.worker-option'));

        options.sort((a, b) => {
            const aHoliday = a.classList.contains('worker-on-holiday');
            const bHoliday = b.classList.contains('worker-on-holiday');
            const aPreferred = a.classList.contains('worker-preferred');
            const bPreferred = b.classList.contains('worker-preferred');

            // Sort order: preferred first, then normal, then holiday
            if (aPreferred && !bPreferred) return -1;
            if (!aPreferred && bPreferred) return 1;
            if (aHoliday && !bHoliday) return 1;
            if (!aHoliday && bHoliday) return -1;
            return 0;
        });

        // Reattach sorted options
        options.forEach(option => {
            workerOptionsContainer.appendChild(option);
        });
    }
}

// Initialize the calendar when the page loads
let calendar;
document.addEventListener('DOMContentLoaded', () => {
    calendar = new ShiftCalendar();
});

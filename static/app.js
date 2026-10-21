document.addEventListener('DOMContentLoaded', function() {
    // Initialize Materialize components
    const datepickers = M.Datepicker.init(document.querySelectorAll('.datepicker'), {
        format: 'yyyy-mm-dd',
        autoClose: true,
        container: document.body, // Ensure datepicker modal isn't clipped
        onSelect: function(selectedDate) {
            if (this.toString) {
                this.el.value = this.toString();
            } else if (selectedDate instanceof Date) {
                const y = selectedDate.getFullYear();
                const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
                const d = String(selectedDate.getDate()).padStart(2, '0');
                this.el.value = `${y}-${m}-${d}`;
            }

            if (this.el.id === 'start-date' || this.el.id === 'end-date') {
                renderSummary();
            } else if (this.el.id === 'date-picker') {
                fetch('/data')
                    .then(response => response.json())
                    .then(data => {
                        window.egg_data = data;
                        renderChickens(this.el.value);
                    })
                    .catch(error => console.error('Error fetching egg data:', error));
            }
        },
        onClose: function() {
            if (this.el.id === 'start-date' || this.el.id === 'end-date') {
                renderSummary();
            }
        }
    });

    const startDateInputEl = document.getElementById('start-date');
    const endDateInputEl = document.getElementById('end-date');
    if (startDateInputEl) {
        startDateInputEl.addEventListener('change', renderSummary);
        startDateInputEl.addEventListener('input', renderSummary);
    }
    if (endDateInputEl) {
        endDateInputEl.addEventListener('change', renderSummary);
        endDateInputEl.addEventListener('input', renderSummary);
    }

    const chickensDiv = document.getElementById('chickens');
    let allChickens = [];

    // Add Chicken modal initialization
    const addChickenModalEl = document.getElementById('addChickenModal');
    const addChickenModalInstance = addChickenModalEl ? M.Modal.init(addChickenModalEl, {
        container: document.body,
        onOpenEnd: function() {
            const nameInput = document.getElementById('newChickenName');
            if (nameInput) nameInput.focus();
        }
    }) : null;

    function openAddChickenModal() {
        const dateInput = document.getElementById('date-picker');
        const defaultDate = (dateInput && dateInput.value) ? dateInput.value : getLAToday();
        const nameInput = document.getElementById('newChickenName');
        const arrivalInput = document.getElementById('newChickenArrivalDate');
        if (nameInput) {
            nameInput.value = '';
        }
        if (arrivalInput) {
            arrivalInput.value = defaultDate;
            const dpInstance = M.Datepicker.getInstance(arrivalInput);
            if (dpInstance) {
                dpInstance.setDate(new Date(defaultDate + 'T00:00:00'));
            }
        }
        M.updateTextFields();
        if (addChickenModalInstance) {
            addChickenModalInstance.open();
        }
    }

    const confirmAddBtn = document.getElementById('confirmAddChickenBtn');
    const newChickenNameInput = document.getElementById('newChickenName');
    const newChickenArrivalInput = document.getElementById('newChickenArrivalDate');

    function submitNewChicken() {
        const name = newChickenNameInput ? newChickenNameInput.value.trim() : '';
        const arrivalDate = (newChickenArrivalInput && newChickenArrivalInput.value.trim()) ? newChickenArrivalInput.value.trim() : getLAToday();

        if (!name) {
            M.toast({html: 'Please enter a chicken name.', classes: 'amber darken-3'});
            if (newChickenNameInput) newChickenNameInput.focus();
            return;
        }

        if (confirmAddBtn) confirmAddBtn.disabled = true;
        addChicken(name, arrivalDate).finally(() => {
            if (confirmAddBtn) confirmAddBtn.disabled = false;
        });
    }

    if (confirmAddBtn) {
        confirmAddBtn.addEventListener('click', submitNewChicken);
    }
    if (newChickenNameInput) {
        newChickenNameInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitNewChicken();
            }
        });
    }

    function renderChickenCards(chickensToRender) {
        chickensDiv.innerHTML = '';

        chickensToRender.forEach(chickenName => {
            const chickenCard = document.createElement('div');
            chickenCard.className = 'col s12 m6 l4';
            chickenCard.innerHTML = 
                '<div class="card-panel">' +
                    '<div class="row" style="margin-bottom: 0;">' +
                        '<div class="col s10">' +
                            '<h5>' + chickenName + '</h5>' +
                        '</div>' +
                        '<div class="col s2 right-align">' +
                            '<a class="btn-flat btn-small delete-chicken-btn" data-chicken-name="' + chickenName + '" style="padding: 0 10px;">' +
                                '<i class="material-icons grey-text">archive</i>' +
                            '</a>' +
                        '</div>' +
                    '</div>' +
                    '<div class="switch">' +
                        '<label>' +
                            'No Egg' +
                            '<input type="checkbox" data-chicken-name="' + chickenName + '">' +
                            '<span class="lever"></span>' +
                            'Egg Laid' +
                        '</label>' +
                    '</div>' +
                '</div>';
            chickensDiv.appendChild(chickenCard);
            
            const input = chickenCard.querySelector('input');
            input.addEventListener('change', function() {
                const laid_egg = this.checked;
                const dateInput = document.getElementById('date-picker');
                const date = dateInput.value;
                if (!window.egg_data) window.egg_data = {};
                if (!window.egg_data[date]) window.egg_data[date] = {};
                window.egg_data[date][chickenName] = laid_egg;
                updateEggData(date, chickenName, laid_egg);
                renderSummary();
            });

            const deleteButton = chickenCard.querySelector('.delete-chicken-btn');
            deleteButton.addEventListener('click', function(event) {
                event.stopPropagation();
                const chickenToDelete = this.dataset.chickenName;
                M.Modal.init(document.getElementById('confirmationModal'), {
                    onOpenEnd: () => {
                        document.getElementById('confirmDeleteBtn').onclick = () => {
                            removeChicken(chickenToDelete);
                            M.Modal.getInstance(document.getElementById('confirmationModal')).close();
                        };
                    }
                }).open();
            });
        });

        // Add Chicken card
        const addChickenCard = document.createElement('div');
        addChickenCard.className = 'col s12 m6 l4';
        addChickenCard.innerHTML = 
            '<div class="card-panel center-align add-chicken-card" style="cursor: pointer; min-height: 100px; display: flex; align-items: center; justify-content: center;" role="button" tabindex="0">' +
                '<div style="display: flex; flex-direction: column; align-items: center;">' +
                    '<span style="font-size: 2rem; line-height: 1; margin-bottom: 5px;">🐔</span>' +
                    '<div style="font-size: 1.2em; font-weight: 500;">Add Chicken</div>' +
                '</div>' +
            '</div>';
        chickensDiv.appendChild(addChickenCard);

        addChickenCard.addEventListener('click', openAddChickenModal);
        addChickenCard.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openAddChickenModal();
            }
        });
    }

    function addChicken(name, arrivalDate) {
        return fetch('/add_chicken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chicken_name: name, arrival_date: arrivalDate }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                allChickens = data.chickens;
                if (addChickenModalInstance) {
                    addChickenModalInstance.close();
                }
                const dateInput = document.getElementById('date-picker');
                const currentDate = dateInput ? dateInput.value : getLAToday();
                return fetch('/data')
                    .then(r => r.json())
                    .then(eggData => {
                        window.egg_data = eggData;
                        renderChickenCards(allChickens);
                        renderChickens(currentDate);
                        renderSummary();
                        M.toast({html: 'Added ' + name + ' to the flock! 🐔', classes: 'green darken-1'});
                    });
            } else {
                M.toast({html: 'Failed: ' + (data.message || 'Could not add chicken.'), classes: 'red darken-3'});
            }
        })
        .catch(error => {
            console.error('Error adding chicken:', error);
            M.toast({html: 'Network error adding chicken.', classes: 'red darken-3'});
        });
    }

    function removeChicken(name) {
        fetch('/remove_chicken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chicken_name: name }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                allChickens = data.chickens;
                const dateInput = document.getElementById('date-picker');
                const currentDate = dateInput ? dateInput.value : getLAToday();
                renderChickenCards(allChickens);
                renderChickens(currentDate);
                renderSummary();
                M.toast({html: 'Chicken retired.', classes: 'green darken-1'});
            } else {
                M.toast({html: 'Failed: ' + (data.message || 'Could not retire chicken.'), classes: 'red darken-3'});
            }
        })
        .catch(error => {
            console.error('Error removing chicken:', error);
            M.toast({html: 'Error removing chicken.', classes: 'red darken-3'});
        });
    }
    function getLAToday() {
        return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
    }

    function syncData() {
        const dateInput = document.getElementById('date-picker');
        if (!dateInput) return;
        const laToday = getLAToday();

        Promise.all([
            fetch('/get_chickens').then(r => r.json()),
            fetch('/data').then(r => r.json())
        ])
        .then(([chickensData, eggData]) => {
            if (chickensData.success) {
                allChickens = chickensData.chickens;
                window.egg_data = eggData;
                
                renderChickenCards(allChickens);
                
                const datePickerInstance = M.Datepicker.getInstance(dateInput);
                if (datePickerInstance) {
                    const todayDateObj = new Date(laToday + 'T00:00:00');
                    datePickerInstance.setDate(todayDateObj);
                    dateInput.value = laToday;
                } else {
                    dateInput.value = laToday;
                }
                
                setDefaultDates(laToday);
                renderChickens(laToday);
                renderSummary();
            }
        })
        .catch(error => console.error('Error syncing data:', error));
    }

    // Initial sync
    syncData();

    // Re-sync when page is revisited or tab is brought back from background/sleep
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            syncData();
        }
    });

    window.addEventListener('pageshow', function() {
        syncData();
    });

    function renderChickens(date) {
        allChickens.forEach(chickenName => {
            const input = chickensDiv.querySelector('input[data-chicken-name="' + chickenName + '"]');
            if (input) {
                const isChecked = (window.egg_data && window.egg_data[date] && window.egg_data[date][chickenName]);
                input.checked = !!isChecked;
            }
        });
    }

    function renderSummary() {
        const startInput = document.getElementById('start-date');
        const endInput = document.getElementById('end-date');
        if (!startInput || !endInput) return;

        const startDatePicker = M.Datepicker.getInstance(startInput);
        const endDatePicker = M.Datepicker.getInstance(endInput);

        let startDate = startInput.value;
        let endDate = endInput.value;

        if (!startDate && startDatePicker && startDatePicker.toString) {
            startDate = startDatePicker.toString();
        }
        if (!endDate && endDatePicker && endDatePicker.toString) {
            endDate = endDatePicker.toString();
        }

        const summaryTableBody = document.querySelector('#summary-table tbody');
        if (!summaryTableBody) return;
        summaryTableBody.innerHTML = '';

        if (startDate && endDate && startDate > endDate) {
            const row = summaryTableBody.insertRow();
            const cell = row.insertCell(0);
            cell.colSpan = 2;
            cell.className = 'center-align grey-text';
            cell.style.padding = '16px';
            cell.textContent = 'Start Date must be before or equal to End Date.';
            renderEggChart(startDate, endDate);
            return;
        }

        const eggCounts = {};
        allChickens.forEach(c => eggCounts[c] = 0);

        if (window.egg_data && startDate && endDate) {
            for (const dateStr in window.egg_data) {
                if (dateStr >= startDate && dateStr <= endDate) {
                    for (const chickenName in window.egg_data[dateStr]) {
                        if (allChickens.includes(chickenName) && window.egg_data[dateStr][chickenName]) {
                            eggCounts[chickenName] = (eggCounts[chickenName] || 0) + 1;
                        }
                    }
                }
            }
        }

        allChickens.forEach(chickenName => {
            const row = summaryTableBody.insertRow();
            row.insertCell(0).textContent = chickenName;
            row.insertCell(1).textContent = eggCounts[chickenName] || 0;
        });

        // Update Egg Production Chart
        renderEggChart(startDate, endDate);
    }

    let eggChart = null;

    function getChartThemeColors(isDarkMode) {
        return {
            text: isDarkMode ? '#e0e0e0' : '#2c3e2d',
            grid: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(75, 111, 68, 0.12)',
            bar: isDarkMode ? '#81c784' : '#4b6f44',
            hover: isDarkMode ? '#a5d6a7' : '#3d5a37'
        };
    }

    function getChartData(startDate, endDate) {
        if (!startDate || !endDate) {
            return { labels: [], data: [], grouping: 'Daily' };
        }
        if (startDate > endDate) {
            return { labels: [], data: [], grouping: 'Invalid Range' };
        }

        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T00:00:00');
        const dayDiff = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

        // Daily map filled with 0
        const dailyMap = {};
        const curr = new Date(start);
        while (curr <= end) {
            const y = curr.getFullYear();
            const m = String(curr.getMonth() + 1).padStart(2, '0');
            const d = String(curr.getDate()).padStart(2, '0');
            dailyMap[`${y}-${m}-${d}`] = 0;
            curr.setDate(curr.getDate() + 1);
        }

        if (window.egg_data) {
            for (const dateStr in window.egg_data) {
                if (dailyMap.hasOwnProperty(dateStr)) {
                    let daySum = 0;
                    for (const chickenName in window.egg_data[dateStr]) {
                        if (allChickens.includes(chickenName) && window.egg_data[dateStr][chickenName]) {
                            daySum++;
                        }
                    }
                    dailyMap[dateStr] = daySum;
                }
            }
        }

        const sortedDates = Object.keys(dailyMap).sort();

        if (dayDiff <= 31) {
            const labels = sortedDates.map(dStr => {
                const dt = new Date(dStr + 'T00:00:00');
                return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            });
            const data = sortedDates.map(dStr => dailyMap[dStr]);
            return { labels, data, grouping: 'Daily' };
        } else if (dayDiff <= 120) {
            // Group into 7-day chunks
            const labels = [];
            const data = [];
            for (let i = 0; i < sortedDates.length; i += 7) {
                const chunk = sortedDates.slice(i, i + 7);
                const chunkSum = chunk.reduce((acc, dt) => acc + dailyMap[dt], 0);
                const firstDate = new Date(chunk[0] + 'T00:00:00');
                const lastDate = new Date(chunk[chunk.length - 1] + 'T00:00:00');

                let label = firstDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                if (chunk.length > 1) {
                    if (firstDate.getMonth() === lastDate.getMonth()) {
                        label += ' - ' + lastDate.getDate();
                    } else {
                        label += ' - ' + lastDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                    }
                }
                labels.push(label);
                data.push(chunkSum);
            }
            return { labels, data, grouping: 'Weekly' };
        } else {
            // Group into months
            const monthMap = {};
            sortedDates.forEach(dStr => {
                const mKey = dStr.substring(0, 7);
                monthMap[mKey] = (monthMap[mKey] || 0) + dailyMap[dStr];
            });
            const sortedMonths = Object.keys(monthMap).sort();
            const labels = sortedMonths.map(mStr => {
                const [y, m] = mStr.split('-').map(Number);
                const dt = new Date(y, m - 1, 1);
                return dt.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
            });
            const data = sortedMonths.map(mStr => monthMap[mStr]);
            return { labels, data, grouping: 'Monthly' };
        }
    }

    function renderEggChart(startDate, endDate) {
        const canvas = document.getElementById('eggChart');
        if (!canvas || typeof Chart === 'undefined') return;

        const { labels, data, grouping } = getChartData(startDate, endDate);
        const badge = document.getElementById('chart-grouping-badge');
        if (badge) {
            badge.textContent = grouping;
        }

        const isDarkMode = document.body.classList.contains('dark-mode');
        const theme = getChartThemeColors(isDarkMode);

        if (eggChart) {
            eggChart.data.labels = labels;
            eggChart.data.datasets[0].data = data;
            eggChart.data.datasets[0].backgroundColor = theme.bar;
            eggChart.data.datasets[0].hoverBackgroundColor = theme.hover;
            eggChart.options.scales.x.ticks.color = theme.text;
            eggChart.options.scales.y.ticks.color = theme.text;
            eggChart.options.scales.y.grid.color = theme.grid;
            eggChart.update();
            return;
        }

        const ctx = canvas.getContext('2d');
        eggChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Eggs Laid',
                    data: data,
                    backgroundColor: theme.bar,
                    hoverBackgroundColor: theme.hover,
                    borderRadius: 6,
                    maxBarThickness: 36
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: isDarkMode ? '#1e2d1d' : '#2c3e2d',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        callbacks: {
                            label: function(context) {
                                const val = context.raw;
                                return ` ${val} egg${val === 1 ? '' : 's'}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: theme.text,
                            font: {
                                family: "'Roboto', sans-serif",
                                size: 11
                            },
                            maxRotation: 45,
                            autoSkip: true,
                            maxTicksLimit: 12
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: theme.text,
                            precision: 0,
                            stepSize: 1,
                            font: {
                                family: "'Roboto', sans-serif",
                                size: 11
                            }
                        },
                        grid: {
                            color: theme.grid
                        }
                    }
                }
            }
        });
    }

    function updateChartTheme() {
        if (!eggChart) return;
        const isDarkMode = document.body.classList.contains('dark-mode');
        const theme = getChartThemeColors(isDarkMode);
        eggChart.data.datasets[0].backgroundColor = theme.bar;
        eggChart.data.datasets[0].hoverBackgroundColor = theme.hover;
        eggChart.options.scales.x.ticks.color = theme.text;
        eggChart.options.scales.y.ticks.color = theme.text;
        eggChart.options.scales.y.grid.color = theme.grid;
        if (eggChart.options.plugins && eggChart.options.plugins.tooltip) {
            eggChart.options.plugins.tooltip.backgroundColor = isDarkMode ? '#1e2d1d' : '#2c3e2d';
        }
        eggChart.update();
    }

    function setDefaultDates(serverToday) {
        const today = new Date(serverToday + 'T00:00:00');
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);
        const startDatePicker = M.Datepicker.getInstance(document.getElementById('start-date'));
        const endDatePicker = M.Datepicker.getInstance(document.getElementById('end-date'));
        endDatePicker.setDate(today);
        endDatePicker.el.value = today.toISOString().split('T')[0];
        startDatePicker.setDate(sevenDaysAgo);
        startDatePicker.el.value = sevenDaysAgo.toISOString().split('T')[0];
        M.updateTextFields();
    }
    
    const themeSwitcher = document.getElementById('theme-switcher');
    themeSwitcher.addEventListener('change', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
        updateChartTheme();
    });
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        themeSwitcher.checked = true;
    }
});

function updateEggData(date, chicken, laid_egg) {
    fetch('/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: date, chicken: chicken, laid_egg: laid_egg }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) window.egg_data = data.egg_data;
    });
}

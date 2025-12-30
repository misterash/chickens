document.addEventListener('DOMContentLoaded', function() {
    // Initialize Materialize components
    const datepickers = M.Datepicker.init(document.querySelectorAll('.datepicker'), {
        format: 'yyyy-mm-dd',
        autoClose: true,
        onSelect: function() {
            // Manually trigger change event for summary dates
            if (this.el.id === 'start-date' || this.el.id === 'end-date') {
                renderSummary();
            } else {
                fetch('/data')
                    .then(response => response.json())
                    .then(data => {
                        window.egg_data = data;
                        renderChickens(this.el.value);
                    })
                    .catch(error => console.error('Error fetching egg data:', error));
            }
        }
    });

    const chickensDiv = document.getElementById('chickens');
    const chickens = ['Larry', 'Iggy', 'Curly', 'Salt', 'Peppa'];
    chickens.forEach(chickenName => {
        const chickenCard = document.createElement('div');
        chickenCard.className = 'col s12 m6 l4';
        chickenCard.innerHTML = `
            <div class="card-panel">
                <h5>${chickenName}</h5>
                <div class="switch">
                    <label>
                        No Egg
                        <input type="checkbox" data-chicken-name="${chickenName}">
                        <span class="lever"></span>
                        Egg Laid
                    </label>
                </div>
            </div>
        `;
        chickensDiv.appendChild(chickenCard);
        const input = chickenCard.querySelector('input');
        input.addEventListener('change', function() {
            const laid_egg = this.checked;
            const date = M.Datepicker.getInstance(document.getElementById('date-picker')).el.value;
            updateEggData(date, chickenName, laid_egg);
            renderSummary();
        });
    });
    const summaryTableBody = document.querySelector('#summary-table tbody');
    const themeSwitcher = document.getElementById('theme-switcher');
    const body = document.body;

    function renderChickens(date) {
        chickens.forEach(chickenName => {
            const input = chickensDiv.querySelector(`input[data-chicken-name="${chickenName}"]`);
            if (input) {
                const isChecked = (window.egg_data && window.egg_data[date] && window.egg_data[date][chickenName]);
                input.checked = !!isChecked;
            }
        });
    }

    function renderSummary() {
        const startDatePicker = M.Datepicker.getInstance(document.getElementById('start-date'));
        const endDatePicker = M.Datepicker.getInstance(document.getElementById('end-date'));
        
        const startDate = startDatePicker.el.value;
        const endDate = endDatePicker.el.value;

        summaryTableBody.innerHTML = '';

        const eggCounts = {};
        chickens.forEach(c => eggCounts[c] = 0);

        if (window.egg_data) {
            for (const dateStr in window.egg_data) {
                if (dateStr >= startDate && dateStr <= endDate) {
                    for (const chickenName in window.egg_data[dateStr]) {
                        if (window.egg_data[dateStr][chickenName]) {
                            if (!eggCounts[chickenName]) eggCounts[chickenName] = 0;
                            eggCounts[chickenName]++;
                        }
                    }
                }
            }
        }

        chickens.forEach(chickenName => {
            const row = summaryTableBody.insertRow();
            const cell1 = row.insertCell(0);
            const cell2 = row.insertCell(1);
            cell1.textContent = chickenName;
            cell2.textContent = eggCounts[chickenName] || 0;
        });
    }

    function setDefaultDates(serverToday) {
        const today = new Date(serverToday + 'T00:00:00'); // Use server date, assume start of day in that timezone
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
    
    // Theme switcher logic
    themeSwitcher.addEventListener('change', () => {
        body.classList.toggle('dark-mode');
        if (body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.setItem('theme', 'light');
        }
    });

    // Apply saved theme
    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-mode');
        themeSwitcher.checked = true;
    }

    // Initial setup
    const mainDatePicker = M.Datepicker.getInstance(document.getElementById('date-picker'));
    const serverToday = mainDatePicker.el.value;
    
    setDefaultDates(serverToday);
    renderChickens(serverToday);
    renderSummary();
});

function updateEggData(date, chicken, laid_egg) {
    if (!window.egg_data) window.egg_data = {};
    if (!window.egg_data[date]) window.egg_data[date] = {};
    window.egg_data[date][chicken] = laid_egg;

    fetch('/update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            date: date,
            chicken: chicken,
            laid_egg: laid_egg,
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.egg_data = data.egg_data;
        } else {
            console.error('Failed to update egg data.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

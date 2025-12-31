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
    let allChickens = []; // This will hold the dynamic list of chickens

    function renderChickenCards(chickensToRender) {
        chickensDiv.innerHTML = ''; // Clear existing chicken cards

        chickensToRender.forEach(chickenName => {
            const chickenCard = document.createElement('div');
            chickenCard.className = 'col s12 m6 l4';
            chickenCard.innerHTML = `
                <div class="card-panel">
                    <div class="row" style="margin-bottom: 0;">
                        <div class="col s10">
                            <h5>${chickenName}</h5>
                        </div>
                        <div class="col s2 right-align">
                            <a class="btn-flat btn-small delete-chicken-btn" data-chicken-name="${chickenName}" data-action="delete" style="padding: 0 10px;">
                                <i class="material-icons red-text">delete</i>
                            </a>
                        </div>
                    </div>
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

            const deleteButton = chickenCard.querySelector('.delete-chicken-btn');
            deleteButton.addEventListener('click', function(event) {
                event.stopPropagation(); // Prevent card click event if any
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

        // Add "Add Chicken" card
        const addChickenCard = document.createElement('div');
        addChickenCard.className = 'col s12 m6 l4';
        addChickenCard.innerHTML = `
            <div class="card-panel center-align add-chicken-card" style="cursor: pointer; min-height: 100px; display: flex; align-items: center; justify-content: center;">
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <i class="material-icons small" style="margin-bottom: 5px;">🐓</i>
                    <div style="font-size: 1.2em;">Add Chicken</div>
                </div>
            </div>
        `;
        chickensDiv.appendChild(addChickenCard);

        addChickenCard.addEventListener('click', () => {
            const newChickenName = prompt('Enter the name for the new chicken:');
            if (newChickenName && newChickenName.trim() !== '') {
                addChicken(newChickenName.trim());
            }
        });
    }

    // Function to add a chicken (will be implemented later with backend call)
    function addChicken(name) {
        fetch('/add_chicken', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ chicken_name: name }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                allChickens = data.chickens;
                renderChickenCards(allChickens);
                renderSummary(); // Re-render summary to include new chicken
            } else {
                console.error('Failed to add chicken:', data.message);
                M.toast({html: `Failed to add chicken: ${data.message}`, classes: 'red darken-3'});
            }
        })
        .catch(error => {
            console.error('Error adding chicken:', error);
            M.toast({html: 'Error adding chicken.', classes: 'red darken-3'});
        });
    }

    // Function to remove a chicken
    function removeChicken(name) {
        fetch('/remove_chicken', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ chicken_name: name }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                allChickens = data.chickens;
                renderChickenCards(allChickens);
                renderSummary(); // Re-render summary
                M.toast({html: `Chicken '${name}' removed.`, classes: 'green darken-1'});
            } else {
                console.error('Failed to remove chicken:', data.message);
                M.toast({html: `Failed to remove chicken: ${data.message}`, classes: 'red darken-3'});
            }
        })
        .catch(error => {
            console.error('Error removing chicken:', error);
            M.toast({html: 'Error removing chicken.', classes: 'red darken-3'});
        });
    }

    // Fetch chickens from the backend and then render cards
    fetch('/get_chickens')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                allChickens = data.chickens;
                renderChickenCards(allChickens);
                // Initial setup after chickens are loaded
                const mainDatePicker = M.Datepicker.getInstance(document.getElementById('date-picker'));
                const serverToday = mainDatePicker.el.value;
                
                setDefaultDates(serverToday);
                renderChickens(serverToday);
                renderSummary();
            } else {
                console.error('Failed to fetch chickens:', data.message);
                M.toast({html: `Failed to fetch chickens: ${data.message}`, classes: 'red darken-3'});
            }
        })
        .catch(error => {
            console.error('Error fetching chickens:', error);
            M.toast({html: 'Error fetching chickens.', classes: 'red darken-3'});
        });


    const summaryTableBody = document.querySelector('#summary-table tbody');
    const themeSwitcher = document.getElementById('theme-switcher');
    const body = document.body;

    function renderChickens(date) {
        allChickens.forEach(chickenName => {
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
        allChickens.forEach(c => eggCounts[c] = 0);

        if (window.egg_data) {
            for (const dateStr in window.egg_data) {
                if (dateStr >= startDate && dateStr <= endDate) {
                    // Check if window.egg_data[dateStr] exists before iterating
                    if (window.egg_data[dateStr]) {
                        for (const chickenName in window.egg_data[dateStr]) {
                            // Ensure the chicken still exists in allChickens before counting
                            if (allChickens.includes(chickenName) && window.egg_data[dateStr][chickenName]) {
                                if (!eggCounts[chickenName]) eggCounts[chickenName] = 0;
                                eggCounts[chickenName]++;
                            }
                        }
                    }
                }
            }
        }

        allChickens.forEach(chickenName => {
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

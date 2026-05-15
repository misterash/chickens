document.addEventListener('DOMContentLoaded', function() {
    // Initialize Materialize components
    const datepickers = M.Datepicker.init(document.querySelectorAll('.datepicker'), {
        format: 'yyyy-mm-dd',
        autoClose: true,
        onSelect: function() {
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
    let allChickens = [];

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
                const date = M.Datepicker.getInstance(document.getElementById('date-picker')).el.value;
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
            '<div class="card-panel center-align add-chicken-card" style="cursor: pointer; min-height: 100px; display: flex; align-items: center; justify-content: center;">' +
                '<div style="display: flex; flex-direction: column; align-items: center;">' +
                    '<i class="material-icons small" style="margin-bottom: 5px;">🐓</i>' +
                    '<div style="font-size: 1.2em;">Add Chicken</div>' +
                '</div>' +
            '</div>';
        chickensDiv.appendChild(addChickenCard);

        addChickenCard.addEventListener('click', () => {
            const newChickenName = prompt('Enter the name for the new chicken:');
            if (newChickenName && newChickenName.trim() !== '') {
                const arrivalDate = prompt('Enter arrival date (YYYY-MM-DD) or leave empty for today:', 
                    new Date().toISOString().split('T')[0]);
                addChicken(newChickenName.trim(), arrivalDate);
            }
        });
    }

    function addChicken(name, arrivalDate) {
        fetch('/add_chicken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chicken_name: name, arrival_date: arrivalDate }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                allChickens = data.chickens;
                renderChickenCards(allChickens);
                renderSummary();
            } else {
                M.toast({html: 'Failed: ' + data.message, classes: 'red darken-3'});
            }
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
                renderChickenCards(allChickens);
                renderSummary();
                M.toast({html: 'Chicken retired.', classes: 'green darken-1'});
            }
        });
    }

    fetch('/get_chickens')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                allChickens = data.chickens;
                renderChickenCards(allChickens);
                const mainDatePicker = M.Datepicker.getInstance(document.getElementById('date-picker'));
                const serverToday = mainDatePicker.el.value;
                setDefaultDates(serverToday);
                renderChickens(serverToday);
                renderSummary();
            }
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
        const startDatePicker = M.Datepicker.getInstance(document.getElementById('start-date'));
        const endDatePicker = M.Datepicker.getInstance(document.getElementById('end-date'));
        const startDate = startDatePicker.el.value;
        const endDate = endDatePicker.el.value;
        const summaryTableBody = document.querySelector('#summary-table tbody');
        summaryTableBody.innerHTML = '';

        const eggCounts = {};
        allChickens.forEach(c => eggCounts[c] = 0);

        if (window.egg_data) {
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

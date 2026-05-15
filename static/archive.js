document.addEventListener('DOMContentLoaded', function() {
    const archiveBody = document.getElementById('archive-body');
    const editModal = M.Modal.init(document.getElementById('editDatesModal'), {
        container: document.body
    });
    
    const datepickers = M.Datepicker.init(document.querySelectorAll('.datepicker'), {
        format: 'yyyy-mm-dd',
        autoClose: true,
        container: document.body
    });

    let currentChicken = null;

    function fetchArchive() {
        fetch('/get_archive')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    renderArchive(data.archive);
                } else {
                    M.toast({html: 'Failed to load archive.', classes: 'red darken-3'});
                }
            })
            .catch(error => {
                console.error('Error:', error);
                M.toast({html: 'Error loading archive.', classes: 'red darken-3'});
            });
    }

    function renderArchive(chickens) {
        archiveBody.innerHTML = '';
        chickens.forEach(chicken => {
            const row = document.createElement('tr');
            
            const statusClass = chicken.status === "Active" ? "green" : "grey";
            const endDate = chicken.status === "Active" ? "Present" : chicken.deactivation_date;
            const lifespan = chicken.arrival_date + ' → ' + endDate;

            row.innerHTML = '<td>' +
                                '<div><strong>' + chicken.name + '</strong></div>' +
                                '<span class="status-badge ' + statusClass + '">' + chicken.status + '</span>' +
                            '</td>' +
                            '<td class="lifespan-cell">' + lifespan + '</td>' +
                            '<td>' + chicken.lifetime_eggs + '</td>' +
                            '<td class="right-align">' +
                                '<a class="btn-flat btn-small edit-btn" data-name="' + chicken.name + '" data-arrival="' + chicken.arrival_date + '" data-deactivation="' + chicken.deactivation_date + '" style="padding: 0;">' +
                                    '<i class="material-icons grey-text" style="font-size: 1.2rem;">edit</i>' +
                                '</a>' +
                            '</td>';
            archiveBody.appendChild(row);
        });

        // Attach edit listeners
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                currentChicken = this.dataset.name;
                document.getElementById('modalChickenName').textContent = currentChicken;
                
                const arrivalInput = document.getElementById('editArrivalDate');
                const deactivationInput = document.getElementById('editDeactivationDate');
                
                arrivalInput.value = this.dataset.arrival;
                deactivationInput.value = (this.dataset.deactivation === 'N/A') ? '' : this.dataset.deactivation;
                
                M.updateTextFields();
                editModal.open();
            });
        });
    }

    document.getElementById('saveDatesBtn').addEventListener('click', function() {
        const arrivalDate = document.getElementById('editArrivalDate').value;
        const deactivationDate = document.getElementById('editDeactivationDate').value;

        fetch('/update_chicken_dates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: currentChicken,
                arrival_date: arrivalDate,
                deactivation_date: deactivationDate
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                M.toast({html: 'Dates updated!', classes: 'green darken-1'});
                editModal.close();
                fetchArchive();
            } else {
                M.toast({html: 'Update failed: ' + data.message, classes: 'red darken-3'});
            }
        });
    });

    fetchArchive();
});

document.addEventListener('DOMContentLoaded', function() {
    const archiveBody = document.getElementById('archive-body');
    const editModal = M.Modal.init(document.getElementById('editDatesModal'), {
        container: document.body // Renders the datepicker outside the modal container to prevent clipping
    });
    
    const datepickers = M.Datepicker.init(document.querySelectorAll('.datepicker'), {
        format: 'yyyy-mm-dd',
        autoClose: true,
        container: document.body // This is the key fix to keep the calendar from being cut off
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
            row.innerHTML = '<td><strong>' + chicken.name + '</strong></td>' +
                            '<td><span class="badge ' + (chicken.status === "Active" ? "green" : "grey") + ' white-text" style="float: none; margin-left: 0;">' + chicken.status + '</span></td>' +
                            '<td>' + chicken.arrival_date + '</td>' +
                            '<td>' + chicken.deactivation_date + '</td>' +
                            '<td>' + chicken.lifetime_eggs + '</td>' +
                            '<td><a class="btn-small blue waves-effect edit-btn" data-name="' + chicken.name + '" data-arrival="' + chicken.arrival_date + '" data-deactivation="' + chicken.deactivation_date + '"><i class="material-icons">edit</i></a></td>';
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

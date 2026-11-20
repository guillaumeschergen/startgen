/* Script du formulaire de candidature (vérification du CV : PDF, 5 Mo max.) */
(function () {
        var fileInput = document.getElementById('cv');
        var box = document.getElementById('cv-status');
        var err = document.getElementById('cv-error');
        var MAX = 5 * 1024 * 1024;
        var defaultHTML = box.innerHTML;
        function showError(msg) {
            fileInput.setCustomValidity(msg);
            err.textContent = msg; err.hidden = !msg;
            box.classList.toggle('file-invalid', !!msg);
        }
        fileInput.addEventListener('change', function () {
            var f = fileInput.files[0];
            if (!f) { box.innerHTML = defaultHTML; box.classList.remove('file-selected'); showError(''); return; }
            var isPdf = /\.pdf$/i.test(f.name) || f.type === 'application/pdf';
            if (!isPdf) showError('Ton CV doit être un fichier PDF.');
            else if (f.size > MAX) showError('Ton CV fait ' + (f.size / 1048576).toFixed(1) + ' Mo : la limite est de 5 Mo.');
            else showError('');
            box.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-circle-check"/></svg>' +
                '<span class="file-name"></span><small></small><span class="file-change">Toucher pour changer de fichier</span>';
            box.querySelector('.file-name').textContent = f.name;
            box.querySelector('small').textContent = 'Taille : ' + (f.size / 1048576).toFixed(2) + ' Mo';
            box.classList.add('file-selected');
        });
        ['dragenter', 'dragover'].forEach(function (t) { fileInput.addEventListener(t, function () { box.classList.add('is-dragover'); }); });
        ['dragleave', 'drop'].forEach(function (t) { fileInput.addEventListener(t, function () { box.classList.remove('is-dragover'); }); });
})();

    <!-- SCRIPT UPLOAD CV -->
    <script>
        const fileInput = document.getElementById('cv');
        const fileUploadCustom = document.querySelector('.file-upload-custom');

        fileInput.addEventListener('change', function() {
            if (fileInput.files.length > 0) {
                const fileName = fileInput.files[0].name;
                const fileSize = (fileInput.files[0].size / 1024 / 1024).toFixed(2);
                fileUploadCustom.innerHTML = `
                    <i class="fas fa-check-circle"></i>
                    <span class="file-name">${fileName}</span>
                    <small>Taille : ${fileSize} Mo</small>
                    <span class="file-change">Cliquer pour changer de fichier</span>
                `;
                fileUploadCustom.classList.add('file-selected');
            } else {
                fileUploadCustom.innerHTML = `
                    <i class="fas fa-cloud-upload-alt"></i>
                    <span>Glisse ton CV ici ou clique pour parcourir</span>
                    <small>Format accepté : PDF — Max 5 Mo</small>
                `;
                fileUploadCustom.classList.remove('file-selected');
            }
        });
    </script>

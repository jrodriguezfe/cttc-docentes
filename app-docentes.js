// app-docentes.js - Gestión de Staff Docente CTTC-SENATI

let currentDocenteId = null;
let allDocentes = [];

// =================================================================
// CONTROL DE SECCIONES (SPA)
// =================================================================
function showSection(sectionId, isNew = false) {
    document.querySelectorAll('.spa-section').forEach(s => s.style.display = 'none');
    document.getElementById(sectionId).style.display = 'block';

    if (sectionId === 'admin-dashboard') loadAdminList();
    if (sectionId === 'directorio') cargarDirectorio();

    if (sectionId === 'admin-form') {
        if (isNew) {
            currentDocenteId = null;
            document.getElementById('docenteForm').reset();
            document.getElementById('form-title').textContent = "Registrar Especialista";
        }
    }
}

// =================================================================
// AUTENTICACIÓN
// =================================================================
function setupAuthStateListener() {
    auth.onAuthStateChanged(user => {
        const adminLink = document.getElementById('nav-admin-link');
        const logoutLink = document.getElementById('nav-logout-link');
        const loginLink = document.getElementById('nav-login-link');
        
        if (user) {
            if (adminLink) adminLink.classList.remove('d-none');
            if (logoutLink) logoutLink.classList.remove('d-none');
            if (loginLink) loginLink.classList.add('d-none');
        } else {
            if (adminLink) adminLink.classList.add('d-none');
            if (logoutLink) logoutLink.classList.add('d-none');
            if (loginLink) loginLink.classList.remove('d-none');
            // Redirección si se cierra sesión estando en admin
            if (document.getElementById('admin-dashboard').style.display === 'block') showSection('directorio');
        }
    });
}

function logoutAdmin() {
    auth.signOut().then(() => {
        alert("Sesión finalizada.");
        showSection('directorio');
    });
}

document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorMsg = document.getElementById('login-error-message');

    auth.signInWithEmailAndPassword(email, password)
        .then(() => showSection('admin-dashboard'))
        .catch(err => {
            errorMsg.textContent = "Error: Acceso denegado.";
            errorMsg.classList.remove('d-none');
        });
});

// =================================================================
// VISTA PÚBLICA
// =================================================================

function cargarDirectorio() {
    const container = document.getElementById('docentes-container');
    container.innerHTML = '<div class="text-center w-100 py-5"><div class="spinner-border text-success"></div></div>';

    db.collection('docentes').get().then(snapshot => {
        container.innerHTML = '';
        if (snapshot.empty) {
            container.innerHTML = '<p class="text-center py-5">No hay especialistas registrados.</p>';
            return;
        }

        snapshot.forEach(doc => {
            const d = doc.data();
            const nombreCompleto = `${d.NOMBRES || ''} ${d.APELLIDOS || ''}`;
            const especialidad = d.ESPECIALIDAD || 'Especialista';
            const bio = d.BIO || 'Sin biografía disponible.';
            const foto = d.fotoURL || 'https://placehold.co/400x400?text=Docente';
            const correoSenati = d["Correo institucional (@senati.pe)"] || "";
            const habilidades = d.Skills || "";

            container.innerHTML += `
                <div class="col-md-6 col-lg-4">
                    <div class="card card-docente h-100 shadow-sm border-0">
                        <div class="img-docente-container">
                            <img src="${foto}" class="img-docente" onerror="this.src='https://placehold.co/400x400?text=Error+Imagen'">
                        </div>
                        <div class="card-body p-4 d-flex flex-column">
                            <span class="badge-especialidad mb-2">${especialidad}</span>
                            <h4 class="fw-bold mb-1">${nombreCompleto}</h4>
                            ${correoSenati ? `
                            <div class="mb-3">
                                <a href="mailto:${correoSenati}" class="text-decoration-none small text-muted">
                                    <i class="bi bi-envelope-at text-success"></i> ${correoSenati}
                                </a>
                            </div>` : ''}
                            <p class="text-muted small flex-grow-1">${bio.substring(0, 200)}${bio.length > 200 ? '...' : ''}</p>
                            ${habilidades ? `
                            <div class="mb-3">
                                <small class="fw-bold text-acento">Habilidades técnicas:</small><br>
                                <small class="text-muted" style="font-size: 0.75rem;">${habilidades}</small>
                            </div>` : ''}
                            <hr>
                            <div class="d-grid">
                                <a href="https://wa.me/51954622231?text=Hola,%20quisiera%20más%20información%20sobre%20el%20especialista%20${encodeURIComponent(nombreCompleto)}" 
                                   target="_blank" class="btn btn-outline-success border-2 fw-bold">
                                    <i class="bi bi-whatsapp"></i> Consultas
                                </a>
                            </div>
                        </div>
                    </div>
                </div>`;
        });
    }).catch(error => {
        console.error("Error Firestore:", error);
        container.innerHTML = `<p class="text-danger text-center">Error al cargar datos.</p>`;
    });
}

// =================================================================
// PANEL ADMINISTRATIVO
// =================================================================

function loadAdminList() {
    const container = document.getElementById('admin-list-container');
    const user = auth.currentUser; 
    if (!user) return;

    const SUPER_ADMIN_UID = "y8YTEQvXQGRNf4HECYHj3CBMyOA2";
    const URL_ASISTENCIA = "https://jrodriguezfe.github.io/asistencia-cttc-senati/";

    const btnNuevoDocente = document.getElementById('btn-nuevo-docente');
    if (btnNuevoDocente) {
        btnNuevoDocente.classList.toggle('d-none', user.uid !== SUPER_ADMIN_UID);
    }

    container.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary"></div></div>';

    let query;
    const isSuperAdmin = user.uid === SUPER_ADMIN_UID;

    if (isSuperAdmin) {
        query = db.collection('docentes').orderBy('NOMBRES', 'asc');
    } else {
        query = db.collection('docentes').where("ownerUID", "==", user.uid);
    }

    query.get().then(snapshot => {
        allDocentes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (snapshot.empty) {
            container.innerHTML = `<div class="alert alert-warning">No hay perfiles vinculados a su cuenta.</div>`;
            return;
        }

        let html = `
            <div class="mb-3">
                <span class="badge ${isSuperAdmin ? 'bg-danger' : 'bg-success'}">
                    Rol: ${isSuperAdmin ? 'Super Administrador' : 'Docente'}
                </span>
            </div>
            <table class="table align-middle">
                <thead class="table-dark">
                    <tr><th>Docente</th><th>Acciones de Gestión</th></tr>
                </thead>
                <tbody>`;
        
        allDocentes.forEach(d => {
            const nombreDocente = `${d.NOMBRES || ''} ${d.APELLIDOS || ''}`;
            
            // Variables de control de botones
            let botonesHtml = "";

            if (isSuperAdmin) {
                // --- VISTA SUPERADMIN ---
                // Acciones: Editar, Borrar y Dashboard Asistencia (vínculo externo admin.html)
                botonesHtml = `
                    <button class="btn btn-sm btn-primary" onclick="editDocente('${d.id}')">
                        <i class="bi bi-pencil-square"></i> Editar Perfil
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteDocente('${d.id}')">
                        <i class="bi bi-trash"></i> Borrar
                    </button>
                    <a href="${URL_ASISTENCIA}admin.html" target="_blank" class="btn btn-sm btn-dark fw-bold">
                        <i class="bi bi-speedometer2"></i> Dashboard Asistencia
                    </a>
                `;
            } else {
                // --- VISTA DOCENTE ---
                // Acciones: Editar, Plan de Sesión (Upload) y Asistencia (Personalizada)
                const urlConDatos = `${URL_ASISTENCIA}?uid=${user.uid}&name=${encodeURIComponent(nombreDocente)}`;
                
                botonesHtml = `
                    <button class="btn btn-sm btn-primary" onclick="editDocente('${d.id}')">
                        <i class="bi bi-pencil-square"></i> Editar Perfil
                    </button>
                    <button class="btn btn-sm btn-info text-white fw-bold" onclick="triggerFileUpload('${d.id}', '${nombreDocente}')">
                        <i class="bi bi-cloud-upload"></i> Plan de Sesión
                    </button>
                    <a href="${urlConDatos}" target="_blank" class="btn btn-sm btn-warning fw-bold">
                        <i class="bi bi-calendar-check"></i> Asistencia
                    </a>
                `;
            }

            html += `<tr>
                <td>
                    <strong>${nombreDocente}</strong><br>
                    <small class="text-muted">${d.ESPECIALIDAD || ''}</small>
                </td>
                <td>
                    <div class="d-flex flex-wrap gap-2">
                        ${botonesHtml}
                    </div>
                </td>
            </tr>`;
        });
        html += `</tbody></table>`;
        container.innerHTML = html;
    });
}
// =================================================================
// GUARDAR DATOS Y SUBIDA A DRIVE
// =================================================================

document.getElementById('docenteForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!auth.currentUser) return alert("Debes estar logueado.");

    const btnSubmit = e.target.querySelector('button[type="submit"]');
    const originalText = btnSubmit.innerText;

    // Captura de datos básicos
    const nombres = document.getElementById('form_nombres').value;
    const apellidos = document.getElementById('form_apellidos').value;
    const nombreCompleto = `${nombres} ${apellidos}`.trim();
    
    // CORRECCIÓN: Usar un ID que sí existe o validar su existencia
    // Nota: 'hidden_file_input' está fuera del formulario en tu HTML
    const fileInput = document.getElementById('form_file'); 

    try {
        btnSubmit.innerText = "Procesando...";
        btnSubmit.disabled = true;

        // 1. Lógica de subida opcional (Solo si el input existe y tiene archivos)
        if (fileInput && fileInput.files && fileInput.files.length > 0) {
            btnSubmit.innerText = "Subiendo a Drive...";
            await uploadFileToDrive(fileInput.files[0], nombreCompleto);
        }

        // 2. Preparación de objeto de datos
        const docenteData = {
            NOMBRES: nombres,
            APELLIDOS: apellidos,
            BIO: document.getElementById('form_bio').value,
            "CFP/UFP/Escuela": document.getElementById('form_escuela').value,
            Celular: document.getElementById('form_celular').value,
            "Correo institucional (@senati.pe)": document.getElementById('form_correo_inst').value,
            "Correo personal": document.getElementById('form_correo_pers').value,
            DNI: document.getElementById('form_dni').value,
            ESPECIALIDAD: document.getElementById('form_especialidad').value,
            "ID-SENATI": document.getElementById('form_id_senati').value,
            NACIMIENTO: document.getElementById('form_nacimiento').value,
            Skills: document.getElementById('form_skills').value,
            fotoURL: document.getElementById('form_foto_url').value,
            ownerUID: document.getElementById('form_owner_uid').value,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };

        // 3. Ejecución del guardado (Async/Await para mayor seguridad)
        if (currentDocenteId) {
            await db.collection('docentes').doc(currentDocenteId).update(docenteData);
        } else {
            await db.collection('docentes').add(docenteData);
        }

        alert("Perfil guardado con éxito.");
        showSection('admin-dashboard');
        if (fileInput) fileInput.value = ""; 

    } catch (error) {
        console.error("Error en el proceso:", error);
        alert("Error al guardar: " + error.message);
    } finally {
        btnSubmit.innerText = originalText;
        btnSubmit.disabled = false;
    }
});

function editDocente(id) {
    const d = allDocentes.find(doc => doc.id === id);
    if (!d) return;
    currentDocenteId = id;
    document.getElementById('form_nombres').value = d.NOMBRES || "";
    document.getElementById('form_apellidos').value = d.APELLIDOS || "";
    document.getElementById('form_bio').value = d.BIO || "";
    document.getElementById('form_escuela').value = d["CFP/UFP/Escuela"] || "";
    document.getElementById('form_celular').value = d.Celular || "";
    document.getElementById('form_correo_inst').value = d["Correo institucional (@senati.pe)"] || "";
    document.getElementById('form_correo_pers').value = d["Correo personal"] || "";
    document.getElementById('form_dni').value = d.DNI || "";
    document.getElementById('form_especialidad').value = d.ESPECIALIDAD || "";
    document.getElementById('form_id_senati').value = d["ID-SENATI"] || "";
    document.getElementById('form_nacimiento').value = d.NACIMIENTO || "";
    document.getElementById('form_skills').value = d.Skills || "";
    document.getElementById('form_foto_url').value = d.fotoURL || "";
    document.getElementById('form_owner_uid').value = d.ownerUID || "";
    document.getElementById('form-title').textContent = `Editando: ${d.NOMBRES} ${d.APELLIDOS}`;
    showSection('admin-form');
}

function deleteDocente(id) {
    if (confirm("¿Está seguro de eliminar este docente de forma permanente?")) {
        db.collection('docentes').doc(id).delete().then(() => loadAdminList());
    }
}

async function uploadFileToDrive(file, docenteName) {
    const reader = new FileReader();
    const GAS_URL = "https://script.google.com/macros/s/AKfycbwV2J8vWJRd8p51jNPcktn8H7wBm75Kwq5NtFlh-Z4nTwWKH7KxPuUY7zIl6CzKtPUA/exec";

    return new Promise((resolve, reject) => {
        reader.onload = function(event) {
            const content = event.target.result.split(',')[1];
            const formData = new URLSearchParams();
            formData.append("fileContent", content);
            formData.append("filename", file.name);
            formData.append("mimeType", file.type);
            formData.append("docenteName", docenteName); 

            fetch(GAS_URL, {
                method: "POST",
                body: formData,
                mode: "no-cors"
            }).then(() => resolve(true)).catch(err => reject(err));
        };
        reader.readAsDataURL(file);
    });
}


// Función para abrir el selector de archivos
function triggerFileUpload(docId, nombreDocente) {
    const fileInput = document.getElementById('hidden_file_input');
    
    // Al cambiar el archivo, se dispara la subida
    fileInput.onchange = async () => {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const originalBtn = document.activeElement; // Captura el botón presionado
            
            try {
                if(originalBtn) {
                    originalBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Subiendo...`;
                    originalBtn.disabled = true;
                }

                // Subir a Drive usando tu función existente
                await uploadFileToDrive(file, nombreDocente);
                
                alert(`¡Éxito! El archivo "${file.name}" se guardó en la carpeta de ${nombreDocente}`);
            } catch (error) {
                alert("Error al subir al Drive: " + error.message);
            } finally {
                if(originalBtn) {
                    originalBtn.innerHTML = `<i class="bi bi-cloud-upload"></i> Subir Documento`;
                    originalBtn.disabled = false;
                }
                fileInput.value = ""; // Limpiar selector
            }
        }
    };
    
    fileInput.click(); // Abre la ventana de selección de archivos
}


document.addEventListener('DOMContentLoaded', () => {
    setupAuthStateListener();
    cargarDirectorio();
});
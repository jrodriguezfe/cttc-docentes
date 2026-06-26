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
            // Solo mostrar si el estado es ACTIVO (o si no tiene estado definido aún)
            if (d.Estado === "DESACTIVO") return;

            const nombreCompleto = `${d.NOMBRES || ''} ${d.APELLIDOS || ''}`;
            const especialidad = d.ESPECIALIDAD || 'Especialista';
            const bio = d.BIO || 'Sin biografía disponible.';
            const foto = d.fotoURL || 'https://placehold.co/400x400?text=Docente';
            
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
                           
                            <p class="text-muted small flex-grow-1">${bio.substring(0, 250)}${bio.length > 200 ? '...' : ''}</p>
                            ${habilidades ? `
                            <div class="mb-3">
                                <small class="fw-bold text-acento">Habilidades técnicas:</small><br>
                                <small class="text-muted" style="font-size: 0.75rem;">${habilidades}</small>
                            </div>` : ''}
                            <hr>
                            <div class="d-grid gap-2">
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

// --- Helpers de Datos ---
const getInstEmail = (d) => d.Correo_Institucional || d["Correo institucional (@senati.pe)"] || "";
const getPersEmail = (d) => d.Correo_Personal || d["Correo personal"] || "";

function loadAdminList() {
    const container = document.getElementById('admin-list-container');
    const user = auth.currentUser; 
    if (!user) return;

    // Array con los UIDs de los superadministradores
    const SUPER_ADMIN_UIDS = ["y8YTEQvXQGRNf4HECYHj3CBMyOA2", "cK2K0hfGt2QlRVCEKLkNpvpfZBr2"];
    const URL_ASISTENCIA = "https://jrodriguezfe.github.io/asistencia-cttc-senati/";

    const btnNuevoDocente = document.getElementById('btn-nuevo-docente');
    if (btnNuevoDocente) {
        btnNuevoDocente.classList.toggle('d-none', !SUPER_ADMIN_UIDS.includes(user.uid));
    }

    const btnCopyEmails = document.getElementById('btn-copy-emails');
    if (btnCopyEmails) {
        btnCopyEmails.classList.toggle('d-none', !SUPER_ADMIN_UIDS.includes(user.uid));
    }

    container.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary"></div></div>';

    let query;
    const isSuperAdmin = SUPER_ADMIN_UIDS.includes(user.uid);

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
            <div class="table-responsive">
            <table class="table align-middle">
                <thead class="table-dark">
                    <tr><th>Docente</th><th>Acciones de Gestión</th></tr>
                </thead>
                <tbody>`;
        
        allDocentes.forEach(d => {
            const nombreDocente = `${d.NOMBRES || ''} ${d.APELLIDOS || ''}`;
            
            const statusBadge = d.Estado === "DESACTIVO" 
                ? '<span class="badge bg-secondary">DESACTIVO</span>' 
                : '<span class="badge bg-success">ACTIVO</span>';
            
            // Variables de control de botones
            let botonesHtml = "";

            if (isSuperAdmin) {
                // --- VISTA SUPERADMIN ---
                // Acciones: Editar, Borrar y Dashboard Asistencia (vínculo externo admin.html)
                botonesHtml = `
                    <button class="btn btn-sm ${d.Estado === 'DESACTIVO' ? 'btn-success' : 'btn-secondary'}" onclick="toggleDocenteStatus('${d.id}', '${d.Estado || 'ACTIVO'}')">
                        <i class="bi ${d.Estado === 'DESACTIVO' ? 'bi-check-circle' : 'bi-slash-circle'}"></i> ${d.Estado === 'DESACTIVO' ? 'Activar' : 'Desactivar'}
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="editDocente('${d.id}')">
                        <i class="bi bi-pencil-square"></i> Editar Perfil
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteDocente('${d.id}')">
                        <i class="bi bi-trash"></i> Borrar
                    </button>
                    <a href="${URL_ASISTENCIA}admin.html" target="_blank" class="btn btn-sm btn-dark fw-bold">
                        <i class="bi bi-speedometer2"></i> Dashboard Asistencia
                    </a>
                    <button class="btn btn-sm btn-acento-principal" onclick="verProgramacion('${d.DNI || ''}')">
                        <i class="bi bi-calendar3"></i> Programación
                    </button>
                `;
            } else {
                // --- VISTA DOCENTE ---
                // Acciones: Editar, Plan de Sesión (Upload) y Asistencia (Personalizada)
                const dniDocente = encodeURIComponent(d.DNI || "");
                const idDocente = encodeURIComponent(d["ID-SENATI"] || "");
                const urlConDatos = `${URL_ASISTENCIA}?uid=${user.uid}&name=${encodeURIComponent(nombreDocente)}&dni=${dniDocente}&id=${idDocente}&rol=Docente`;
                
                botonesHtml = `
                    <button class="btn btn-sm btn-primary" onclick="editDocente('${d.id}')" disabled>
                        <i class="bi bi-pencil-square"></i> Editar Perfil
                    </button>
                    <button class="btn btn-sm btn-info text-white fw-bold" onclick="triggerFileUpload('${d.id}', '${nombreDocente}')">
                        <i class="bi bi-cloud-upload"></i> Plan de Sesión
                    </button>
                    <a href="${urlConDatos}" target="_blank" class="btn btn-sm btn-warning fw-bold">
                        <i class="bi bi-calendar-check"></i> Asistencia
                    </a>
                    <button class="btn btn-sm btn-acento-principal" onclick="verProgramacion('${d.DNI || ''}')">
                        <i class="bi bi-calendar3"></i> Programación
                    </button>
                `;
            }

            html += `<tr>
                <td>
                    <div class="d-flex align-items-center flex-wrap gap-2">
                        <strong>${nombreDocente}</strong> ${statusBadge}
                        <button class="btn btn-outline-secondary btn-sm py-0 px-1" title="Copiar ID" onclick="copyToClipboard('${d["ID-SENATI"] || ''}', 'ID-SENATI')">
                            <i class="bi bi-person-badge"></i> ID
                        </button>
                        <button class="btn btn-outline-secondary btn-sm py-0 px-1" title="Copiar Correos" onclick="copyTeacherEmails('${getInstEmail(d)}', '${getPersEmail(d)}')">
                            <i class="bi bi-envelope-at"></i> Correos
                        </button>
                    </div>
                    <small class="text-muted">${d.ESPECIALIDAD || ''}</small>
                </td>
                <td>
                    <div class="d-grid gap-2 d-xl-flex justify-content-xl-start">
                        ${botonesHtml}
                    </div>
                </td>
            </tr>`;
        });
        html += `</tbody></table></div>`;
        container.innerHTML = html;
    });
}

function toggleDocenteStatus(id, currentStatus) {
    const newStatus = currentStatus === "DESACTIVO" ? "ACTIVO" : "DESACTIVO";
    db.collection('docentes').doc(id).update({ Estado: newStatus })
        .then(() => loadAdminList())
        .catch(err => alert("Error al cambiar estado: " + err.message));
}

function copyToClipboard(text, label) {
    if (!text) return alert(`No hay ${label} registrado.`);
    navigator.clipboard.writeText(text).then(() => {
        alert(`${label} copiado: ${text}`);
    });
}

function copyTeacherEmails(inst, pers) {
    const emails = [inst, pers].filter(e => e && e.trim() !== "").join('; ');
    if (!emails) return alert("No hay correos registrados para este docente.");
    navigator.clipboard.writeText(emails).then(() => {
        alert("Correos copiados: " + emails);
    });
}

function copyAllEmails() {
    if (!allDocentes || allDocentes.length === 0) {
        alert("No hay datos de docentes disponibles para copiar.");
        return;
    }

    const emailSet = new Set();
    allDocentes.forEach(d => {
        const inst = getInstEmail(d);
        const pers = getPersEmail(d);
        if (inst && inst.trim()) emailSet.add(inst.trim().toLowerCase());
        if (pers && pers.trim()) emailSet.add(pers.trim().toLowerCase());
    });

    const emailList = Array.from(emailSet).join('; ');

    if (emailList.length === 0) {
        alert("No se encontraron correos electrónicos.");
        return;
    }

    navigator.clipboard.writeText(emailList).then(() => {
        alert(`¡Éxito! Se han copiado ${emailSet.size} correos únicos al portapapeles.`);
    }).catch(err => {
        console.error("Error al copiar:", err);
        alert("No se pudo copiar al portapapeles.");
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
    
    // Usar el input de archivo correcto
    const fileInput = document.getElementById('hidden_file_input'); 

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
            // CAMBIO AQUÍ: Cambiamos "/" por "_" para cumplir con las reglas de Firebase
            CFP_UFP_Escuela: document.getElementById('form_escuela').value, 
            Celular: document.getElementById('form_celular').value,
            Correo_Institucional: document.getElementById('form_correo_inst').value,
            Correo_Personal: document.getElementById('form_correo_pers').value,
            DNI: document.getElementById('form_dni').value,
            ESPECIALIDAD: document.getElementById('form_especialidad').value,
            "ID-SENATI": document.getElementById('form_id_senati').value,
            NACIMIENTO: document.getElementById('form_nacimiento').value,
            Skills: document.getElementById('form_skills').value,
            Estado: document.getElementById('form_estado').value,
            fotoURL: document.getElementById('form_foto_url').value,
            ownerUID: document.getElementById('form_owner_uid').value || auth.currentUser.uid,
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
    document.getElementById('form_escuela').value = d["CFP_UFP_Escuela"] || "";
    document.getElementById('form_celular').value = d.Celular || "";
    document.getElementById('form_correo_inst').value = getInstEmail(d);
    document.getElementById('form_correo_pers').value = getPersEmail(d);
    document.getElementById('form_dni').value = d.DNI || "";
    document.getElementById('form_especialidad').value = d.ESPECIALIDAD || "";
    document.getElementById('form_id_senati').value = d["ID-SENATI"] || "";
    document.getElementById('form_estado').value = d.Estado || "ACTIVO";

    // Convertir formato DD-MM-YYYY a YYYY-MM-DD para compatibilidad con input type="date"
    let fechaNac = d.NACIMIENTO || "";
    if (/^\d{2}-\d{2}-\d{4}$/.test(fechaNac)) {
        const [day, month, year] = fechaNac.split('-');
        fechaNac = `${year}-${month}-${day}`;
    }
    document.getElementById('form_nacimiento').value = fechaNac;

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



// =================================================================
// PROGRAMACIÓN DOCENTE
// =================================================================

function parseDateStr(dateStr) {
    if (!dateStr) return null;
    if (dateStr.toDate) return dateStr.toDate(); // Si es Timestamp de Firestore
    if (typeof dateStr === 'string') {
        const parts = dateStr.trim().split(/[-/]/);
        if (parts.length === 3) {
            if (parts[0].length === 4) {
                return new Date(`${parts[0]}-${parts[1]}-${parts[2]}T00:00:00`);
            } else {
                return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
            }
        }
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
}

async function verProgramacion(dni) {
    if (!dni) {
        alert("DNI no disponible para este docente.");
        return;
    }

    // Limpiamos los espacios en blanco al inicio y al final por precaución
    const cleanDni = String(dni).trim();

    const modalElement = document.getElementById('modalProgramacion');
    if (!modalElement) return;
    
    let modal = bootstrap.Modal.getInstance(modalElement);
    if (!modal) modal = new bootstrap.Modal(modalElement);
    
    const container = document.getElementById('programacion-container');
    
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-3 fw-bold text-muted">Buscando programación...</p></div>';
    modal.show();

    try {
        // 1. Buscar en la colección 'docentes' de la nueva BD por DNI
        const docentesRef = progDb.collection('docentes');
        let docentesSnapshot = await docentesRef.where('DNI', '==', cleanDni).get();
        
        if (docentesSnapshot.empty && !isNaN(cleanDni)) {
            // Intento alternativo en caso de que el DNI esté guardado como número
            docentesSnapshot = await docentesRef.where('DNI', '==', Number(cleanDni)).get();
        }
        
        // Intento alternativo en caso de que la columna se llame 'dni' (minúsculas)
        if (docentesSnapshot.empty) {
            docentesSnapshot = await docentesRef.where('dni', '==', cleanDni).get();
        }
        if (docentesSnapshot.empty && !isNaN(cleanDni)) {
            docentesSnapshot = await docentesRef.where('dni', '==', Number(cleanDni)).get();
        }

        if (docentesSnapshot.empty) {
            container.innerHTML = `<div class="alert alert-warning text-center m-3"><i class="bi bi-exclamation-triangle-fill fs-4 d-block mb-2"></i>No se encontró al docente con DNI <strong>${cleanDni}</strong> en la base de datos de programación. Verifique que el DNI coincida en ambas bases de datos.</div>`;
            return;
        }

        const docenteDoc = docentesSnapshot.docs[0].data();

        // Identificar el nombre del docente según los campos disponibles en la BD de programación
        let nombreDocente = "";
        if (docenteDoc.NOMBRES && docenteDoc.APELLIDOS) {
            nombreDocente = `${docenteDoc.NOMBRES} ${docenteDoc.APELLIDOS}`;
        } else if (docenteDoc.Nombres && docenteDoc.Apellidos) {
            nombreDocente = `${docenteDoc.Nombres} ${docenteDoc.Apellidos}`;
        } else if (docenteDoc.nombres && docenteDoc.apellidos) {
            nombreDocente = `${docenteDoc.nombres} ${docenteDoc.apellidos}`;
        } else {
            nombreDocente = docenteDoc.Nombre || docenteDoc.nombre || docenteDoc.Docente || docenteDoc.docente || docenteDoc.NOMBRES || docenteDoc.Nombres || docenteDoc.nombres || docenteDoc['Nombre Completo'] || docenteDoc['NOMBRES Y APELLIDOS'] || "";
        }
        
        nombreDocente = String(nombreDocente).trim();

        if (!nombreDocente) {
            console.error("Documento encontrado pero sin campo de nombre reconocido:", docenteDoc);
            const campos = Object.keys(docenteDoc).join(', ');
            container.innerHTML = `<div class="alert alert-warning text-center m-3"><i class="bi bi-exclamation-triangle-fill fs-4 d-block mb-2"></i>El registro con DNI <strong>${cleanDni}</strong> se encontró, pero no tiene un campo de nombre reconocido.<br><br><small class="d-block mt-2 text-muted"><strong>Campos disponibles en la BD:</strong> ${campos}</small></div>`;
            return;
        }

        // 2. Buscar en la colección 'programaciones' usando el nombre
        const progRef = progDb.collection('programaciones');
        const progSnapshot = await progRef.where('Docente', '==', nombreDocente).get();

        if (progSnapshot.empty) {
            container.innerHTML = `<div class="alert alert-info text-center m-3"><i class="bi bi-calendar-x fs-4 d-block mb-2"></i>No hay programación registrada para <strong>${nombreDocente}</strong>.</div>`;
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const limitDate = new Date(today);
        limitDate.setDate(today.getDate() + 30);

        let programacionesArray = [];

        progSnapshot.forEach(doc => {
            const p = doc.data();
            
            // Capturamos los campos y asignamos fallbacks por si las columnas varían en mayúsculas/minúsculas
            const nrc = p.NRC || p.nrc || 'N/A';
            const modulo = p['MODULO-CURSO'] || p.Modulo || p.Curso || p.curso || 'No especificado';
            const fFin = p['Fecha de fin'] || p.FechaFin || p.fecha_fin || 'N/A';
            const fInicio = p['Fecha de inicio'] || p.FechaInicio || p.fecha_inicio || 'N/A';
            const duracion = p.Duracion || p.duracion || 'N/A';
            const horario = p.horario || p.Horario || 'N/A';

            const fechaInicioDate = parseDateStr(fInicio);
            const fechaFinDate = parseDateStr(fFin);

            // Filtro: Cursos próximos a iniciar (desde la fecha de hoy hasta 30 días adelante)
            let mostrar = false;
            if (fechaInicioDate) {
                if (fechaInicioDate >= today && fechaInicioDate <= limitDate) {
                    mostrar = true;
                }
            } else {
                mostrar = true; // Mostrar por defecto si el formato de fecha no es reconocible
            }

            if (!mostrar) return;

            // Guardamos cada programación válida en un array para poder ordenarla después
            programacionesArray.push({
                modulo, nrc, fInicio, fFin, duracion, horario, fechaInicioDate
            });
        });

        // Ordenamos el array: desde la fecha de inicio más cercana a la más lejana
        programacionesArray.sort((a, b) => {
            if (!a.fechaInicioDate && !b.fechaInicioDate) return 0;
            if (!a.fechaInicioDate) return 1; // Si no hay fecha, lo mandamos al final
            if (!b.fechaInicioDate) return -1;
            return a.fechaInicioDate - b.fechaInicioDate; 
        });

        let programacionesHtml = '';
        programacionesArray.forEach(item => {
            programacionesHtml += `
                <div class="card mb-3 border-0 shadow-sm">
                    <div class="card-body border-start border-4 border-success rounded bg-white">
                        <h5 class="fw-bold text-dark mb-1">${item.modulo}</h5>
                        <div class="mb-3"><span class="badge bg-secondary">NRC: ${item.nrc}</span></div>
                        <div class="row text-muted small">
                            <div class="col-sm-6 mb-2">
                                <i class="bi bi-calendar-check text-success"></i> <strong class="text-dark">Inicio:</strong> ${item.fInicio}
                            </div>
                            <div class="col-sm-6 mb-2">
                                <i class="bi bi-calendar-x text-danger"></i> <strong class="text-dark">Fin:</strong> ${item.fFin}
                            </div>
                            <div class="col-sm-6 mb-2">
                                <i class="bi bi-clock-history text-warning"></i> <strong class="text-dark">Duración:</strong> ${item.duracion}
                            </div>
                            <div class="col-sm-6 mb-2">
                                <i class="bi bi-alarm text-info"></i> <strong class="text-dark">Horario:</strong> ${item.horario}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        if (programacionesArray.length === 0) {
            container.innerHTML = `<div class="alert alert-info text-center m-3"><i class="bi bi-calendar-check fs-4 d-block mb-2"></i><strong>${nombreDocente}</strong> no tiene programación dentro de los próximos 30 días.</div>`;
        } else {
            container.innerHTML = `
                <div class="mb-4 text-center">
                    <h5 class="text-acento fw-bold mb-0">${nombreDocente}</h5>
                    <small class="text-muted text-uppercase fw-bold">Próximos 30 días</small>
                </div>
                ${programacionesHtml}
            `;
        }

    } catch (error) {
        console.error("Error al obtener programación:", error);
        container.innerHTML = `<div class="alert alert-danger text-center m-3"><i class="bi bi-x-circle-fill fs-4 d-block mb-2"></i>Error al consultar la programación: ${error.message}</div>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupAuthStateListener();
    cargarDirectorio();

    // Solución para advertencia de aria-hidden en el Modal de Programación
    const modalElement = document.getElementById('modalProgramacion');
    if (modalElement) {
        modalElement.addEventListener('hide.bs.modal', function () {
            if (document.activeElement && modalElement.contains(document.activeElement)) {
                document.activeElement.blur();
            }
        });
    }
});
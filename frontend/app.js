// ── Configuración de la API ───────────────────────────────────────────────────
// Este es el ÚNICO lugar donde debes cambiar la URL al desplegar.
// Detecta automáticamente si estamos en desarrollo local o en producción.
const API_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3000"                     // Desarrollo local
  : "https://mutzu.onrender.com";               // URL del backend en Render

// ── Estado de la aplicación ───────────────────────────────────────────────────
let allTasks = [];        // Lista completa de tareas traída de la API
let currentFilter = "all"; // Filtro activo en la UI
let editingTaskId = null;  // ID de la tarea que se está editando en el modal

// ── Referencias al DOM ────────────────────────────────────────────────────────
const taskList        = document.getElementById("task-list");
const emptyState      = document.getElementById("empty-state");
const loadingState    = document.getElementById("loading-state");
const statsEl         = document.getElementById("stats");
const connectionBadge = document.getElementById("connection-badge");

const taskForm        = document.getElementById("task-form");
const titleInput      = document.getElementById("title");
const descInput       = document.getElementById("description");
const prioritySelect  = document.getElementById("priority");
const statusSelect    = document.getElementById("status-select");
const submitBtn       = document.getElementById("submit-btn");
const cancelBtn       = document.getElementById("cancel-btn");

const modalOverlay    = document.getElementById("modal-overlay");
const editForm        = document.getElementById("edit-form");
const editId          = document.getElementById("edit-id");
const editTitle       = document.getElementById("edit-title");
const editDesc        = document.getElementById("edit-description");
const editPriority    = document.getElementById("edit-priority");
const editStatus      = document.getElementById("edit-status");
const modalCancel     = document.getElementById("modal-cancel");

// ── Capa de acceso a la API ───────────────────────────────────────────────────
// Función centralizada para todas las llamadas HTTP.
// Agrega los headers necesarios y lanza un error si el servidor responde con fallo.

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "La solicitud falló");
  return data;
}

// ── Operaciones de datos ──────────────────────────────────────────────────────

async function cargarTareas() {
  loadingState.hidden = false;
  emptyState.hidden   = true;
  taskList.innerHTML  = "";
  try {
    const { data } = await apiFetch("/api/tasks");
    allTasks = data;
    setEstadoConexion(true);
    renderizarTareas();
  } catch (err) {
    setEstadoConexion(false);
    mostrarToast("No se pudo conectar con la API: " + err.message, "error");
    loadingState.hidden = true;
  }
}

async function crearTarea(payload) {
  const { data } = await apiFetch("/api/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  allTasks.unshift(data); // Agrega la nueva tarea al inicio de la lista
  renderizarTareas();
  mostrarToast("¡Tarea creada!", "success");
}

async function actualizarTarea(id, payload) {
  const { data } = await apiFetch(`/api/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  // Reemplaza la tarea vieja por la actualizada en el estado local
  allTasks = allTasks.map(t => (t.id === id ? data : t));
  renderizarTareas();
  mostrarToast("¡Tarea actualizada!", "success");
}

async function eliminarTarea(id) {
  await apiFetch(`/api/tasks/${id}`, { method: "DELETE" });
  allTasks = allTasks.filter(t => t.id !== id); // Elimina del estado local sin recargar
  renderizarTareas();
  mostrarToast("Tarea eliminada.", "info");
}

// ── Renderizado ───────────────────────────────────────────────────────────────

function renderizarTareas() {
  loadingState.hidden = true;

  // Aplica el filtro activo sobre la lista completa
  const visibles = currentFilter === "all"
    ? allTasks
    : allTasks.filter(t => t.status === currentFilter);

  actualizarEstadisticas();

  if (visibles.length === 0) {
    taskList.innerHTML = "";
    emptyState.hidden  = false;
    return;
  }

  emptyState.hidden  = true;
  taskList.innerHTML = visibles.map(tarjetaTarea).join("");

  // Asignamos los listeners DESPUÉS de insertar el HTML.
  // No pueden asignarse antes porque los elementos no existen en el DOM todavía.
  taskList.querySelectorAll(".btn-edit").forEach(btn => {
    btn.addEventListener("click", () => abrirModalEditar(Number(btn.dataset.id)));
  });
  taskList.querySelectorAll(".btn-delete").forEach(btn => {
    btn.addEventListener("click", () => confirmarEliminacion(Number(btn.dataset.id)));
  });
}

function tarjetaTarea(task) {
  const fecha = new Date(task.created_at).toLocaleDateString("es-AR", {
    day: "numeric", month: "short", year: "numeric",
  });
  return `
    <article class="task-card" data-priority="${task.priority}" data-status="${task.status}">
      <div class="task-header">
        <h3 class="task-title">${escaparHtml(task.title)}</h3>
      </div>
      ${task.description ? `<p class="task-description">${escaparHtml(task.description)}</p>` : ""}
      <div class="task-meta">
        <span class="tag tag--${task.status}">${formatearEstado(task.status)}</span>
        <span class="tag tag--${task.priority}">${formatearPrioridad(task.priority)}</span>
      </div>
      <p class="task-date">Creada el ${fecha}</p>
      <div class="task-actions">
        <button class="btn btn--ghost btn-edit"    data-id="${task.id}">Editar</button>
        <button class="btn btn--danger btn-delete" data-id="${task.id}">Eliminar</button>
      </div>
    </article>`;
}

function actualizarEstadisticas() {
  const total      = allTasks.length;
  const completadas = allTasks.filter(t => t.status === "completed").length;
  const pendientes  = allTasks.filter(t => t.status === "pending").length;
  statsEl.textContent = `${total} tareas · ${completadas} completadas · ${pendientes} pendientes`;
}

// ── Manejadores de eventos ────────────────────────────────────────────────────

// Formulario de creación
taskForm.addEventListener("submit", async e => {
  e.preventDefault();
  submitBtn.disabled = true; // Evita envíos dobles mientras espera la respuesta
  try {
    await crearTarea({
      title:       titleInput.value,
      description: descInput.value,
      priority:    prioritySelect.value,
      status:      statusSelect.value,
    });
    taskForm.reset();
  } catch (err) {
    mostrarToast(err.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
});

// Botones de filtro
document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderizarTareas();
  });
});

// ── Modal de edición ──────────────────────────────────────────────────────────

function abrirModalEditar(id) {
  const task = allTasks.find(t => t.id === id);
  if (!task) return;
  editingTaskId       = id;
  editId.value        = id;
  editTitle.value     = task.title;
  editDesc.value      = task.description || "";
  editPriority.value  = task.priority;
  editStatus.value    = task.status;
  modalOverlay.hidden = false;
}

// Cierra el modal al presionar Cancelar o al hacer clic fuera del cuadro
modalCancel.addEventListener("click", () => { modalOverlay.hidden = true; });
modalOverlay.addEventListener("click", e => {
  if (e.target === modalOverlay) modalOverlay.hidden = true;
});

// Formulario de edición
editForm.addEventListener("submit", async e => {
  e.preventDefault();
  try {
    await actualizarTarea(editingTaskId, {
      title:       editTitle.value,
      description: editDesc.value,
      priority:    editPriority.value,
      status:      editStatus.value,
    });
    modalOverlay.hidden = true;
  } catch (err) {
    mostrarToast(err.message, "error");
  }
});

async function confirmarEliminacion(id) {
  const task = allTasks.find(t => t.id === id);
  if (!task) return;
  if (!confirm(`¿Eliminar la tarea "${task.title}"?`)) return;
  try {
    await eliminarTarea(id);
  } catch (err) {
    mostrarToast(err.message, "error");
  }
}

// ── Utilidades ────────────────────────────────────────────────────────────────

function setEstadoConexion(online) {
  connectionBadge.textContent = online ? "En línea" : "Sin conexión";
  connectionBadge.className   = `badge badge--${online ? "online" : "offline"}`;
}

function mostrarToast(mensaje, tipo = "info") {
  const toast = document.createElement("div");
  toast.className   = `toast toast--${tipo}`;
  toast.textContent = mensaje;
  document.getElementById("toast-container").appendChild(toast);
  setTimeout(() => toast.remove(), 3500); // Se elimina solo después de 3.5 segundos
}

function formatearEstado(s) {
  return { pending: "Pendiente", in_progress: "En progreso", completed: "Completada" }[s] ?? s;
}

function formatearPrioridad(p) {
  return { low: "Baja", medium: "Media", high: "Alta" }[p] ?? p;
}

// Previene XSS al insertar contenido del usuario en innerHTML.
// Sin esto, un título como <script>alert(1)</script> ejecutaría código arbitrario.
function escaparHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Inicio ────────────────────────────────────────────────────────────────────
cargarTareas();

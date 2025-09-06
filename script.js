// Configuración
const GITHUB_USERNAME = 'Francobelbruno';
const GITHUB_API_URL = `https://api.github.com/users/${GITHUB_USERNAME}/repos`;

// Variables globales
let allProjects = [];

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeScrollAnimations();
    loadGitHubProjects();
    initializeProjectFilters();
    initializeContactForm();
});

// Navegación
function initializeNavigation() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Toggle del menú móvil
    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Cerrar menú al hacer click en un enlace
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });

    // Scroll suave para enlaces internos
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = targetSection.offsetTop - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Cambiar estilo del header al hacer scroll
    window.addEventListener('scroll', () => {
        const header = document.querySelector('.header');
        if (window.scrollY > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

// Animaciones de scroll
function initializeScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-on-scroll');
            }
        });
    }, observerOptions);

    // Observar elementos para animación
    const elementsToAnimate = document.querySelectorAll(
        '.hero-text, .hero-image, .about-text, .highlight-item, .skill-category, .contact-item, .contact-form'
    );

    elementsToAnimate.forEach((el, index) => {
        el.style.animationDelay = `${index * 0.1}s`;
        observer.observe(el);
    });
}

// Cargar proyectos desde GitHub
async function loadGitHubProjects() {
    const projectsContainer = document.getElementById('projects-container');
    
    try {
        const response = await fetch(GITHUB_API_URL);
        if (!response.ok) {
            // Try to parse JSON error if present
            let errorText = response.statusText;
            try { const errJson = await response.json(); if (errJson && errJson.message) errorText = errJson.message; } catch(e){}
            throw new Error(`${response.status} ${errorText}`);
        }
        const repos = await response.json();
        
        // Keep only non-null array
        const allRepos = Array.isArray(repos) ? repos : [];
        
        // First preference: non-fork repos with a description (to keep quality)
        let relevantRepos = allRepos.filter(repo => !repo.fork && repo.description && repo.description.trim() !== '' && !repo.name.toLowerCase().includes('readme'));

        // If no repos matched, relax: include non-forks even without description
        if (relevantRepos.length === 0) {
            relevantRepos = allRepos.filter(repo => !repo.fork && !repo.name.toLowerCase().includes('readme'));
        }

        // If still empty, include forks as last resort (user may host forks)
        if (relevantRepos.length === 0) {
            relevantRepos = allRepos.filter(repo => !repo.name.toLowerCase().includes('readme'));
        }

        // If repository list is still empty, leave projects empty and show message later (displayProjects handles empty)
        
        // Ordenar por fecha de actualización
        relevantRepos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

        allProjects = relevantRepos.map(repo => ({
            id: repo.id,
            name: repo.name,
            description: repo.description || 'Sin descripcion disponible',
            language: repo.language,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            url: repo.html_url,
            homepage: repo.homepage,
            topics: repo.topics || [],
            updated: repo.updated_at
        }));
        
        displayProjects(allProjects);
        
    } catch (error) {
        console.error('Error al cargar proyectos:', error);
        // Detect rate limit messages and show a clearer hint to the user
        const isRateLimit = /rate limit|API rate limit/i.test(error.message || '');
        projectsContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${isRateLimit ? 'Se alcanzó el límite de la API de GitHub (sin autenticación). Intenta de nuevo más tarde o autenticarte.' : 'Error al cargar los proyectos. Por favor, intenta más tarde.'}</p>
                <a href="https://github.com/${GITHUB_USERNAME}" target="_blank" class="btn btn-primary">
                    Ver GitHub directamente
                </a>
            </div>
        `;
    }
}

// Mostrar proyectos
function displayProjects(projects) {
    const projectsContainer = document.getElementById('projects-container');
    
    if (projects.length === 0) {
        projectsContainer.innerHTML = `
            <div class="no-projects">
                <i class="fas fa-folder-open"></i>
                <p>No se encontraron proyectos para mostrar.</p>
            </div>
        `;
        return;
    }

    projectsContainer.innerHTML = projects.map(project => `
        <div class="project-card" data-category="${getProjectCategory(project)}">
            <div class="project-header">
                <h3 class="project-title">${formatProjectName(project.name)}</h3>
                <p class="project-description">${project.description}</p>
                <div class="project-tags">
                    ${project.language ? `<span class="project-tag">${project.language}</span>` : ''}
                    ${project.topics.map(topic => `<span class="project-tag">${topic}</span>`).join('')}
                </div>
            </div>
            <div class="project-footer">
                <div class="project-links">
                    <a href="${project.url}" target="_blank" class="project-link">
                        <i class="fab fa-github"></i>
                        Código
                    </a>
                    ${(() => {
                        // Determine demo URL: prefer homepage, otherwise infer GitHub Pages
                        const homepage = project.homepage && project.homepage.trim() !== '' ? project.homepage : null;
                        if (homepage) {
                            return `
                                <a href="${homepage}" target="_blank" class="project-link">
                                    <i class="fas fa-external-link-alt"></i>
                                    Demo
                                </a>
                            `;
                        }

                        // Infer pages URL: https://<GITHUB_USERNAME>.github.io/<repo-name>/
                        const repoName = project.name;
                        if (repoName) {
                            const inferred = `https://${GITHUB_USERNAME}.github.io/${encodeURIComponent(repoName)}/`;
                            return `
                                <a href="${inferred}" target="_blank" class="project-link">
                                    <i class="fas fa-external-link-alt"></i>
                                    Demo
                                </a>
                            `;
                        }

                        return '';
                    })()}
                </div>
                <div class="project-stats">
                    <span><i class="fas fa-star"></i> ${project.stars}</span>
                    <span><i class="fas fa-code-branch"></i> ${project.forks}</span>
                </div>
            </div>
        </div>
    `).join('');

    // Animar las tarjetas
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('animate-on-scroll');
    });
}

// Obtener categoría del proyecto
function getProjectCategory(project) {
    const language = project.language?.toLowerCase() || '';
    const topics = project.topics.join(' ').toLowerCase();
    const name = project.name.toLowerCase();
    const description = project.description.toLowerCase();
    
    const content = `${language} ${topics} ${name} ${description}`;
    
    if (content.includes('react') || content.includes('frontend')) return 'react';
    if (content.includes('java') || content.includes('spring')) return 'java';
    if (content.includes('python')) return 'python';
    if (content.includes('fullstack') || content.includes('full-stack') || 
        (content.includes('backend') && content.includes('frontend'))) return 'fullstack';
    
    return 'other';
}

// Formatear nombre del proyecto
function formatProjectName(name) {
    return name
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

// Filtros de proyectos
function initializeProjectFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    // Make 'Todos' active by default
    const defaultBtn = document.querySelector('.filter-btn[data-filter="all"]');
    if (defaultBtn) defaultBtn.classList.add('active');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Actualizar botón activo
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Filtrar proyectos
            const filter = button.getAttribute('data-filter');
            filterProjects(filter);
        });
    });
}

// Filtrar proyectos
function filterProjects(category) {
    const projectCards = document.querySelectorAll('.project-card');
    const filter = (category || 'all').toString().toLowerCase();
    projectCards.forEach(card => {
        const cardCategory = (card.getAttribute('data-category') || 'other').toString().toLowerCase();
        if (filter === 'all' || cardCategory === filter) {
            card.classList.remove('hidden');
        } else {
            card.classList.add('hidden');
        }
    });
}

// Formulario de contacto
function initializeContactForm() {
    const contactForm = document.getElementById('contact-form');
    
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = new FormData(contactForm);
        const name = formData.get('name');
        const email = formData.get('email');
        const message = formData.get('message');
        
        // Crear enlace mailto
        const subject = encodeURIComponent(`Contacto desde portafolio - ${name}`);
        const body = encodeURIComponent(`
Nombre: ${name}
Email: ${email}

Mensaje:
${message}
        `);
        
        const mailtoLink = `mailto:francobelbruno1@gmail.com?subject=${subject}&body=${body}`;
        window.location.href = mailtoLink;
        
        // Mostrar mensaje de confirmación
        showNotification('¡Gracias por tu mensaje! Se abrirá tu cliente de email.', 'success');
        
        // Limpiar formulario
        contactForm.reset();
    });
}

// Mostrar notificaciones
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Estilos para la notificación
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? 'var(--success-color)' : 'var(--primary-color)'};
        color: white;
        padding: var(--spacing-md) var(--spacing-lg);
        border-radius: var(--border-radius-md);
        box-shadow: var(--shadow-lg);
        z-index: 1001;
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        transform: translateX(100%);
        transition: var(--transition-normal);
    `;
    
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remover después de 5 segundos
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);
}

// Utilidades
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Scroll suave para navegación
function smoothScrollTo(target) {
    const element = document.querySelector(target);
    if (element) {
        const headerHeight = document.querySelector('.header').offsetHeight;
        const targetPosition = element.offsetTop - headerHeight;
        
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    }
}
// Import the mock data
import { portfolioData } from './data.js';

// Initializes the entire website once the page is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    renderContentByPage();
    setupSmoothScroll();
    
    // Initialize Lucide icons after all content has been rendered
    lucide.createIcons();
});

// Renders the correct content based on the page's body ID
function renderContentByPage() {
    const pageId = document.body.id;

    switch(pageId) {
        case 'home':
        case 'about':
        case 'contact':
        case 'myelin-hub': // Add this line so your router acknowledges it smoothly!
            break;
        case 'skills':
            renderSkills();
            break;
        case 'research':
            renderResearch();
            setupFilters();
            break;
        case 'publications':
            renderPublications();
            break;
        default:
            console.error("Unknown page ID:", pageId);
            break;
    }
}

// Renders the skills section on the skills page
function renderSkills() {
    const skillsGrid = document.querySelector('.skills-grid');
    if (!skillsGrid) return;

    skillsGrid.innerHTML = portfolioData.skills.map(category => `
        <div class="skill-category">
            <h3>${category.category}</h3>
            <div class="tech-tags">
                ${category.items.map(item => `
                    <span class="tech-tag">${item}</span>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// Renders the publications section on the publications page
function renderPublications() {
    const publicationsContainer = document.querySelector('.publications-grid');
    if (!publicationsContainer) return;
    
    publicationsContainer.innerHTML = portfolioData.publications.map(pub => `
        <div class="publication-card">
            <h3>${pub.title}</h3>
            <p class="journal">${pub.journal} (${pub.year})</p>
            <p class="abstract">${pub.abstract}</p>
            <div class="pub-tags">
                ${pub.tags.map(tag => `<span class="tech-tag">${tag}</span>`).join('')}
            </div>
            <a href="${pub.url}" class="btn-primary">
                <i data-lucide="book-open"></i>
                Read Full Publication
            </a>
        </div>
    `).join('');
}

// Renders the project cards on the research page
function renderResearch(filter = 'all') {
    const grid = document.querySelector('.projects-grid');
    if (!grid) return;
    
    const filteredProjects = filter === 'all'
        ? portfolioData.projects
        : portfolioData.projects.filter(project => project.status.toLowerCase().replace(/\s/g, '-') === filter);

    grid.innerHTML = filteredProjects.map(project => `
        <div class="project-card" data-status="${project.status.toLowerCase().replace(/\s/g, '-')}">
            <div class="status-badge ${getStatusClass(project.status)}">
                <i data-lucide="${getStatusIcon(project.status)}"></i>
                ${project.status}
            </div>
            <h3>${project.title}</h3>
            <p>${project.description}</p>
            <div class="tech-tags">
                ${project.technologies.map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
            </div>
            ${project.link && project.link.endsWith('.html') ? `
                <a href="${project.link}" class="btn-primary">
                    View Technical Report
                </a>` : `
                <a href="project-detail.html?id=${project.id}" class="btn-primary">
                    View Details
                </a>`
            }
        </div>
    `).join('');
    
    lucide.createIcons();
}

// Handles loading content for the generic project detail page (project-detail.html)
function renderProjectDetail() {
    // 1. Get the project ID from the URL (e.g., ?id=4)
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = parseInt(urlParams.get('id'));

    // 2. Find the project in the data
    const project = portfolioData.projects.find(p => p.id === projectId);
    const contentArea = document.getElementById('project-detail-content');

    if (!project) {
        contentArea.innerHTML = '<h2>Project Not Found</h2><p>The project you are looking for does not exist.</p>';
        return;
    }

    // 3. Generate detailed HTML content
    contentArea.innerHTML = `
        <a href="research.html" class="btn-secondary">&leftarrow; Back to Research</a>
        
        <div class="project-detail-header">
            <h1 class="main-title">${project.title}</h1>
            <div class="status-badge ${getStatusClass(project.status)}">
                <i data-lucide="${getStatusIcon(project.status)}"></i>
                ${project.status}
            </div>
        </div>

        <p class="detail-description">${project.description}</p>
        
        <div class="detail-section">
            <h3>Technologies Used:</h3>
            <div class="tech-tags">
                ${project.technologies.map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
            </div>
        </div>

        ${project.link && project.link !== '#' && !project.link.endsWith('.html') ? `
            <div class="detail-section">
                <a href="${project.link}" target="_blank" class="btn-primary">
                    <i data-lucide="external-link"></i>
                    View External Link
                </a>
            </div>` : ''}
        
        <div class="detail-section">
            <h3>Extended Project Summary:</h3>
            <p>This space is ready for the full methodology, detailed results, and future scope of the **${project.title}** project. You can add this content directly to the project's entry in the **data.js** file later.</p>
        </div>
    `;
    
    // Update the page title for better UX
    document.title = project.title + ' - Dharshan Keba';
}


// Sets up the filter buttons for the projects
function setupFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    if (!filterBtns) return;
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const filter = this.dataset.filter;
            renderResearch(filter);
        });
    });
}


// Enables smooth scrolling for navigation links
function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// Helper functions for status classes and icons
function getStatusClass(status) {
    const statusMap = {
        'Published Research': 'status-published',
        'In Progress': 'status-progress',
        'In Planning': 'status-planning'
    };
    return statusMap[status] || 'status-published';
}

function getStatusIcon(status) {
    const iconMap = {
        'Published Research': 'check-circle',
        'In Progress': 'settings',
        'In Planning': 'file-plus'
    };
    return iconMap[status] || 'file';
}
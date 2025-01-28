// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Add active class to navigation links on scroll
window.addEventListener('scroll', () => {
    let current = '';
    const sections = document.querySelectorAll('section');
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (window.scrollY >= sectionTop - sectionHeight / 3) {
            current = section.getAttribute('id');
        }
    });

    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').slice(1) === current) {
            link.classList.add('active');
        }
    });
});

// Scroll animation
function handleScrollAnimation() {
    const elements = document.querySelectorAll('.section');
    
    elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementBottom = element.getBoundingClientRect().bottom;
        
        if (elementTop < window.innerHeight - 100 && elementBottom > 0) {
            element.classList.add('visible');
        }
    });
}

// Initial check for elements in view
handleScrollAnimation();

// Add scroll event listener
window.addEventListener('scroll', handleScrollAnimation);

// Add smooth reveal for project cards
const projectCards = document.querySelectorAll('.project-card');
projectCards.forEach((card, index) => {
    card.style.animationDelay = `${index * 0.2}s`;
});

// Add hover effect for timeline items
const timelineItems = document.querySelectorAll('.timeline-item');
timelineItems.forEach(item => {
    item.addEventListener('mouseenter', () => {
        item.style.transform = 'scale(1.02)';
        item.style.transition = 'transform 0.3s ease';
    });
    
    item.addEventListener('mouseleave', () => {
        item.style.transform = 'scale(1)';
    });
});

// Add this new code for the typing animation
const typedTextSpan = document.querySelector(".typed-text");
const cursor = document.querySelector(".cursor");

const words = [
    "An Undergraduate Student",
    "An Aspiring Software Engineer",
    "An Aspiring Front-end Designer",
    "An iDTech SDE Instructor",
    "A Former GDSC Lead",
    "A Musician",
    "A Designer",
    "A Photographer"
];

const typingDelay = 100;
const erasingDelay = 50;
const newWordDelay = 2000;
let wordIndex = 0;
let charIndex = 0;

function type() {
    if (charIndex < words[wordIndex].length) {
        if(!cursor.classList.contains("typing")) cursor.classList.add("typing");
        typedTextSpan.textContent += words[wordIndex].charAt(charIndex);
        charIndex++;
        setTimeout(type, typingDelay);
    } else {
        cursor.classList.remove("typing");
        setTimeout(erase, newWordDelay);
    }
}

function erase() {
    if (charIndex > 0) {
        if(!cursor.classList.contains("typing")) cursor.classList.add("typing");
        typedTextSpan.textContent = words[wordIndex].substring(0, charIndex-1);
        charIndex--;
        setTimeout(erase, erasingDelay);
    } else {
        cursor.classList.remove("typing");
        wordIndex++;
        if(wordIndex >= words.length) wordIndex = 0;
        setTimeout(type, typingDelay + 1100);
    }
}

// Start the animation when the document loads
document.addEventListener("DOMContentLoaded", function() {
    if(words.length) setTimeout(type, newWordDelay + 250);
});

document.getElementById('contactForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        message: formData.get('message')
    };

    // Update with your actual Google Apps Script URL
    const scriptURL = 'https://script.google.com/macros/s/AKfycbwb-E9rJbvJl6Hod44RMHsqmZHx7Nf2Gi2OlaQvzI_8CAtMH7e7c5BDSO7qgCXc9wHa/exec';

    fetch(scriptURL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(() => {
        alert('Message sent successfully!');
        this.reset();
    })
    .catch(error => {
        alert('Error sending message. Please try again.');
        console.error('Error:', error);
    });
});

document.querySelector('.scroll-indicator').addEventListener('click', function() {
    const aboutSection = document.getElementById('about');
    aboutSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
});

// Add horizontal scroll functionality for projects
document.addEventListener('DOMContentLoaded', function() {
    const projectsGrid = document.querySelector('.projects-grid');
    
    // Mouse wheel scrolling
    projectsGrid.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0) {
            e.preventDefault();
            projectsGrid.scrollLeft += e.deltaY;
        }
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (projectsGrid.matches(':hover')) {
            const SCROLL_AMOUNT = 300; // Adjust this value to change scroll distance
            
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                projectsGrid.scrollLeft += SCROLL_AMOUNT;
            }
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                projectsGrid.scrollLeft -= SCROLL_AMOUNT;
            }
        }
    });
}); 
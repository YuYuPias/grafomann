const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const closeButton = document.getElementById('lightboxClose');
const zoomIn = document.getElementById('zoomIn');
const zoomOut = document.getElementById('zoomOut');
const prevImage = document.getElementById('prevImage');
const nextImage = document.getElementById('nextImage');

const galleryLinks = Array.from(document.querySelectorAll('.gallery a'));

let currentIndex = 0;
let scale = 1;
let posX = 0;
let posY = 0;
let isDragging = false;
let startX = 0;
let startY = 0;

function updateImageTransform() {
    lightboxImage.style.transform =
        `translate(${posX}px, ${posY}px) scale(${scale})`;
}

function resetView() {
    scale = 1;
    posX = 0;
    posY = 0;
    updateImageTransform();
}

function showImage(index) {
    currentIndex = index;

    if (currentIndex < 0) {
        currentIndex = galleryLinks.length - 1;
    }

    if (currentIndex >= galleryLinks.length) {
        currentIndex = 0;
    }

    lightboxImage.src = galleryLinks[currentIndex].href;
    resetView();
    lightbox.classList.add('active');
}

galleryLinks.forEach((link, index) => {
    link.addEventListener('click', function(event) {
        event.preventDefault();
        showImage(index);
    });
});

nextImage.addEventListener('click', (event) => {
    event.stopPropagation();
    showImage(currentIndex + 1);
});

prevImage.addEventListener('click', (event) => {
    event.stopPropagation();
    showImage(currentIndex - 1);
});

zoomIn.addEventListener('click', (event) => {
    event.stopPropagation();
    if (scale < 4) {
        scale += 0.5;
        updateImageTransform();
    }
});

zoomOut.addEventListener('click', (event) => {
    event.stopPropagation();
    if (scale > 1) {
        scale -= 0.5;
        if (scale === 1) {
            posX = 0;
            posY = 0;
        }
        updateImageTransform();
    }
});

lightboxImage.addEventListener('pointerdown', (event) => {
    if (scale <= 1) return;

    event.preventDefault();

    isDragging = true;
    lightboxImage.classList.add('dragging');

    startX = event.clientX - posX;
    startY = event.clientY - posY;

    lightboxImage.setPointerCapture(event.pointerId);
});

lightboxImage.addEventListener('pointermove', (event) => {
    if (!isDragging) return;

    event.preventDefault();

    posX = event.clientX - startX;
    posY = event.clientY - startY;

    updateImageTransform();
});

function stopDragging(event) {
    if (!isDragging) return;

    isDragging = false;
    lightboxImage.classList.remove('dragging');

    if (
        event.pointerId !== undefined &&
        lightboxImage.hasPointerCapture(event.pointerId)
    ) {
        lightboxImage.releasePointerCapture(event.pointerId);
    }
}

lightboxImage.addEventListener('pointerup', stopDragging);
lightboxImage.addEventListener('pointercancel', stopDragging);

closeButton.addEventListener('click', () => {
    lightbox.classList.remove('active');
});

lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) {
        lightbox.classList.remove('active');
    }
});

document.addEventListener('keydown', (event) => {
    if (!lightbox.classList.contains('active')) return;

    if (event.key === 'Escape') {
        lightbox.classList.remove('active');
    }

    if (event.key === 'ArrowRight') {
        showImage(currentIndex + 1);
    }

    if (event.key === 'ArrowLeft') {
        showImage(currentIndex - 1);
    }
});
(() => {
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const closeButton = document.getElementById('lightboxClose');
    const zoomIn = document.getElementById('zoomIn');
    const zoomOut = document.getElementById('zoomOut');
    const prevImage = document.getElementById('prevImage');
    const nextImage = document.getElementById('nextImage');

    const galleryLinks = Array.from(
        document.querySelectorAll('.gallery a')
    );

    /*
    Если на странице нет блока lightbox или фотографий,
    скрипт просто прекращает работу, не вызывая ошибку.
    */

    if (!lightbox || !lightboxImage || galleryLinks.length === 0) {
        return;
    }

    const MIN_SCALE = 1;
    const MAX_SCALE = 4;
    const ZOOM_STEP = 0.5;

    const SWIPE_DISTANCE = 55;
    const SWIPE_TIME = 700;

    const DOUBLE_TAP_TIME = 320;
    const DOUBLE_TAP_DISTANCE = 40;

    let currentIndex = 0;

    let scale = 1;
    let posX = 0;
    let posY = 0;

    let gestureMode = null;
    let gestureWasPinch = false;

    let swipeStartX = 0;
    let swipeStartY = 0;
    let swipeStartTime = 0;

    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartPosX = 0;
    let dragStartPosY = 0;

    let pinchStartDistance = 0;
    let pinchStartScale = 1;
    let pinchAnchorX = 0;
    let pinchAnchorY = 0;

    let lastTapTime = 0;
    let lastTapX = 0;
    let lastTapY = 0;

    let previousBodyOverflow = '';

    const pointers = new Map();

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function updateImageTransform() {
        lightboxImage.style.transform =
            `translate3d(${posX}px, ${posY}px, 0) scale(${scale})`;
    }

    function resetView() {
        scale = 1;
        posX = 0;
        posY = 0;

        updateImageTransform();
    }

    function getLightboxCenter() {
        const rect = lightbox.getBoundingClientRect();

        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    }

    /*
    Увеличение относительно точки касания.
    Благодаря этому при двойном нажатии увеличивается
    именно та часть фотографии, которой коснулся человек.
    */

    function zoomAtPoint(newScale, clientX, clientY) {
        newScale = clamp(newScale, MIN_SCALE, MAX_SCALE);

        if (newScale === MIN_SCALE) {
            resetView();
            return;
        }

        const center = getLightboxCenter();

        const anchorX =
            (clientX - center.x - posX) / scale;

        const anchorY =
            (clientY - center.y - posY) / scale;

        posX =
            clientX - center.x - newScale * anchorX;

        posY =
            clientY - center.y - newScale * anchorY;

        scale = newScale;

        updateImageTransform();
    }

    function changeScale(amount) {
        const newScale = clamp(
            scale + amount,
            MIN_SCALE,
            MAX_SCALE
        );

        if (newScale === MIN_SCALE) {
            resetView();
            return;
        }

        scale = newScale;

        updateImageTransform();
    }

    function openLightbox() {
        if (!lightbox.classList.contains('active')) {
            previousBodyOverflow =
                document.body.style.overflow;

            document.body.style.overflow = 'hidden';
        }

        lightbox.classList.add('active');
    }

    function closeLightbox() {
        lightbox.classList.remove('active');

        document.body.style.overflow =
            previousBodyOverflow;

        pointers.clear();

        gestureMode = null;
        gestureWasPinch = false;

        lightboxImage.classList.remove('dragging');

        resetView();
    }

    function showImage(index) {
        currentIndex = index;

        if (currentIndex < 0) {
            currentIndex = galleryLinks.length - 1;
        }

        if (currentIndex >= galleryLinks.length) {
            currentIndex = 0;
        }

        lightboxImage.src =
            galleryLinks[currentIndex].href;

        resetView();
        openLightbox();
    }

    function getTwoPointers() {
        return Array.from(pointers.values()).slice(0, 2);
    }

    function getDistance(pointA, pointB) {
        return Math.hypot(
            pointB.x - pointA.x,
            pointB.y - pointA.y
        );
    }

    function getMidpoint(pointA, pointB) {
        return {
            x: (pointA.x + pointB.x) / 2,
            y: (pointA.y + pointB.y) / 2
        };
    }

    function beginPinch() {
        const [pointA, pointB] = getTwoPointers();

        if (!pointA || !pointB) {
            return;
        }

        const midpoint = getMidpoint(pointA, pointB);
        const center = getLightboxCenter();

        pinchStartDistance =
            getDistance(pointA, pointB);

        pinchStartScale = scale;

        pinchAnchorX =
            (midpoint.x - center.x - posX) / scale;

        pinchAnchorY =
            (midpoint.y - center.y - posY) / scale;

        gestureMode = 'pinch';
        gestureWasPinch = true;

        lightboxImage.classList.remove('dragging');
    }

    function beginDrag(point) {
        gestureMode = 'drag';

        dragStartX = point.x;
        dragStartY = point.y;

        dragStartPosX = posX;
        dragStartPosY = posY;

        lightboxImage.classList.add('dragging');
    }

    function beginSwipe(point) {
        gestureMode = 'swipe';

        swipeStartX = point.x;
        swipeStartY = point.y;
        swipeStartTime = Date.now();
    }

    /*
    Двойное касание:
    при обычном размере — увеличение в два раза;
    при увеличенном — возврат к исходному виду.
    */

    function handleTap(clientX, clientY) {
        const now = Date.now();

        const tapDistance = Math.hypot(
            clientX - lastTapX,
            clientY - lastTapY
        );

        if (
            now - lastTapTime <= DOUBLE_TAP_TIME &&
            tapDistance <= DOUBLE_TAP_DISTANCE
        ) {
            if (scale > 1) {
                resetView();
            } else {
                zoomAtPoint(2, clientX, clientY);
            }

            lastTapTime = 0;
            return;
        }

        lastTapTime = now;
        lastTapX = clientX;
        lastTapY = clientY;
    }

    /*
    Открытие фотографий.
    */

    galleryLinks.forEach((link, index) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            showImage(index);
        });
    });

    /*
    Обычные стрелки и кнопки увеличения сохраняются.
    */

    nextImage?.addEventListener('click', (event) => {
        event.stopPropagation();
        showImage(currentIndex + 1);
    });

    prevImage?.addEventListener('click', (event) => {
        event.stopPropagation();
        showImage(currentIndex - 1);
    });

    zoomIn?.addEventListener('click', (event) => {
        event.stopPropagation();
        changeScale(ZOOM_STEP);
    });

    zoomOut?.addEventListener('click', (event) => {
        event.stopPropagation();
        changeScale(-ZOOM_STEP);
    });

    /*
    Начало касания.
    Один палец:
    — при scale 1 готовит перелистывание;
    — при увеличении готовит перемещение.

    Два пальца включают pinch-to-zoom.
    */

    lightboxImage.addEventListener(
        'pointerdown',
        (event) => {
            if (
                event.pointerType === 'mouse' &&
                event.button !== 0
            ) {
                return;
            }

            event.preventDefault();

            pointers.set(event.pointerId, {
                x: event.clientX,
                y: event.clientY
            });

            lightboxImage.setPointerCapture(
                event.pointerId
            );

            if (pointers.size === 2) {
                beginPinch();
                return;
            }

            if (pointers.size === 1) {
                const point =
                    pointers.get(event.pointerId);

                if (scale > 1) {
                    beginDrag(point);
                } else {
                    gestureWasPinch = false;
                    beginSwipe(point);
                }
            }
        }
    );

    /*
    Движение пальцев.
    */

    lightboxImage.addEventListener(
        'pointermove',
        (event) => {
            if (!pointers.has(event.pointerId)) {
                return;
            }

            event.preventDefault();

            pointers.set(event.pointerId, {
                x: event.clientX,
                y: event.clientY
            });

            /*
            Два пальца: изменение масштаба.
            */

            if (pointers.size >= 2) {
                if (gestureMode !== 'pinch') {
                    beginPinch();
                }

                const [pointA, pointB] =
                    getTwoPointers();

                const distance =
                    getDistance(pointA, pointB);

                const midpoint =
                    getMidpoint(pointA, pointB);

                const center =
                    getLightboxCenter();

                let newScale =
                    pinchStartScale *
                    (distance / pinchStartDistance);

                newScale = clamp(
                    newScale,
                    MIN_SCALE,
                    MAX_SCALE
                );

                if (newScale <= 1.01) {
                    scale = 1;
                    posX = 0;
                    posY = 0;
                } else {
                    scale = newScale;

                    posX =
                        midpoint.x -
                        center.x -
                        scale * pinchAnchorX;

                    posY =
                        midpoint.y -
                        center.y -
                        scale * pinchAnchorY;
                }

                updateImageTransform();
                return;
            }

            /*
            Один палец при увеличении:
            перемещение фотографии.
            */

            if (
                pointers.size === 1 &&
                gestureMode === 'drag' &&
                scale > 1
            ) {
                const point =
                    pointers.get(event.pointerId);

                posX =
                    dragStartPosX +
                    point.x -
                    dragStartX;

                posY =
                    dragStartPosY +
                    point.y -
                    dragStartY;

                updateImageTransform();
            }
        }
    );

    /*
    Завершение касания:
    распознавание свайпа или двойного касания.
    */

    function finishPointer(event) {
        if (!pointers.has(event.pointerId)) {
            return;
        }

        const point =
            pointers.get(event.pointerId);

        const pointerCountBeforeRelease =
            pointers.size;

        if (
            event.type !== 'pointercancel' &&
            gestureMode === 'swipe' &&
            pointerCountBeforeRelease === 1 &&
            !gestureWasPinch &&
            scale === 1
        ) {
            const deltaX =
                point.x - swipeStartX;

            const deltaY =
                point.y - swipeStartY;

            const elapsed =
                Date.now() - swipeStartTime;

            const isHorizontal =
                Math.abs(deltaX) >
                Math.abs(deltaY) * 1.2;

            const isSwipe =
                Math.abs(deltaX) >= SWIPE_DISTANCE &&
                elapsed <= SWIPE_TIME &&
                isHorizontal;

            if (isSwipe) {
                if (deltaX < 0) {
                    showImage(currentIndex + 1);
                } else {
                    showImage(currentIndex - 1);
                }
            } else if (
                Math.hypot(deltaX, deltaY) < 12
            ) {
                handleTap(point.x, point.y);
            }
        }

        pointers.delete(event.pointerId);

        if (
            lightboxImage.hasPointerCapture(
                event.pointerId
            )
        ) {
            lightboxImage.releasePointerCapture(
                event.pointerId
            );
        }

        /*
        После отпускания одного из двух пальцев
        оставшийся палец может сразу двигать
        увеличенную фотографию.
        */

        if (pointers.size === 1 && scale > 1) {
            const remainingPoint =
                Array.from(pointers.values())[0];

            beginDrag(remainingPoint);
            return;
        }

        if (pointers.size === 0) {
            gestureMode = null;
            gestureWasPinch = false;

            lightboxImage.classList.remove(
                'dragging'
            );
        }
    }

    lightboxImage.addEventListener(
        'pointerup',
        finishPointer
    );

    lightboxImage.addEventListener(
        'pointercancel',
        finishPointer
    );

    /*
    Закрытие кинозала.
    */

    closeButton?.addEventListener(
        'click',
        (event) => {
            event.stopPropagation();
            closeLightbox();
        }
    );

    lightbox.addEventListener('click', (event) => {
        if (event.target === lightbox) {
            closeLightbox();
        }
    });

    /*
    Клавиатурная навигация на компьютере.
    */

    document.addEventListener('keydown', (event) => {
        if (
            !lightbox.classList.contains('active')
        ) {
            return;
        }

        if (event.key === 'Escape') {
            closeLightbox();
        }

        if (event.key === 'ArrowRight') {
            showImage(currentIndex + 1);
        }

        if (event.key === 'ArrowLeft') {
            showImage(currentIndex - 1);
        }
    });

    /*
    При повороте телефона фотография
    возвращается к исходному масштабу.
    */

    window.addEventListener('resize', () => {
        if (
            lightbox.classList.contains('active')
        ) {
            resetView();
        }
    });
})();
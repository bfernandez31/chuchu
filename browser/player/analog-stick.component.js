"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalogStickComponent = void 0;
var AnalogStickComponent = /** @class */ (function () {
    function AnalogStickComponent() {
        this.track = null;
        this.knob = null;
        this.isDragging = false;
        this.centerX = 0;
        this.centerY = 0;
        this.maxRadius = 0;
        this.deadZone = 0.03; // Zone neutre de 3% pour réactivité maximale
        this.animationFrame = null;
        this.moveAnimationFrame = null;
        // Position normalisée du stick (-1 à 1)
        this.currentX = 0;
        this.currentY = 0;
        // Position du curseur dans le jeu (0-1)
        this.cursorX = 0.5;
        this.cursorY = 0.5;
        // Direction actuelle du mouvement
        this.moveDirectionX = 0;
        this.moveDirectionY = 0;
        this.isMoving = false;
        // Position de départ du touch pour calculer le delta
        this.startTouchX = 0;
        this.startTouchY = 0;
        this.onMove = function () { };
    }
    AnalogStickComponent.prototype.init = function (onMove) {
        this.track = document.getElementById('analog-stick-track');
        this.knob = document.getElementById('analog-stick-knob');
        if (!this.track || !this.knob) {
            console.error('Analog stick elements not found');
            return;
        }
        // Calcul des dimensions avec amplitude maximale - CORRIGÉ
        var trackRect = this.track.getBoundingClientRect();
        this.centerX = trackRect.width / 2;
        this.centerY = trackRect.height / 2;
        this.maxRadius = (trackRect.width / 2) - 50; // Plus d'amplitude, knob de 80px donc marge de 50px
        this.setupEventListeners(onMove);
    };
    AnalogStickComponent.prototype.setupEventListeners = function (onMove) {
        if (!this.track || !this.knob)
            return;
        // Mouse events - écouter sur le track entier, pas seulement le knob
        this.track.addEventListener('mousedown', this.handleStart.bind(this));
        document.addEventListener('mousemove', this.handleMove.bind(this));
        document.addEventListener('mouseup', this.handleEnd.bind(this));
        // Touch events - écouter sur le track entier
        this.track.addEventListener('touchstart', this.handleStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleEnd.bind(this));
        // Stockage de la callback
        this.onMove = onMove;
    };
    AnalogStickComponent.prototype.handleStart = function (event) {
        var _a;
        event.preventDefault();
        this.isDragging = true;
        (_a = this.knob) === null || _a === void 0 ? void 0 : _a.classList.add('dragging');
        // NOUVEAU COMPORTEMENT : juste noter la position de départ du touch
        // Le stick ne bouge pas au début !
        if (!this.track || !this.knob)
            return;
        // Obtenir la position de départ du touch
        if (event instanceof MouseEvent) {
            this.startTouchX = event.clientX;
            this.startTouchY = event.clientY;
        }
        else {
            if (event.touches.length === 0)
                return;
            this.startTouchX = event.touches[0].clientX;
            this.startTouchY = event.touches[0].clientY;
        }
    };
    AnalogStickComponent.prototype.handleMove = function (event) {
        if (!this.track || !this.knob)
            return;
        if (!this.isDragging)
            return;
        event.preventDefault();
        // Obtenir la position actuelle du touch
        var currentTouchX, currentTouchY;
        if (event instanceof MouseEvent) {
            currentTouchX = event.clientX;
            currentTouchY = event.clientY;
        }
        else {
            if (event.touches.length === 0)
                return;
            currentTouchX = event.touches[0].clientX;
            currentTouchY = event.touches[0].clientY;
        }
        // NOUVEAU : Calculer le delta depuis la position de départ du touch
        var deltaX = currentTouchX - this.startTouchX;
        var deltaY = currentTouchY - this.startTouchY;
        // Convertir le delta en position de stick (avec sensibilité)
        var sensitivity = 1.2; // Sensibilité du stick augmentée pour plus de fluidité
        // Détecter si on est sur mobile en mode paysage
        var isLandscape = window.innerWidth > window.innerHeight;
        var isMobile = 'ontouchstart' in window;
        var newStickX, newStickY;
        if (isMobile && !isLandscape) {
            // Mobile en portrait : correction -90° nécessaire (interface tournée par CSS)
            newStickX = deltaY / sensitivity; // Y devient X (rotation -90°)
            newStickY = -deltaX / sensitivity; // -X devient Y (rotation -90°)
        }
        else {
            // PC ou mobile paysage : pas de correction
            newStickX = deltaX / sensitivity; // Normal pour X
            newStickY = deltaY / sensitivity; // Normal pour Y
        }
        // Calcul des dimensions
        var trackRect = this.track.getBoundingClientRect();
        var maxRadius = (trackRect.width / 2) - 50;
        // Contrainte circulaire
        var distance = Math.sqrt(newStickX * newStickX + newStickY * newStickY);
        if (distance > maxRadius) {
            var angle = Math.atan2(newStickY, newStickX);
            newStickX = Math.cos(angle) * maxRadius;
            newStickY = Math.sin(angle) * maxRadius;
        }
        // Mettre à jour la position du stick
        this.currentX = newStickX;
        this.currentY = newStickY;
        this.updateKnobPosition(newStickX, newStickY);
        // Calcul des valeurs normalisées pour le mouvement
        var normalizedX = newStickX / maxRadius;
        var normalizedY = newStickY / maxRadius;
        var magnitude = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);
        // Zone morte et mouvement continu (comportement manette)
        if (magnitude > this.deadZone) {
            var adjustedMagnitude = Math.min((magnitude - this.deadZone) / (1 - this.deadZone), 1);
            var factor = adjustedMagnitude / magnitude;
            var moveX = normalizedX * factor;
            var moveY = normalizedY * factor;
            // Mettre à jour la direction de mouvement (pas de redémarrage de timer)
            this.moveDirectionX = moveX;
            this.moveDirectionY = moveY;
            // Démarrer le mouvement si pas déjà en cours
            if (!this.isMoving) {
                this.startContinuousMove();
            }
        }
        else {
            // Dans la zone morte - arrêter le mouvement
            this.stopContinuousMove();
        }
    };
    AnalogStickComponent.prototype.handleEnd = function (event) {
        var _a;
        if (!this.isDragging)
            return;
        this.isDragging = false;
        (_a = this.knob) === null || _a === void 0 ? void 0 : _a.classList.remove('dragging');
        // Arrêter le mouvement du curseur
        this.stopContinuousMove();
        // Animation de retour au centre du stick visuel
        this.animateToCenter();
    };
    AnalogStickComponent.prototype.updateKnobPosition = function (x, y) {
        if (!this.knob)
            return;
        // Position relative au centre du track (x et y sont déjà relatifs au centre)
        // CORRIGER : x et y sont les offsets depuis le centre
        this.knob.style.transform = "translate(calc(-50% + ".concat(x, "px), calc(-50% + ").concat(y, "px))");
    };
    AnalogStickComponent.prototype.startContinuousMove = function () {
        var _this = this;
        if (this.isMoving)
            return; // Déjà en mouvement
        this.isMoving = true;
        var lastTime = performance.now();
        var moveLoop = function (currentTime) {
            if (!_this.isMoving)
                return;
            // Calcul du delta time pour un mouvement frame-rate indépendant
            var deltaTime = (currentTime - lastTime) / 16.67; // Normaliser par 60fps
            lastTime = currentTime;
            // Vitesse adaptative avec courbe d'accélération contrôlée
            var baseSpeed = 0.035; // Vitesse initiale réduite (était 0.045)
            var maxSpeed = 0.055; // Vitesse maximale pour éviter l'emballement
            var magnitude = Math.sqrt(_this.moveDirectionX * _this.moveDirectionX + _this.moveDirectionY * _this.moveDirectionY);
            // Courbe de précision : plus lent près du centre pour le contrôle fin
            var precisionMultiplier = 1.0;
            if (magnitude < 0.3) {
                // Zone de précision (30% du rayon) : ralentir progressivement
                precisionMultiplier = 0.3 + (magnitude / 0.3) * 0.7; // De 0.3 à 1.0
            }
            // Courbe d'accélération plus douce : linear + léger boost
            var speedMultiplier = (0.5 + (magnitude * 0.5)) * precisionMultiplier;
            var rawSpeed = baseSpeed * speedMultiplier * deltaTime;
            var speed = Math.min(rawSpeed, maxSpeed * deltaTime); // Cap à la vitesse max
            // Calculer le déplacement
            var deltaX = _this.moveDirectionX * speed;
            var deltaY = _this.moveDirectionY * speed;
            // Mettre à jour la position du curseur
            _this.cursorX = Math.max(0, Math.min(1, _this.cursorX + deltaX));
            _this.cursorY = Math.max(0, Math.min(1, _this.cursorY + deltaY));
            // Envoyer la nouvelle position
            _this.onMove(_this.cursorX, _this.cursorY);
            // Continuer la boucle
            _this.moveAnimationFrame = requestAnimationFrame(moveLoop);
        };
        this.moveAnimationFrame = requestAnimationFrame(moveLoop);
    };
    AnalogStickComponent.prototype.stopContinuousMove = function () {
        this.isMoving = false;
        if (this.moveAnimationFrame) {
            cancelAnimationFrame(this.moveAnimationFrame);
            this.moveAnimationFrame = null;
        }
        this.moveDirectionX = 0;
        this.moveDirectionY = 0;
    };
    AnalogStickComponent.prototype.animateToCenter = function () {
        var _this = this;
        if (!this.knob)
            return;
        var startX = this.currentX;
        var startY = this.currentY;
        var startTime = performance.now();
        var duration = 200; // 200ms pour revenir au centre
        var animate = function (currentTime) {
            var elapsed = currentTime - startTime;
            var progress = Math.min(elapsed / duration, 1);
            // Easing out cubic pour un retour naturel
            var easeProgress = 1 - Math.pow(1 - progress, 3);
            // Interpolation vers le centre VISUELLEMENT seulement
            var currentX = startX * (1 - easeProgress);
            var currentY = startY * (1 - easeProgress);
            _this.updateKnobPosition(currentX, currentY);
            // NE PAS envoyer de position pendant l'animation
            // Le curseur garde sa dernière position
            if (progress < 1) {
                _this.animationFrame = requestAnimationFrame(animate);
            }
            else {
                // Position finale VISUELLE seulement - retour au centre
                _this.currentX = 0;
                _this.currentY = 0;
                _this.knob.style.transform = 'translate(-50%, -50%)';
                // NE PAS envoyer onMove(0.5, 0.5) - garde la dernière position du curseur
            }
        };
        this.animationFrame = requestAnimationFrame(animate);
    };
    AnalogStickComponent.prototype.destroy = function () {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        if (this.moveAnimationFrame) {
            cancelAnimationFrame(this.moveAnimationFrame);
        }
        this.stopContinuousMove();
    };
    return AnalogStickComponent;
}());
exports.AnalogStickComponent = AnalogStickComponent;
//# sourceMappingURL=analog-stick.component.js.map
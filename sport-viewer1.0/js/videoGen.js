// /**
//  * Module de génération vidéo
//  * Génère une vidéo animée du parcours sportif
//  */

// export class VideoGenerator {
//     constructor() {
//         this.canvas = null;
//         this.ctx = null;
//         this.mediaRecorder = null;
//         this.recordedChunks = [];
//         this.isRecording = false;
//     }

//     /**
//      * Initialise le générateur vidéo
//      */
//     init(container, width = 1920, height = 1080) {
//         // Créer un canvas pour l'enregistrement
//         this.canvas = document.createElement('canvas');
//         this.canvas.width = width;
//         this.canvas.height = height;
//         this.ctx = this.canvas.getContext('2d');
        
//         // Le canvas n'est pas visible
//         this.canvas.style.display = 'none';
//         container.appendChild(this.canvas);
//     }

//     /**
//      * Démarre l'enregistrement vidéo
//      */
//     startRecording(scene, camera, renderer) {
//         // Configuration du MediaRecorder
//         const stream = this.canvas.captureStream(30); // 30 FPS
//         const options = {
//             mimeType: 'video/webm;codecs=vp9',
//             videoBitsPerSecond: 8000000 // 8 Mbps
//         };

//         try {
//             this.mediaRecorder = new MediaRecorder(stream, options);
//         } catch (e) {
//             // Fallback si VP9 n'est pas supporté
//             options.mimeType = 'video/webm';
//             this.mediaRecorder = new MediaRecorder(stream, options);
//         }

//         this.recordedChunks = [];

//         // Événements du MediaRecorder
//         this.mediaRecorder.ondataavailable = (event) => {
//             if (event.data.size > 0) {
//                 this.recordedChunks.push(event.data);
//             }
//         };

//         this.mediaRecorder.onstop = () => {
//             this.saveVideo();
//         };

//         // Démarrer l'enregistrement
//         this.mediaRecorder.start();
//         this.isRecording = true;

//         console.log('Enregistrement vidéo démarré');
//     }

//     /**
//      * Capture une frame de Three.js
//      */
//     captureFrame(renderer) {
//         if (!this.isRecording) return;

//         // Copier le rendu Three.js dans notre canvas
//         this.ctx.drawImage(
//             renderer.domElement,
//             0, 0,
//             this.canvas.width,
//             this.canvas.height
//         );

//         // Ajouter des overlays (texte, stats, etc.)
//         this.addOverlays();
//     }

//     /**
//      * Ajoute des informations en surimpression
//      */
//     addOverlays(data) {
//         // Exemple d'overlay
//         this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
//         this.ctx.fillRect(50, 50, 300, 150);

//         this.ctx.fillStyle = 'white';
//         this.ctx.font = '24px Arial';
//         this.ctx.fillText('Sport Viewer 3D', 70, 90);
        
//         if (data) {
//             this.ctx.font = '18px Arial';
//             this.ctx.fillText(`Vitesse: ${data.speed} km/h`, 70, 120);
//             this.ctx.fillText(`Distance: ${data.distance} km`, 70, 145);
//             this.ctx.fillText(`Temps: ${data.time}`, 70, 170);
//         }
//     }

//     /**
//      * Arrête l'enregistrement
//      */
//     stopRecording() {
//         if (this.mediaRecorder && this.isRecording) {
//             this.mediaRecorder.stop();
//             this.isRecording = false;
//             console.log('Enregistrement vidéo arrêté');
//         }
//     }

//     /**
//      * Sauvegarde la vidéo
//      */
//     saveVideo() {
//         const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
//         const url = URL.createObjectURL(blob);
        
//         const a = document.createElement('a');
//         a.href = url;
//         a.download = `sport_viewer_${Date.now()}.webm`;
//         document.body.appendChild(a);
//         a.click();
//         document.body.removeChild(a);
        
//         URL.revokeObjectURL(url);
//         console.log('Vidéo sauvegardée');
//     }

//     /**
//      * Génère une vidéo automatique du parcours
//      */
//     async generateAutomaticVideo(data, map3D, options = {}) {
//         const {
//             duration = 60,        // Durée de la vidéo en secondes
//             fps = 30,            // Images par seconde
//             quality = 'high',    // Qualité: low, medium, high
//             showStats = true,    // Afficher les statistiques
//             cameraMode = 'follow' // Mode caméra: follow, orbit, flyover
//         } = options;

//         console.log('Génération de vidéo automatique en cours...');

//         // TODO: Implémenter la génération automatique
//         // 1. Calculer le chemin de caméra
//         // 2. Animer la caméra frame par frame
//         // 3. Capturer chaque frame
//         // 4. Ajouter les overlays dynamiques
//         // 5. Sauvegarder la vidéo

//         alert('La génération automatique de vidéo sera disponible dans la prochaine version!');
//     }

//     /**
//      * Calcule le chemin de caméra pour l'animation
//      */
//     calculateCameraPath(points, mode) {
//         const cameraPath = [];

//         switch (mode) {
//             case 'follow':
//                 // Caméra qui suit le parcours
//                 points.forEach((point, index) => {
//                     cameraPath.push({
//                         position: {
//                             x: point.x - 50,
//                             y: point.y + 100,
//                             z: point.z - 50
//                         },
//                         lookAt: {
//                             x: point.x,
//                             y: point.y,
//                             z: point.z
//                         },
//                         time: index / points.length
//                     });
//                 });
//                 break;

//             case 'orbit':
//                 // Caméra en orbite autour du parcours
//                 // TODO: Implémenter
//                 break;

//             case 'flyover':
//                 // Survol du parcours
//                 // TODO: Implémenter
//                 break;
//         }

//         return cameraPath;
//     }

//     /**
//      * Détruit le générateur
//      */
//     destroy() {
//         if (this.canvas && this.canvas.parentNode) {
//             this.canvas.parentNode.removeChild(this.canvas);
//         }
        
//         this.canvas = null;
//         this.ctx = null;
//         this.mediaRecorder = null;
//         this.recordedChunks = [];
//     }
// }

// // Classe alternative utilisant CCapture.js pour une meilleure qualité
// export class CCaptureVideoGenerator {
//     constructor() {
//         this.capturer = null;
//         this.isCapturing = false;
//     }

//     /**
//      * Initialise CCapture
//      */
//     init(options = {}) {
//         // Vérifier si CCapture est disponible
//         if (typeof CCapture === 'undefined') {
//             console.error('CCapture.js non trouvé. Incluez la bibliothèque dans votre HTML.');
//             return false;
//         }

//         // Configuration par défaut
//         const defaultOptions = {
//             format: 'webm',
//             framerate: 30,
//             quality: 90,
//             name: 'sport_viewer_3d',
//             verbose: true,
//             display: false,
//             ...options
//         };

//         this.capturer = new CCapture(defaultOptions);
//         return true;
//     }

//     /**
//      * Démarre la capture
//      */
//     startCapture() {
//         if (this.capturer) {
//             this.capturer.start();
//             this.isCapturing = true;
//             console.log('Capture CCapture démarrée');
//         }
//     }

//     /**
//      * Capture une frame
//      */
//     captureFrame(canvas) {
//         if (this.isCapturing && this.capturer) {
//             this.capturer.capture(canvas);
//         }
//     }

//     /**
//      * Arrête la capture et sauvegarde
//      */
//     stopCapture() {
//         if (this.isCapturing && this.capturer) {
//             this.capturer.stop();
//             this.capturer.save();
//             this.isCapturing = false;
//             console.log('Capture CCapture arrêtée et sauvegardée');
//         }
//     }
// }












// videoGen.js
export class VideoGenerator {
    constructor(map, animateFrameCallback) {
        this.map = map;
        this.canvas = map.getCanvas();
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.animateFrameCallback = animateFrameCallback;
    }

    // startRecording(durationSeconds = 10, fps = 30) {
    //     if (this.isRecording) return;

    //     const stream = this.canvas.captureStream(fps);
    //     this.mediaRecorder = new MediaRecorder(stream, {
    //         mimeType: 'video/webm; codecs=vp9'
    //     });


    startRecording(durationSeconds = 10, fps = 30, bitrate = 20000000) {
        if (this.isRecording) return;

        const stream = this.canvas.captureStream(fps);
        this.mediaRecorder = new MediaRecorder(stream, {
            // mimeType: 'video/webm; codecs=h264',
            mimeType: 'video/webm; codecs=vp9',
            bitsPerSecond: bitrate
        });



        this.recordedChunks = [];
        this.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) this.recordedChunks.push(e.data);
        };

        this.mediaRecorder.onstop = () => {
            const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'animation.webm';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        };

        this.mediaRecorder.start();
        this.isRecording = true;

        const totalFrames = durationSeconds * fps;
        let currentFrame = 0;

        const recordFrame = () => {
            if (currentFrame < totalFrames) {
                this.animateFrameCallback(currentFrame / totalFrames);
                currentFrame++;
                requestAnimationFrame(recordFrame);
            } else {
                this.stopRecording();
            }
        };

        recordFrame();
    }

    stopRecording() {
        if (!this.isRecording) return;
        this.mediaRecorder.stop();
        this.isRecording = false;
    }
}

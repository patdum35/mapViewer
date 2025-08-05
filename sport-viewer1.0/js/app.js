/**
 * Point d'entrée principal de l'application Sport Viewer 3D
 */

import { GPXParser } from './gpxParser.js';
import { Map2D } from './map2D.js';
import { Map3D } from './map3D.js';
import { VideoGenerator } from './videoGen.js';




// for tracking with google Analytics
export function trackPageView(pagePath) {
    if (window.gtag) {
        console.log(`📊 Suivi de la vue de page pour google Analytics: ${pagePath}`);
        gtag('event', 'page_view', {
            page_location: window.location.href,
            page_title: pagePath
        });
    }
}

class SportViewer {
    constructor() {
        this.gpxParser = new GPXParser();
        this.map2D = null;
        this.map3D = null;
        this.currentData = null;
        this.currentView = null;
        
        this.init();
    }

    /**
     * Initialise l'application
     */
    init() {
        console.log('Sport Viewer 3D - Initialisation');

        trackPageView('accueilSportViewer'); // Suivre la vue de la page d'accueil
        
        // Initialiser les gestionnaires d'événements
        this.setupEventHandlers();
        
        // Masquer la section résultats au départ
        document.getElementById('results-section').classList.add('hidden');
    }

    /**
     * Configure tous les gestionnaires d'événements
     */
    setupEventHandlers() {
        // Zone d'upload
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-input');
        
        // Click pour sélectionner un fichier
        uploadArea.addEventListener('click', () => fileInput.click());
        
        // Sélection de fichier
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFile(e.target.files[0]);
            }
        });
        
        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFile(files[0]);
            }
        });
        
        // Boutons de contrôle
        document.getElementById('btn-2d').addEventListener('click', () => this.show2DView());
        document.getElementById('btn-3d').addEventListener('click', () => this.show3DView());
        document.getElementById('btn-export').addEventListener('click', () => this.exportData());
        document.getElementById('btn-video').addEventListener('click', () => this.generateVideo());
    }

    /**
     * Traite le fichier sélectionné
     */
    handleFile(file) {
        // Vérifier l'extension
        if (!file.name.toLowerCase().endsWith('.gpx')) {
            this.showStatus('⚠️ Veuillez sélectionner un fichier .GPX', 'error');
            return;
        }
        
        this.showStatus('⏳ Lecture du fichier GPX en cours...', 'loading');
        
        // Lire le fichier
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                // Parser le GPX
                this.currentData = this.gpxParser.parse(e.target.result);
                
                // Afficher les résultats
                this.displayResults();
                
                // Message de succès
                this.showStatus(
                    `✅ Fichier chargé avec succès! ${this.currentData.points.length} points GPS trouvés.`, 
                    'success'
                );
                
                // Afficher automatiquement la vue 2D
                setTimeout(() => this.show2DView(), 500);
                
            } catch (error) {
                console.error('Erreur lors du parsing:', error);
                this.showStatus(`❌ Erreur: ${error.message}`, 'error');
            }
        };
        
        reader.onerror = () => {
            this.showStatus('❌ Erreur lors de la lecture du fichier', 'error');
        };
        
        reader.readAsText(file);
    }

    /**
     * Affiche un message de statut
     */
    showStatus(message, type) {
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
    }

    /**
     * Affiche les résultats du parsing
     */
    displayResults() {
        // Afficher la section résultats
        document.getElementById('results-section').classList.remove('hidden');
        
        // Afficher le résumé
        this.displaySummary();
        
        // Afficher le tableau de données
        this.displayDataTable();
        
        // Activer le bouton vidéo si on a des données
        document.getElementById('btn-video').disabled = false;
    }

    /**
     * Affiche le résumé de l'activité
     */
    displaySummary() {
        const stats = this.currentData.stats;
        const summaryDiv = document.getElementById('summary');
        
        summaryDiv.innerHTML = `
            <h2>📊 Résumé de l'activité</h2>
            <div class="summary-grid">
                <div class="summary-item">
                    <strong>Activité</strong>
                    <span>${this.currentData.name}</span>
                </div>
                <div class="summary-item">
                    <strong>Date</strong>
                    <span>${stats.startTime.toLocaleDateString('fr-FR')}</span>
                </div>
                <div class="summary-item">
                    <strong>Heure de départ</strong>
                    <span>${stats.startTime.toLocaleTimeString('fr-FR')}</span>
                </div>
                <div class="summary-item">
                    <strong>Durée totale</strong>
                    <span>${this.formatDuration(stats.duration)}</span>
                </div>
                <div class="summary-item">
                    <strong>Temps en mouvement</strong>
                    <span>${this.formatDuration(stats.movingTime)}</span>
                </div>
                <div class="summary-item">
                    <strong>Distance</strong>
                    <span>${(stats.totalDistance / 1000).toFixed(2)} km</span>
                </div>
                <div class="summary-item">
                    <strong>Vitesse moyenne</strong>
                    <span>${stats.avgSpeed.toFixed(1)} km/h</span>
                </div>
                <div class="summary-item">
                    <strong>Vitesse max</strong>
                    <span>${stats.maxSpeed.toFixed(1)} km/h</span>
                </div>
                <div class="summary-item">
                    <strong>Dénivelé positif</strong>
                    <span>${stats.elevationGain.toFixed(0)} m</span>
                </div>
                <div class="summary-item">
                    <strong>Dénivelé négatif</strong>
                    <span>${stats.elevationLoss.toFixed(0)} m</span>
                </div>
                ${stats.avgHeartRate ? `
                <div class="summary-item">
                    <strong>FC moyenne</strong>
                    <span>${stats.avgHeartRate.toFixed(0)} bpm</span>
                </div>
                <div class="summary-item">
                    <strong>FC max</strong>
                    <span>${stats.maxHeartRate} bpm</span>
                </div>
                ` : ''}
                <div class="summary-item">
                    <strong>Points GPS</strong>
                    <span>${stats.pointCount}</span>
                </div>
                <div class="summary-item">
                    <strong>Pauses</strong>
                    <span>${stats.pauseCount}</span>
                </div>
            </div>
        `;
    }

    /**
     * Affiche le tableau de données détaillées
     */
    displayDataTable() {
        const points = this.currentData.points;
        const tableDiv = document.getElementById('data-table');
        
        // Sélectionner les points à afficher (10 premiers, 10 derniers)
        const pointsToShow = [];
        if (points.length <= 20) {
            pointsToShow.push(...points);
        } else {
            pointsToShow.push(...points.slice(0, 10));
            pointsToShow.push({ separator: true });
            pointsToShow.push(...points.slice(-10));
        }
        
        let tableHTML = `
            <h3>📍 Aperçu des points GPS</h3>
            <table>
                <thead>
                    <tr>
                        <th>N°</th>
                        <th>Heure</th>
                        <th>Latitude</th>
                        <th>Longitude</th>
                        <th>Altitude</th>
                        <th>Distance</th>
                        <th>Vitesse</th>
                        ${points[0].heartRate !== null ? '<th>FC</th>' : ''}
                        ${points[0].cadence !== null ? '<th>Cadence</th>' : ''}
                    </tr>
                </thead>
                <tbody>
        `;
        
        pointsToShow.forEach(point => {
            if (point.separator) {
                tableHTML += `
                    <tr>
                        <td colspan="9" style="text-align: center; font-style: italic;">
                            ... ${points.length - 20} points masqués ...
                        </td>
                    </tr>
                `;
            } else {
                tableHTML += `
                    <tr ${point.isPause ? 'style="background-color: #fff3cd;"' : ''}>
                        <td>${point.index + 1}</td>
                        <td>${point.time.toLocaleTimeString('fr-FR')}</td>
                        <td>${point.lat.toFixed(6)}°</td>
                        <td>${point.lon.toFixed(6)}°</td>
                        <td>${point.ele.toFixed(1)} m</td>
                        <td>${(point.distance / 1000).toFixed(3)} km</td>
                        <td>${point.speed.toFixed(1)} km/h</td>
                        ${point.heartRate !== null ? `<td>${point.heartRate} bpm</td>` : ''}
                        ${point.cadence !== null ? `<td>${point.cadence.toFixed(0)}</td>` : ''}
                    </tr>
                `;
            }
        });
        
        tableHTML += `
                </tbody>
            </table>
        `;
        
        tableDiv.innerHTML = tableHTML;
    }

    /**
     * Affiche la vue 2D
     */
    show2DView() {
        console.log('Affichage de la vue 2D');
        trackPageView('Affichage de la vue 2D'); // Suivre la vue 
        
        // Masquer toutes les vues
        this.hideAllViews();
        
        // Afficher le conteneur 2D
        const map2DContainer = document.getElementById('map-2d');
        map2DContainer.classList.remove('hidden');
        
        // Créer ou mettre à jour la carte 2D
        if (!this.map2D) {
            this.map2D = new Map2D('map-2d');
            this.map2D.init(this.currentData.bounds);
        }
        
        this.map2D.displayRoute(this.currentData);
        this.currentView = '2d';
        
        // Mettre à jour les boutons
        this.updateViewButtons();
    }

    /**
     * Affiche la vue 3D
     */
    show3DView() {
        console.log('Affichage de la vue 3D');
        trackPageView('Affichage de la vue 3D'); // Suivre la vue 

        // Masquer toutes les vues
        this.hideAllViews();
        
        // Afficher le conteneur 3D
        const map3DContainer = document.getElementById('map-3d');
        map3DContainer.classList.remove('hidden');
        
        // Créer la vue 3D
        if (this.map3D) {
            this.map3D.destroy();
        }
        
        this.map3D = new Map3D('map-3d');
        this.map3D.init(this.currentData);
        this.currentView = '3d';

        window.mapboxInstance = this.map3D;
        
        // Mettre à jour les boutons
        this.updateViewButtons();
    }

    /**
     * Masque toutes les vues
     */
    hideAllViews() {
        document.getElementById('map-2d').classList.add('hidden');
        document.getElementById('map-3d').classList.add('hidden');
        
        // Nettoyer la vue 3D si elle existe
        if (this.map3D && this.currentView === '3d') {
            this.map3D.destroy();
            this.map3D = null;
        }
    }

    /**
     * Met à jour l'état des boutons de vue
     */
    updateViewButtons() {
        const btn2D = document.getElementById('btn-2d');
        const btn3D = document.getElementById('btn-3d');
        
        if (this.currentView === '2d') {
            btn2D.style.backgroundColor = '#45a049';
            btn3D.style.backgroundColor = '#4CAF50';
        } else if (this.currentView === '3d') {
            btn2D.style.backgroundColor = '#4CAF50';
            btn3D.style.backgroundColor = '#45a049';
        }
    }

    /**
     * Exporte les données en JSON
     */
    exportData() {
        if (!this.currentData) {
            this.showStatus('⚠️ Aucune donnée à exporter', 'error');
            return;
        }
        
        // Créer le JSON
        const dataStr = this.gpxParser.toJSON();
        
        // Créer un blob et télécharger
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentData.name.replace(/[^a-z0-9]/gi, '_')}_export.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showStatus('✅ Données exportées avec succès!', 'success');
    }

    /**
     * Génère une vidéo de l'activité
     */
    generateVideo() {
        trackPageView('generateVideo'); // Suivre la vue 
        const videoGen = new VideoGenerator(window.mapboxInstance.map, (progress) => {
            window.mapboxInstance .updateAnimationProgress(progress); 
        });

        videoGen.startRecording(10, 30);
    }

    /**
     * Formate une durée en secondes
     */
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs.toString().padStart(2, '0')}s`;
        } else {
            return `${secs}s`;
        }
    }
}

// Initialiser l'application quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
    window.sportViewer = new SportViewer();
});

// Exporter la classe pour utilisation dans d'autres modules si nécessaire
export { SportViewer };

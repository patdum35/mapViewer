/**
 * Module de visualisation 2D avec Leaflet
 */

export class Map2D {
    constructor(containerId) {
        this.containerId = containerId;
        this.map = null;
        this.layers = {
            route: null,
            markers: null,
            heatmap: null
        };
    }

    /**
     * Initialise la carte
     */
    init(bounds) {
        // Créer la carte
        this.map = L.map(this.containerId).setView(
            [bounds.center.lat, bounds.center.lon], 
            13
        );

        // Ajouter les tuiles de base
        this.baseLayers = {
            'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }),
            'Satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: '© Esri'
            }),
            'Terrain': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenTopoMap'
            })
        };

        // Ajouter la couche par défaut
        this.baseLayers['OpenStreetMap'].addTo(this.map);

        // Ajouter le contrôle des couches
        L.control.layers(this.baseLayers, {}).addTo(this.map);

        // Ajouter l'échelle
        L.control.scale({ imperial: false }).addTo(this.map);
    }

    /**
     * Affiche le parcours sur la carte
     */
    displayRoute(data) {
        // Nettoyer les couches existantes
        this.clearLayers();

        // Préparer les coordonnées
        const coordinates = data.points.map(p => [p.lat, p.lon]);

        // Créer le tracé principal avec gradient de couleur selon la vitesse
        this.createGradientRoute(data.points);

        // Ajouter les marqueurs de début et fin
        this.addStartEndMarkers(data.points);

        // Ajouter les marqueurs de pause
        this.addPauseMarkers(data.points);

        // Ajuster la vue
        const bounds = L.latLngBounds(coordinates);
        this.map.fitBounds(bounds, { padding: [50, 50] });

        // Ajouter les contrôles d'affichage
        this.addDisplayControls(data);
    }

    /**
     * Crée un tracé avec gradient de couleur
     */
    createGradientRoute(points) {
        // Grouper les segments par couleur (selon la vitesse)
        const segments = [];
        let currentSegment = [];
        let currentColor = null;

        points.forEach((point, index) => {
            const color = this.getSpeedColor(point.speed);
            
            if (color !== currentColor && currentSegment.length > 0) {
                segments.push({
                    coords: currentSegment,
                    color: currentColor
                });
                currentSegment = [[point.lat, point.lon]];
                currentColor = color;
            } else {
                currentSegment.push([point.lat, point.lon]);
                currentColor = color;
            }
        });

        // Ajouter le dernier segment
        if (currentSegment.length > 0) {
            segments.push({
                coords: currentSegment,
                color: currentColor
            });
        }

        // Créer un groupe de couches pour le tracé
        this.layers.route = L.layerGroup();

        // Dessiner chaque segment
        segments.forEach(segment => {
            const polyline = L.polyline(segment.coords, {
                color: segment.color,
                weight: 4,
                opacity: 0.8,
                smoothFactor: 1
            });

            polyline.addTo(this.layers.route);
        });

        this.layers.route.addTo(this.map);
    }

    /**
     * Détermine la couleur selon la vitesse
     */
    getSpeedColor(speed) {
        // Échelle de couleurs du vert (lent) au rouge (rapide)
        if (speed < 5) return '#00ff00';      // Vert
        if (speed < 10) return '#7fff00';     // Vert-jaune
        if (speed < 15) return '#ffff00';     // Jaune
        if (speed < 20) return '#ff7f00';     // Orange
        if (speed < 25) return '#ff3f00';     // Orange-rouge
        return '#ff0000';                      // Rouge
    }

    /**
     * Ajoute les marqueurs de début et fin
     */
    addStartEndMarkers(points) {
        const startPoint = points[0];
        const endPoint = points[points.length - 1];

        // Marqueur de départ (vert)
        const startIcon = L.divIcon({
            html: '<div style="background-color: #4CAF50; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
            iconSize: [20, 20],
            className: 'custom-div-icon'
        });

        L.marker([startPoint.lat, startPoint.lon], { icon: startIcon })
            .bindPopup(`
                <strong>Départ</strong><br>
                Heure: ${startPoint.time.toLocaleTimeString()}<br>
                Altitude: ${startPoint.ele.toFixed(0)}m
            `)
            .addTo(this.map);

        // Marqueur d'arrivée (rouge)
        const endIcon = L.divIcon({
            html: '<div style="background-color: #f44336; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
            iconSize: [20, 20],
            className: 'custom-div-icon'
        });

        L.marker([endPoint.lat, endPoint.lon], { icon: endIcon })
            .bindPopup(`
                <strong>Arrivée</strong><br>
                Heure: ${endPoint.time.toLocaleTimeString()}<br>
                Altitude: ${endPoint.ele.toFixed(0)}m<br>
                Distance: ${(endPoint.distance / 1000).toFixed(2)} km
            `)
            .addTo(this.map);
    }

    /**
     * Ajoute les marqueurs de pause
     */
    addPauseMarkers(points) {
        this.layers.markers = L.layerGroup();

        points.forEach(point => {
            if (point.isPause) {
                const pauseIcon = L.divIcon({
                    html: '<div style="background-color: #FFC107; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white;"></div>',
                    iconSize: [10, 10],
                    className: 'pause-icon'
                });

                L.marker([point.lat, point.lon], { icon: pauseIcon })
                    .bindPopup(`
                        <strong>Pause</strong><br>
                        Durée: ${point.timeDelta}s<br>
                        Heure: ${point.time.toLocaleTimeString()}
                    `)
                    .addTo(this.layers.markers);
            }
        });

        this.layers.markers.addTo(this.map);
    }

    /**
     * Ajoute des contrôles d'affichage
     */
    addDisplayControls(data) {
        const controlDiv = L.control({ position: 'topright' });
        
        controlDiv.onAdd = () => {
            const div = L.DomUtil.create('div', 'leaflet-control-layers leaflet-control');
            div.style.backgroundColor = 'white';
            div.style.padding = '10px';
            div.style.borderRadius = '5px';
            
            div.innerHTML = `
                <div style="margin-bottom: 10px;">
                    <strong>Affichage</strong>
                </div>
                <label style="display: block; margin-bottom: 5px;">
                    <input type="checkbox" id="show-pauses" checked> Pauses
                </label>
                <label style="display: block; margin-bottom: 5px;">
                    <input type="checkbox" id="show-km-markers"> Marqueurs km
                </label>
                <label style="display: block;">
                    <input type="checkbox" id="show-elevation"> Profil altitude
                </label>
            `;

            // Empêcher la propagation des clics
            L.DomEvent.disableClickPropagation(div);

            return div;
        };

        controlDiv.addTo(this.map);

        // Gérer les événements
        document.getElementById('show-pauses').addEventListener('change', (e) => {
            if (e.target.checked) {
                this.map.addLayer(this.layers.markers);
            } else {
                this.map.removeLayer(this.layers.markers);
            }
        });

        document.getElementById('show-km-markers').addEventListener('change', (e) => {
            if (e.target.checked) {
                this.addKilometerMarkers(data.points);
            } else {
                this.removeKilometerMarkers();
            }
        });
    }

    /**
     * Ajoute des marqueurs tous les kilomètres
     */
    addKilometerMarkers(points) {
        this.kmMarkers = L.layerGroup();
        let nextKm = 1000;

        points.forEach(point => {
            if (point.distance >= nextKm) {
                const km = nextKm / 1000;
                
                const kmIcon = L.divIcon({
                    html: `<div style="background-color: #2196F3; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px;">${km}</div>`,
                    iconSize: [30, 30],
                    className: 'km-marker'
                });

                L.marker([point.lat, point.lon], { icon: kmIcon })
                    .bindPopup(`
                        <strong>${km} km</strong><br>
                        Temps: ${this.formatTime(point.time - points[0].time)}<br>
                        Altitude: ${point.ele.toFixed(0)}m<br>
                        Vitesse: ${point.speed.toFixed(1)} km/h
                    `)
                    .addTo(this.kmMarkers);

                nextKm += 1000;
            }
        });

        this.kmMarkers.addTo(this.map);
    }

    /**
     * Supprime les marqueurs kilométriques
     */
    removeKilometerMarkers() {
        if (this.kmMarkers) {
            this.map.removeLayer(this.kmMarkers);
        }
    }

    /**
     * Formate le temps écoulé
     */
    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
        }
        return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
    }

    /**
     * Nettoie toutes les couches
     */
    clearLayers() {
        Object.values(this.layers).forEach(layer => {
            if (layer && this.map.hasLayer(layer)) {
                this.map.removeLayer(layer);
            }
        });
        
        if (this.kmMarkers) {
            this.map.removeLayer(this.kmMarkers);
        }
    }

    /**
     * Exporte la carte en image
     */
    exportImage() {
        // Utilisation de leaflet-image si nécessaire
        // Pour l'instant, capture d'écran manuelle
        alert('Utilisez la fonction capture d\'écran de votre navigateur');
    }

    /**
     * Détruit la carte
     */
    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
    }
}
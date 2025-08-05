/**
 * Module de visualisation 3D avec Mapbox GL JS
 * Version corrigée pour afficher le tracé GPX
 */

export class Map3D {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.mapboxContainer = document.getElementById('mapbox-container');
        this.map = null;
        this.animationId = null;
        
        // Animation
        this.isAnimating = false;
        this.animationProgress = 0;
        this.animationSpeed = 1;
        this.routeCoordinates = [];
    }

    /**
     * Initialise la vue 3D avec Mapbox
     */
    init(data) {
        // Token Mapbox
        mapboxgl.accessToken = 'pk.eyJ1IjoicGF0ZHVtMzUiLCJhIjoiY21kbjUzcDdpMWxqMzJpcnowaWV3ZXV0dCJ9.xgnQKkSNs7esDNl4vj23ew';

        const center = [data.bounds.center.lon, data.bounds.center.lat];

        // Créer la carte Mapbox
        this.map = new mapboxgl.Map({
            container: 'mapbox-container',
            style: 'mapbox://styles/mapbox/satellite-streets-v12',
            center: center,
            zoom: 13,
            pitch: 60,
            bearing: -30,
            antialias: true
        });

        // Attendre que la carte soit chargée
        this.map.on('load', () => {
            // Ajouter le relief 3D
            this.addTerrain();
            
            // Ajouter le tracé GPX
            this.addGPXRoute(data);
            
            // Ajouter les marqueurs
            this.addMarkers(data);
            
            // Centrer la vue sur le parcours
            this.fitBounds(data.bounds);
        });

        // Créer les contrôles UI
        this.createControls();

        // Gérer le redimensionnement
        window.addEventListener('resize', () => this.onWindowResize());
    }

    /**
     * Ajoute le terrain 3D
     */
    addTerrain() {
        // Source pour le relief
        this.map.addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.terrain-rgb',
            tileSize: 512,
            maxzoom: 14
        });

        // Activer le terrain avec exagération
        this.map.setTerrain({ 
            source: 'mapbox-dem', 
            exaggeration: 1.5 
        });

        // Ajouter l'ombrage du relief
        this.map.addLayer({
            id: 'hillshading',
            source: 'mapbox-dem',
            type: 'hillshade',
            paint: {
                'hillshade-exaggeration': 0.5
            }
        });

        // Ajouter le ciel
        this.map.addLayer({
            id: 'sky',
            type: 'sky',
            paint: {
                'sky-type': 'atmosphere',
                'sky-atmosphere-sun': [0.0, 90.0],
                'sky-atmosphere-sun-intensity': 15
            }
        });
    }

    /**
     * Ajoute le tracé GPX sur la carte
     */
    addGPXRoute(data) {
        // Convertir les points en format GeoJSON
        this.routeCoordinates = data.points.map(point => [
            point.lon,
            point.lat,
            point.ele
        ]);

        // Créer le GeoJSON pour le tracé
        const geojson = {
            'type': 'Feature',
            'properties': {},
            'geometry': {
                'type': 'LineString',
                'coordinates': this.routeCoordinates
            }
        };

        // Ajouter la source
        this.map.addSource('route', {
            'type': 'geojson',
            'data': geojson
        });

        // Ajouter le layer du tracé principal
        this.map.addLayer({
            'id': 'route-main',
            'type': 'line',
            'source': 'route',
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#ff0000',
                'line-width': 6,
                'line-opacity': 0.8
            }
        });

        // Ajouter un contour pour meilleure visibilité
        this.map.addLayer({
            'id': 'route-outline',
            'type': 'line',
            'source': 'route',
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#ffffff',
                'line-width': 8,
                'line-opacity': 0.4
            }
        }, 'route-main'); // Placer sous le tracé principal

        // Ajouter le tracé coloré par vitesse (optionnel)
        this.addSpeedGradientRoute(data);
    }

    /**
     * Ajoute un tracé avec gradient de couleur selon la vitesse
     */
    addSpeedGradientRoute(data) {
        // Créer des segments colorés selon la vitesse
        const segments = [];
        let currentSegment = {
            coordinates: [],
            speed: 0
        };

        data.points.forEach((point, index) => {
            const coord = [point.lon, point.lat, point.ele];
            
            if (index === 0) {
                currentSegment.coordinates.push(coord);
                currentSegment.speed = point.speed;
            } else {
                const speedDiff = Math.abs(point.speed - currentSegment.speed);
                
                // Si la vitesse change significativement, créer un nouveau segment
                if (speedDiff > 2) {
                    currentSegment.coordinates.push(coord);
                    segments.push(currentSegment);
                    currentSegment = {
                        coordinates: [coord],
                        speed: point.speed
                    };
                } else {
                    currentSegment.coordinates.push(coord);
                }
            }
        });
        
        // Ajouter le dernier segment
        if (currentSegment.coordinates.length > 0) {
            segments.push(currentSegment);
        }

        // Ajouter chaque segment avec sa couleur
        segments.forEach((segment, index) => {
            const color = this.getSpeedColor(segment.speed);
            
            const segmentGeojson = {
                'type': 'Feature',
                'properties': {
                    'speed': segment.speed
                },
                'geometry': {
                    'type': 'LineString',
                    'coordinates': segment.coordinates
                }
            };

            this.map.addSource(`route-segment-${index}`, {
                'type': 'geojson',
                'data': segmentGeojson
            });

            this.map.addLayer({
                'id': `route-segment-${index}`,
                'type': 'line',
                'source': `route-segment-${index}`,
                'layout': {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                'paint': {
                    'line-color': color,
                    'line-width': 4,
                    'line-opacity': 0.9
                }
            });
        });
    }

    /**
     * Obtient la couleur selon la vitesse
     */
    getSpeedColor(speed) {
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
    addMarkers(data) {
        const startPoint = data.points[0];
        const endPoint = data.points[data.points.length - 1];

        // Marqueur de départ
        const startEl = document.createElement('div');
        startEl.className = 'marker-start';
        startEl.style.width = '30px';
        startEl.style.height = '30px';
        startEl.style.borderRadius = '50%';
        startEl.style.backgroundColor = '#4CAF50';
        startEl.style.border = '3px solid white';
        startEl.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

        new mapboxgl.Marker(startEl)
            .setLngLat([startPoint.lon, startPoint.lat])
            .setPopup(new mapboxgl.Popup().setHTML(`
                <h3>Départ</h3>
                <p>Heure: ${startPoint.time.toLocaleTimeString()}</p>
                <p>Altitude: ${startPoint.ele.toFixed(0)}m</p>
            `))
            .addTo(this.map);

        // Marqueur d'arrivée
        const endEl = document.createElement('div');
        endEl.className = 'marker-end';
        endEl.style.width = '30px';
        endEl.style.height = '30px';
        endEl.style.borderRadius = '50%';
        endEl.style.backgroundColor = '#f44336';
        endEl.style.border = '3px solid white';
        endEl.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

        new mapboxgl.Marker(endEl)
            .setLngLat([endPoint.lon, endPoint.lat])
            .setPopup(new mapboxgl.Popup().setHTML(`
                <h3>Arrivée</h3>
                <p>Heure: ${endPoint.time.toLocaleTimeString()}</p>
                <p>Altitude: ${endPoint.ele.toFixed(0)}m</p>
                <p>Distance: ${(endPoint.distance / 1000).toFixed(2)} km</p>
            `))
            .addTo(this.map);

        // Ajouter les marqueurs kilométriques
        this.addKilometerMarkers(data);
    }

    /**
     * Ajoute les marqueurs kilométriques
     */
    addKilometerMarkers(data) {
        let nextKm = 1000;
        
        data.points.forEach(point => {
            if (point.distance >= nextKm) {
                const km = nextKm / 1000;
                
                const kmEl = document.createElement('div');
                kmEl.className = 'marker-km';
                kmEl.style.width = '25px';
                kmEl.style.height = '25px';
                kmEl.style.borderRadius = '50%';
                kmEl.style.backgroundColor = '#2196F3';
                kmEl.style.color = 'white';
                kmEl.style.display = 'flex';
                kmEl.style.alignItems = 'center';
                kmEl.style.justifyContent = 'center';
                kmEl.style.fontWeight = 'bold';
                kmEl.style.fontSize = '12px';
                kmEl.style.border = '2px solid white';
                kmEl.textContent = km;

                new mapboxgl.Marker(kmEl)
                    .setLngLat([point.lon, point.lat])
                    .addTo(this.map);

                nextKm += 1000;
            }
        });
    }

    /**
     * Centre la vue sur le parcours
     */
    fitBounds(bounds) {
        this.map.fitBounds([
            [bounds.west, bounds.south],
            [bounds.east, bounds.north]
        ], {
            padding: 50,
            duration: 1000
        });
    }

    /**
     * Crée les contrôles UI pour la vue 3D
     */
    createControls() {
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'controls-3d';
        controlsDiv.innerHTML = `
            <h4>Contrôles 3D</h4>
            <label>
                <input type="checkbox" id="show-terrain" checked> Terrain 3D
            </label>
            <label>
                <input type="checkbox" id="show-markers" checked> Marqueurs km
            </label>
            <label>
                Exagération terrain:
                <input type="range" id="terrain-exaggeration" min="0" max="3" step="0.1" value="1.5">
                <span id="terrain-value">1.5</span>
            </label>
            <button id="start-animation" class="btn btn-primary">Démarrer animation</button>
            <label>
                Vitesse:
                <input type="range" id="animation-speed" min="0.1" max="10" step="0.1" value="1">
            </label>
            <div style="margin-top: 10px;">
                <button id="reset-view" class="btn btn-secondary">Réinitialiser vue</button>
            </div>
        `;
        this.container.appendChild(controlsDiv);

        // Gérer les événements
        document.getElementById('show-terrain').addEventListener('change', (e) => {
            if (e.target.checked) {
                this.map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
            } else {
                this.map.setTerrain(null);
            }
        });

        document.getElementById('show-markers').addEventListener('change', (e) => {
            const markers = document.querySelectorAll('.marker-km');
            markers.forEach(marker => {
                marker.style.display = e.target.checked ? 'flex' : 'none';
            });
        });

        document.getElementById('terrain-exaggeration').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            document.getElementById('terrain-value').textContent = value;
            this.map.setTerrain({ source: 'mapbox-dem', exaggeration: value });
        });

        document.getElementById('start-animation').addEventListener('click', () => {
            this.toggleAnimation();
        });

        document.getElementById('animation-speed').addEventListener('input', (e) => {
            this.animationSpeed = parseFloat(e.target.value);
        });

        document.getElementById('reset-view').addEventListener('click', () => {
            this.fitBounds(this.currentBounds);
        });
    }


    toggleAnimation() {
        this.isAnimating = !this.isAnimating;
        const button = document.getElementById('start-animation');
        button.textContent = this.isAnimating ? 'Arrêter animation' : 'Démarrer animation';
        
        if (this.isAnimating) {
            // Masquer le tracé complet
            this.map.setLayoutProperty('route-main', 'visibility', 'none');
            this.map.setLayoutProperty('route-outline', 'visibility', 'none');
            
            // Créer le tracé animé
            this.createAnimatedRoute();
            this.animationProgress = 0;
            this.animateRoute();
        } else {
            // Réafficher le tracé complet
            this.map.setLayoutProperty('route-main', 'visibility', 'visible');
            this.map.setLayoutProperty('route-outline', 'visibility', 'visible');
            
            // Supprimer le tracé animé
            if (this.map.getSource('animated-route')) {
                this.map.removeLayer('animated-route');
                this.map.removeSource('animated-route');
            }
        }
    }


    createAnimatedRoute() {
        // Source vide au départ
        this.map.addSource('animated-route', {
            'type': 'geojson',
            'data': {
                'type': 'Feature',
                'properties': {},
                'geometry': {
                    'type': 'LineString',
                    'coordinates': []
                }
            }
        });

        // Layer rouge bien visible
        this.map.addLayer({
            'id': 'animated-route',
            'type': 'line',
            'source': 'animated-route',
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#ff0000',
                'line-width': 8,
                'line-opacity': 1
            }
        });
    }


    animateRoute() {
        if (!this.isAnimating) return;

        const routeLength = this.routeCoordinates.length;
        const currentIndex = Math.floor(this.animationProgress * routeLength);
        
        if (currentIndex < routeLength - 1) {
            // Extraire les coordonnées jusqu'au point actuel
            const animatedCoords = this.routeCoordinates.slice(0, currentIndex + 1);
            
            // Mettre à jour le tracé animé
            this.map.getSource('animated-route').setData({
                'type': 'Feature',
                'properties': {},
                'geometry': {
                    'type': 'LineString',
                    'coordinates': animatedCoords
                }
            });
            
            const currentPoint = this.routeCoordinates[currentIndex];
            const nextPoint = this.routeCoordinates[currentIndex + 1];
            const bearing = this.getBearing(currentPoint, nextPoint);
            
            this.map.easeTo({
                center: currentPoint,
                bearing: bearing,
                pitch: 70,
                zoom: 16,
                duration: 100
            });
            
            this.animationProgress += 0.001 * this.animationSpeed;
            requestAnimationFrame(() => this.animateRoute());
        } else {
            // Fin de l'animation - garder le tracé complet visible
            this.isAnimating = false;
            this.animationProgress = 0;
            document.getElementById('start-animation').textContent = 'Démarrer animation';
        }
    }


    /**
     * Calcule le bearing entre deux points
     */
    getBearing(start, end) {
        const startLat = start[1] * Math.PI / 180;
        const startLng = start[0] * Math.PI / 180;
        const endLat = end[1] * Math.PI / 180;
        const endLng = end[0] * Math.PI / 180;
        const dLng = endLng - startLng;
        
        const x = Math.sin(dLng) * Math.cos(endLat);
        const y = Math.cos(startLat) * Math.sin(endLat) - Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);
        
        return Math.atan2(x, y) * 180 / Math.PI;
    }

    /**
     * Gère le redimensionnement de la fenêtre
     */
    onWindowResize() {
        if (this.map) {
            this.map.resize();
        }
    }




    /**
     * Met à jour l'animation avec une progression donnée (entre 0 et 1)
     */
    updateAnimationProgress(progress) {
        this.animationProgress = progress;

        if (this.animatedRouteLine && this.animatedRouteCoords) {
            const count = Math.floor(progress * this.animatedRouteCoords.length);
            const positions = this.animatedRouteLine.geometry.attributes.position.array;

            for (let i = 0; i < count; i++) {
                positions[i * 3] = this.animatedRouteCoords[i].x;
                positions[i * 3 + 1] = this.animatedRouteCoords[i].y + 5;
                positions[i * 3 + 2] = this.animatedRouteCoords[i].z;
            }

            for (let i = count; i < this.animatedRouteCoords.length; i++) {
                positions[i * 3] = 0;
                positions[i * 3 + 1] = 0;
                positions[i * 3 + 2] = 0;
            }

            this.animatedRouteLine.geometry.attributes.position.needsUpdate = true;
        }
    }



    /**
     * Détruit la vue 3D
     */
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        
        // Nettoyer les contrôles
        const controls = this.container.querySelector('.controls-3d');
        if (controls) {
            this.container.removeChild(controls);
        }
    }
}

// Stocker les bounds pour reset
Map3D.prototype.currentBounds = null;
Map3D.prototype.fitBounds = function(bounds) {
    this.currentBounds = bounds;
    this.map.fitBounds([
        [bounds.west, bounds.south],
        [bounds.east, bounds.north]
    ], {
        padding: 50,
        duration: 1000
    });
};
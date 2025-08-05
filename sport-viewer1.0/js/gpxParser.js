/**
 * Module de parsing GPX
 * Parse les fichiers GPX et extrait toutes les données nécessaires
 */

export class GPXParser {
    constructor() {
        this.data = null;
    }

    /**
     * Parse un fichier GPX depuis du texte XML
     * @param {string} xmlText - Contenu XML du fichier GPX
     * @returns {Object} Données parsées
     */
    parse(xmlText) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        
        // Vérifier les erreurs de parsing
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            throw new Error('Fichier GPX invalide');
        }
        
        // Extraire les métadonnées
        const trackName = xmlDoc.querySelector('trk > name')?.textContent || 'Activité sans nom';
        const trackDesc = xmlDoc.querySelector('trk > desc')?.textContent || '';
        
        // Extraire tous les points
        const trackpoints = xmlDoc.querySelectorAll('trkpt');
        const points = this.extractTrackpoints(trackpoints);
        
        // Calculer les statistiques
        const stats = this.calculateStats(points);
        
        this.data = {
            name: trackName,
            description: trackDesc,
            points: points,
            stats: stats,
            bounds: this.calculateBounds(points)
        };
        
        return this.data;
    }

    /**
     * Extrait les données de chaque trackpoint
     */
    extractTrackpoints(trackpoints) {
        const points = [];
        let totalDistance = 0;
        let lastPoint = null;
        
        trackpoints.forEach((trkpt, index) => {
            // Données de base
            const point = {
                index: index,
                lat: parseFloat(trkpt.getAttribute('lat')),
                lon: parseFloat(trkpt.getAttribute('lon')),
                ele: parseFloat(trkpt.querySelector('ele')?.textContent || 0),
                time: new Date(trkpt.querySelector('time')?.textContent)
            };
            
            // Extensions Garmin/Amazfit
            const extensions = trkpt.querySelector('extensions');
            if (extensions) {
                // Vitesse (m/s -> km/h)
                const speedElement = extensions.querySelector('speed');
                point.speed = speedElement ? parseFloat(speedElement.textContent) * 3.6 : 0;
                
                // Fréquence cardiaque
                const hrElement = extensions.querySelector('hr');
                point.heartRate = hrElement ? parseInt(hrElement.textContent) : null;
                
                // Cadence
                const cadElement = extensions.querySelector('cad');
                point.cadence = cadElement ? parseFloat(cadElement.textContent) : null;
                
                // Puissance (pour vélo)
                const powerElement = extensions.querySelector('power');
                point.power = powerElement ? parseInt(powerElement.textContent) : null;
            }
            
            // Calculer la distance depuis le dernier point
            if (lastPoint) {
                const dist = this.haversineDistance(
                    lastPoint.lat, lastPoint.lon,
                    point.lat, point.lon
                );
                totalDistance += dist;
                
                // Calculer le temps écoulé
                point.timeDelta = (point.time - lastPoint.time) / 1000; // secondes
                
                // Calculer la vitesse si non fournie
                if (!point.speed && point.timeDelta > 0) {
                    point.speed = (dist / point.timeDelta) * 3.6; // km/h
                }
            } else {
                point.timeDelta = 0;
            }
            
            point.distance = totalDistance;
            
            // Détection des pauses (vitesse < 0.5 km/h pendant plus de 30s)
            point.isPause = point.speed < 0.5 && point.timeDelta > 30;
            
            points.push(point);
            lastPoint = point;
        });
        
        return points;
    }

    /**
     * Calcule la distance entre deux points GPS (formule Haversine)
     */
    haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Rayon de la Terre en mètres
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    /**
     * Calcule les statistiques globales
     */
    calculateStats(points) {
        if (points.length === 0) return null;
        
        const startTime = points[0].time;
        const endTime = points[points.length - 1].time;
        const duration = (endTime - startTime) / 1000; // secondes
        
        // Distance totale
        const totalDistance = points[points.length - 1].distance;
        
        // Vitesses
        const speeds = points.map(p => p.speed).filter(s => s > 0);
        const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
        const maxSpeed = Math.max(...speeds);
        
        // Altitude
        const elevations = points.map(p => p.ele);
        const minEle = Math.min(...elevations);
        const maxEle = Math.max(...elevations);
        
        // Dénivelé positif/négatif
        let elevGain = 0, elevLoss = 0;
        for (let i = 1; i < points.length; i++) {
            const diff = points[i].ele - points[i-1].ele;
            if (diff > 0) elevGain += diff;
            else elevLoss += Math.abs(diff);
        }
        
        // Fréquence cardiaque
        const heartRates = points.map(p => p.heartRate).filter(hr => hr > 0);
        const avgHeartRate = heartRates.length > 0 
            ? heartRates.reduce((a, b) => a + b, 0) / heartRates.length 
            : null;
        const maxHeartRate = heartRates.length > 0 
            ? Math.max(...heartRates) 
            : null;
        
        // Temps en mouvement (excluant les pauses)
        const movingTime = points
            .filter(p => !p.isPause)
            .reduce((sum, p) => sum + p.timeDelta, 0);
        
        // Nombre de pauses
        const pauseCount = points.filter(p => p.isPause).length;
        
        return {
            startTime,
            endTime,
            duration,
            movingTime,
            pauseTime: duration - movingTime,
            pauseCount,
            totalDistance,
            avgSpeed,
            maxSpeed,
            avgMovingSpeed: totalDistance / movingTime * 3.6,
            minElevation: minEle,
            maxElevation: maxEle,
            elevationGain: elevGain,
            elevationLoss: elevLoss,
            avgHeartRate,
            maxHeartRate,
            pointCount: points.length
        };
    }

    /**
     * Calcule les limites géographiques du parcours
     */
    calculateBounds(points) {
        if (points.length === 0) return null;
        
        const lats = points.map(p => p.lat);
        const lons = points.map(p => p.lon);
        
        return {
            north: Math.max(...lats),
            south: Math.min(...lats),
            east: Math.max(...lons),
            west: Math.min(...lons),
            center: {
                lat: (Math.max(...lats) + Math.min(...lats)) / 2,
                lon: (Math.max(...lons) + Math.min(...lons)) / 2
            }
        };
    }

    /**
     * Exporte les données en JSON
     */
    toJSON() {
        return JSON.stringify(this.data, null, 2);
    }

    /**
     * Réduit le nombre de points pour optimiser l'affichage
     * Utilise l'algorithme Douglas-Peucker
     */
    simplify(tolerance = 0.00001) {
        // À implémenter si nécessaire pour de très gros fichiers
        return this.data.points;
    }
}
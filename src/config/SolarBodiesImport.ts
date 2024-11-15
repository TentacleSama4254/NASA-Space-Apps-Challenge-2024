
import { TextureLoader } from "three";
import { PlanetDataType } from "../types/SolarBodies"

export const distanceFactor = 100000/2;
const timeFactor = 1;

export const PlanetData: Record<string, PlanetDataType> = {

    mercury : {
        name: "Mercury",
        diameter: 4879/distanceFactor , 
        period: 87.97 * timeFactor, 
        texture_path : "/textures/8k_mercury.jpg",
        orbit: {
            a: 5.79091 * Math.pow(10,7) / distanceFactor,
            e: 0.20564,
            inclination: 7.01,
            omega: 29.022,
            raan: 48.378,
        }
    },

    venus : {
        name: "Venus",
        diameter: 6051.8*2/distanceFactor ,
        period: 224.70 * timeFactor, 
        texture_path : "/textures/8k_venus_surface.jpg",
        texture_path1 : "/textures/4k_venus_atmosphere.jpg",
        orbit: {
            a: 1.08209  * Math.pow(10,8) / distanceFactor,
            e: 0.00676,
            inclination: 3.395,
            omega: 131.532, 
            raan: 76.681,
        }
    },

    earth : {
        name: "Earth",
        diameter: 6378.137*2/distanceFactor,
        period: 365.256 * timeFactor, 
        texture_path : "null",
        orbit: {
            a: 1.49598  * Math.pow(10,8) / distanceFactor,
            e: 0.0167, 
            inclination: 0,
            omega: 102.947, 
            raan: -11.260,
        }
    },

    mars : {
        name: "Mars",
        diameter: 3396.2*2/distanceFactor,
        period: 686.980 * timeFactor, 
        texture_path : "/textures/8k_mars.jpg",
        orbit: {
            a: 2.27956  * Math.pow(10,8) / distanceFactor,
            e: 0.0935 ,
            inclination: 1.848,
            omega: 336.04, 
            raan: 49.579,
        }
    },

    jupiter : {
        name: "Jupiter",
        diameter: 71492*2/distanceFactor,
        period: 4332.589 * timeFactor, 
        texture_path : "/textures/8k_jupiter.jpg",
        orbit: {
            a: 7.78479  * Math.pow(10,8) / distanceFactor,
            e: 0.0487,
            inclination: 1.305,
            omega: 14.754, 
            raan: 100.556,
        }
    },

    saturn : {
        name: "Saturn",
        diameter: 60268*2/distanceFactor,
        period: 10755.699* timeFactor, 
        texture_path : "/textures/8k_saturn.jpg",
        texture_path_ring : "/textures/8k_saturn_ring_alpha.png",
        orbit: {
            a: 14.32041  * Math.pow(10,8) / distanceFactor,
            e: 0.0520,
            inclination: 2.486,
            omega: 92.432, 
            raan: 113.715,
        }
    },

    uranus : {
        name: "Uranus",
        diameter: 25559*2/distanceFactor,
        period: 30685.400* timeFactor, 
        texture_path : "/textures/2k_uranus.jpg",
        orbit: {
            a: 28.67043  * Math.pow(10,8) / distanceFactor,
            e: 0.0469,
            inclination: 0.770,
            omega: 170.964, 
            raan: 74.230,
        }
    },

    neptune : {
        name: "Neptune",
        diameter: 24764*2/distanceFactor,
        period: 60189 * timeFactor, 
        texture_path : "/textures/2k_neptune.jpg",
        orbit: {
            a: 45.1495  * Math.pow(10,8) / distanceFactor,
            e: 0.0097,
            inclination: 1.770,
            omega: 44.971, 
            raan: 131.722,
        }
    }
}
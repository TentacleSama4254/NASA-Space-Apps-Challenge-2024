import MercuryMap from "../assets/textures/8k_mercury.jpg"
import VenusMap from "../assets/textures/8k_venus_surface.jpg"
import EarthMap from "../assets/textures/8k_earth_daymap.jpg"
import MarsMap from "../assets/textures/8k_mars.jpg"
import JupiterMap from "../assets/textures/8k_jupiter.jpg"
import SaturnMap from "../assets/textures/8k_saturn.jpg"
import UranusMap from "../assets/textures/2k_uranus.jpg"
import NeptuneMap from "../assets/textures/2k_neptune.jpg"
import { TextureLoader } from "three";
import { PlanetDataType } from "../types/SolarBodies"

const distanceFactor = 1000;
const timeFactor = 1;

export const SolarBodiesImport = {
    MercuryMap,
    VenusMap,
    EarthMap,
    MarsMap,
    JupiterMap,
    SaturnMap,
    UranusMap,
    NeptuneMap,
}

export const PlanetData: Record<string, PlanetDataType> = {

    mercury : {
        name: "Mercury",
        diameter: 4879/distanceFactor, 
        distanceFromSun: 57900000/distanceFactor,
        period: 87.97 * timeFactor, 
        texture_path : "/textures/8k_mercury.jpg",
        position: [20,0,0],
        orbit: {
            a: 5.79091 * Math.pow(10,7) / distanceFactor,
            e: 0.20564,
            q: 4.60009* Math.pow(10,7) / distanceFactor,
            inclination: 7.01,
            omega: 29.022,
            raan: 48.378,
        }
    }
}
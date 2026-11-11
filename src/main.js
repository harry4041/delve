import './style.css';
import {load} from './state.js';
import {loop} from './render.js';
import {view} from './camp.js';
load();view();requestAnimationFrame(loop);

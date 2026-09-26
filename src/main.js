// Module entry (index.html loads only this). Import order is load order:
// platform.js defines window.Platform, the data files define window.FishData
// / AquariumData / Achievements / RequestsData, and game.js -- which reads all of them as
// globals -- comes last.
import './style.css';
import './platform.js';
import './version.js';
import './fish-data.js';
import './aquarium-data.js';
import './achievements-data.js';
import './requests-data.js';
import './game.js';

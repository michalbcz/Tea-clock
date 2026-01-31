// Tea-clock Vanilla JavaScript implementation
// Refactored from AngularJS and CoffeeScript

// Constants
const SOUND = true;
const CANCEL_TIMEOUT = 10000;
const CHOSEN_TEA = "chosen_tea";
const CUSTOM_TIMER = "custom_timer";
const CHOSEN_DEGREE = "chosen_degree";

// Tea data
const teas = [
    {name: "white", title: "White tea", temp: "65 - 70", time: 90},
    {name: "yellow", title: "Yellow tea", temp: "70 - 75", time: 90},
    {name: "green", title: "Green tea", temp: "75 - 80", time: 90},
    {name: "oolong", title: "Oolong tea", temp: "80 - 85", time: 150},
    {name: "black", title: "Black tea", temp: "99", time: 150},
    {name: "herbal", title: "Herbal tea", temp: "99", time: 300},
    {name: "fruit", title: "Fruit tea", temp: "99", time: 480}
];

// Temperature units (limited to Celsius and Fahrenheit)
const degrees = [
    {name: "celsius", title: "Celsius", symbol: "C", formula: (val) => val},
    {name: "fahrenheit", title: "Fahrenheit", symbol: "F", formula: (val) => val * 9 / 5 + 32}
];

// Application state
let state = {
    selectedTea: teas[0],
    chosenDegree: degrees[0],
    time: teas[0].time,
    timer: null,
    actualTime: 0,
    timerRunning: false
};

// Sound for notification
const snd = new Audio('snd/alarm.mp3');
let notificationPopup = null;

// Utils
const Utils = {
    formatTime: function(secs) {
        const minutes = Math.floor(secs / 60);
        let secondsRemainder = secs - (minutes * 60);
        if (secondsRemainder < 10) {
            secondsRemainder = "0" + secondsRemainder;
        }
        return minutes + ":" + secondsRemainder;
    },

    convertTemp: function(degree, temperature) {
        const degreeType = degree.symbol;
        const dashPosition = temperature.search('-');
        
        const convert = (tempString, degree) => {
            const val = parseInt(tempString);
            return degree.formula(val);
        };

        if (degreeType !== 'C') {
            if (dashPosition > 0) {
                const temp1 = temperature.substring(0, dashPosition);
                const temp2 = temperature.substring(dashPosition + 1);
                return convert(temp1, degree) + ' - ' + convert(temp2, degree);
            } else {
                return convert(temperature, degree).toString();
            }
        } else {
            return temperature;
        }
    },

    gaTrack: function(tea, degree, time) {
        if (typeof _gaq !== 'undefined') {
            _gaq.push(['_trackEvent', 'start-tea', tea]);
            _gaq.push(['_trackEvent', 'degree', degree]);
            _gaq.push(['_trackEvent', 'start-time', time]);
        }
    }
};

// Notification handling
const Notification = {
    supported: function() {
        return typeof window.Notification !== 'undefined';
    },

    checkPermission: function() {
        if (window.Notification && window.Notification.permission !== "granted") {
            window.Notification.requestPermission();
        }
    },

    display: function(title, message) {
        if (window.Notification && window.Notification.permission === "granted") {
            notificationPopup = new window.Notification(title, {
                body: message,
                icon: "img/icon.png"
            });

            if (SOUND) {
                snd.play();
            }

            notificationPopup.onclick = function() {
                notificationPopup.close();
            };

            notificationPopup.onclose = function() {
                snd.pause();
            };

            setTimeout(function() {
                if (notificationPopup) {
                    notificationPopup.close();
                }
                snd.pause();
            }, CANCEL_TIMEOUT);
        }
    }
};

// Storage functions
function loadSelection() {
    const storedTea = localStorage.getItem(CHOSEN_TEA);
    const storedDegree = localStorage.getItem(CHOSEN_DEGREE) || 'celsius';
    const storedTimer = localStorage.getItem(CUSTOM_TIMER);

    if (storedTea) {
        const tea = teas.find(t => t.name === storedTea);
        if (tea) {
            state.selectedTea = tea;
        }
    }

    const degree = degrees.find(d => d.name === storedDegree);
    if (degree) {
        state.chosenDegree = degree;
    }

    if (storedTimer) {
        state.time = parseInt(storedTimer);
    } else {
        state.time = state.selectedTea.time;
    }
}

function saveSelection() {
    localStorage.setItem(CHOSEN_TEA, state.selectedTea.name);
    localStorage.setItem(CUSTOM_TIMER, state.time);
    localStorage.setItem(CHOSEN_DEGREE, state.chosenDegree.name);
}

// UI Update functions
function updateInfoPanel() {
    document.getElementById('teaName').textContent = state.selectedTea.title;
    document.getElementById('displayTime').textContent = Utils.formatTime(state.time);
    
    const convertedTemp = Utils.convertTemp(state.chosenDegree, state.selectedTea.temp);
    document.getElementById('displayTemp').textContent = convertedTemp + ' °' + state.chosenDegree.symbol;
}

function updateTimeInput() {
    document.getElementById('timeInput').value = state.time;
}

function updateTitle(time) {
    document.title = "[" + Utils.formatTime(time) + "] Tea-clock";
}

function resetTitle() {
    document.title = "Tea-clock";
}

// Timer functions
function startTimer() {
    Notification.checkPermission();
    
    saveSelection();
    Utils.gaTrack(state.selectedTea.name, state.chosenDegree.name, state.time);
    
    state.actualTime = state.time;
    state.timerRunning = true;
    
    // Update modal content
    document.getElementById('modalTeaName').textContent = state.selectedTea.title;
    document.getElementById('modalTime').textContent = Utils.formatTime(state.actualTime);
    
    // Show modal
    const modal = document.getElementById('countdownModal');
    modal.style.display = 'block';
    modal.classList.add('show');
    
    // Start countdown
    tick();
}

function tick() {
    if (state.timerRunning && state.actualTime > 0) {
        state.actualTime -= 1;
        updateTitle(state.actualTime);
        
        // Update modal
        document.getElementById('modalTime').textContent = Utils.formatTime(state.actualTime);
        const percentage = (state.actualTime / state.time) * 100;
        document.getElementById('countdownBar').style.width = percentage + '%';
        
        state.timer = setTimeout(tick, 1000);
    } else if (state.actualTime <= 0 && state.timerRunning) {
        // Display notification before stopping timer
        Notification.display('Tea-clock', 'Your tea is ready!');
        stopTimer();
        resetTitle();
    }
}

function stopTimer() {
    state.timerRunning = false;
    if (state.timer) {
        clearTimeout(state.timer);
        state.timer = null;
    }
    
    // Hide modal
    const modal = document.getElementById('countdownModal');
    modal.style.display = 'none';
    modal.classList.remove('show');
    
    resetTitle();
}

// Event handlers
function onTeaChange() {
    const teaSelect = document.getElementById('teaSelect');
    const teaName = teaSelect.value;
    const tea = teas.find(t => t.name === teaName);
    
    if (tea) {
        state.selectedTea = tea;
        state.time = tea.time;
        updateInfoPanel();
        updateTimeInput();
    }
}

function onDegreeChange(degreeName) {
    const degree = degrees.find(d => d.name === degreeName);
    if (degree) {
        state.chosenDegree = degree;
        updateInfoPanel();
    }
}

function onTimeChange() {
    const timeInput = document.getElementById('timeInput');
    const newTime = parseInt(timeInput.value);
    
    if (!isNaN(newTime) && newTime > 0) {
        state.time = newTime;
        updateInfoPanel();
    }
}

// Initialize the application
function init() {
    // Check notification support
    if (!Notification.supported()) {
        document.getElementById('notificationWarning').style.display = 'block';
    }
    
    // Load saved selection
    loadSelection();
    
    // Populate tea select
    const teaSelect = document.getElementById('teaSelect');
    teas.forEach(tea => {
        const option = document.createElement('option');
        option.value = tea.name;
        option.textContent = tea.title;
        if (tea.name === state.selectedTea.name) {
            option.selected = true;
        }
        teaSelect.appendChild(option);
    });
    
    // Set up degree buttons
    const degreeButtons = document.getElementById('degreeButtons');
    degrees.forEach(degree => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-default';
        button.textContent = degree.title;
        button.setAttribute('data-degree', degree.name);
        
        if (degree.name === state.chosenDegree.name) {
            button.classList.add('active');
        }
        
        button.addEventListener('click', function() {
            // Remove active from all buttons
            degreeButtons.querySelectorAll('button').forEach(btn => {
                btn.classList.remove('active');
            });
            // Add active to clicked button
            this.classList.add('active');
            onDegreeChange(degree.name);
        });
        
        degreeButtons.appendChild(button);
    });
    
    // Update UI
    updateInfoPanel();
    updateTimeInput();
    
    // Set up event listeners
    teaSelect.addEventListener('change', onTeaChange);
    document.getElementById('timeInput').addEventListener('input', onTimeChange);
    document.getElementById('steepButton').addEventListener('click', startTimer);
    document.getElementById('resetButton').addEventListener('click', stopTimer);
    
    // Close modal on backdrop click
    document.getElementById('countdownModal').addEventListener('click', function(e) {
        if (e.target === this) {
            stopTimer();
        }
    });
    
    // Close modal button
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', stopTimer);
    });
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

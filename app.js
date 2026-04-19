document.addEventListener('DOMContentLoaded', () => {
    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        document.body.classList.toggle('light-mode');
        themeToggle.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
    });

    // Tab Switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
        });
    });

    // TM Core State
    let tape = {}; // index -> symbol
    let head = 0;
    let currentState = '';
    let startState = '';
    let acceptState = '';
    let rejectState = '';
    let blankSymbol = '_';
    let stepCount = 0;
    let status = 'Stopped'; // Stopped, Running, Paused, Accepted, Rejected
    let isRunning = false;
    let runTimeout = null;
    let logHistory = [];
    
    // UI Elements
    const tapeWindow = document.getElementById('tape-window');
    const btnStart = document.getElementById('btn-start');
    const btnStep = document.getElementById('btn-step');
    const btnRun = document.getElementById('btn-run');
    const btnPause = document.getElementById('btn-pause');
    const btnReset = document.getElementById('btn-reset');
    const speedSlider = document.getElementById('speed-slider');
    const speedValue = document.getElementById('speed-value');
    
    const displayState = document.getElementById('display-state');
    const displaySymbol = document.getElementById('display-symbol');
    const displayStep = document.getElementById('display-step');
    const displayStatus = document.getElementById('display-status');
    const displayRule = document.getElementById('display-rule');
    const finalTapeContainer = document.getElementById('final-tape-container');
    const displayFinalTape = document.getElementById('display-final-tape');
    const logContainer = document.getElementById('log-container');

    // Transitions state
    // Array of {state, read, nextState, write, move}
    let transitions = [];

    const CELL_WIDTH = 64; // 60px width + 4px horizontal margin (2px each side)
    const RENDER_RADIUS = 15; // Render 15 cells to the left and right of head

    // --- Configuration Parsing ---

    function getInitialConfig() {
        startState = document.getElementById('start-state').value.trim();
        acceptState = document.getElementById('accept-state').value.trim();
        rejectState = document.getElementById('reject-state').value.trim();
        const initialTapeStr = document.getElementById('initial-tape').value;
        
        tape = {};
        for(let i=0; i<initialTapeStr.length; i++) {
            tape[i] = initialTapeStr[i];
        }
        if (initialTapeStr.length === 0) {
            tape[0] = blankSymbol;
        }
        
        head = 0;
        currentState = startState;
        stepCount = 0;
        status = 'Ready';
        logHistory = [];
        updateLogUI();
        parseTransitions();
        if(finalTapeContainer) finalTapeContainer.style.display = 'none';
    }

    function getFinalTapeString() {
        const indices = Object.keys(tape).map(Number).sort((a, b) => a - b);
        if (indices.length === 0) return '';
        let min = indices[0];
        let max = indices[indices.length - 1];
        
        while (min <= max && (tape[min] === blankSymbol || tape[min] === undefined)) min++;
        while (max >= min && (tape[max] === blankSymbol || tape[max] === undefined)) max--;
        
        if (min > max) return '[Empty Tape]';
        
        let result = '';
        for (let i = min; i <= max; i++) {
            result += (tape[i] === undefined) ? blankSymbol : tape[i];
        }
        return result;
    }

    function showFinalTape() {
        if(finalTapeContainer) {
            finalTapeContainer.style.display = 'block';
            displayFinalTape.textContent = getFinalTapeString();
        }
    }

    function parseTransitions() {
        transitions = [];
        const activeTab = document.querySelector('.tab-btn.active').dataset.target;
        
        if (activeTab === 'visual-editor') {
            const rows = document.querySelectorAll('.transition-row');
            rows.forEach(row => {
                const state = row.querySelector('.s-state').value.trim();
                const read = row.querySelector('.s-read').value.trim() || blankSymbol;
                const nextState = row.querySelector('.s-next').value.trim();
                const write = row.querySelector('.s-write').value.trim() || blankSymbol;
                const move = row.querySelector('.s-move').value;
                if (state && nextState) {
                    transitions.push({ state, read, nextState, write, move });
                }
            });
        } else {
            const lines = document.getElementById('bulk-transitions').value.split('\n');
            lines.forEach(line => {
                // e.g. q0, 1 -> q1, 0, R  or  (q0, 1) -> (q1, 0, R)
                const cleanLine = line.replace(/[()]/g, '');
                const match = cleanLine.match(/^\s*([^,]+)\s*,\s*([^-\s]+)\s*->\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([LR])\s*$/i);
                if (match) {
                    transitions.push({
                        state: match[1].trim(),
                        read: match[2].trim(),
                        nextState: match[3].trim(),
                        write: match[4].trim(),
                        move: match[5].toUpperCase()
                    });
                }
            });
        }
    }

    function getTransition(state, symbol) {
        return transitions.find(t => t.state === state && t.read === symbol);
    }

    // --- Tape Rendering & Animation ---

    function renderTape() {
        tapeWindow.style.transition = 'none';
        tapeWindow.style.transform = 'translateX(0px)';
        tapeWindow.innerHTML = '';
        
        for (let i = head - RENDER_RADIUS; i <= head + RENDER_RADIUS; i++) {
            const symbol = tape[i] !== undefined ? tape[i] : blankSymbol;
            const cell = document.createElement('div');
            cell.className = 'tape-cell';
            cell.textContent = symbol === blankSymbol ? '' : symbol; // show empty for blank or actual symbol
            cell.dataset.index = i;
            if (i === head) {
                cell.id = 'current-head-cell';
            }
            tapeWindow.appendChild(cell);
        }
        
        updateStatusUI();
    }

    function updateStatusUI() {
        const symbol = tape[head] !== undefined ? tape[head] : blankSymbol;
        displayState.textContent = currentState;
        displaySymbol.textContent = symbol;
        displayStep.textContent = stepCount;
        
        displayStatus.textContent = status;
        displayStatus.className = 'status-badge ' + status.toLowerCase();
        
        if (status === 'Accepted' || status === 'Rejected' || status === 'Ready') {
            btnStep.disabled = true;
            btnRun.disabled = true;
            btnPause.disabled = true;
            if (status === 'Ready') {
                btnStep.disabled = false;
                btnRun.disabled = false;
            }
        } else if (status === 'Running') {
            btnStart.disabled = true;
            btnStep.disabled = true;
            btnRun.disabled = true;
            btnPause.disabled = false;
        } else {
            // Paused / Stopped
            btnStart.disabled = false;
            btnStep.disabled = false;
            btnRun.disabled = false;
            btnPause.disabled = true;
        }
    }

    // --- Execution Logic ---

    function step() {
        if (status === 'Accepted' || status === 'Rejected') return Promise.resolve(false);
        
        const symbol = tape[head] !== undefined ? tape[head] : blankSymbol;
        const rule = getTransition(currentState, symbol);
        
        if (!rule) {
            // No rule found, check if it's an accept/reject state
            if (currentState === acceptState) {
                status = 'Accepted';
                addLog('Halted in Accept State.', 'success');
            } else if (currentState === rejectState) {
                status = 'Rejected';
                addLog('Halted in Reject State.', 'error');
            } else {
                status = 'Rejected';
                addLog(`Crash: No transition for (${currentState}, ${symbol}).`, 'error');
            }
            updateStatusUI();
            showFinalTape();
            return Promise.resolve(false);
        }

        // Apply rule
        const prevSymbol = symbol;
        tape[head] = rule.write;
        currentState = rule.nextState;
        stepCount++;
        status = isRunning ? 'Running' : 'Paused';
        
        const ruleStr = `(${rule.state}, ${prevSymbol}) → (${rule.nextState}, ${rule.write}, ${rule.move})`;
        displayRule.textContent = ruleStr;
        addLog(`Step ${stepCount}: ${ruleStr}`);

        // UI update for write
        const currentCell = document.getElementById('current-head-cell');
        if (currentCell && prevSymbol !== rule.write) {
            currentCell.textContent = rule.write === blankSymbol ? '' : rule.write;
            currentCell.classList.add('updated');
        }

        updateStatusUI();

        // Animate move
        return new Promise(resolve => {
            const speed = parseInt(speedSlider.value);
            // Reverse speed calculation: slider 50(fast) to 2000(slow)
            const animDuration = Math.min(speed * 0.8, 300); // Animation takes 80% of step time, max 300ms
            
            tapeWindow.style.transition = `transform ${animDuration}ms cubic-bezier(0.25, 1, 0.5, 1)`;
            const moveOffset = rule.move === 'R' ? -CELL_WIDTH : CELL_WIDTH;
            tapeWindow.style.transform = `translateX(${moveOffset}px)`;
            
            setTimeout(() => {
                head += rule.move === 'R' ? 1 : -1;
                renderTape(); // Re-center
                resolve(true);
            }, speed); // Wait full speed duration before resolving
        });
    }

    async function runMachine() {
        isRunning = true;
        status = 'Running';
        updateStatusUI();
        
        while (isRunning) {
            const canContinue = await step();
            if (!canContinue) {
                isRunning = false;
                break;
            }
        }
    }

    // --- Event Listeners ---

    btnStart.addEventListener('click', () => {
        getInitialConfig();
        renderTape();
        displayRule.textContent = 'None';
    });

    btnStep.addEventListener('click', async () => {
        isRunning = false;
        await step();
    });

    btnRun.addEventListener('click', () => {
        if (status === 'Stopped' || status === 'Ready' || status === 'Paused') {
            if (status === 'Stopped') {
                getInitialConfig();
                renderTape();
            }
            runMachine();
        }
    });

    btnPause.addEventListener('click', () => {
        isRunning = false;
        status = 'Paused';
        updateStatusUI();
    });

    btnReset.addEventListener('click', () => {
        isRunning = false;
        clearTimeout(runTimeout);
        getInitialConfig();
        renderTape();
        displayRule.textContent = 'None';
        logContainer.innerHTML = '<div style="color: var(--text-muted); text-align: center; margin-top: 80px;">Logs will appear here...</div>';
    });

    speedSlider.addEventListener('input', (e) => {
        speedValue.textContent = e.target.value + 'ms';
    });

    // --- Transitions Editor Logic ---

    const transitionList = document.getElementById('transition-list');
    const btnAddTransition = document.getElementById('add-transition-btn');

    function createTransitionRow(state='', read='', next='', write='', move='R') {
        const row = document.createElement('div');
        row.className = 'transition-row';
        row.innerHTML = `
            <input type="text" class="s-state" placeholder="State" value="${state}">
            <input type="text" class="s-read" placeholder="Read" value="${read}" maxlength="1">
            <span class="arrow">→</span>
            <input type="text" class="s-next" placeholder="Next" value="${next}">
            <input type="text" class="s-write" placeholder="Write" value="${write}" maxlength="1">
            <select class="s-move">
                <option value="R" ${move==='R'?'selected':''}>R</option>
                <option value="L" ${move==='L'?'selected':''}>L</option>
            </select>
            <button class="del-btn" title="Remove">&times;</button>
        `;
        row.querySelector('.del-btn').addEventListener('click', () => row.remove());
        return row;
    }

    btnAddTransition.addEventListener('click', () => {
        transitionList.appendChild(createTransitionRow());
        transitionList.scrollTop = transitionList.scrollHeight;
    });

    document.getElementById('apply-bulk-btn').addEventListener('click', () => {
        alert('Transitions applied! (Switch to Visual Editor to see them, or just press Initialize to use them).');
        // If we want to sync bulk to visual, we can do it here, but it might be complex.
        // For simplicity, we just rely on parsing when Initialize is pressed.
        parseTransitions();
    });

    // --- Logging ---

    function addLog(msg, type='normal') {
        logHistory.push(msg);
        updateLogUI();
    }

    function updateLogUI() {
        if (logHistory.length === 0) return;
        
        if (logHistory.length === 1) {
            logContainer.innerHTML = '';
        }

        const msg = logHistory[logHistory.length - 1];
        const div = document.createElement('div');
        div.className = 'log-entry';
        
        if (msg.startsWith('Crash') || msg.includes('error')) {
            div.classList.add('error');
            div.innerHTML = msg;
        } else if (msg.startsWith('Halted')) {
            div.classList.add('success');
            div.innerHTML = msg;
        } else {
            // normal step
            const match = msg.match(/^Step (\d+): (.*)$/);
            if (match) {
                div.innerHTML = `<span class="step-num">[${match[1]}]</span> <span class="log-rule">${match[2]}</span>`;
            } else {
                div.textContent = msg;
            }
        }
        
        logContainer.appendChild(div);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    document.getElementById('btn-download-log').addEventListener('click', () => {
        const text = logHistory.join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tm-execution-log.txt';
        a.click();
        URL.revokeObjectURL(url);
    });

    // --- Save/Load Config ---
    
    document.getElementById('save-config-btn').addEventListener('click', () => {
        parseTransitions();
        const config = {
            initialTape: document.getElementById('initial-tape').value,
            startState: document.getElementById('start-state').value,
            acceptState: document.getElementById('accept-state').value,
            rejectState: document.getElementById('reject-state').value,
            transitions: transitions
        };
        localStorage.setItem('tm-config', JSON.stringify(config));
        alert('Configuration saved to local storage!');
    });

    document.getElementById('load-config-btn').addEventListener('click', () => {
        const data = localStorage.getItem('tm-config');
        if (data) {
            loadConfig(JSON.parse(data));
        } else {
            alert('No saved configuration found.');
        }
    });

    function loadConfig(config) {
        document.getElementById('initial-tape').value = config.initialTape;
        document.getElementById('start-state').value = config.startState;
        document.getElementById('accept-state').value = config.acceptState;
        document.getElementById('reject-state').value = config.rejectState;
        
        transitionList.innerHTML = '';
        let bulkText = '';
        config.transitions.forEach(t => {
            transitionList.appendChild(createTransitionRow(t.state, t.read, t.nextState, t.write, t.move));
            bulkText += `${t.state}, ${t.read} -> ${t.nextState}, ${t.write}, ${t.move}\n`;
        });
        document.getElementById('bulk-transitions').value = bulkText.trim();
        
        document.getElementById('btn-start').click(); // Initialize
    }

    // --- Preloaded Examples ---

    const preloaded = {
        'load-bin-inc': {
            initialTape: '1011',
            startState: 'q0',
            acceptState: 'q_accept',
            rejectState: 'q_reject',
            transitions: [
                { state: 'q0', read: '0', nextState: 'q0', write: '0', move: 'R' },
                { state: 'q0', read: '1', nextState: 'q0', write: '1', move: 'R' },
                { state: 'q0', read: '_', nextState: 'q1', write: '_', move: 'L' },
                { state: 'q1', read: '1', nextState: 'q1', write: '0', move: 'L' },
                { state: 'q1', read: '0', nextState: 'q_accept', write: '1', move: 'L' },
                { state: 'q1', read: '_', nextState: 'q_accept', write: '1', move: 'L' }
            ]
        },
        'load-replace': {
            initialTape: '010010',
            startState: 'q0',
            acceptState: 'q_accept',
            rejectState: 'q_reject',
            transitions: [
                { state: 'q0', read: '0', nextState: 'q0', write: '1', move: 'R' },
                { state: 'q0', read: '1', nextState: 'q0', write: '1', move: 'R' },
                { state: 'q0', read: '_', nextState: 'q_accept', write: '_', move: 'L' }
            ]
        },
        'load-even-1s': {
            initialTape: '101011',
            startState: 'q_even',
            acceptState: 'q_accept',
            rejectState: 'q_reject',
            transitions: [
                { state: 'q_even', read: '0', nextState: 'q_even', write: '0', move: 'R' },
                { state: 'q_even', read: '1', nextState: 'q_odd', write: '1', move: 'R' },
                { state: 'q_odd', read: '0', nextState: 'q_odd', write: '0', move: 'R' },
                { state: 'q_odd', read: '1', nextState: 'q_even', write: '1', move: 'R' },
                { state: 'q_even', read: '_', nextState: 'q_accept', write: '_', move: 'L' }
            ]
        },
        'load-reverse': { // Actually just "Find End (Right)" as string reverse is complex to set up simply
            initialTape: 'abcd',
            startState: 'q0',
            acceptState: 'q_accept',
            rejectState: 'q_reject',
            transitions: [
                { state: 'q0', read: 'a', nextState: 'q0', write: 'a', move: 'R' },
                { state: 'q0', read: 'b', nextState: 'q0', write: 'b', move: 'R' },
                { state: 'q0', read: 'c', nextState: 'q0', write: 'c', move: 'R' },
                { state: 'q0', read: 'd', nextState: 'q0', write: 'd', move: 'R' },
                { state: 'q0', read: '_', nextState: 'q_accept', write: '_', move: 'L' }
            ]
        }
    };

    ['load-bin-inc', 'load-replace', 'load-even-1s', 'load-reverse'].forEach(id => {
        document.getElementById(id).addEventListener('click', () => {
            loadConfig(preloaded[id]);
        });
    });

    // Initialization
    // Add one empty row on load
    transitionList.appendChild(createTransitionRow());
    getInitialConfig();
    renderTape();

});

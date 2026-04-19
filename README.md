# Turing Machine Simulator

A robust, visually immersive, and browser-based Turing Machine simulator. This project serves as a professional-grade educational tool that demonstrates theoretical computation through a responsive, high-performance interface.

## Features

- **Interactive Infinite Tape**: Visual representation of the Turing machine's tape with dynamic cell highlighting, updates, and smooth animations.
- **Transition Rule Editor**: Easy-to-use interface to define current states, read symbols, write symbols, head movement directions (Left, Right, Neutral), and next states.
- **Execution Controls**: Run, step, pause, and reset the simulation. Adjust execution speed dynamically with a slider.
- **State & Symbol Display**: Real-time tracking of the current state, symbol under the read/write head, and steps executed.
- **Execution Log**: Detailed history of applied rules and machine status for easy debugging and tracking.
- **Dark Mode**: Sleek dark mode design for better visibility and user preference.
- **Local Storage**: Automatically saves your transition rules and tape configurations in the browser.

## Technology Stack

- **HTML5**: Semantic and accessible structure.
- **CSS3**: Vanilla CSS with modern UI techniques (Glassmorphism, CSS variables, Flexbox/Grid) for a premium, responsive design.
- **Vanilla JavaScript**: Core logic for the Turing Machine simulation engine, DOM manipulation, and state management without external dependencies.

## How to Run

1. Clone or download this repository.
2. Open the `index.html` file in any modern web browser.
3. No build tools, package managers, or local servers are required!

## Usage Guide

1. **Setup the Tape**: Enter the initial input string into the designated input field to populate the tape.
2. **Define Rules**: Add transition rules using the editor. For each rule, specify:
   - `Current State`: The state the machine is currently in.
   - `Read`: The symbol currently under the tape head.
   - `Write`: The symbol to write to the tape.
   - `Move`: The direction to move the head (`L` for Left, `R` for Right, `N` for Neutral/Stay).
   - `Next State`: The state to transition to.
3. **Set Initial State**: Specify the starting state (e.g., `q0`).
4. **Run Simulation**: 
   - Click **Step** to execute a single instruction and pause.
   - Click **Run** to execute automatically. You can adjust the speed using the slider.
   - Click **Pause** to halt execution temporarily.
   - Click **Reset** to return the machine and tape to their initial configurations.
5. **Observe**: Watch the tape head move and the execution log update as the machine processes the input. The simulation halts automatically when it reaches an accept state, a reject state, or if no valid transition rule is found for the current state and symbol.

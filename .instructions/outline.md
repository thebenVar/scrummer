# Role
Act as an Expert Front-End Developer and UI/UX Designer.

# Task
Generate the complete code for a modern, feature-rich **Advanced Work Time Tracker & Task Manager** web application.

# Core Requirements

## 1. Application Features & Hierarchy
* **Hierarchical Data Entry:** Before starting a timer, the user must be able to specify the hierarchy of their work:
  * Client Name (Input or Dropdown)
  * Project Name (Input or Dropdown)
  * Task Name (Input)
* **Status Tracking:** Every task must track its current lifecycle status: `Pending`, `In Progress`, `On Hold/Pause`, or `Completed`.
* **Advanced Timer Controls:** * A prominent digital clock (`HH:MM:SS` format).
  * "Start" button (changes task status to `In Progress`).
  * "Pause" button (changes task status to `On Hold/Pause`).
  * "Complete & Save" button (changes task status to `Completed` and logs the session).
  * "Time Zone and Time" label (default to user time zone, serves the session time of the day).
* **Time Log Dashboard:** A section displaying previously recorded work sessions detailing the Client, Project, Task, Status, Start/End Time, and Total Duration.
* **Reporting & Analytics:** A dedicated tab, section, or modal that generates a summary report. It should calculate and display the total time spent grouped by **Client**, then subdivided by **Project**, and finally down to the individual **Task**, each group should be shrinked or expanted.
* **Data Persistence:** Use browser `localStorage` to save the active timer state, task statuses, clients/projects list, and the history of logged work sessions.

## 2. Advanced Theming (Light, Dark & System Modes)
* Implement a sleek theme toggle switch with three options: **Light**, **Dark**, and **System**.
* **System Mode** should automatically detect and adapt to the user's OS preference using the `prefers-color-scheme` media query.
* Use Tailwind to define the color palettes for both light and dark modes (e.g., backgrounds, text colors, primary accents, borders, status badge colors).

## 3. Responsive Design (Mobile, Tablet, Desktop)
* Build a mobile-first layout using tailwind.
* **Mobile View:** Stacked layout, large touch-friendly buttons, bottom or top navigation bar to switch between "Timer", "Logs", and "Reports".
* **Tablet View:** Adjusted paddings, multi-column grid for the time logs and reports.
* **Desktop View:** A polished dashboard layout (e.g., sidebar for navigation/controls, main area for active timer, list of tasks, and detailed statistics). Ensure it utilizes the screen real estate well.
* Ensure all UI elements scale gracefully without horizontal scrolling.

## 4. UI/UX & Motion UI (Animations)
* **Best-in-Class UI:** The design should look like a premium modern SaaS product (e.g., glassmorphism accents, soft drop shadows, rounded corners, modern sans-serif typography like Inter or Roboto).
* **Status Badges:** Use visually distinct, color-coded pill badges for statuses (e.g., Gray for `Pending`, Blue for `In Progress`, Orange/Yellow for `On Hold`, Green for `Completed`).
* **Motion UI Elements:**
  * Smooth color transitions when switching between Light and Dark modes.
  * Micro-interactions on buttons and form inputs (hover states, scale down slightly on click, focus rings).
  * Entrance animations for new time logs and report generation (fade-in and slide-up).
  * A subtle pulsing animation or ring indicator on the active timer display when it is currently running.

# Code Constraints
* Write semantic, accessible HTML5 using Svelte components (utilize `<header>`, `<main>`, `<section>`, `<nav>`, `<button>`, etc.).
* Use Tailwind CSS for all styling, adopting a utility-first approach to maintain a scalable and consistent design system.
* Implement application logic using modern ES6+ JavaScript/TypeScript within Svelte's `<script>` blocks. Manage state with Svelte stores and reactive declarations (`$:`). Use `setInterval` for timers, ensuring proper lifecycle cleanup via `onDestroy`.
* Use SvelteKit with Vite as the framework and build tool. Avoid outdated libraries like jQuery or unnecessary heavy frameworks like React.
* Ensure compatibility with Bun as the runtime and package manager (use `bun install` and `bun run dev`).
* Keep the project lightweight, fast, and optimized for Bun’s performance advantages.


Please provide the complete code along with brief instructions on how to run and test it.
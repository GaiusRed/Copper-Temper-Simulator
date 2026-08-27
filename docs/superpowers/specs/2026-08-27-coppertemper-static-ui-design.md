# CopperTemper Static UI Design

## Purpose

CopperTemper will provide a static visual recreation of the ManaForge
simulator page. The page will use CopperTemper branding. It will not include
game data, simulation code, user actions, a version note, or a changelog link.

## Technology

The project will use Vite, Preact, and plain CSS. This setup provides a small,
current client application without the old Vue and Tailwind dependencies.

## Page Layout

The page will have these areas:

- A slate header with the CopperTemper title.
- A responsive workspace based on ManaForge's multi-panel layout.
- A selection panel with static labels, selects, categories, and blank item
  controls.
- A central forge panel with static equipment and material areas.
- An explanation panel with inactive navigation controls and empty content.

On narrow screens, panels will stack. On wide screens, they will use columns.
The page has no footer.

## Static Behavior

All fields and buttons are visual controls only. The controls have no event
handlers, data imports, application state, persistence, calculations, or
network requests. Repeated blank controls use local presentation constants
only. They do not represent ManaForge item data.

## Components

`App` owns the complete page structure. Small presentational components can
render repeated static controls or panels. Components receive display text
only, and they do not contain application logic.

## Errors And Validation

The Vite build must complete without errors. A production preview must render
the CopperTemper page without a version footer or interactive behavior.
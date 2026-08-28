# CopperTemper Explanation Inspector Design

## Purpose

The explanation interface will show the complete result of a selected recipe
step before it shows calculation details. It will not make the page taller as
recipe steps are added.

## Main Interface

The Statistics column will contain a compact explanation summary. This summary
will show the effects of the selected ingredient and an **Open inspector**
button.

The button will open a drawer from the right side of the viewport. A backdrop
will separate the drawer from the workspace. The drawer will contain these
areas:

- A header with the title and a close button.
- One select control for the recipe step.
- A compact phase rail on the left.
- A detail area for the selected phase on the right.

The drawer will close when the user selects the close button, selects the
backdrop, or presses Escape. On narrow screens, the drawer will use the full
viewport width.

## Step And Phase Selection

The step select will replace the row of step buttons. It will contain the
initial state and each ingredient step.

When an ingredient step becomes selected, the final phase will become selected.
This rule applies after these actions:

- Add an ingredient.
- Select a recipe step.
- Select a step in the inspector.
- Reorder the recipe.
- Remove an ingredient when another step remains selected.
- Import a recipe with ingredients.

An imported recipe will select its last ingredient and final phase. If no
ingredient is selected, the interface will show the initial state and no phase
selection.

## Final Phase Summary

The final phase will show the complete effects of the selected ingredient. The
summary will derive its values from all phases in that step.

Each changed value will show its value before and after the step. It will also
show the phase that caused the change. The summary will omit operations that do
not change the final state.

A user can select an earlier phase to inspect its individual events. Phases
with effects will have a small visual marker in the phase rail.

## Sizing And Scrolling

The interface will use a smaller font for the phase rail than for the detail
area. All 15 phases will fit at common desktop viewport heights.

At desktop widths, the application shell will fit within the viewport. The
browser document will not have a vertical scrollbar. Long ingredient and recipe
lists will scroll inside their panels.

If the drawer content does not fit, only its phase rail or detail area will
scroll. The page behind the open drawer will not scroll.

On narrow screens, the workspace will retain vertical scrolling so that all
controls remain accessible. The full-width drawer will have its own internal
scroll area.

## Accessibility

The inspector will use an accessible dialog name. Opening it will move keyboard
focus into the drawer. Closing it will return focus to the open button.

The phase controls will expose the selected phase. Effect markers will not be
the only way to identify phases with changes. All controls will have visible
keyboard focus styles.

## Components And State

`App` will continue to own the selected step and phase. It will set the selected
phase to `PHASES.length` when an action selects an ingredient step.

`ExplanationPanel` will become the compact summary and inspector trigger. The
inspector can be a separate component if this keeps the dialog behavior and
phase rendering isolated.

The interface will derive effect summaries from existing simulation events. The
simulation engine and event format will not change.

## Validation

Component tests will cover these behaviors:

- A new ingredient selects its final phase.
- A selected final phase shows effects from all phases in the step.
- The step select replaces the growing step-button row.
- The drawer opens and closes with pointer and keyboard input.
- The selected phase and phases with effects have accessible text.

A browser check will cover desktop and narrow viewports. The check will confirm
that the desktop document has no scrollbar and that all drawer content remains
accessible.

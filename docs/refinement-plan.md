# Arcade refinement

1. Keep the viewport geometry fixed: permanent header, game controls on the left,
   information on the right; a quiet fullscreen view with score and controls that
   appear only during manual play. Check portrait, landscape and narrow screens.
2. Make the game library a compact keyboard grid. Support arrows from search,
   numbered selection, both slash shortcuts and physical keys on Russian layouts.
3. Install shadcn/ui components and Lucide through the CLI. Use a small React
   settings surface while keeping game rules, rendering and AI independent.
4. Give Snake an active food-seeking AI, keep the safe strategy as an option,
   and add small, medium, large and custom boards.
5. Persist each game locally, including control mode and settings. Switching or
   reloading resumes the board; Restart deliberately replaces it.
6. Run behavior tests and the production build, then verify layout, keyboard
   navigation, settings and restoration in the browser.

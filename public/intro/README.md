# Hallucinated Games studio intro

Shared intro from `corycowgill/Wick` (`intro/hallucinated-intro.js`), taken from the adapted copy in `corycowgill/Warzone`, which adds an accessible dialog label and a keyboard-focusable Skip intro button. The logo, animation, colours, duration and tagline are unchanged.

The Last Light plays it once per page load, over the title menu while the crypt loads, with sound off. Click, tap, any key, any controller button or the Skip intro button dismisses it. Reduced-motion users see the resolved logo briefly instead of the animation. `?debug` QA links skip it. If the script fails to load, the game continues to the menu.

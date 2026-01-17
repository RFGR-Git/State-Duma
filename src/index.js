import React from 'react';
import ReactDOM from 'react-dom';
import App from './app.js';

// import a small global stylesheet
import './global.css';

function injectTailwindAndFonts() {
  // hide page to prevent flash-of-unstyled-content
  try { document.documentElement.style.visibility = 'hidden'; } catch (e) {}

  // Inject Google Fonts if not present
  if (!document.getElementById('gf-inter')) {
    const link = document.createElement('link');
    link.id = 'gf-inter';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap';
    document.head.appendChild(link);
  }

  // Inject Tailwind CDN (runtime) so utility classes become available
  if (!document.getElementById('tailwind-cdn')) {
    const s = document.createElement('script');
    s.id = 'tailwind-cdn';
    s.src = 'https://cdn.tailwindcss.com';
    s.async = true;

    // fallback unhide in case load fails
    const fallback = setTimeout(() => {
      try { document.documentElement.style.visibility = ''; } catch (e) {}
    }, 3000);

    s.onload = () => {
      try {
        if (window.tailwind) {
          window.tailwind.config = window.tailwind.config || {};
          window.tailwind.config.theme = window.tailwind.config.theme || {};
          window.tailwind.config.theme.extend = window.tailwind.config.theme.extend || {};
          window.tailwind.config.theme.extend.fontFamily = {
            sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
          };
        }
      } catch (e) {
        // ignore
      }
      clearTimeout(fallback);
      try { document.documentElement.style.visibility = ''; } catch (e) {}
    };
    document.head.appendChild(s);
  } else {
    // if already present, immediately unhide
    try { document.documentElement.style.visibility = ''; } catch (e) {}
  }
}

injectTailwindAndFonts();

ReactDOM.render(
  <App />,
  document.getElementById('root')
);

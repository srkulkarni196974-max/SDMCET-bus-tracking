# PWA Icon Generation Instructions

Since the automatic icon generation is currently unavailable, please follow these steps to create the required PWA icons:

## Option 1: Use the HTML Generator (Recommended)

1. Open `generate-icons.html` in your browser
2. Right-click on each canvas and select "Save image as..."
3. Save them to the `public/` folder with these exact names:
   - First canvas → `icon-192x192.png`
   - Second canvas → `icon-512x512.png`
   - Third canvas → `apple-touch-icon.png`

## Option 2: Use an Online Tool

1. Visit [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator) or [RealFaviconGenerator](https://realfavicongenerator.net/)
2. Upload a logo or design (use blue/indigo colors with a bus icon)
3. Generate PWA icons
4. Download and place in the `public/` folder:
   - `icon-192x192.png`
   - `icon-512x512.png`
   - `apple-touch-icon.png`

## Option 3: Create Manually

Use any image editor (Photoshop, Figma, Canva) to create:
- 192x192px PNG (for Android)
- 512x512px PNG (for Android splash)
- 180x180px PNG (for iOS, save as `apple-touch-icon.png`)

Design should feature:
- Background: Blue gradient (#3b82f6 to #1e40af)
- Icon: White bus silhouette with a red GPS pin
- Style: Modern, minimal, professional

## After Creating Icons

Once the icons are in place, the app will be installable on:
- **Desktop**: Chrome/Edge will show an install icon in the address bar
- **Mobile**: "Add to Home Screen" option will appear in the browser menu

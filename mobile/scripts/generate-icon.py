#!/usr/bin/env python3
"""
Script pour générer l'icône ActoGraph avec le texte "AG" plus petit
pour éviter que le cercle Android ne coupe les lettres.
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Configuration
SIZE = 1024  # Taille de l'icône (carrée)
BG_COLOR = (255, 255, 255)  # Blanc
TEXT_COLOR = (249, 115, 22)  # Orange ActoGraph (#f97316)
OUTPUT_PATH = "public/app-icon.png"

# Créer une nouvelle image blanche
img = Image.new("RGB", (SIZE, SIZE), BG_COLOR)
draw = ImageDraw.Draw(img)

# Essayer de charger une police système, sinon utiliser la police par défaut
try:
    # Essayer différentes polices système selon l'OS
    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Windows/Fonts/arial.ttf",
    ]
    font = None
    for path in font_paths:
        if os.path.exists(path):
            # Taille de police réduite pour laisser plus de marges (environ 28% de la taille de l'icône)
            # Cela garantit que seul le blanc sera coupé par le cercle Android
            font = ImageFont.truetype(path, int(SIZE * 0.28))
            break
    
    if font is None:
        # Utiliser la police par défaut si aucune police système n'est trouvée
        font = ImageFont.load_default()
        print("Warning: Using default font, text may not look optimal")
except Exception as e:
    print(f"Warning: Could not load system font: {e}")
    font = ImageFont.load_default()

# Texte à dessiner
text = "AG"

# Calculer la taille du texte pour le centrer
# Utiliser textbbox pour obtenir les dimensions exactes
# textbbox retourne (left, top, right, bottom) par rapport au point d'ancrage
bbox = draw.textbbox((0, 0), text, font=font)
text_width = bbox[2] - bbox[0]
text_height = bbox[3] - bbox[1]

# Position centrée : soustraire les offsets du bbox pour un centrage parfait
# Le bbox[0] et bbox[1] sont les offsets à partir du point d'ancrage
x = (SIZE - text_width) // 2 - bbox[0]
y = (SIZE - text_height) // 2 - bbox[1]

# Dessiner le texte
draw.text((x, y), text, fill=TEXT_COLOR, font=font)

# Sauvegarder l'image
img.save(OUTPUT_PATH, "PNG")
print(f"Icône générée avec succès : {OUTPUT_PATH}")
print(f"Taille : {SIZE}x{SIZE} pixels")
print(f"Texte 'AG' centré avec marges blanches importantes")


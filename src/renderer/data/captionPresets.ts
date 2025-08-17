import { CaptionPreset, PresetCategory } from '../../types';

export const captionPresets: CaptionPreset[] = [
  // Modern/Trending Presets with varied text cases
  {
    id: 'subway-surfers',
    name: 'Subway Surfers',
    description: 'Bold green highlight with strong contrast, perfect for gaming content',
    category: 'modern',
    style: {
      font: 'Montserrat',
      fontSize: 85,
      textColor: '#ffffff',
      highlighterColor: '#00ff41',
      backgroundColor: 'transparent',
      strokeColor: '#000000',
      strokeWidth: 2,
      textTransform: 'uppercase',
      position: { x: 50, y: 85, z: 0 },
      scale: 1.0,
      emphasizeMode: true,
      renderMode: 'horizontal',
      textAlign: 'center',
      burnInSubtitles: true,
      animation: {
        type: 'bounce',
        duration: 300,
        delay: 100,
        intensity: 0.7
      }
    },
    tags: ['gaming', 'viral', 'bright', 'bold', 'uppercase'],
    popularity: 95
  },

  {
    id: 'minimal-lowercase',
    name: 'Minimal Lowercase',
    description: 'Clean lowercase style with subtle blue highlight',
    category: 'professional',
    style: {
      font: 'Inter',
      fontSize: 72,
      textColor: '#ffffff',
      highlighterColor: '#3b82f6',
      backgroundColor: 'transparent',
      strokeColor: 'transparent',
      strokeWidth: 0,
      textTransform: 'lowercase',
      position: { x: 50, y: 85, z: 0 },
      scale: 1.0,
      emphasizeMode: true,
      renderMode: 'horizontal',
      textAlign: 'center',
      burnInSubtitles: true,
      animation: {
        type: 'fade',
        duration: 250,
        delay: 80,
        intensity: 0.4
      }
    },
    tags: ['minimal', 'clean', 'lowercase', 'subtle'],
    popularity: 78
  },

  {
    id: 'casual-mixed',
    name: 'Casual Mixed Case',
    description: 'Friendly mixed case with rounded font and green accents',
    category: 'creative',
    style: {
      font: 'Nunito',
      fontSize: 78,
      textColor: '#1f2937',
      highlighterColor: '#10b981',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      strokeColor: 'transparent',
      strokeWidth: 0,
      textTransform: 'none',
      position: { x: 50, y: 83, z: 0 },
      scale: 1.0,
      emphasizeMode: false,
      renderMode: 'horizontal',
      textAlign: 'center',
      burnInSubtitles: true,
      animation: {
        type: 'bounce',
        duration: 300,
        delay: 100,
        intensity: 0.5
      }
    },
    tags: ['casual', 'friendly', 'mixed-case', 'rounded'],
    popularity: 82
  },

  {
    id: 'elegant-speech',
    name: 'Elegant Speech',
    description: 'Sophisticated red accent with natural capitalization',
    category: 'professional',
    style: {
      font: 'SF Pro Display',
      fontSize: 75,
      textColor: '#ffffff',
      highlighterColor: '#ff4444',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      strokeColor: 'transparent',
      strokeWidth: 0,
      textTransform: 'capitalize',
      position: { x: 50, y: 80, z: 0 },
      scale: 1.0,
      emphasizeMode: false,
      renderMode: 'horizontal',
      textAlign: 'center',
      burnInSubtitles: true,
      animation: {
        type: 'fade',
        duration: 250,
        delay: 80,
        intensity: 0.5
      }
    },
    tags: ['professional', 'clean', 'elegant', 'capitalize'],
    popularity: 85
  },

  {
    id: 'blocky-bounce',
    name: 'Blocky Bounce',
    description: 'Purple block style with bouncy animation for energetic content',
    category: 'creative',
    style: {
      font: 'Poppins',
      fontSize: 90,
      textColor: '#ffffff',
      highlighterColor: '#9333ea',
      backgroundColor: '#9333ea',
      strokeColor: '#ffffff',
      strokeWidth: 3,
      textTransform: 'uppercase',
      position: { x: 50, y: 82, z: 0 },
      scale: 1.1,
      emphasizeMode: true,
      renderMode: 'horizontal',
      textAlign: 'center',
      burnInSubtitles: true,
      animation: {
        type: 'bounce',
        duration: 400,
        delay: 120,
        intensity: 0.8
      }
    },
    tags: ['energetic', 'fun', 'colorful', 'bold', 'uppercase'],
    popularity: 90
  },

  {
    id: 'tech-lowercase',
    name: 'Tech Lowercase',
    description: 'Modern tech style with cyan accents and lowercase',
    category: 'modern',
    style: {
      font: 'Roboto',
      fontSize: 74,
      textColor: '#06b6d4',
      highlighterColor: '#0891b2',
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      strokeColor: '#164e63',
      strokeWidth: 1,
      textTransform: 'lowercase',
      position: { x: 50, y: 85, z: 0 },
      scale: 1.0,
      emphasizeMode: true,
      renderMode: 'horizontal',
      textAlign: 'center',
      burnInSubtitles: true,
      animation: {
        type: 'typewriter',
        duration: 200,
        delay: 60,
        intensity: 0.7
      }
    },
    tags: ['tech', 'modern', 'cyan', 'lowercase'],
    popularity: 88
  },

  {
    id: 'retro-caps',
    name: 'Retro All Caps',
    description: 'Vintage style with thick stroke and retro colors',
    category: 'creative',
    style: {
      font: 'Montserrat',
      fontSize: 82,
      textColor: '#fbbf24',
      highlighterColor: '#f59e0b',
      backgroundColor: 'transparent',
      strokeColor: '#7c2d12',
      strokeWidth: 4,
      textTransform: 'uppercase',
      position: { x: 50, y: 84, z: 0 },
      scale: 1.1,
      emphasizeMode: true,
      renderMode: 'horizontal',
      textAlign: 'center',
      burnInSubtitles: true,
      animation: {
        type: 'glow',
        duration: 400,
        delay: 120,
        intensity: 0.8
      }
    },
    tags: ['retro', 'vintage', 'thick-stroke', 'golden', 'uppercase'],
    popularity: 80
  },

  {
    id: 'gaming-mixed',
    name: 'Gaming Mixed',
    description: 'Gaming style with mixed case and neon effects',
    category: 'modern',
    style: {
      font: 'Poppins',
      fontSize: 86,
      textColor: '#ff0080',
      highlighterColor: '#00ff80',
      backgroundColor: 'transparent',
      strokeColor: '#000000',
      strokeWidth: 3,
      textTransform: 'none',
      position: { x: 50, y: 84, z: 0 },
      scale: 1.05,
      emphasizeMode: true,
      renderMode: 'horizontal',
      textAlign: 'center',
      burnInSubtitles: true,
      animation: {
        type: 'shake',
        duration: 300,
        delay: 80,
        intensity: 0.6
      }
    },
    tags: ['gaming', 'neon', 'mixed-case', 'energetic'],
    popularity: 92
  },

  {
    id: 'handwritten-style',
    name: 'Handwritten Style',
    description: 'Casual handwritten look with natural capitalization',
    category: 'creative',
    style: {
      font: 'Quicksand',
      fontSize: 76,
      textColor: '#374151',
      highlighterColor: '#ef4444',
      backgroundColor: 'rgba(255, 243, 224, 0.8)',
      strokeColor: 'transparent',
      strokeWidth: 0,
      textTransform: 'capitalize',
      position: { x: 50, y: 82, z: -1 },
      scale: 1.0,
      emphasizeMode: false,
      renderMode: 'horizontal',
      textAlign: 'center',
      burnInSubtitles: true,
      animation: {
        type: 'wave',
        duration: 500,
        delay: 100,
        intensity: 0.3
      }
    },
    tags: ['handwritten', 'casual', 'natural', 'warm', 'capitalize'],
    popularity: 68
  },

  {
    id: 'futuristic',
    name: 'Futuristic',
    description: 'Neon green glow effect with tech vibes',
    category: 'creative',
    style: {
      font: 'Roboto',
      fontSize: 78,
      textColor: '#00ff88',
      highlighterColor: '#00ffcc',
      backgroundColor: 'transparent',
      strokeColor: '#004422',
      strokeWidth: 2,
      textTransform: 'uppercase',
      position: { x: 50, y: 83, z: 0 },
      scale: 1.0,
      emphasizeMode: true,
      renderMode: 'horizontal',
      textAlign: 'center',
      burnInSubtitles: true,
      animation: {
        type: 'glow',
        duration: 500,
        delay: 100,
        intensity: 0.9
      }
    },
    tags: ['tech', 'glow', 'futuristic', 'neon', 'uppercase'],
    popularity: 75
  },

  {
    id: 'elegant-title-case',
    name: 'Elegant Title Case',
    description: 'Sophisticated title case with serif-like styling',
    category: 'professional',
    style: {
      font: 'Lato',
      fontSize: 80,
      textColor: '#1f2937',
      highlighterColor: '#7c3aed',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      strokeColor: '#4c1d95',
      strokeWidth: 0.5,
      textTransform: 'capitalize',
      position: { x: 50, y: 83, z: 0 },
      scale: 1.0,
      emphasizeMode: false,
      renderMode: 'horizontal',
      textAlign: 'center',
      burnInSubtitles: true,
      animation: {
        type: 'slide',
        duration: 350,
        delay: 90,
        intensity: 0.5,
        direction: 'up'
      }
    },
    tags: ['elegant', 'professional', 'title-case', 'sophisticated'],
    popularity: 73
  },

  {
    id: 'blue-highlight',
    name: 'Blue Highlight',
    description: 'Cool blue accent with mixed case styling',
    category: 'modern',
    style: {
      font: 'Open Sans',
      fontSize: 80,
      textColor: '#ffffff',
      highlighterColor: '#3b82f6',
      backgroundColor: 'transparent',
      strokeColor: '#1e40af',
      strokeWidth: 1.5,
      textTransform: 'none',
      position: { x: 50, y: 84, z: 0 },
      scale: 1.0,
      emphasizeMode: true,
      renderMode: 'horizontal',
      textAlign: 'center',
      burnInSubtitles: true,
      animation: {
        type: 'slide',
        duration: 300,
        delay: 90,
        intensity: 0.6,
        direction: 'up'
      }
    },
    tags: ['tech', 'educational', 'cool', 'modern', 'mixed-case'],
    popularity: 78
  },

  {
    id: 'fancy-highlight',
    name: 'Fancy Highlight',
    description: 'Stylish golden accent with italic emphasis',
    category: 'creative',
    style: {
      font: 'Raleway',
      fontSize: 82,
      textColor: '#ffffff',
      highlighterColor: '#fbbf24',
      backgroundColor: 'rgba(251, 191, 36, 0.2)',
      strokeColor: '#92400e',
      strokeWidth: 1,
      textTransform: 'capitalize',
      position: { x: 50, y: 82, z: -2 },
      scale: 1.05,
      emphasizeMode: true,
      renderMode: 'horizontal',
      textAlign: 'center',
      burnInSubtitles: true,
      animation: {
        type: 'wave',
        duration: 600,
        delay: 150,
        intensity: 0.4
      }
    },
    tags: ['elegant', 'fancy', 'golden', 'stylish', 'capitalize'],
    popularity: 65
  },

  {
    id: 'whisper-lowercase',
    name: 'Whisper Lowercase',
    description: 'Soft lowercase style with gentle fade effect',
    category: 'professional',
    style: {
      font: 'Source Sans Pro',
      fontSize: 70,
      textColor: '#6b7280',
      highlighterColor: '#9ca3af',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      strokeColor: 'transparent',
      strokeWidth: 0,
      textTransform: 'lowercase',
      position: { x: 50, y: 86, z: 0 },
      scale: 1.0,
      emphasizeMode: false,
      renderMode: 'horizontal',
      textAlign: 'center',
      burnInSubtitles: true,
      animation: {
        type: 'fade',
        duration: 400,
        delay: 120,
        intensity: 0.3
      }
    },
    tags: ['soft', 'gentle', 'lowercase', 'subtle'],
    popularity: 60
  },

  {
    id: 'smooth-fade',
    name: 'Smooth Fade',
    description: 'Subtle gray styling with smooth fade animation',
    category: 'professional',
    style: {
      font: 'Lato',
      fontSize: 76,
      textColor: '#f3f4f6',
      highlighterColor: '#9ca3af',
      backgroundColor: 'rgba(17, 24, 39, 0.8)',
      strokeColor: 'transparent',
      strokeWidth: 0,
      textTransform: 'none',
      position: { x: 50, y: 85, z: 0 },
      scale: 1.0,
      emphasizeMode: false,
      renderMode: 'horizontal',
      textAlign: 'center',
      burnInSubtitles: true,
      animation: {
        type: 'fade',
        duration: 400,
        delay: 100,
        intensity: 0.3
      }
    },
    tags: ['subtle', 'professional', 'minimalist', 'mixed-case'],
    popularity: 60
  },

  {
    id: 'purple-outline-bold',
    name: 'Purple Outline Bold',
    description: 'Bold purple outline with strong presence',
    category: 'modern',
    style: {
      font: 'Montserrat',
      fontSize: 88,
      textColor: '#8b5cf6',
      highlighterColor: '#a855f7',
      backgroundColor: 'transparent',
      strokeColor: '#ffffff',
      strokeWidth: 3,
      textTransform: 'uppercase',
      position: { x: 50, y: 83, z: 0 },
      scale: 1.1,
      emphasizeMode: true,
      renderMode: 'horizontal',
      textAlign: 'center',
      burnInSubtitles: true,
      animation: {
        type: 'zoom',
        duration: 350,
        delay: 110,
        intensity: 0.7
      }
    },
    tags: ['bold', 'purple', 'outline', 'strong', 'uppercase'],
    popularity: 85
  },

  {
    id: 'barbie',
    name: 'Barbie',
    description: 'Pink glam style for lifestyle and beauty content',
    category: 'creative',
    style: {
      font: 'Quicksand',
      fontSize: 84,
      textColor: '#ffffff',
      highlighterColor: '#ec4899',
      backgroundColor: 'rgba(236, 72, 153, 0.3)',
      strokeColor: '#be185d',
      strokeWidth: 2,
      textTransform: 'capitalize',
      position: { x: 50, y: 81, z: 0 },
      scale: 1.05,
      emphasizeMode: true,
      renderMode: 'horizontal',
      textAlign: 'center',
      burnInSubtitles: true,
      animation: {
        type: 'bounce',
        duration: 300,
        delay: 90,
        intensity: 0.6
      }
    },
    tags: ['pink', 'glam', 'beauty', 'lifestyle', 'capitalize'],
    popularity: 70
  },

  {
    id: 'standard-loud',
    name: 'Standard Loud',
    description: 'High contrast black and white for maximum readability',
    category: 'classic',
    style: {
      font: 'Inter',
      fontSize: 85,
      textColor: '#ffffff',
      highlighterColor: '#ffffff',
      backgroundColor: '#000000',
      strokeColor: '#000000',
      strokeWidth: 1,
      textTransform: 'uppercase',
      position: { x: 50, y: 85, z: 0 },
      scale: 1.0,
      emphasizeMode: false,
      renderMode: 'horizontal',
      textAlign: 'center',
      burnInSubtitles: true,
      animation: {
        type: 'typewriter',
        duration: 200,
        delay: 50,
        intensity: 0.6
      }
    },
    tags: ['classic', 'readable', 'universal', 'uppercase'],
    popularity: 80
  },

  {
    id: 'bold',
    name: 'Bold',
    description: 'Simple bold white text on black background',
    category: 'classic',
    style: {
      font: 'Arial',
      fontSize: 90,
      textColor: '#ffffff',
      highlighterColor: '#ffffff',
      backgroundColor: '#000000',
      strokeColor: 'transparent',
      strokeWidth: 0,
      textTransform: 'uppercase',
      position: { x: 50, y: 85, z: 0 },
      scale: 1.2,
      emphasizeMode: false,
      renderMode: 'horizontal',
      textAlign: 'center',
      burnInSubtitles: true,
      animation: {
        type: 'typewriter',
        duration: 150,
        delay: 40,
        intensity: 0.8
      }
    },
    tags: ['bold', 'simple', 'classic', 'high-contrast', 'uppercase'],
    popularity: 75
  },

  {
    id: 'podcast',
    name: 'Podcast',
    description: 'Clean and readable style for spoken content',
    category: 'professional',
    style: {
      font: 'Source Sans Pro',
      fontSize: 72,
      textColor: '#ffffff',
      highlighterColor: '#6b7280',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      strokeColor: 'transparent',
      strokeWidth: 0,
      textTransform: 'none',
      position: { x: 50, y: 87, z: 0 },
      scale: 1.0,
      emphasizeMode: false,
      renderMode: 'horizontal',
      textAlign: 'center',
      burnInSubtitles: true,
      animation: {
        type: 'fade',
        duration: 300,
        delay: 70,
        intensity: 0.4
      }
    },
    tags: ['podcast', 'clean', 'readable', 'professional', 'mixed-case'],
    popularity: 65
  },

  {
    id: 'classic',
    name: 'Classic',
    description: 'Timeless white text with subtle shadow',
    category: 'classic',
    style: {
      font: 'Helvetica',
      fontSize: 78,
      textColor: '#ffffff',
      highlighterColor: '#ffffff',
      backgroundColor: 'transparent',
      strokeColor: '#000000',
      strokeWidth: 1,
      textTransform: 'none',
      position: { x: 50, y: 86, z: 0 },
      scale: 1.0,
      emphasizeMode: false,
      renderMode: 'horizontal',
      textAlign: 'center',
      burnInSubtitles: true,
      animation: {
        type: 'typewriter',
        duration: 200,
        delay: 60,
        intensity: 0.5
      }
    },
    tags: ['classic', 'timeless', 'simple', 'universal', 'mixed-case'],
    popularity: 70
  },

  // Progressive Text Reveal Presets
  {
    id: 'progressive-modern',
    name: 'Progressive Modern',
    description: 'Modern progressive text reveal with blue accents',
    category: 'modern',
    style: {
      font: 'Inter',
      fontSize: 85,
      textColor: '#ffffff',
      highlighterColor: '#3b82f6',
      backgroundColor: 'transparent',
      strokeColor: '#1e40af',
      strokeWidth: 1.5,
      textTransform: 'none',
      position: { x: 50, y: 75, z: 0 },
      scale: 1.0,
      emphasizeMode: true,
      renderMode: 'progressive',
      textAlign: 'center',
      burnInSubtitles: true,
      animation: {
        type: 'slide',
        duration: 300,
        delay: 80,
        intensity: 0.7,
        direction: 'up'
      }
    },
    tags: ['progressive', 'modern', 'reveal', 'blue'],
    popularity: 85
  },

  {
    id: 'progressive-bold',
    name: 'Progressive Bold',
    description: 'Bold progressive reveal with emphasis highlighting',
    category: 'creative',
    style: {
      font: 'Montserrat',
      fontSize: 90,
      textColor: '#ffffff',
      highlighterColor: '#fbbf24',
      backgroundColor: 'transparent',
      strokeColor: '#000000',
      strokeWidth: 2,
      textTransform: 'uppercase',
      position: { x: 50, y: 70, z: 0 },
      scale: 1.1,
      emphasizeMode: true,
      renderMode: 'progressive',
      textAlign: 'center',
      burnInSubtitles: true,
      animation: {
        type: 'bounce',
        duration: 350,
        delay: 100,
        intensity: 0.8
      }
    },
    tags: ['progressive', 'bold', 'emphasis', 'golden'],
    popularity: 88
  },

  {
    id: 'horizontal-highlighter',
    name: 'Horizontal Highlighter',
    description: 'Classic horizontal layout with strong background highlighting',
    category: 'professional',
    style: {
      font: 'SF Pro Display',
      fontSize: 80,
      textColor: '#000000',
      highlighterColor: '#000000',
      backgroundColor: '#ffff00',
      strokeColor: 'transparent',
      strokeWidth: 0,
      textTransform: 'none',
      position: { x: 50, y: 85, z: 0 },
      scale: 1.0,
      emphasizeMode: false,
      renderMode: 'horizontal',
      textAlign: 'center',
      burnInSubtitles: true,
      animation: {
        type: 'slide',
        duration: 250,
        delay: 70,
        intensity: 0.5,
        direction: 'left'
      }
    },
    tags: ['horizontal', 'highlighter', 'classic', 'yellow'],
    popularity: 82
  },

  {
    id: 'progressive-emphasis',
    name: 'Progressive Emphasis',
    description: 'Progressive reveal with emphasis mode for dynamic highlighting',
    category: 'creative',
    style: {
      font: 'Poppins',
      fontSize: 88,
      textColor: '#ffffff',
      highlighterColor: '#ec4899',
      backgroundColor: 'transparent',
      strokeColor: '#be185d',
      strokeWidth: 1.5,
      textTransform: 'capitalize',
      position: { x: 50, y: 72, z: 0 },
      scale: 1.05,
      emphasizeMode: true,
      renderMode: 'progressive',
      textAlign: 'center',
      burnInSubtitles: true,
      animation: {
        type: 'zoom',
        duration: 400,
        delay: 120,
        intensity: 0.9
      }
    },
    tags: ['progressive', 'emphasis', 'dynamic', 'pink'],
    popularity: 86
  },

  {
    id: 'horizontal-neon',
    name: 'Horizontal Neon',
    description: 'Horizontal layout with neon glow emphasis effects',
    category: 'modern',
    style: {
      font: 'Roboto',
      fontSize: 84,
      textColor: '#00ffcc',
      highlighterColor: '#00ff80',
      backgroundColor: 'transparent',
      strokeColor: '#004422',
      strokeWidth: 2,
      textTransform: 'lowercase',
      position: { x: 50, y: 83, z: 0 },
      scale: 1.0,
      emphasizeMode: true,
      renderMode: 'horizontal',
      textAlign: 'center',
      burnInSubtitles: true,
      animation: {
        type: 'glow',
        duration: 500,
        delay: 90,
        intensity: 1.0
      }
    },
    tags: ['horizontal', 'neon', 'glow', 'emphasis'],
    popularity: 89
  },

  {
    id: 'progressive-minimal',
    name: 'Progressive Minimal',
    description: 'Clean minimal progressive reveal with subtle effects',
    category: 'professional',
    style: {
      font: 'Lato',
      fontSize: 76,
      textColor: '#374151',
      highlighterColor: '#6b7280',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      strokeColor: 'transparent',
      strokeWidth: 0,
      textTransform: 'none',
      position: { x: 50, y: 78, z: 0 },
      scale: 1.0,
      emphasizeMode: false,
      renderMode: 'progressive',
      textAlign: 'center',
      burnInSubtitles: true,
      animation: {
        type: 'fade',
        duration: 350,
        delay: 100,
        intensity: 0.4
      }
    },
    tags: ['progressive', 'minimal', 'clean', 'subtle'],
    popularity: 75
  }
];

// Function to adjust font size based on video aspect ratio
export const adjustFontSizeForAspectRatio = (preset: CaptionPreset, videoWidth: number, videoHeight: number): CaptionPreset => {
  const aspectRatio = videoWidth / videoHeight;
  const isVertical = aspectRatio < 1; // 9:16 or similar vertical format
  const isSquare = aspectRatio >= 0.9 && aspectRatio <= 1.1; // 1:1 or similar square format
  
  // Adjust font size based on aspect ratio
  let fontSizeMultiplier = 1;
  let positionAdjustment = { x: 0, y: 0 };
  
  if (isVertical) {
    // For vertical videos (9:16), increase font size and adjust position
    fontSizeMultiplier = 1.3;
    positionAdjustment = { x: 0, y: -5 }; // Move slightly higher
  } else if (isSquare) {
    // For square videos (1:1), slightly increase font size
    fontSizeMultiplier = 1.15;
    positionAdjustment = { x: 0, y: 0 };
  } else {
    // For horizontal videos (16:9), use original size or slightly smaller
    fontSizeMultiplier = 0.95;
    positionAdjustment = { x: 0, y: 2 }; // Move slightly lower
  }
  
  return {
    ...preset,
    style: {
      ...preset.style,
      fontSize: Math.round(preset.style.fontSize * fontSizeMultiplier),
      position: {
        x: preset.style.position.x + positionAdjustment.x,
        y: preset.style.position.y + positionAdjustment.y,
        z: preset.style.position.z
      }
    }
  };
};

export const presetCategories: PresetCategory[] = [
  {
    id: 'modern',
    name: 'Modern & Viral',
    description: 'Trending styles perfect for social media and viral content',
    presets: captionPresets.filter(p => p.category === 'modern')
  },
  {
    id: 'creative',
    name: 'Creative & Fun',
    description: 'Eye-catching animated styles for entertainment content',
    presets: captionPresets.filter(p => p.category === 'creative')
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Clean and sophisticated styles for business content',
    presets: captionPresets.filter(p => p.category === 'professional')
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Timeless and universally readable caption styles',
    presets: captionPresets.filter(p => p.category === 'classic')
  }
];

// Sort presets by popularity within each category
presetCategories.forEach(category => {
  category.presets.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
});
export type BackgroundTheme = {
  imageUrl: string;
  overlayClass: string;
};

export const BACKGROUND_THEMES: BackgroundTheme[] = [
  {
    imageUrl:
      "https://images.unsplash.com/photo-1472120435266-53107fd0c44a?auto=format&fit=crop&w=2200&q=80",
    overlayClass:
      "bg-[linear-gradient(120deg,rgba(9,18,37,0.88)_0%,rgba(21,43,90,0.62)_45%,rgba(18,135,126,0.5)_100%)]",
  },
  {
    imageUrl:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2200&q=80",
    overlayClass:
      "bg-[linear-gradient(130deg,rgba(7,18,38,0.9)_0%,rgba(21,43,90,0.66)_48%,rgba(10,98,132,0.62)_100%)]",
  },
  {
    imageUrl:
      "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=2200&q=80",
    overlayClass:
      "bg-[linear-gradient(120deg,rgba(7,18,38,0.9)_0%,rgba(21,43,90,0.72)_48%,rgba(10,98,132,0.55)_100%)]",
  },
  {
    imageUrl:
      "https://images.unsplash.com/photo-1493244040629-496f6d136cc3?auto=format&fit=crop&w=2200&q=80",
    overlayClass:
      "bg-[linear-gradient(135deg,rgba(15,23,42,0.9)_0%,rgba(124,45,18,0.6)_48%,rgba(180,83,9,0.48)_100%)]",
  },
];

export function pickRandomTheme(): BackgroundTheme {
  const index = Math.floor(Math.random() * BACKGROUND_THEMES.length);
  return BACKGROUND_THEMES[index] ?? BACKGROUND_THEMES[0];
}

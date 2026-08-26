export const SPECIES_COLORS: Record<string, string[]> = {
  trex: [
    'hsl(25, 20%, 88%)',
    'hsl(15, 25%, 85%)',
    'hsl(20, 22%, 86%)',
    'hsl(30, 18%, 87%)',
    'hsl(10, 20%, 84%)',
  ],
  velociraptor: [
    'hsl(210, 15%, 87%)',
    'hsl(200, 20%, 84%)',
    'hsl(215, 18%, 86%)',
    'hsl(205, 22%, 85%)',
    'hsl(195, 16%, 88%)',
  ],
  triceratops: [
    'hsl(140, 18%, 86%)',
    'hsl(150, 22%, 83%)',
    'hsl(145, 20%, 85%)',
    'hsl(135, 16%, 87%)',
    'hsl(155, 19%, 84%)',
  ],
  parasaurolophus: [
    'hsl(230, 20%, 88%)',
    'hsl(220, 25%, 85%)',
    'hsl(225, 22%, 87%)',
    'hsl(235, 18%, 86%)',
    'hsl(215, 20%, 84%)',
  ],
  therizinosaurus: [
    'hsl(280, 18%, 87%)',
    'hsl(300, 15%, 85%)',
    'hsl(290, 20%, 86%)',
    'hsl(270, 16%, 88%)',
    'hsl(295, 18%, 84%)',
  ],
  struthiomimus: [
    'hsl(45, 25%, 88%)',
    'hsl(40, 20%, 85%)',
    'hsl(50, 22%, 87%)',
    'hsl(35, 18%, 86%)',
    'hsl(42, 24%, 84%)',
  ],
};

export function getRandomBgColor(speciesId: string): string {
  const colors = SPECIES_COLORS[speciesId];
  if (!colors) return 'hsl(0, 0%, 90%)';
  return colors[Math.floor(Math.random() * colors.length)];
}

export const SPECIES_ACCENT: Record<string, string> = {
  trex: 'hsl(25, 35%, 45%)',
  velociraptor: 'hsl(210, 30%, 45%)',
  triceratops: 'hsl(140, 30%, 40%)',
  parasaurolophus: 'hsl(230, 30%, 50%)',
  therizinosaurus: 'hsl(280, 25%, 50%)',
  struthiomimus: 'hsl(45, 35%, 45%)',
};

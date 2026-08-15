import { generateMinigamesMetadata, MinigamesCatalog } from './minigames-catalog';

export const revalidate = 3600;

export function generateMetadata() {
  return generateMinigamesMetadata(1);
}

export default function MinigamesPage() {
  return <MinigamesCatalog page={1} />;
}

import { generateGamesMetadata, GamesCatalog } from './games-catalog';

export const revalidate = 3600;

export function generateMetadata() {
  return generateGamesMetadata(1);
}

export default function GamesPage() {
  return <GamesCatalog page={1} />;
}

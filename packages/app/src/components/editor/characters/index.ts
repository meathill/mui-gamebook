import type { AICharacter } from '@mui-gamebook/parser/src/types';

export { default as CharacterList } from './CharacterList';
export { default as CharacterForm } from './CharacterForm';

export interface CharacterFormData {
  id: string;
  name: string;
  description: string;
  image_prompt: string;
  image_url: string;
  voice_sample_url: string;
}

export const defaultCharacterFormData: CharacterFormData = {
  id: '',
  name: '',
  description: '',
  image_prompt: '',
  image_url: '',
  voice_sample_url: '',
};

export function characterToFormData(id: string, char: AICharacter): CharacterFormData {
  return {
    id,
    name: char.name,
    description: char.description || '',
    image_prompt: char.image_prompt || '',
    image_url: char.image_url || '',
    voice_sample_url: char.voice_sample_url || '',
  };
}

export function formDataToCharacter(data: CharacterFormData): AICharacter {
  return {
    name: data.name,
    description: data.description || undefined,
    image_prompt: data.image_prompt || undefined,
    image_url: data.image_url || undefined,
    voice_sample_url: data.voice_sample_url || undefined,
  };
}

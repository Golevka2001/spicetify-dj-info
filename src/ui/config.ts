import { client } from '/modules/stdlib/mod.ts';

const DEFAULT_CONFIG = {
  isPlaylistEnabled: true,
  isNowPlayingEnabled: true,
  isLeftPlayingEnabled: false,
  isRecommendationsEnabled: true,
  isBPMEnabled: true,
  isKeyEnabled: false,
  isCamelotEnabled: true,
  isPopularityEnabled: true,
  isEnergyEnabled: false,
  isDanceEnabled: false,
  isAcousticnessEnabled: false,
  isInstrumentalnessEnabled: false,
  isLivenessEnabled: false,
  isLoudnessEnabled: false,
  isSpeechinessEnabled: false,
  isValenceEnabled: false,
  isTimeSignatureEnabled: false,
  isYearEnabled: true,
  isRichUiEnabled: true,
};

export let CONFIG;

export function loadConfig() {
  try {
    CONFIG = JSON.parse(client.storage.get('dj-info-config') || 'error');

    // Ensure all new keys exist
    Object.keys(DEFAULT_CONFIG).forEach((key) => {
      if (CONFIG[key] === undefined) {
        CONFIG[key] = DEFAULT_CONFIG[key];
      }
    });
  } catch {
    CONFIG = { ...DEFAULT_CONFIG };
  }
}

export function saveConfig() {
  client.storage.set('dj-info-config', JSON.stringify(CONFIG));
}

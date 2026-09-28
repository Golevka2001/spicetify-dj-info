import { client, createRegistrar } from '/modules/stdlib/mod.ts';
import type { ModuleRuntimeContext } from '/modules/stdlib/mod.ts';

declare global {
  interface Window {
    djInfoObserver?: IntersectionObserver;
    djInfoMutationObserver?: MutationObserver;
  }
}

import { debounce } from './src/utils/dom.ts';
import { CONFIG, loadConfig } from './src/ui/config.ts';
import { registerSettingsMenu } from './src/ui/settingsModal.ts';
import { initTrackDb } from './src/db/trackDb.ts';
import { initProductState } from './src/api/metadata.ts';
import { queueTrackInfo, setAddInfoToTrack } from './src/features/queue.ts';
import {
  addInfoToTrack,
  updateTracklist,
  updateRecommendations,
  setQueueTrackInfo,
} from './src/features/tracklist.ts';
import {
  updateNowPlayingWidget,
  initNowPlayingListener,
  setNowPlayingElement,
} from './src/features/nowPlaying.ts';

export default async function (ctx: ModuleRuntimeContext) {
  while (!client.notify) {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const { cosmos: CosmosAsync, uri: URI } = client;
  if (!(CosmosAsync && URI)) {
    return;
  }

  loadConfig();
  initTrackDb();
  await initProductState();

  const registrar = createRegistrar(ctx);
  registerSettingsMenu(registrar);

  setQueueTrackInfo(queueTrackInfo);
  setAddInfoToTrack(addInfoToTrack);
  initNowPlayingListener();

  if (window.djInfoObserver) {
    window.djInfoObserver.disconnect();
  }

  const trackIntersectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const track = entry.target as HTMLElement;
          const isRecommendation = track.closest('[data-testid="recommended-track"]') !== null;
          addInfoToTrack(track, isRecommendation);
          trackIntersectionObserver.unobserve(track);
        }
      });
    },
    { rootMargin: '200px' },
  );
  window.djInfoObserver = trackIntersectionObserver;

  const observedTracklists = new WeakSet();

  let oldNowPlayingWidget = null;
  let nowPlayingWidget = null;

  function observeTracklist(tracklist, isRecommendation = false) {
    const updater = () => {
      if (isRecommendation) {
        updateRecommendations(tracklist, trackIntersectionObserver);
      } else {
        updateTracklist(tracklist, trackIntersectionObserver);
      }
    };

    if (observedTracklists.has(tracklist)) {
      updater();
      return;
    }

    const observer = new MutationObserver(updater);
    observer.observe(tracklist, { childList: true, subtree: true });
    observedTracklists.add(tracklist);
    updater();
  }

  function main() {
    const tracklists = document.querySelectorAll<HTMLElement>('.main-trackList-indexable');
    tracklists.forEach((tracklist) => observeTracklist(tracklist, false));

    const recommendationsContainer = document.querySelector<HTMLElement>(
      '[data-testid="recommended-track"]',
    );
    if (recommendationsContainer) {
      observeTracklist(recommendationsContainer, true);
    }

    oldNowPlayingWidget = nowPlayingWidget;
    nowPlayingWidget = document.querySelector<HTMLElement>('.main-nowPlayingWidget-nowPlaying');

    if (nowPlayingWidget && !nowPlayingWidget.isEqualNode(oldNowPlayingWidget)) {
      if (!nowPlayingWidget.querySelector('.dj-info-now-playing')) {
        const nowPlayingWidgetdjInfoData = document.createElement('p');
        nowPlayingWidgetdjInfoData.classList.add('dj-info-now-playing');

        const trackInfo = nowPlayingWidget.querySelector('.main-trackInfo-container');
        if (trackInfo) {
          if (CONFIG.isLeftPlayingEnabled) {
            trackInfo.before(nowPlayingWidgetdjInfoData);
          } else {
            trackInfo.after(nowPlayingWidgetdjInfoData);
          }
        }

        nowPlayingWidget.classList.add('dj-info-now-playing-parent');
        nowPlayingWidget.parentElement.classList.add('dj-info-now-playing-parent');
        nowPlayingWidget.parentElement.parentElement.classList.add('dj-info-now-playing-parent');

        setNowPlayingElement(nowPlayingWidgetdjInfoData);
        updateNowPlayingWidget();
      }
    }
  }

  const debouncedMain = debounce(main, 10);

  if (window.djInfoMutationObserver) {
    window.djInfoMutationObserver.disconnect();
  }

  const observer = new MutationObserver(debouncedMain);
  main();
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
  window.djInfoMutationObserver = observer;

  ctx.defer(() => {
    observer.disconnect();
    trackIntersectionObserver.disconnect();
  });
}

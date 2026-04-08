/**
 * 素材预览扩展
 *
 * 扫描 YAML 代码块，如果包含 url 字段（图片/音频/视频），
 * 在代码块后方插入内联预览（缩略图、播放器）。
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { extractAssetUrl } from './matchers';

const pluginKey = new PluginKey('assetPreview');

function createPreviewWidget(url: string, assetType: string): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'dsl-asset-preview';

  if (assetType === 'image') {
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Asset preview';
    img.loading = 'lazy';
    img.className = 'dsl-asset-image';
    wrapper.appendChild(img);
  } else if (assetType === 'audio') {
    const audio = document.createElement('audio');
    audio.src = url;
    audio.controls = true;
    audio.preload = 'none';
    audio.className = 'dsl-asset-audio';
    wrapper.appendChild(audio);
  } else if (assetType === 'video') {
    const video = document.createElement('video');
    video.src = url;
    video.controls = true;
    video.preload = 'none';
    video.className = 'dsl-asset-video';
    wrapper.appendChild(video);
  }

  return wrapper;
}

export const AssetPreview = Extension.create({
  name: 'assetPreview',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: pluginKey,
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            const { doc } = state;

            doc.descendants((node, pos) => {
              if (node.type.name !== 'codeBlock') return;

              const lang = node.attrs.language;
              if (lang !== 'yaml') return;

              const text = node.textContent;
              const asset = extractAssetUrl(text);
              if (!asset || asset.assetType === 'unknown') return;

              // 在代码块结束位置后插入 widget
              const endPos = pos + node.nodeSize;
              decorations.push(
                Decoration.widget(endPos, () => createPreviewWidget(asset.url, asset.assetType), {
                  side: -1,
                  key: `asset-${pos}`,
                }),
              );
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});

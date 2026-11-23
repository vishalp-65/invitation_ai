import { BRAND, BUILTIN_TEMPLATES, buildDesign, designDataFrom, planVideoScenes, type InviteProps } from '@cardai/shared';
import type { ComponentType } from 'react';
import { Composition, Still } from 'remotion';
import { COMPOSITIONS } from '../compositions';
import { InviteCard } from '../InviteCard';
import { InviteVideo } from '../InviteVideo';
import { DesignCard, DesignVideo, planDesignVideo, type DesignRenderProps } from '../design/compositions';
import { sampleInviteProps } from '../sample';
import { SiteVideo, siteVideoFrames, type SiteVideoProps } from '../site-video/SiteVideo';

const defaultProps = sampleInviteProps();
// Remotion's generic props typing is stricter than our serialisable InviteProps.
const Card = InviteCard as ComponentType<Record<string, unknown>>;
const Video = InviteVideo as ComponentType<Record<string, unknown>>;
const DCard = DesignCard as ComponentType<Record<string, unknown>>;
const DVideo = DesignVideo as ComponentType<Record<string, unknown>>;
const SVideo = SiteVideo as ComponentType<Record<string, unknown>>;

const siteVideoDefaults: SiteVideoProps = {
  designId: 'rose-seal',
  language: 'en',
  timezone: 'Asia/Kolkata',
  content: { ...defaultProps.content, primaryNames: ['Abhishek', 'Kanika'], headline: 'Wedding Celebration', connector: 'weds', hashtag: '#AbhiWedsKanika' },
  functions: [
    { name: 'Mehendi', startsAt: '2026-12-12T16:00:00+05:30', venueName: 'Rambagh Gardens', dressCode: 'Shades of green' },
    { name: 'Sangeet', startsAt: '2026-12-13T19:00:00+05:30', venueName: 'Rambagh Palace' },
    { name: 'Wedding', startsAt: '2026-12-14T18:00:00+05:30', venueName: 'Rambagh Palace', venueAddress: 'Bhawani Singh Rd, Jaipur' },
  ],
  musicUrl: null,
  watermark: false,
  watermarkText: BRAND.watermarkText,
  link: 'https://example.test/s/abcde',
};

const designDefaults: DesignRenderProps = (() => {
  const template = BUILTIN_TEMPLATES.find((t) => t.design) ?? BUILTIN_TEMPLATES[0]!;
  const data = designDataFrom({ content: defaultProps.content, functions: [{ name: 'Wedding', startsAt: '2026-12-14T19:00:00+05:30', venueName: 'Rambagh Palace', venueAddress: 'Jaipur' }], language: 'en', eventType: 'wedding' });
  return { design: buildDesign({ template, data, language: 'en', eventType: 'wedding' }), data, language: 'en', page: 0, watermark: false, watermarkText: BRAND.watermarkText, musicUrl: null, aiClipUrl: null };
})();

export function RemotionRoot() {
  return (
    <>
      <Still id={COMPOSITIONS.card.id} component={Card} width={COMPOSITIONS.card.width} height={COMPOSITIONS.card.height} defaultProps={defaultProps} />
      <Still
        id={COMPOSITIONS.cardPrint.id}
        component={Card}
        width={COMPOSITIONS.cardPrint.width}
        height={COMPOSITIONS.cardPrint.height}
        defaultProps={defaultProps}
      />
      <Composition
        id={COMPOSITIONS.video.id}
        component={Video}
        width={COMPOSITIONS.video.width}
        height={COMPOSITIONS.video.height}
        fps={COMPOSITIONS.video.fps}
        durationInFrames={300}
        defaultProps={defaultProps}
        calculateMetadata={({ props }) => ({
          durationInFrames: planVideoScenes(props as InviteProps, COMPOSITIONS.video.fps).durationInFrames,
        })}
      />
      <Still id={COMPOSITIONS.designCard.id} component={DCard} width={COMPOSITIONS.designCard.width} height={COMPOSITIONS.designCard.height} defaultProps={designDefaults} />
      <Still id={COMPOSITIONS.designCardPrint.id} component={DCard} width={COMPOSITIONS.designCardPrint.width} height={COMPOSITIONS.designCardPrint.height} defaultProps={designDefaults} />
      <Composition
        id={COMPOSITIONS.designVideo.id}
        component={DVideo}
        width={COMPOSITIONS.designVideo.width}
        height={COMPOSITIONS.designVideo.height}
        fps={COMPOSITIONS.designVideo.fps}
        durationInFrames={300}
        defaultProps={designDefaults}
        calculateMetadata={({ props }) => {
          const p = props as unknown as DesignRenderProps;
          return { durationInFrames: planDesignVideo(p.design, COMPOSITIONS.designVideo.fps, Boolean(p.aiClipUrl)).durationInFrames };
        }}
      />
      <Composition
        id={COMPOSITIONS.siteVideo.id}
        component={SVideo}
        width={COMPOSITIONS.siteVideo.width}
        height={COMPOSITIONS.siteVideo.height}
        fps={COMPOSITIONS.siteVideo.fps}
        durationInFrames={900}
        defaultProps={siteVideoDefaults}
        calculateMetadata={({ props }) => ({
          durationInFrames: siteVideoFrames(props as unknown as SiteVideoProps, COMPOSITIONS.siteVideo.fps),
        })}
      />
    </>
  );
}

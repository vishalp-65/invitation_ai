import { MakerLanding, makerMetadata } from '@/features/makers/maker-landing';

export const metadata = makerMetadata('video-invitation-maker');

export default function Page() {
  return <MakerLanding slug="video-invitation-maker" />;
}

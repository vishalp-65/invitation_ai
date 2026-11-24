import { MakerLanding, makerMetadata } from '@/features/makers/maker-landing';

export const metadata = makerMetadata('invitation-website-maker');

export default function Page() {
  return <MakerLanding slug="invitation-website-maker" />;
}

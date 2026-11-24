import { MakerLanding, makerMetadata } from '@/features/makers/maker-landing';

export const metadata = makerMetadata('free-invitation-maker');

export default function Page() {
  return <MakerLanding slug="free-invitation-maker" />;
}

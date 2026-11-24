import { MakerLanding, makerMetadata } from '@/features/makers/maker-landing';

export const metadata = makerMetadata('invitation-card-maker');

export default function Page() {
  return <MakerLanding slug="invitation-card-maker" />;
}

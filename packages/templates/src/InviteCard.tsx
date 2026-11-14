import { planCardPages, type InviteProps } from '@cardai/shared';
import { useVideoConfig } from 'remotion';
import { CoverBlock, FamilyBlock, FunctionsBlock } from './components/Content';
import { Stage } from './components/Stage';

/** One page of the multi-page image card. `props.page` selects which page. */
export function InviteCard(props: InviteProps) {
  const { width, height } = useVideoConfig();
  const pages = planCardPages(props);
  const page = pages[Math.min(Math.max(props.page, 0), pages.length - 1)]!;

  return (
    <Stage props={props} width={width} height={height} fit>
      {({ skin, u }) => {
        switch (page.kind) {
          case 'cover':
            return <CoverBlock props={props} skin={skin} u={u} inlineFunction={page.inlineFunction} showFamily={page.showFamily} />;
          case 'functions':
            return <FunctionsBlock props={props} skin={skin} u={u} items={page.items} />;
          case 'family':
            return <FamilyBlock props={props} skin={skin} u={u} />;
        }
      }}
    </Stage>
  );
}

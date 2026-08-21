import { Box, IconButton, Scroll, Text } from 'folds';
import {
  ArrowLeft,
  CurrencyCircleDollar,
  composerIcon,
  dropzoneIcon,
} from '$components/icons/phosphor';
import { BackRouteHandler } from '$components/BackRouteHandler';
import { Page, PageContent, PageContentCenter, PageHeader } from '$components/page';
import { ScreenSize, useScreenSizeContext } from '$hooks/useScreenSize';
import { useSpace } from '$hooks/useSpace';
import { useProjectIdentity, ProjectIdentityContent } from '$features/project-identity';

function ProjectHeader({ title }: { title: string }) {
  const screenSize = useScreenSizeContext();

  return (
    <PageHeader balance>
      <Box grow="Yes" alignItems="Center" gap="200">
        <Box grow="Yes" basis="No">
          {screenSize === ScreenSize.Mobile && (
            <BackRouteHandler>
              {(onBack) => <IconButton onClick={onBack}>{composerIcon(ArrowLeft)}</IconButton>}
            </BackRouteHandler>
          )}
        </Box>
        <Box justifyContent="Center" alignItems="Center" gap="200">
          {screenSize !== ScreenSize.Mobile && dropzoneIcon(CurrencyCircleDollar)}
          <Text size="H3" truncate>
            {title}
          </Text>
        </Box>
        <Box grow="Yes" basis="No" />
      </Box>
    </PageHeader>
  );
}

/** The dedicated, standalone Project Identity Page (Bible §12) at
 *  /:spaceIdOrAlias/project/ -- a real, linkable, bookmarkable URL, as
 *  opposed to ProjectIdentitySection's content seeded inline inside the
 *  Lobby. Both surfaces render from the SAME useProjectIdentity hook and
 *  ProjectIdentityContent component, so they can never silently drift
 *  into showing different things for the same project.
 *
 *  Unlike ProjectIdentitySection (which renders nothing for a space with
 *  no project, since it lives inline in a screen everyone visits), this
 *  route is only ever reached by someone deliberately navigating to
 *  /project/ -- so an ordinary space with no bound project shows an
 *  explicit "no project" state here rather than silently rendering
 *  nothing, which would look like the page itself is broken. */
export function SpaceProject() {
  const space = useSpace();
  const { project, chainAssets, links, selectedAssetId, setSelectedAssetId, selectedAsset } =
    useProjectIdentity(space.roomId);

  if (project === undefined) {
    return (
      <Page>
        <ProjectHeader title="Project" />
        <Box grow="Yes" alignItems="Center" justifyContent="Center">
          <Text size="T300">Loading…</Text>
        </Box>
      </Page>
    );
  }

  if (project === null) {
    return (
      <Page>
        <ProjectHeader title="Project" />
        <Box grow="Yes" alignItems="Center" justifyContent="Center" direction="Column" gap="100">
          <Text size="H4">No project yet</Text>
          <Text size="T300">This space doesn&apos;t have a project bound to it.</Text>
        </Box>
      </Page>
    );
  }

  return (
    <Page>
      <ProjectHeader title={project.name} />
      <Box style={{ position: 'relative' }} grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <PageContentCenter>
              <ProjectIdentityContent
                project={project}
                chainAssets={chainAssets}
                links={links}
                selectedAssetId={selectedAssetId}
                setSelectedAssetId={setSelectedAssetId}
                selectedAsset={selectedAsset}
              />
            </PageContentCenter>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}

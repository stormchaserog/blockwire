import { Box, IconButton, Scroll, Text, color, config } from 'folds';
import {
  ArrowLeft,
  House,
  Checks,
  composerIcon,
  dropzoneIcon,
  sizedIcon,
  CaretRight,
} from '$components/icons/phosphor';
import { BackRouteHandler } from '$components/BackRouteHandler';
import { Page, PageContent, PageContentCenter, PageHeader } from '$components/page';
import { ScreenSize, useScreenSizeContext } from '$hooks/useScreenSize';
import { useSpace } from '$hooks/useSpace';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { usePowerLevels } from '$hooks/usePowerLevels';
import { useRoomCreators } from '$hooks/useRoomCreators';
import { useRoomPermissions } from '$hooks/useRoomPermissions';
import { EventType } from '$types/matrix-sdk';
import { getSpaceProjectPath } from '$pages/pathUtils';
import { useMyProjectPermissions } from '$hooks/useMyProjectPermissions';
import { useProjectIdentity, RolesPanel, ProjectTabBar } from '$features/project-identity';

function HubHeader({ title }: { title: string }) {
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
          {screenSize !== ScreenSize.Mobile && dropzoneIcon(House)}
          <Text size="H3" truncate>
            {title}
          </Text>
        </Box>
        <Box grow="Yes" basis="No" />
      </Box>
    </PageHeader>
  );
}

function HubCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box
      direction="Column"
      gap="300"
      style={{
        border: `1px solid ${color.Surface.ContainerLine}`,
        borderRadius: config.radii.R400,
        padding: config.space.S400,
      }}
    >
      <Text size="H6">{title}</Text>
      {children}
    </Box>
  );
}

type ChecklistItemProps = {
  label: string;
  done: boolean;
};

function ChecklistItem({ label, done }: ChecklistItemProps) {
  return (
    <Box alignItems="Center" gap="200">
      {sizedIcon(Checks, '100', { filled: done })}
      <Text size="T300">{label}</Text>
    </Box>
  );
}

/** PRD §10/§22 (Project Hub / Founder Readiness Score), UX Playbook §8
 *  ("What needs attention today?" + focused cards).
 *
 *  This is a deliberately honest MVP, not the full blueprint: the PRD lists
 *  Today-at-a-Glance, Critical Alerts, Community Health, Token Activity,
 *  Social Activity, Tasks, Moderation, Launch Readiness, Billing as
 *  candidate cards. None of those data sources exist yet (see
 *  BLOCKWIRE_VERIFIED_STATUS_2026-08-21.md) -- building fake cards with no
 *  real data behind them would violate the Bible's own screenshot-driven
 *  rule and the Constitution's ban on decorative settings. This ships
 *  exactly one real, computed thing: setup completeness, built entirely
 *  from the ProjectRecord/ProjectChainAsset/ProjectLinkRecord data this
 *  page already fetches -- every checklist item reflects a real, current,
 *  verifiable fact about this project, nothing simulated. Additional cards
 *  land as their underlying data sources get built (Community Health once
 *  a metrics decision is made, Token Activity once BuyFeed's trade history
 *  is reusable in aggregate form here, etc.) -- this is the seed the rest
 *  of the blueprint's Hub widgets attach to, not a finished dashboard. */
export function SpaceHub() {
  const space = useSpace();
  const mx = useMatrixClient();
  const powerLevels = usePowerLevels(space);
  const creators = useRoomCreators(space);
  const permissions = useRoomPermissions(creators, powerLevels);
  const userId = mx.getUserId();
  const canManage = !!userId && permissions.stateEvent(EventType.RoomName, userId);
  const { project, chainAssets, links } = useProjectIdentity(space.roomId);
  const { has: hasProjectPermission } = useMyProjectPermissions(project?.project_id);

  if (project === undefined) {
    return (
      <Page>
        <HubHeader title="Hub" />
        <ProjectTabBar />
        <Box grow="Yes" alignItems="Center" justifyContent="Center">
          <Text size="T300">Loading…</Text>
        </Box>
      </Page>
    );
  }

  if (project === null) {
    return (
      <Page>
        <HubHeader title="Hub" />
        <ProjectTabBar />
        <Box grow="Yes" alignItems="Center" justifyContent="Center" direction="Column" gap="100">
          <Text size="H4">No project yet</Text>
          <Text size="T300">This space doesn&apos;t have a project bound to it.</Text>
        </Box>
      </Page>
    );
  }

  if (!canManage) {
    return (
      <Page>
        <HubHeader title="Hub" />
        <ProjectTabBar />
        <Box grow="Yes" alignItems="Center" justifyContent="Center" direction="Column" gap="100">
          <Text size="H4">Hub is for project admins</Text>
          <Text size="T300">You don&apos;t have permission to view this project&apos;s Hub.</Text>
        </Box>
      </Page>
    );
  }

  const checklist: ChecklistItemProps[] = [
    { label: 'Project name and description set', done: !!project.description },
    { label: 'Ticker set', done: !!project.ticker },
    { label: 'At least one token added', done: chainAssets.length > 0 },
    { label: 'At least one official link added', done: links.length > 0 },
    { label: 'Project owner verified', done: project.owner_verification_state === 'verified' },
  ];
  const completedCount = checklist.filter((item) => item.done).length;

  return (
    <Page>
      <HubHeader title={`${project.name} Hub`} />
      <ProjectTabBar />
      <Box style={{ position: 'relative' }} grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <PageContentCenter>
              <Box direction="Column" gap="600">
                <Text size="H4">What needs attention today?</Text>
                <HubCard title={`Setup Completeness (${completedCount}/${checklist.length})`}>
                  <Box direction="Column" gap="200">
                    {checklist.map((item) => (
                      <ChecklistItem key={item.label} label={item.label} done={item.done} />
                    ))}
                  </Box>
                  <Text size="T200" style={{ color: color.Surface.OnContainer }}>
                    This reflects setup progress only -- it is not an investment rating and says
                    nothing about the project&apos;s legitimacy or quality.
                  </Text>
                </HubCard>
                {hasProjectPermission('role.assign') && (
                  <RolesPanel projectId={project.project_id} />
                )}
                <Box
                  as="a"
                  href={getSpaceProjectPath(space.roomId)}
                  alignItems="Center"
                  gap="100"
                  style={{ color: color.Primary.Main, textDecoration: 'none' }}
                >
                  <Text size="T300">Open full Project Identity page</Text>
                  {sizedIcon(CaretRight, '50')}
                </Box>
              </Box>
            </PageContentCenter>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}

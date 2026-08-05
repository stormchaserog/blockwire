import { SidebarAvatar, SidebarItem, SidebarItemTooltip } from '$components/sidebar';
import { ListMagnifyingGlassIcon } from '@phosphor-icons/react';
import { getPhosphorIconSize } from '$components/icons/phosphor';
import { Text, Box, color } from 'folds';
import { getNavigatePath } from '$pages/pathUtils';
import { useOpenShallowRoute } from '$pages/client/useShallowRoute';
import { useNavigateSelected } from '$hooks/router/useRouteSelected';
import { useMobileTapActivation } from '$hooks/useMobileTapActivation';

export function NavigateTab({ isBottom, isMobile }: { isBottom?: boolean; isMobile?: boolean }) {
  const isNavigate = useNavigateSelected();
  const openShallowRoute = useOpenShallowRoute();
  const open = () => openShallowRoute(getNavigatePath());
  const mobileTapActivation = useMobileTapActivation(isMobile ?? false, open);

  return (
    <SidebarItem active={isNavigate && !isMobile} isBottom={isBottom}>
      <SidebarItemTooltip tooltip="Search" position={isBottom ? 'Top' : 'Right'}>
        {(triggerRef) => (
          <Box direction="Column" alignItems="Center">
            <SidebarAvatar
              as="button"
              ref={triggerRef}
              outlined={!isMobile}
              {...mobileTapActivation}
              size={'400'}
            >
              <ListMagnifyingGlassIcon
                size={getPhosphorIconSize(isBottom ? 'inline' : 'toolbar')}
                weight={isNavigate ? 'fill' : 'regular'}
                color={isNavigate && isMobile ? color.Primary.Main : color.Background.OnContainer}
              />
            </SidebarAvatar>
            {isMobile && (
              // "Search" — matching the tooltip above, which upstream already
              // called Search while labelling the tab "Navigate". This is the
              // only way to search rooms on a phone, so it keeps its slot in
              // the bottom bar; it just says what it does now.
              <Text size="B300" priority="300">
                Search
              </Text>
            )}
          </Box>
        )}
      </SidebarItemTooltip>
    </SidebarItem>
  );
}

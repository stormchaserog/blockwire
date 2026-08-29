import type { ReactNode } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Box, IconButton, Text, color } from 'folds';
import {
  ArrowUpRight,
  Check,
  Copy,
  CurrencyCircleDollar,
  Globe,
  Info,
  Presentation,
  ShareNetwork,
  Stack,
  XLogo,
  sizedIcon,
} from '$components/icons/phosphor';
import { formatTicker, nameInitials } from '$utils/common';
import { copyToClipboard } from '$utils/dom';
import { shareText } from '$utils/share';
import { getExplorerUrl } from '$utils/blockwire/chainExplorers';
import { getSpaceProjectPath } from '$pages/pathUtils';
import type {
  ProjectChainAsset,
  ProjectLinkRecord,
  ProjectRecord,
} from '$utils/blockwire/projects';
import { VerificationBadge } from './VerificationBadge';
import { ProjectChainAssetPrice } from './ProjectChainAssetPrice';
import { Sparkline } from './Sparkline';
import { useTokenPriceHistory } from './useTokenPriceHistory';
import * as css from './ProjectInfoSheet.css';

/** '8xR…pump' style: first 3 + ellipsis + last 4. Deliberately shorter
 *  than ContractAddressBadge's 6+4 -- this details list has a label
 *  taking up the left half of the row, so the value column has less
 *  horizontal room than the badge's full-width strip. */
function truncateAddress(address: string): string {
  if (address.length <= 8) return address;
  return `${address.slice(0, 3)}…${address.slice(-4)}`;
}

function capitalizeChain(chain: string): string {
  if (!chain) return chain;
  return chain.charAt(0).toUpperCase() + chain.slice(1);
}

/** 'May 21, 2024'. Returns null for anything unparseable rather than
 *  rendering "Invalid Date" into the details list. */
function formatFirstSeen(createdAt: string | null | undefined): string | null {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** The project's official link of the given type(s), if the owner has
 *  added one. link_type values come from AddProjectLinkForm's
 *  LINK_TYPE_OPTIONS ('website', 'x', ...) but are matched
 *  case-insensitively the same way OfficialLinksVault's iconForLinkType
 *  already does. */
function findLink(links: ProjectLinkRecord[], ...types: string[]): ProjectLinkRecord | null {
  return links.find((link) => types.includes(link.link_type.toLowerCase())) ?? null;
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/** '@handle' from an x.com/twitter.com profile URL; null when the URL has
 *  no usable path segment (e.g. a bare 'https://x.com'). */
function xHandleOf(url: string): string | null {
  try {
    const segment = new URL(url).pathname.split('/').find(Boolean);
    if (!segment) return null;
    return `@${segment.replace(/^@/, '')}`;
  } catch {
    return null;
  }
}

type ActionTileProps = {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  href?: string;
};

/** One rounded-square tile in the Chart / Buy Feed / Info / Share row:
 *  icon above label, equal widths. Rendered as an anchor when `href` is
 *  given (external links open in a new tab) and a button otherwise. */
function ActionTile({ icon, label, onClick, href }: ActionTileProps) {
  const content = (
    <>
      {icon}
      <Text size="B300" style={{ color: 'inherit' }}>
        {label}
      </Text>
    </>
  );

  if (href) {
    return (
      <Box
        as="a"
        grow="Yes"
        direction="Column"
        alignItems="Center"
        gap="100"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={css.ActionTile}
      >
        {content}
      </Box>
    );
  }
  return (
    <Box
      as="button"
      type="button"
      grow="Yes"
      direction="Column"
      alignItems="Center"
      gap="100"
      onClick={onClick}
      className={css.ActionTile}
    >
      {content}
    </Box>
  );
}

type DetailRowProps = {
  label: string;
  children: ReactNode;
};

/** Label muted left / value + small trailing icon right, with a hairline
 *  divider between rows (last row undivided via the css :last-child). */
function DetailRow({ label, children }: DetailRowProps) {
  return (
    <Box alignItems="Center" justifyContent="SpaceBetween" gap="300" className={css.DetailRow}>
      <Text size="T300" style={{ color: color.Surface.OnContainer }}>
        {label}
      </Text>
      <Box alignItems="Center" gap="200">
        {children}
      </Box>
    </Box>
  );
}

export type ProjectInfoOverviewProps = {
  project: ProjectRecord;
  chainAssets: ProjectChainAsset[];
  links: ProjectLinkRecord[];
  selectedAsset: ProjectChainAsset | null;
  spaceRoomId: string;
  /** 'page' renders the Info tab's larger (~88px) hero avatar; 'sheet'
   *  keeps the Project Info Sheet's compact 76px one. Identical content
   *  otherwise -- one source of truth per the locked design mock. */
  variant?: 'sheet' | 'page';
  /** Called before an in-app tile navigation (the sheet closes itself
   *  first; the page has nothing to do). */
  onBeforeNavigate?: () => void;
};

/** The design-mock project overview shared by the room-header Project
 *  Info Sheet and the project page's Info tab: centered hero (avatar,
 *  name + seal, "$TICKER • Chain", Verified Project chip), live price +
 *  24h sparkline card, the Chart / Buy Feed / Info / Share tile row, and
 *  the details card (contract, chain, explorer, website, X, first seen).
 *  Both surfaces render THIS component so they can never drift apart.
 *
 *  Presentational except for the sparkline history (GeckoTerminal, cached
 *  + never-throwing in useTokenPriceHistory): callers own the record
 *  fetch, keeping this testable with plain fixture records the way
 *  TokenPriceCard is. Never fabricates a row: any detail whose real data
 *  is missing (no X link, no chain asset, unparseable created_at) is
 *  omitted entirely. */
export function ProjectInfoOverview({
  project,
  chainAssets,
  links,
  selectedAsset,
  spaceRoomId,
  variant = 'sheet',
  onBeforeNavigate,
}: ProjectInfoOverviewProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const asset = selectedAsset ?? chainAssets[0] ?? null;
  const ticker = formatTicker(project.ticker);
  const chainName = asset ? capitalizeChain(asset.chain) : null;
  const subtitle = [ticker, chainName].filter(Boolean).join(' • ');
  const verified = project.owner_verification_state === 'verified';

  const priceHistory = useTokenPriceHistory(asset?.chain, asset?.contract_address);

  const dexscreenerUrl = asset
    ? `https://dexscreener.com/${asset.chain.toLowerCase()}/${asset.contract_address}`
    : null;
  const explorerUrl = asset ? getExplorerUrl(asset.chain, asset.contract_address) : null;
  const websiteLink = findLink(links, 'website');
  const websiteHost = websiteLink ? hostnameOf(websiteLink.url) : null;
  const xLink = findLink(links, 'x', 'twitter');
  const xHandle = xLink ? xHandleOf(xLink.url) : null;
  const firstSeen = formatFirstSeen(project.created_at);

  const handleCopyAddress = async () => {
    if (!asset) return;
    const ok = await copyToClipboard(asset.contract_address);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleShare = () => {
    const shareUrl = websiteLink?.url ?? dexscreenerUrl;
    void shareText(shareUrl ? `${project.name} — ${shareUrl}` : project.name);
  };

  const goTo = (path: string) => {
    onBeforeNavigate?.();
    navigate(path);
  };

  return (
    <Box direction="Column" gap="400">
      <Box direction="Column" alignItems="Center" gap="200">
        <Avatar size="500" className={variant === 'page' ? css.HeroAvatarPage : css.HeroAvatar}>
          {project.avatar_url ? (
            <img src={project.avatar_url} alt={project.name} className={css.HeroAvatarImg} />
          ) : (
            <Text size="H4">{nameInitials(project.name)}</Text>
          )}
        </Avatar>
        <Box alignItems="Center" justifyContent="Center" gap="200" style={{ maxWidth: '100%' }}>
          <Text size="H4" align="Center" truncate>
            <b>{project.name}</b>
          </Text>
          <VerificationBadge
            state={project.owner_verification_state}
            label="Project Owner Verified"
          />
        </Box>
        {subtitle && (
          <Text size="T300" align="Center" style={{ color: color.Surface.OnContainer }}>
            {subtitle}
          </Text>
        )}
        {verified && (
          <Box shrink="No" alignItems="Center" className={css.VerifiedChip}>
            {sizedIcon(Check, '50', { style: { color: color.Success.OnContainer } })}
            <Text size="T200" style={{ color: color.Success.OnContainer }}>
              Verified Project
            </Text>
          </Box>
        )}
      </Box>

      {asset && (
        <ProjectChainAssetPrice
          projectId={project.project_id}
          chainAssetId={asset.id}
          variant="sheet"
          sparkline={
            priceHistory && priceHistory.length > 1 ? (
              <Sparkline history={priceHistory} />
            ) : undefined
          }
        />
      )}

      <Box gap="200">
        {dexscreenerUrl && (
          <ActionTile icon={sizedIcon(Presentation, '200')} label="Chart" href={dexscreenerUrl} />
        )}
        <ActionTile
          icon={sizedIcon(CurrencyCircleDollar, '200')}
          label="Buy Feed"
          onClick={() => goTo(getSpaceProjectPath(spaceRoomId))}
        />
        <ActionTile
          icon={sizedIcon(Info, '200')}
          label="Info"
          onClick={() => goTo(getSpaceProjectPath(spaceRoomId))}
        />
        <ActionTile icon={sizedIcon(ShareNetwork, '200')} label="Share" onClick={handleShare} />
      </Box>

      <Box direction="Column" className={css.DetailsCard}>
        {asset && (
          <DetailRow label="Contract Address">
            <Text size="T300" style={{ fontFamily: 'monospace' }}>
              {truncateAddress(asset.contract_address)}
            </Text>
            <IconButton
              size="300"
              variant="SurfaceVariant"
              radii="300"
              aria-label={copied ? 'Copied' : 'Copy contract address'}
              onClick={handleCopyAddress}
            >
              {copied
                ? sizedIcon(Check, '100', { style: { color: color.Success.Main } })
                : sizedIcon(Copy, '100')}
            </IconButton>
          </DetailRow>
        )}
        {chainName && (
          <DetailRow label="Chain">
            <Text size="T300">{chainName}</Text>
            {sizedIcon(Stack, '100', { style: { color: color.Surface.OnContainer } })}
          </DetailRow>
        )}
        {explorerUrl && (
          <DetailRow label="Explorer">
            <Box
              as="a"
              alignItems="Center"
              gap="100"
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={css.DetailLink}
            >
              <Text size="T300" style={{ color: 'inherit' }}>
                Solscan
              </Text>
              {sizedIcon(ArrowUpRight, '100')}
            </Box>
          </DetailRow>
        )}
        {websiteLink && websiteHost && (
          <DetailRow label="Website">
            <Box
              as="a"
              alignItems="Center"
              gap="100"
              href={websiteLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className={css.DetailLink}
            >
              <Text size="T300" style={{ color: 'inherit' }}>
                {websiteHost}
              </Text>
              {sizedIcon(Globe, '100')}
            </Box>
          </DetailRow>
        )}
        {xLink && xHandle && (
          <DetailRow label="X (Twitter)">
            <Box
              as="a"
              alignItems="Center"
              gap="100"
              href={xLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className={css.DetailLink}
            >
              <Text size="T300" style={{ color: 'inherit' }}>
                {xHandle}
              </Text>
              {sizedIcon(XLogo, '100')}
            </Box>
          </DetailRow>
        )}
        {firstSeen && (
          <DetailRow label="First Seen">
            <Text size="T300">{firstSeen}</Text>
            {sizedIcon(Copy, '100', { style: { color: color.Surface.OnContainer } })}
          </DetailRow>
        )}
      </Box>
    </Box>
  );
}

import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { Box, IconButton, Text } from 'folds';
import {
  ArrowUpRight,
  Check,
  Copy,
  CurrencyCircleDollar,
  Globe,
  Info,
  Presentation,
  SealCheck,
  ShareNetwork,
  Stack,
  X,
  XLogo,
  sizedIcon,
} from '$components/icons/phosphor';
import { formatTicker, nameInitials } from '$utils/common';
import { copyToClipboard } from '$utils/dom';
import { shareText } from '$utils/share';
import { mxcUrlToHttp } from '$utils/matrix';
import { useOptionalMatrixClient } from '$hooks/useMatrixClient';
import { useMediaAuthentication } from '$hooks/useMediaAuthentication';
import { getExplorerUrl } from '$utils/blockwire/chainExplorers';
import type {
  ProjectChainAsset,
  ProjectLinkRecord,
  ProjectRecord,
} from '$utils/blockwire/projects';
import { VerificationBadge } from './VerificationBadge';
import { ProjectChainAssetPrice } from './ProjectChainAssetPrice';
import { Sparkline } from './Sparkline';
import { useTokenPriceHistory } from './useTokenPriceHistory';
import { useJupiterVerification } from './useJupiterVerification';
import { BuyFeed } from './BuyFeed';
import { ModalOverlay } from '$components/modal-overlay/ModalOverlay';
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
      <span className={css.ActionTileIcon}>{icon}</span>
      <span className={css.ActionTileLabel}>{label}</span>
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
      <span className={css.DetailKey}>{label}</span>
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
  /** The project's bound space -- kept in the contract so both surfaces
   *  keep handing the overview its full identity context even though the
   *  tiles no longer navigate (Buy Feed opens in-place, Info scrolls). */
  spaceRoomId: string;
  /** 'page' renders the Info tab's larger (~88px) hero avatar; 'sheet'
   *  keeps the Project Info Sheet's compact 76px one. Identical content
   *  otherwise -- one source of truth per the locked design mock. */
  variant?: 'sheet' | 'page';
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
  variant = 'sheet',
}: ProjectInfoOverviewProps) {
  const [copied, setCopied] = useState(false);
  const [buyFeedOpen, setBuyFeedOpen] = useState(false);
  const detailsCardRef = useRef<HTMLDivElement | null>(null);
  const mx = useOptionalMatrixClient();
  const useAuthentication = useMediaAuthentication();
  // avatar_url may be an mxc:// URI (Matrix media) or a plain https URL.
  // Never hand a raw mxc:// to <img> -- an unloadable src renders alt text,
  // which spills outside the avatar circle.
  const heroAvatarSrc = project.avatar_url
    ? project.avatar_url.startsWith('mxc://')
      ? (mx && (mxcUrlToHttp(mx, project.avatar_url, useAuthentication, 176, 176, 'crop') ?? undefined)) || undefined
      : project.avatar_url
    : undefined;

  const asset = selectedAsset ?? chainAssets[0] ?? null;
  const ticker = formatTicker(project.ticker);
  const chainName = asset ? capitalizeChain(asset.chain) : null;
  const subtitle = [ticker, chainName].filter(Boolean).join(' • ');
  const verified = project.owner_verification_state === 'verified';

  const priceHistory = useTokenPriceHistory(asset?.chain, asset?.contract_address);
  // Jupiter verification (solana only). null = unknown (loading, error, or
  // non-solana) and the row is omitted entirely -- never a fabricated state.
  const jupiterVerified = useJupiterVerification(asset?.chain, asset?.contract_address);

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

  // Info: the overview IS the info surface, so the only honest behavior
  // is scrolling the details card into view rather than a same-page
  // navigation that feels like a dead button.
  const handleInfo = () => {
    detailsCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Box direction="Column" gap="400">
      <Box direction="Column" alignItems="Center" gap="200">
        <div className={variant === 'page' ? css.HeroAvatarPage : css.HeroAvatar}>
          {heroAvatarSrc ? (
            <img src={heroAvatarSrc} alt={project.name} className={css.HeroAvatarImg} />
          ) : (
            nameInitials(project.name, 2)
          )}
        </div>
        <Box alignItems="Center" justifyContent="Center" gap="200" style={{ maxWidth: '100%' }}>
          <span className={css.HeroName}>{project.name}</span>
          <VerificationBadge
            state={project.owner_verification_state}
            label="Project Owner Verified"
          />
        </Box>
        {subtitle && <span className={css.HeroSubtitle}>{subtitle}</span>}
        {verified && (
          <Box shrink="No" alignItems="Center" className={css.VerifiedChip}>
            {sizedIcon(Check, '50')}
            Verified Project
          </Box>
        )}
      </Box>

      {asset && (
        <ProjectChainAssetPrice
          projectId={project.project_id}
          chainAssetId={asset.id}
          variant="sheet"
          sparkline={
            priceHistory && priceHistory.length > 1
              ? // oxlint-disable-next-line react/no-unstable-nested-components -- render prop, not a component: TokenPriceCard invokes it inline with the snapshot's 24h change so the sparkline tone always matches the % text
                (change24h) => <Sparkline history={priceHistory} change24h={change24h} />
              : undefined
          }
        />
      )}

      <Box gap="200">
        {dexscreenerUrl && (
          <ActionTile icon={sizedIcon(Presentation, '200')} label="Chart" href={dexscreenerUrl} />
        )}
        {asset && (
          <ActionTile
            icon={sizedIcon(CurrencyCircleDollar, '200')}
            label="Buy Feed"
            onClick={() => setBuyFeedOpen(true)}
          />
        )}
        <ActionTile icon={sizedIcon(Info, '200')} label="Info" onClick={handleInfo} />
        <ActionTile icon={sizedIcon(ShareNetwork, '200')} label="Share" onClick={handleShare} />
      </Box>

      {asset && buyFeedOpen && (
        <ModalOverlay open requestClose={() => setBuyFeedOpen(false)} mobile="sheet" size="400">
          <Box direction="Column" gap="300" className={css.BuyFeedSheet}>
            <Box alignItems="Center" justifyContent="SpaceBetween" gap="300">
              <Text size="H4">Buy Feed</Text>
              <IconButton
                size="300"
                variant="SurfaceVariant"
                radii="Pill"
                aria-label="Close buy feed"
                onClick={() => setBuyFeedOpen(false)}
              >
                {sizedIcon(X, '100')}
              </IconButton>
            </Box>
            <BuyFeed projectId={project.project_id} chainAssetId={asset.id} />
          </Box>
        </ModalOverlay>
      )}

      <Box direction="Column" className={css.DetailsCard} ref={detailsCardRef}>
        {asset && (
          <DetailRow label="Contract Address">
            <span className={css.DetailValue} style={{ fontFamily: 'monospace' }}>
              {truncateAddress(asset.contract_address)}
            </span>
            <IconButton
              size="300"
              variant="SurfaceVariant"
              radii="300"
              aria-label={copied ? 'Copied' : 'Copy contract address'}
              onClick={handleCopyAddress}
            >
              {copied
                ? sizedIcon(Check, '100', { style: { color: css.mock.green } })
                : sizedIcon(Copy, '100')}
            </IconButton>
          </DetailRow>
        )}
        {chainName && (
          <DetailRow label="Chain">
            <span className={css.DetailValue}>{chainName}</span>
            {sizedIcon(Stack, '100', { style: { color: css.mock.text2 } })}
          </DetailRow>
        )}
        {jupiterVerified !== null && (
          <DetailRow label="Jupiter">
            {jupiterVerified ? (
              <>
                <span className={css.DetailValue} style={{ color: css.mock.green }}>
                  Verified
                </span>
                {sizedIcon(SealCheck, '100', { style: { color: css.mock.green } })}
              </>
            ) : (
              <span className={css.DetailValue} style={{ color: css.mock.text2 }}>
                Not Verified
              </span>
            )}
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
              <span className={css.DetailValue} style={{ color: 'inherit' }}>
                Solscan
              </span>
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
              <span className={css.DetailValue} style={{ color: 'inherit' }}>
                {websiteHost}
              </span>
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
              <span className={css.DetailValue} style={{ color: 'inherit' }}>
                {xHandle}
              </span>
              {sizedIcon(XLogo, '100')}
            </Box>
          </DetailRow>
        )}
        {firstSeen && (
          <DetailRow label="First Seen">
            <span className={css.DetailValue}>{firstSeen}</span>
            {sizedIcon(Copy, '100', { style: { color: css.mock.text2 } })}
          </DetailRow>
        )}
      </Box>
    </Box>
  );
}
